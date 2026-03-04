import { Hono } from "hono";
import { env } from "../env";
import { auth } from "../auth";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const inspireRouter = new Hono<{ Variables: Variables }>();

// GET /api/inspire?q=<query>&mood=<mood>
// Fetches fashion inspiration images via Google Custom Search API
inspireRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const q = c.req.query("q") || "outfit fashion style";
  const mood = c.req.query("mood") || "";

  const query = mood
    ? `${mood} fashion outfit style aesthetic`
    : `${q} fashion outfit inspo`;

  const GOOGLE_CSE_ID =
    env.GOOGLE_CSE_ID || "017576662512468239146:omuauf_lfve";

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", env.GOOGLE_API_KEY || "");
    url.searchParams.set("cx", GOOGLE_CSE_ID);
    url.searchParams.set("q", query);
    url.searchParams.set("searchType", "image");
    url.searchParams.set("num", "10");
    url.searchParams.set("imgType", "photo");
    url.searchParams.set("imgSize", "medium");
    url.searchParams.set("safe", "active");

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Google API error: ${res.status}`);
    }
    const data = (await res.json()) as any;

    const pins = (data.items || []).map((item: any) => ({
      id: item.cacheId || item.link,
      imageUrl: item.link,
      title: item.title,
      sourceUrl: item.image?.contextLink || item.link,
      thumbnail: item.image?.thumbnailLink || item.link,
      width: item.image?.width || 400,
      height: item.image?.height || 600,
    }));

    return c.json({ data: pins });
  } catch (err) {
    console.error("[inspire] Google API failed:", err);
    return c.json({ data: [] });
  }
});

export { inspireRouter };
