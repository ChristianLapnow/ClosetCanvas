import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ClothingCategorySchema = z.enum([
  "tops",
  "pants",
  "shorts",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
  "bags",
]);

export const SeasonSchema = z.enum(["spring", "summer", "fall", "winter", "all"]);

export const OccasionSchema = z.enum([
  "casual",
  "formal",
  "work",
  "sport",
  "party",
  "all",
]);

export const MoodSchema = z.enum([
  "happy",
  "professional",
  "cozy",
  "energetic",
  "romantic",
]);

export const PrioritySchema = z.enum(["low", "medium", "high"]);

export const WeatherSchema = z.enum(["sunny", "cloudy", "rainy", "snowy", "hot", "cold"]);

// ─── ClothingItem ─────────────────────────────────────────────────────────────

export const ClothingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: ClothingCategorySchema,
  color: z.string(),
  season: SeasonSchema,
  occasion: OccasionSchema,
  brand: z.string().nullable(),
  imageUrl: z.string().nullable(),
  notes: z.string().nullable(),
  isFavorite: z.boolean(),
  timesWorn: z.number().int(),
  lastWorn: z.string().nullable(), // ISO datetime
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateClothingItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: ClothingCategorySchema,
  color: z.string().min(1, "Color is required"),
  season: SeasonSchema,
  occasion: OccasionSchema,
  brand: z.string().optional(),
  imageUrl: z.string().url().optional(),
  notes: z.string().optional(),
  isFavorite: z.boolean().optional().default(false),
});

export const UpdateClothingItemSchema = CreateClothingItemSchema.partial().extend({
  timesWorn: z.number().int().min(0).optional(),
  lastWorn: z.string().datetime().optional(),
});

export const ClothingItemFilterSchema = z.object({
  category: ClothingCategorySchema.optional(),
  season: SeasonSchema.optional(),
  occasion: OccasionSchema.optional(),
  color: z.string().optional(),
  isFavorite: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  search: z.string().optional(),
});

export type ClothingItem = z.infer<typeof ClothingItemSchema>;
export type CreateClothingItemInput = z.infer<typeof CreateClothingItemSchema>;
export type UpdateClothingItemInput = z.infer<typeof UpdateClothingItemSchema>;
export type ClothingItemFilter = z.infer<typeof ClothingItemFilterSchema>;
export type ClothingCategory = z.infer<typeof ClothingCategorySchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Occasion = z.infer<typeof OccasionSchema>;

// ─── Outfit ───────────────────────────────────────────────────────────────────

export const OutfitSchema = z.object({
  id: z.string(),
  name: z.string(),
  occasion: z.string().nullable(),
  mood: z.string().nullable(),
  rating: z.number().int().nullable(),
  notes: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isFavorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      clothingItemId: z.string(),
      clothingItem: ClothingItemSchema,
    })
  ),
});

export const CreateOutfitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  occasion: OccasionSchema.optional(),
  mood: MoodSchema.optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isFavorite: z.boolean().optional().default(false),
  itemIds: z.array(z.string()).min(1, "At least one item is required"),
});

export const UpdateOutfitSchema = z.object({
  name: z.string().min(1).optional(),
  occasion: OccasionSchema.optional(),
  mood: MoodSchema.optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isFavorite: z.boolean().optional(),
  itemIds: z.array(z.string()).optional(),
});

export const OutfitFilterSchema = z.object({
  occasion: OccasionSchema.optional(),
  mood: MoodSchema.optional(),
  isFavorite: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  search: z.string().optional(),
});

export type Outfit = z.infer<typeof OutfitSchema>;
export type CreateOutfitInput = z.infer<typeof CreateOutfitSchema>;
export type UpdateOutfitInput = z.infer<typeof UpdateOutfitSchema>;
export type OutfitFilter = z.infer<typeof OutfitFilterSchema>;
export type Mood = z.infer<typeof MoodSchema>;

// ─── CalendarEntry ────────────────────────────────────────────────────────────

export const CalendarEntrySchema = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD
  outfitId: z.string().nullable(),
  primaryItemId: z.string().nullable(),
  notes: z.string().nullable(),
  weather: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  outfit: OutfitSchema.nullable(),
  primaryItem: ClothingItemSchema.nullable(),
});

export const CreateCalendarEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  outfitId: z.string().optional(),
  primaryItemId: z.string().optional(),
  notes: z.string().optional(),
  weather: WeatherSchema.optional(),
});

export const UpdateCalendarEntrySchema = z.object({
  outfitId: z.string().nullable().optional(),
  primaryItemId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  weather: WeatherSchema.nullable().optional(),
});

export const CalendarRangeFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;
export type CreateCalendarEntryInput = z.infer<typeof CreateCalendarEntrySchema>;
export type UpdateCalendarEntryInput = z.infer<typeof UpdateCalendarEntrySchema>;
export type Weather = z.infer<typeof WeatherSchema>;

// ─── ShoppingItem ─────────────────────────────────────────────────────────────

export const ShoppingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: ClothingCategorySchema,
  color: z.string().nullable(),
  brand: z.string().nullable(),
  price: z.number().nullable(),
  url: z.string().nullable(),
  notes: z.string().nullable(),
  priority: PrioritySchema,
  isPurchased: z.boolean(),
  purchasedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateShoppingItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: ClothingCategorySchema,
  color: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().positive().optional(),
  url: z.string().url().optional(),
  notes: z.string().optional(),
  priority: PrioritySchema.optional().default("medium"),
});

export const UpdateShoppingItemSchema = CreateShoppingItemSchema.partial().extend({
  isPurchased: z.boolean().optional(),
  purchasedAt: z.string().datetime().nullable().optional(),
});

export const ShoppingFilterSchema = z.object({
  category: ClothingCategorySchema.optional(),
  priority: PrioritySchema.optional(),
  isPurchased: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
});

export type ShoppingItem = z.infer<typeof ShoppingItemSchema>;
export type CreateShoppingItemInput = z.infer<typeof CreateShoppingItemSchema>;
export type UpdateShoppingItemInput = z.infer<typeof UpdateShoppingItemSchema>;
export type ShoppingFilter = z.infer<typeof ShoppingFilterSchema>;
export type Priority = z.infer<typeof PrioritySchema>;

// ─── Stats ────────────────────────────────────────────────────────────────────

export const WardrobeStatsSchema = z.object({
  totalItems: z.number(),
  totalOutfits: z.number(),
  totalCalendarEntries: z.number(),
  totalShoppingItems: z.number(),
  itemsByCategory: z.record(z.string(), z.number()),
  itemsBySeason: z.record(z.string(), z.number()),
  itemsByOccasion: z.record(z.string(), z.number()),
  favoriteItems: z.number(),
  favoriteOutfits: z.number(),
  mostWornItems: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      timesWorn: z.number(),
      category: z.string(),
    })
  ),
  recentlyWorn: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      lastWorn: z.string().nullable(),
      category: z.string(),
    })
  ),
  pendingShoppingItems: z.number(),
  purchasedShoppingItems: z.number(),
});

export type WardrobeStats = z.infer<typeof WardrobeStatsSchema>;

// ─── Suggest Outfit ───────────────────────────────────────────────────────────

export const SuggestOutfitQuerySchema = z.object({
  occasion: OccasionSchema.optional(),
  season: SeasonSchema.optional(),
  weather: WeatherSchema.optional(),
});

export const OutfitSuggestionSchema = z.object({
  items: z.array(ClothingItemSchema),
  reason: z.string(),
  occasion: z.string().nullable(),
  season: z.string().nullable(),
});

export type SuggestOutfitQuery = z.infer<typeof SuggestOutfitQuerySchema>;
export type OutfitSuggestion = z.infer<typeof OutfitSuggestionSchema>;

// ─── Profile ──────────────────────────────────────────────────────────────────

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
});

export const UpdatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;

// ─── Couple Mode ──────────────────────────────────────────────────────────────

export const CreateInviteSchema = z.object({});

export const JoinCoupleSchema = z.object({
  inviteCode: z.string().min(6).max(8).toUpperCase(),
});

export const CreateCompareSessionSchema = z.object({
  outfitIds: z.array(z.string()).min(2).max(3),
  calendarDate: z.string().optional(), // ISO date
});

export const VoteSchema = z.object({
  outfitId: z.string(),
  reaction: z.string().optional(),
  comment: z.string().max(200).optional(),
});

export const CloseSessionSchema = z.object({
  winnerOutfitId: z.string(),
  autoSaveToFavorites: z.boolean().optional().default(true),
  autoPlaneToCalendar: z.boolean().optional().default(false),
});

export const CompareOptionSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  addedByUserId: z.string(),
  outfit: z.object({
    id: z.string(),
    name: z.string(),
    occasion: z.string().nullable(),
    mood: z.string().nullable(),
    imageUrl: z.string().nullable(),
    items: z.array(ClothingItemSchema),
  }),
});

export const CompareVoteSchema = z.object({
  id: z.string(),
  votedByUserId: z.string(),
  outfitId: z.string(),
  reaction: z.string().nullable(),
  comment: z.string().nullable(),
  createdAt: z.string(),
});

export const CompareSessionSchema = z.object({
  id: z.string(),
  coupleId: z.string(),
  createdByUserId: z.string(),
  calendarDate: z.string().nullable(),
  status: z.string(),
  winnerOutfitId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  options: z.array(CompareOptionSchema).optional(),
  votes: z.array(CompareVoteSchema).optional(),
});

export const CoupleConnectionSchema = z.object({
  id: z.string(),
  inviteCode: z.string(),
  user1Id: z.string(),
  user2Id: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  partnerName: z.string().nullable().optional(),
  partnerEmail: z.string().nullable().optional(),
});

export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type JoinCoupleInput = z.infer<typeof JoinCoupleSchema>;
export type CreateCompareSessionInput = z.infer<typeof CreateCompareSessionSchema>;
export type VoteInput = z.infer<typeof VoteSchema>;
export type CloseSessionInput = z.infer<typeof CloseSessionSchema>;
export type CompareOption = z.infer<typeof CompareOptionSchema>;
export type CompareVote = z.infer<typeof CompareVoteSchema>;
export type CompareSession = z.infer<typeof CompareSessionSchema>;
export type CoupleConnection = z.infer<typeof CoupleConnectionSchema>;
