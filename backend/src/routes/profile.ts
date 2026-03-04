import { Hono } from "hono";
import { prisma } from "../prisma";
import { UpdateProfileSchema, UpdatePasswordSchema } from "../types";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import type { auth } from "../auth";

// ─── Rate limiter (in-memory) ─────────────────────────────────────────────────
// Tracks password-change attempts: userId -> { count, resetAt }
const passwordRateLimiter = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkPasswordRateLimit(userId: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = passwordRateLimiter.get(userId);

  if (!entry || now >= entry.resetAt) {
    // First attempt or window expired — reset
    passwordRateLimiter.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  passwordRateLimiter.set(userId, entry);
  return { allowed: true, retryAfterMs: 0 };
}

// ─── Router ───────────────────────────────────────────────────────────────────

const profileRouter = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// GET / — Return current user profile
profileRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!dbUser) {
    return c.json({ error: { message: "User not found", code: "NOT_FOUND" } }, 404);
  }

  return c.json({
    data: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      createdAt: dbUser.createdAt.toISOString(),
    },
  });
});

// PATCH / — Update name and/or email
profileRouter.patch("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: { message: "Invalid JSON body", code: "INVALID_JSON" } }, 400);
  }

  const result = UpdateProfileSchema.safeParse(rawBody);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return c.json(
      {
        error: {
          message: firstIssue?.message ?? "Validation failed",
          code: "VALIDATION_ERROR",
          details: result.error.issues,
        },
      },
      400
    );
  }

  const body = result.data;

  // Sanitize inputs
  const updates: { name?: string; email?: string } = {};
  if (body.name !== undefined) {
    updates.name = body.name.trim();
  }
  if (body.email !== undefined) {
    updates.email = body.email.trim().toLowerCase();
  }

  // Nothing to update
  if (Object.keys(updates).length === 0) {
    return c.json(
      { error: { message: "No fields provided to update", code: "NO_CHANGES" } },
      400
    );
  }

  // Check email uniqueness if email is being changed
  if (updates.email && updates.email !== user.email.toLowerCase()) {
    const existing = await prisma.user.findFirst({
      where: {
        email: updates.email,
        NOT: { id: user.id },
      },
      select: { id: true },
    });

    if (existing) {
      return c.json(
        {
          error: {
            message: "Email is already in use by another account",
            code: "EMAIL_IN_USE",
          },
        },
        409
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return c.json({
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      createdAt: updated.createdAt.toISOString(),
    },
  });
});

// PATCH /password — Change password with current password verification and rate limiting
profileRouter.patch("/password", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  // Rate limiting — max 5 attempts per 15 minutes per user
  const rateCheck = checkPasswordRateLimit(user.id);
  if (!rateCheck.allowed) {
    const retryAfterSecs = Math.ceil(rateCheck.retryAfterMs / 1000);
    return c.json(
      {
        error: {
          message: `Too many password change attempts. Try again in ${Math.ceil(retryAfterSecs / 60)} minute(s).`,
          code: "RATE_LIMITED",
          retryAfterSeconds: retryAfterSecs,
        },
      },
      429
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: { message: "Invalid JSON body", code: "INVALID_JSON" } }, 400);
  }

  const result = UpdatePasswordSchema.safeParse(rawBody);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return c.json(
      {
        error: {
          message: firstIssue?.message ?? "Validation failed",
          code: "VALIDATION_ERROR",
          details: result.error.issues,
        },
      },
      400
    );
  }

  const { currentPassword, newPassword } = result.data;

  // Look up the credential account for this user
  const account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
    select: {
      id: true,
      password: true,
    },
  });

  if (!account || !account.password) {
    return c.json(
      {
        error: {
          message:
            "No password-based account found. This account may use a social login.",
          code: "NO_PASSWORD_ACCOUNT",
        },
      },
      400
    );
  }

  // Verify current password
  const isValid = await verifyPassword({
    hash: account.password,
    password: currentPassword,
  });

  if (!isValid) {
    return c.json(
      { error: { message: "Current password is incorrect", code: "INVALID_PASSWORD" } },
      401
    );
  }

  // Hash the new password and persist
  const hashed = await hashPassword(newPassword);

  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashed },
  });

  return c.json({ data: { success: true } });
});

export { profileRouter };
