import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../lib/prisma";
import {
  CreateCalendarEntrySchema,
  UpdateCalendarEntrySchema,
  CalendarRangeFilterSchema,
} from "../types";
import { auth } from "../auth";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const calendarRouter = new Hono<{ Variables: Variables }>();

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

function serializeEntry(entry: any) {
  return {
    ...entry,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    outfit: entry.outfit ? serializeOutfit(entry.outfit) : null,
    primaryItem: entry.primaryItem ? serializeItem(entry.primaryItem) : null,
  };
}

const entryInclude = {
  outfit: {
    include: {
      items: {
        include: {
          clothingItem: true,
        },
      },
    },
  },
  primaryItem: true,
};

// GET /api/calendar - get entries by date range
calendarRouter.get(
  "/",
  zValidator("query", CalendarRangeFilterSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { startDate, endDate } = c.req.valid("query");

    const entries = await prisma.calendarEntry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: entryInclude,
      orderBy: { date: "asc" },
    });

    return c.json({ data: entries.map(serializeEntry) });
  }
);

// GET /api/calendar/:date - get entry for a specific date (YYYY-MM-DD)
calendarRouter.get("/:date", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const date = c.req.param("date");
  const entry = await prisma.calendarEntry.findUnique({
    where: { userId_date: { userId: user.id, date } },
    include: entryInclude,
  });
  if (!entry) {
    return c.json({ error: { message: "No entry for this date", code: "NOT_FOUND" } }, 404);
  }
  return c.json({ data: serializeEntry(entry) });
});

// POST /api/calendar - create or replace calendar entry for a date
calendarRouter.post(
  "/",
  zValidator("json", CreateCalendarEntrySchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const body = c.req.valid("json");

    // Validate outfit exists and belongs to user if provided
    if (body.outfitId) {
      const outfit = await prisma.outfit.findUnique({
        where: { id: body.outfitId, userId: user.id },
      });
      if (!outfit) {
        return c.json(
          { error: { message: "Outfit not found", code: "NOT_FOUND" } },
          400
        );
      }
    }

    // Validate primaryItem exists and belongs to user if provided
    if (body.primaryItemId) {
      const item = await prisma.clothingItem.findUnique({
        where: { id: body.primaryItemId, userId: user.id },
      });
      if (!item) {
        return c.json(
          { error: { message: "Clothing item not found", code: "NOT_FOUND" } },
          400
        );
      }
    }

    // Upsert: create or replace the entry for this date
    const entry = await prisma.calendarEntry.upsert({
      where: { userId_date: { userId: user.id, date: body.date } },
      update: {
        outfitId: body.outfitId ?? null,
        primaryItemId: body.primaryItemId ?? null,
        notes: body.notes ?? null,
        weather: body.weather ?? null,
      },
      create: {
        userId: user.id,
        date: body.date,
        outfitId: body.outfitId ?? null,
        primaryItemId: body.primaryItemId ?? null,
        notes: body.notes ?? null,
        weather: body.weather ?? null,
      },
      include: entryInclude,
    });

    return c.json({ data: serializeEntry(entry) }, 201);
  }
);

// PUT /api/calendar/:date - update calendar entry for a date
calendarRouter.put(
  "/:date",
  zValidator("json", UpdateCalendarEntrySchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const date = c.req.param("date");
    const body = c.req.valid("json");

    const existing = await prisma.calendarEntry.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });
    if (!existing) {
      return c.json(
        { error: { message: "No entry for this date", code: "NOT_FOUND" } },
        404
      );
    }

    const updateData: any = {};
    if (body.outfitId !== undefined) updateData.outfitId = body.outfitId;
    if (body.primaryItemId !== undefined) updateData.primaryItemId = body.primaryItemId;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.weather !== undefined) updateData.weather = body.weather;

    const entry = await prisma.calendarEntry.update({
      where: { userId_date: { userId: user.id, date } },
      data: updateData,
      include: entryInclude,
    });

    return c.json({ data: serializeEntry(entry) });
  }
);

// DELETE /api/calendar/:date - delete calendar entry for a date
calendarRouter.delete("/:date", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const date = c.req.param("date");
  const existing = await prisma.calendarEntry.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  if (!existing) {
    return c.json(
      { error: { message: "No entry for this date", code: "NOT_FOUND" } },
      404
    );
  }
  await prisma.calendarEntry.delete({
    where: { userId_date: { userId: user.id, date } },
  });
  return c.json({ data: { success: true } });
});

export { calendarRouter };
