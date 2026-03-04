import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { sampleRouter } from "./routes/sample";
import { wardrobeRouter } from "./routes/wardrobe";
import { outfitsRouter } from "./routes/outfits";
import { calendarRouter } from "./routes/calendar";
import { shoppingRouter } from "./routes/shopping";
import { statsRouter } from "./routes/stats";
import { profileRouter } from "./routes/profile";
import { coupleRouter } from "./routes/couple";
import { inspireRouter } from "./routes/inspire";
import { logger } from "hono/logger";
import { createVibecodeSDK, StorageError } from "@vibecodeapp/backend-sdk";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

const vibecode = createVibecodeSDK();

// CORS middleware
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

app.use("*", logger());

// Auth middleware - populates user/session for all routes
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// Mount auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// OTP endpoint — reads from DB so it survives server restarts and works in production
app.get("/api/dev/otp", async (c) => {
  const email = c.req.query("email")?.toLowerCase();
  if (!email) return c.json({ data: null });
  // Better Auth stores OTPs with identifier = "email-verification-otp-<email>"
  // value is stored as "<otp>:0" — strip the suffix
  const record = await prisma.verification.findFirst({
    where: { identifier: `email-verification-otp-${email}` },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return c.json({ data: null });
  const otp = record.value.split(":")[0];
  return c.json({ data: { otp } });
});

// Current user
app.get("/api/me", (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ data: user });
});

// Wipe all unverified accounts (admin cleanup)
app.delete("/api/admin/unverified-users", async (c) => {
  const result = await prisma.user.deleteMany({ where: { emailVerified: false } });
  console.log(`[ADMIN] Deleted ${result.count} unverified users`);
  return c.json({ data: { deleted: result.count } });
});

// Delete account
app.delete("/api/account", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  await auth.api.signOut({ headers: c.req.raw.headers });

  return c.json({ data: { success: true } });
});

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/wardrobe", wardrobeRouter);
app.route("/api/outfits", outfitsRouter);
app.route("/api/calendar", calendarRouter);
app.route("/api/shopping", shoppingRouter);
app.route("/api/stats", statsRouter);
app.route("/api/profile", profileRouter);
app.route("/api/couple", coupleRouter);
app.route("/api/inspire", inspireRouter);

// Weather route
app.get("/api/weather", async (c) => {
  const { lat, lon, city, units } = c.req.query();
  let url: string;
  if (city) {
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${process.env.OPENWEATHER_API_KEY}&units=${units || "metric"}`;
  } else {
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=${units || "metric"}`;
  }
  const response = await fetch(url);
  const data = await response.json();
  return c.json({ data });
});

// AI Virtual Try-On route
app.post("/api/ai-tryon", async (c) => {
  const body = await c.req.json();
  let prompt: string;
  let parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;

  if (body.photoBase64) {
    prompt = `You are a virtual fashion stylist. The user is wearing the following outfit: ${body.outfitDescription}. Show them wearing this outfit realistically. Keep their face, body shape, and pose the same. Only change the clothing.`;
    parts = [
      { text: prompt },
      { inlineData: { mimeType: body.mimeType || "image/jpeg", data: body.photoBase64 } },
    ];
  } else {
    prompt = `Create a fashion illustration of a person wearing this outfit: ${body.outfitDescription}. Style: modern fashion photography, clean background, full body shot.`;
    parts = [{ text: prompt }];
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GOOGLE_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["Image"],
          imageConfig: { aspectRatio: "9:16" },
        },
      }),
    }
  );

  const data = await response.json();
  return c.json({ data });
});

// File upload
app.post("/api/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }
  try {
    const result = await vibecode.storage.upload(file);
    return c.json({ data: result });
  } catch (error) {
    if (error instanceof StorageError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 500);
    }
    return c.json({ error: "Upload failed" }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
