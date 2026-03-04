import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { auth } from "../auth";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const statsRouter = new Hono<{ Variables: Variables }>();

// GET /api/stats - wardrobe statistics
statsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const userId = user.id;

  const [
    totalItems,
    totalOutfits,
    totalCalendarEntries,
    totalShoppingItems,
    favoriteItems,
    favoriteOutfits,
    pendingShoppingItems,
    purchasedShoppingItems,
    allItems,
    mostWornItems,
    recentlyWorn,
  ] = await Promise.all([
    prisma.clothingItem.count({ where: { userId } }),
    prisma.outfit.count({ where: { userId } }),
    prisma.calendarEntry.count({ where: { userId } }),
    prisma.shoppingItem.count({ where: { userId } }),
    prisma.clothingItem.count({ where: { userId, isFavorite: true } }),
    prisma.outfit.count({ where: { userId, isFavorite: true } }),
    prisma.shoppingItem.count({ where: { userId, isPurchased: false } }),
    prisma.shoppingItem.count({ where: { userId, isPurchased: true } }),
    prisma.clothingItem.findMany({
      where: { userId },
      select: { category: true, season: true, occasion: true },
    }),
    prisma.clothingItem.findMany({
      select: { id: true, name: true, timesWorn: true, category: true },
      orderBy: { timesWorn: "desc" },
      take: 5,
      where: { userId, timesWorn: { gt: 0 } },
    }),
    prisma.clothingItem.findMany({
      select: { id: true, name: true, lastWorn: true, category: true },
      orderBy: { lastWorn: "desc" },
      take: 5,
      where: { userId, lastWorn: { not: null } },
    }),
  ]);

  // Aggregate by category, season, occasion
  const itemsByCategory: Record<string, number> = {};
  const itemsBySeason: Record<string, number> = {};
  const itemsByOccasion: Record<string, number> = {};

  for (const item of allItems) {
    itemsByCategory[item.category] = (itemsByCategory[item.category] ?? 0) + 1;
    itemsBySeason[item.season] = (itemsBySeason[item.season] ?? 0) + 1;
    itemsByOccasion[item.occasion] = (itemsByOccasion[item.occasion] ?? 0) + 1;
  }

  const stats = {
    totalItems,
    totalOutfits,
    totalCalendarEntries,
    totalShoppingItems,
    itemsByCategory,
    itemsBySeason,
    itemsByOccasion,
    favoriteItems,
    favoriteOutfits,
    mostWornItems,
    recentlyWorn: recentlyWorn.map((item) => ({
      ...item,
      lastWorn: item.lastWorn ? item.lastWorn.toISOString() : null,
    })),
    pendingShoppingItems,
    purchasedShoppingItems,
  };

  return c.json({ data: stats });
});

export { statsRouter };
