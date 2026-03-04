import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../lib/prisma";
import {
  CreateOutfitSchema,
  UpdateOutfitSchema,
  OutfitFilterSchema,
} from "../types";
import { auth } from "../auth";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const outfitsRouter = new Hono<{ Variables: Variables }>();

function serializeItem(item: any) {
  return {
    ...item,
    lastWorn: item.lastWorn ? item.lastWorn.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeOutfit(outfit: any) {
  return {
    ...outfit,
    createdAt: outfit.createdAt.toISOString(),
    updatedAt: outfit.updatedAt.toISOString(),
    items: outfit.items.map((oi: any) => ({
      ...oi,
      clothingItem: serializeItem(oi.clothingItem),
    })),
  };
}

const outfitInclude = {
  items: {
    include: {
      clothingItem: true,
    },
  },
};

// GET /api/outfits - list all outfits
outfitsRouter.get(
  "/",
  zValidator("query", OutfitFilterSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { occasion, mood, isFavorite, search } = c.req.valid("query");

    const where: any = { userId: user.id };
    if (occasion) where.occasion = occasion;
    if (mood) where.mood = mood;
    if (isFavorite !== undefined) where.isFavorite = isFavorite;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const outfits = await prisma.outfit.findMany({
      where,
      include: outfitInclude,
      orderBy: { createdAt: "desc" },
    });

    return c.json({ data: outfits.map(serializeOutfit) });
  }
);

// GET /api/outfits/suggest - suggest a random outfit
outfitsRouter.get("/suggest", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const occasion = c.req.query("occasion");
  const season = c.req.query("season");

  // Build a filter for clothing items that match criteria, scoped to user
  const itemWhere: any = { userId: user.id };
  if (season) itemWhere.season = { in: [season, "all"] };
  if (occasion) itemWhere.occasion = { in: [occasion, "all"] };

  // Get available items by category
  const [tops, bottoms, shoes] = await Promise.all([
    prisma.clothingItem.findMany({
      where: { ...itemWhere, category: "tops" },
    }),
    prisma.clothingItem.findMany({
      where: { ...itemWhere, category: { in: ["pants", "shorts"] } },
    }),
    prisma.clothingItem.findMany({
      where: { ...itemWhere, category: "shoes" },
    }),
  ]);

  const suggestedItems: any[] = [];
  const pick = <T>(arr: T[]): T | null => {
    if (arr.length === 0) return null;
    const idx = Math.floor(Math.random() * arr.length);
    return arr[idx] ?? null;
  };

  const top = pick(tops);
  const bottom = pick(bottoms);
  const shoe = pick(shoes);

  if (top) suggestedItems.push(serializeItem(top));
  if (bottom) suggestedItems.push(serializeItem(bottom));
  if (shoe) suggestedItems.push(serializeItem(shoe));

  // Also try dresses if no top+bottom combo
  if (!top && !bottom) {
    const dresses = await prisma.clothingItem.findMany({
      where: { ...itemWhere, category: "dresses" },
    });
    const dress = pick(dresses);
    if (dress) suggestedItems.push(serializeItem(dress));
  }

  const reasons = [
    "A great combination for the occasion",
    "These pieces complement each other beautifully",
    "A classic and versatile outfit choice",
    "Perfect mix of comfort and style",
    "A well-balanced outfit from your wardrobe",
  ];

  return c.json({
    data: {
      items: suggestedItems,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      occasion: occasion ?? null,
      season: season ?? null,
    },
  });
});

// GET /api/outfits/:id - get single outfit
outfitsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const outfit = await prisma.outfit.findUnique({
    where: { id, userId: user.id },
    include: outfitInclude,
  });
  if (!outfit) {
    return c.json({ error: { message: "Outfit not found", code: "NOT_FOUND" } }, 404);
  }
  return c.json({ data: serializeOutfit(outfit) });
});

// POST /api/outfits - create outfit
outfitsRouter.post(
  "/",
  zValidator("json", CreateOutfitSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const body = c.req.valid("json");

    // Verify all itemIds exist and belong to this user
    const items = await prisma.clothingItem.findMany({
      where: { id: { in: body.itemIds }, userId: user.id },
    });
    if (items.length !== body.itemIds.length) {
      return c.json(
        {
          error: {
            message: "One or more clothing items not found",
            code: "ITEMS_NOT_FOUND",
          },
        },
        400
      );
    }

    const outfit = await prisma.outfit.create({
      data: {
        userId: user.id,
        name: body.name,
        occasion: body.occasion ?? null,
        mood: body.mood ?? null,
        rating: body.rating ?? null,
        notes: body.notes ?? null,
        imageUrl: body.imageUrl ?? null,
        isFavorite: body.isFavorite ?? false,
        items: {
          create: body.itemIds.map((clothingItemId) => ({ clothingItemId })),
        },
      },
      include: outfitInclude,
    });

    return c.json({ data: serializeOutfit(outfit) }, 201);
  }
);

// PUT /api/outfits/:id - update outfit
outfitsRouter.put(
  "/:id",
  zValidator("json", UpdateOutfitSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const body = c.req.valid("json");

    const existing = await prisma.outfit.findUnique({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return c.json({ error: { message: "Outfit not found", code: "NOT_FOUND" } }, 404);
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.occasion !== undefined) updateData.occasion = body.occasion;
    if (body.mood !== undefined) updateData.mood = body.mood;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite;

    // If itemIds provided, replace all outfit items (verify they belong to user)
    if (body.itemIds !== undefined) {
      const items = await prisma.clothingItem.findMany({
        where: { id: { in: body.itemIds }, userId: user.id },
      });
      if (items.length !== body.itemIds.length) {
        return c.json(
          {
            error: {
              message: "One or more clothing items not found",
              code: "ITEMS_NOT_FOUND",
            },
          },
          400
        );
      }
      // Delete existing items and recreate
      await prisma.outfitItem.deleteMany({ where: { outfitId: id } });
      updateData.items = {
        create: body.itemIds.map((clothingItemId) => ({ clothingItemId })),
      };
    }

    const outfit = await prisma.outfit.update({
      where: { id },
      data: updateData,
      include: outfitInclude,
    });

    return c.json({ data: serializeOutfit(outfit) });
  }
);

// DELETE /api/outfits/:id - delete outfit
outfitsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await prisma.outfit.findUnique({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return c.json({ error: { message: "Outfit not found", code: "NOT_FOUND" } }, 404);
  }
  await prisma.outfit.delete({ where: { id } });
  return c.json({ data: { success: true } });
});

export { outfitsRouter };
