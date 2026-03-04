import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import { auth } from "../auth";
import {
  JoinCoupleSchema,
  CreateCompareSessionSchema,
  VoteSchema,
  CloseSessionSchema,
} from "../types";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const coupleRouter = new Hono<{ Variables: Variables }>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getActiveCouple(userId: string) {
  return prisma.coupleConnection.findFirst({
    where: {
      status: "active",
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeDates<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ─── GET / — get current couple connection ───────────────────────────────────

coupleRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const connection = await prisma.coupleConnection.findFirst({
    where: {
      status: { in: ["pending", "active"] },
      OR: [{ user1Id: user.id }, { user2Id: user.id }],
    },
    include: {
      user1: { select: { id: true, name: true, email: true } },
      user2: { select: { id: true, name: true, email: true } },
    },
  });

  if (!connection) {
    return c.json({ data: null });
  }

  const isUser1 = connection.user1Id === user.id;
  const partner = isUser1 ? connection.user2 : connection.user1;

  return c.json({
    data: {
      ...serializeDates(connection),
      partnerName: partner?.name ?? null,
      partnerEmail: partner?.email ?? null,
    },
  });
});

// ─── POST /invite — generate invite code ─────────────────────────────────────

coupleRouter.post("/invite", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  // Check if already in an active couple
  const existing = await getActiveCouple(user.id);
  if (existing) {
    return c.json(
      { error: { message: "You are already in an active couple", code: "ALREADY_COUPLED" } },
      400
    );
  }

  // Invalidate any pending invites the user already created
  await prisma.coupleConnection.updateMany({
    where: { user1Id: user.id, status: "pending" },
    data: { status: "dissolved" },
  });

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const conflict = await prisma.coupleConnection.findUnique({ where: { inviteCode } });
    if (!conflict) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const connection = await prisma.coupleConnection.create({
    data: {
      inviteCode,
      user1Id: user.id,
      status: "pending",
    },
  });

  return c.json({ data: { inviteCode: connection.inviteCode, id: connection.id } });
});

// ─── POST /join — join with invite code ──────────────────────────────────────

coupleRouter.post("/join", zValidator("json", JoinCoupleSchema), async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const { inviteCode } = c.req.valid("json");

  // Check if already in an active couple
  const existing = await getActiveCouple(user.id);
  if (existing) {
    return c.json(
      { error: { message: "You are already in an active couple", code: "ALREADY_COUPLED" } },
      400
    );
  }

  // Find the pending connection
  const connection = await prisma.coupleConnection.findUnique({
    where: { inviteCode },
  });

  if (!connection || connection.status !== "pending") {
    return c.json(
      { error: { message: "Invalid or expired invite code", code: "INVALID_INVITE" } },
      404
    );
  }

  // Prevent joining own invite
  if (connection.user1Id === user.id) {
    return c.json(
      { error: { message: "You cannot join your own invite", code: "SELF_JOIN" } },
      400
    );
  }

  const updated = await prisma.coupleConnection.update({
    where: { id: connection.id },
    data: {
      user2Id: user.id,
      status: "active",
    },
    include: {
      user1: { select: { id: true, name: true, email: true } },
      user2: { select: { id: true, name: true, email: true } },
    },
  });

  const partner = updated.user1Id === user.id ? updated.user2 : updated.user1;

  return c.json({
    data: {
      ...serializeDates(updated),
      partnerName: partner?.name ?? null,
      partnerEmail: partner?.email ?? null,
    },
  });
});

// ─── DELETE / — dissolve couple ───────────────────────────────────────────────

coupleRouter.delete("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const connection = await getActiveCouple(user.id);
  if (!connection) {
    return c.json(
      { error: { message: "No active couple connection found", code: "NOT_COUPLED" } },
      404
    );
  }

  await prisma.coupleConnection.update({
    where: { id: connection.id },
    data: { status: "dissolved" },
  });

  return new Response(null, { status: 204 });
});

// ─── GET /sessions — list compare sessions ───────────────────────────────────

coupleRouter.get("/sessions", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const connection = await getActiveCouple(user.id);
  if (!connection) {
    return c.json(
      { error: { message: "No active couple connection found", code: "NOT_COUPLED" } },
      404
    );
  }

  const sessions = await prisma.compareSession.findMany({
    where: { coupleId: connection.id },
    include: {
      options: {
        orderBy: { position: "asc" },
        include: {
          outfit: {
            include: {
              items: {
                include: {
                  clothingItem: true,
                },
              },
            },
          },
        },
      },
      votes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ data: serializeDates(sessions) });
});

// ─── POST /sessions — create compare session ─────────────────────────────────

coupleRouter.post(
  "/sessions",
  zValidator("json", CreateCompareSessionSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { outfitIds, calendarDate } = c.req.valid("json");

    const connection = await getActiveCouple(user.id);
    if (!connection) {
      return c.json(
        { error: { message: "No active couple connection found", code: "NOT_COUPLED" } },
        404
      );
    }

    // Validate all outfits belong to users in the couple
    const validUserIds = [connection.user1Id];
    if (connection.user2Id) validUserIds.push(connection.user2Id);

    const outfits = await prisma.outfit.findMany({
      where: {
        id: { in: outfitIds },
        userId: { in: validUserIds },
      },
    });

    if (outfits.length !== outfitIds.length) {
      return c.json(
        { error: { message: "One or more outfit IDs are invalid", code: "INVALID_OUTFIT" } },
        400
      );
    }

    const session = await prisma.compareSession.create({
      data: {
        coupleId: connection.id,
        createdByUserId: user.id,
        calendarDate: calendarDate ?? null,
        status: "open",
        options: {
          create: outfitIds.map((outfitId, index) => ({
            outfitId,
            addedByUserId: user.id,
            position: index,
          })),
        },
      },
      include: {
        options: {
          orderBy: { position: "asc" },
          include: {
            outfit: {
              include: {
                items: {
                  include: { clothingItem: true },
                },
              },
            },
          },
        },
        votes: true,
      },
    });

    return c.json({ data: serializeDates(session) }, 201);
  }
);

// ─── GET /sessions/:id — get single session ───────────────────────────────────

coupleRouter.get("/sessions/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const { id } = c.req.param();

  const connection = await getActiveCouple(user.id);
  if (!connection) {
    return c.json(
      { error: { message: "No active couple connection found", code: "NOT_COUPLED" } },
      404
    );
  }

  const session = await prisma.compareSession.findFirst({
    where: { id, coupleId: connection.id },
    include: {
      options: {
        orderBy: { position: "asc" },
        include: {
          outfit: {
            include: {
              items: {
                include: { clothingItem: true },
              },
            },
          },
        },
      },
      votes: true,
    },
  });

  if (!session) {
    return c.json({ error: { message: "Session not found", code: "NOT_FOUND" } }, 404);
  }

  // Resolve partner name
  const partnerId =
    connection.user1Id === user.id ? connection.user2Id : connection.user1Id;
  let partnerName: string | null = null;
  if (partnerId) {
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { name: true },
    });
    partnerName = partner?.name ?? null;
  }

  return c.json({
    data: {
      ...serializeDates(session),
      partnerName,
    },
  });
});

// ─── POST /sessions/:id/vote — cast / update vote ─────────────────────────────

coupleRouter.post(
  "/sessions/:id/vote",
  zValidator("json", VoteSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { id } = c.req.param();
    const { outfitId, reaction, comment } = c.req.valid("json");

    const connection = await getActiveCouple(user.id);
    if (!connection) {
      return c.json(
        { error: { message: "No active couple connection found", code: "NOT_COUPLED" } },
        404
      );
    }

    const session = await prisma.compareSession.findFirst({
      where: { id, coupleId: connection.id },
      include: { options: true },
    });

    if (!session) {
      return c.json({ error: { message: "Session not found", code: "NOT_FOUND" } }, 404);
    }

    if (session.status === "closed") {
      return c.json(
        { error: { message: "Session is already closed", code: "SESSION_CLOSED" } },
        400
      );
    }

    // Ensure outfitId is one of the options
    const validOption = session.options.find((o) => o.outfitId === outfitId);
    if (!validOption) {
      return c.json(
        { error: { message: "Outfit is not an option in this session", code: "INVALID_OUTFIT" } },
        400
      );
    }

    // Upsert vote
    const vote = await prisma.compareVote.upsert({
      where: {
        sessionId_votedByUserId: {
          sessionId: id,
          votedByUserId: user.id,
        },
      },
      create: {
        sessionId: id,
        votedByUserId: user.id,
        outfitId,
        reaction: reaction ?? null,
        comment: comment ?? null,
      },
      update: {
        outfitId,
        reaction: reaction ?? null,
        comment: comment ?? null,
      },
    });

    // Check if both partners have voted — auto-set status to "voted"
    if (connection.user2Id) {
      const votes = await prisma.compareVote.findMany({ where: { sessionId: id } });
      const voterIds = new Set(votes.map((v) => v.votedByUserId));
      if (voterIds.has(connection.user1Id) && voterIds.has(connection.user2Id)) {
        await prisma.compareSession.update({
          where: { id },
          data: { status: "voted" },
        });
      }
    }

    return c.json({ data: serializeDates(vote) });
  }
);

// ─── POST /sessions/:id/close — close session & declare winner ────────────────

coupleRouter.post(
  "/sessions/:id/close",
  zValidator("json", CloseSessionSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { id } = c.req.param();
    const { winnerOutfitId, autoSaveToFavorites, autoPlaneToCalendar } = c.req.valid("json");

    const connection = await getActiveCouple(user.id);
    if (!connection) {
      return c.json(
        { error: { message: "No active couple connection found", code: "NOT_COUPLED" } },
        404
      );
    }

    const session = await prisma.compareSession.findFirst({
      where: { id, coupleId: connection.id },
      include: { options: true },
    });

    if (!session) {
      return c.json({ error: { message: "Session not found", code: "NOT_FOUND" } }, 404);
    }

    if (session.status === "closed") {
      return c.json(
        { error: { message: "Session is already closed", code: "SESSION_CLOSED" } },
        400
      );
    }

    // Ensure winner is a valid option
    const validOption = session.options.find((o) => o.outfitId === winnerOutfitId);
    if (!validOption) {
      return c.json(
        {
          error: {
            message: "Winner outfit is not an option in this session",
            code: "INVALID_OUTFIT",
          },
        },
        400
      );
    }

    // Auto-save winner to favorites
    if (autoSaveToFavorites) {
      await prisma.outfit.update({
        where: { id: winnerOutfitId },
        data: { isFavorite: true },
      });
    }

    // Auto-plan to calendar if requested and calendarDate exists
    if (autoPlaneToCalendar && session.calendarDate) {
      // Determine which user owns the winning outfit
      const winnerOutfit = await prisma.outfit.findUnique({
        where: { id: winnerOutfitId },
        select: { userId: true },
      });

      if (winnerOutfit) {
        await prisma.calendarEntry.upsert({
          where: {
            userId_date: {
              userId: winnerOutfit.userId,
              date: session.calendarDate,
            },
          },
          create: {
            userId: winnerOutfit.userId,
            date: session.calendarDate,
            outfitId: winnerOutfitId,
          },
          update: {
            outfitId: winnerOutfitId,
          },
        });
      }
    }

    const closed = await prisma.compareSession.update({
      where: { id },
      data: {
        status: "closed",
        winnerOutfitId,
      },
      include: {
        options: {
          orderBy: { position: "asc" },
          include: {
            outfit: {
              include: {
                items: {
                  include: { clothingItem: true },
                },
              },
            },
          },
        },
        votes: true,
      },
    });

    return c.json({ data: serializeDates(closed) });
  }
);

export { coupleRouter };
