import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../lib/prisma";
import {
  CreateShoppingItemSchema,
  UpdateShoppingItemSchema,
  ShoppingFilterSchema,
} from "../types";
import { auth } from "../auth";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const shoppingRouter = new Hono<{ Variables: Variables }>();

function serializeShoppingItem(item: any) {
  return {
    ...item,
    purchasedAt: item.purchasedAt ? item.purchasedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// GET /api/shopping - list shopping items
shoppingRouter.get(
  "/",
  zValidator("query", ShoppingFilterSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { category, priority, isPurchased } = c.req.valid("query");

    const where: any = { userId: user.id };
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (isPurchased !== undefined) where.isPurchased = isPurchased;

    const items = await prisma.shoppingItem.findMany({
      where,
      orderBy: [{ isPurchased: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });

    return c.json({ data: items.map(serializeShoppingItem) });
  }
);

// GET /api/shopping/:id - get single shopping item
shoppingRouter.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const item = await prisma.shoppingItem.findUnique({
    where: { id, userId: user.id },
  });
  if (!item) {
    return c.json(
      { error: { message: "Shopping item not found", code: "NOT_FOUND" } },
      404
    );
  }
  return c.json({ data: serializeShoppingItem(item) });
});

// POST /api/shopping - create shopping item
shoppingRouter.post(
  "/",
  zValidator("json", CreateShoppingItemSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const body = c.req.valid("json");
    const item = await prisma.shoppingItem.create({
      data: {
        userId: user.id,
        name: body.name,
        category: body.category,
        color: body.color ?? null,
        brand: body.brand ?? null,
        price: body.price ?? null,
        url: body.url ?? null,
        notes: body.notes ?? null,
        priority: body.priority ?? "medium",
      },
    });
    return c.json({ data: serializeShoppingItem(item) }, 201);
  }
);

// PUT /api/shopping/:id - update shopping item
shoppingRouter.put(
  "/:id",
  zValidator("json", UpdateShoppingItemSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const body = c.req.valid("json");

    const existing = await prisma.shoppingItem.findUnique({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return c.json(
        { error: { message: "Shopping item not found", code: "NOT_FOUND" } },
        404
      );
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.isPurchased !== undefined) {
      updateData.isPurchased = body.isPurchased;
      // Auto-set purchasedAt when marking as purchased
      if (body.isPurchased && !existing.isPurchased) {
        updateData.purchasedAt = new Date();
      } else if (!body.isPurchased) {
        updateData.purchasedAt = null;
      }
    }
    if (body.purchasedAt !== undefined) {
      updateData.purchasedAt = body.purchasedAt ? new Date(body.purchasedAt) : null;
    }

    const item = await prisma.shoppingItem.update({
      where: { id },
      data: updateData,
    });

    return c.json({ data: serializeShoppingItem(item) });
  }
);

// DELETE /api/shopping/:id - delete shopping item
shoppingRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await prisma.shoppingItem.findUnique({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return c.json(
      { error: { message: "Shopping item not found", code: "NOT_FOUND" } },
      404
    );
  }
  await prisma.shoppingItem.delete({ where: { id } });
  return c.json({ data: { success: true } });
});

export { shoppingRouter };
