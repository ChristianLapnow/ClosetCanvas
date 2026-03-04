import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  CreateClothingItemSchema,
  UpdateClothingItemSchema,
  ClothingItemFilterSchema,
} from "../types";
import { auth } from "../auth";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const wardrobeRouter = new Hono<{ Variables: Variables }>();

// Serialize Prisma ClothingItem dates to strings for JSON response
function serializeItem(item: any) {
  return {
    ...item,
    lastWorn: item.lastWorn ? item.lastWorn.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// GET /api/wardrobe - list all clothing items with optional filters
wardrobeRouter.get(
  "/",
  zValidator("query", ClothingItemFilterSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { category, season, occasion, color, isFavorite, search } =
      c.req.valid("query");

    const where: any = { userId: user.id };
    if (category) where.category = category;
    if (season) where.season = season;
    if (occasion) where.occasion = occasion;
    if (color) where.color = { contains: color };
    if (isFavorite !== undefined) where.isFavorite = isFavorite;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const items = await prisma.clothingItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return c.json({ data: items.map(serializeItem) });
  }
);

// GET /api/wardrobe/:id - get single clothing item
wardrobeRouter.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const item = await prisma.clothingItem.findUnique({
    where: { id, userId: user.id },
  });
  if (!item) {
    return c.json({ error: { message: "Item not found", code: "NOT_FOUND" } }, 404);
  }
  return c.json({ data: serializeItem(item) });
});

// POST /api/wardrobe - create clothing item
wardrobeRouter.post(
  "/",
  zValidator("json", CreateClothingItemSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const body = c.req.valid("json");
    const item = await prisma.clothingItem.create({
      data: {
        userId: user.id,
        name: body.name,
        category: body.category,
        color: body.color,
        season: body.season,
        occasion: body.occasion,
        brand: body.brand ?? null,
        imageUrl: body.imageUrl ?? null,
        notes: body.notes ?? null,
        isFavorite: body.isFavorite ?? false,
      },
    });
    return c.json({ data: serializeItem(item) }, 201);
  }
);

// PUT /api/wardrobe/:id - update clothing item
wardrobeRouter.put(
  "/:id",
  zValidator("json", UpdateClothingItemSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const body = c.req.valid("json");

    const existing = await prisma.clothingItem.findUnique({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return c.json({ error: { message: "Item not found", code: "NOT_FOUND" } }, 404);
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.season !== undefined) updateData.season = body.season;
    if (body.occasion !== undefined) updateData.occasion = body.occasion;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite;
    if (body.timesWorn !== undefined) updateData.timesWorn = body.timesWorn;
    if (body.lastWorn !== undefined)
      updateData.lastWorn = body.lastWorn ? new Date(body.lastWorn) : null;

    const item = await prisma.clothingItem.update({
      where: { id },
      data: updateData,
    });

    return c.json({ data: serializeItem(item) });
  }
);

// DELETE /api/wardrobe/:id - delete clothing item
wardrobeRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await prisma.clothingItem.findUnique({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return c.json({ error: { message: "Item not found", code: "NOT_FOUND" } }, 404);
  }
  await prisma.clothingItem.delete({ where: { id } });
  return c.json({ data: { success: true } });
});

// POST /api/wardrobe/:id/wear - increment timesWorn and set lastWorn
wardrobeRouter.post("/:id/wear", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await prisma.clothingItem.findUnique({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return c.json({ error: { message: "Item not found", code: "NOT_FOUND" } }, 404);
  }
  const item = await prisma.clothingItem.update({
    where: { id },
    data: {
      timesWorn: { increment: 1 },
      lastWorn: new Date(),
    },
  });
  return c.json({ data: serializeItem(item) });
});

export { wardrobeRouter };
