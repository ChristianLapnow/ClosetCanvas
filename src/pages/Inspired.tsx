import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { ClothingItem } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Sparkles, Palette, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InspirationPin {
  id: string;
  imageUrl: string;
  title: string;
  sourceUrl: string;
  thumbnail: string;
  width: number;
  height: number;
}

// ─── Color Theory Engine ──────────────────────────────────────────────────────

const COLOR_HSL: Record<string, [number, number, number]> = {
  black: [0, 0, 5],
  white: [0, 0, 98],
  gray: [0, 0, 50],
  grey: [0, 0, 50],
  navy: [220, 60, 20],
  blue: [210, 80, 50],
  "light blue": [200, 70, 70],
  red: [0, 80, 50],
  burgundy: [345, 60, 30],
  pink: [340, 70, 75],
  "hot pink": [330, 90, 60],
  orange: [25, 90, 55],
  yellow: [50, 95, 60],
  green: [130, 60, 40],
  "olive green": [80, 40, 35],
  "forest green": [140, 50, 25],
  mint: [160, 50, 75],
  purple: [270, 60, 50],
  lavender: [270, 50, 80],
  beige: [35, 40, 85],
  cream: [40, 50, 92],
  brown: [25, 50, 35],
  tan: [35, 45, 65],
  camel: [35, 55, 60],
  gold: [45, 80, 55],
  silver: [210, 10, 75],
  khaki: [55, 35, 60],
  denim: [215, 50, 45],
};

function getHSL(colorName: string): [number, number, number] {
  const lower = colorName.toLowerCase().trim();
  if (COLOR_HSL[lower]) return COLOR_HSL[lower];
  for (const [key, val] of Object.entries(COLOR_HSL)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return [0, 0, 50];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

type HarmonyType =
  | "Monochromatic"
  | "Complementary"
  | "Analogous"
  | "Triadic"
  | "Neutral"
  | "Achromatic";

interface ColorHarmonyResult {
  type: HarmonyType;
  score: number;
  description: string;
  tip: string;
}

function analyzeColorHarmony(colors: string[]): ColorHarmonyResult {
  if (colors.length === 0)
    return {
      type: "Neutral",
      score: 0,
      description: "No colors to analyze",
      tip: "Add items to your outfit",
    };

  const hsls = colors.map(getHSL);
  const chromatic = hsls.filter(([, s]) => s > 15);

  if (chromatic.length === 0) {
    return {
      type: "Achromatic",
      score: 85,
      description: "All neutrals — timeless and versatile",
      tip: "Add one accent color for depth",
    };
  }

  const hues = chromatic.map(([h]) => h);
  const hueSpread = Math.max(...hues) - Math.min(...hues);

  if (hueSpread < 30 || hueSpread > 330) {
    return {
      type: "Monochromatic",
      score: 90,
      description: "Same hue family — cohesive and polished",
      tip: "Vary textures and shades for dimension",
    };
  }

  if (hueSpread < 60) {
    return {
      type: "Analogous",
      score: 88,
      description: "Adjacent colors — harmonious and natural",
      tip: "Great choice! Anchoring with a neutral makes it pop",
    };
  }

  if (chromatic.length === 2) {
    const hueDiff = Math.abs(hues[0] - hues[1]);
    const normalized = Math.min(hueDiff, 360 - hueDiff);
    if (normalized > 150 && normalized < 210) {
      return {
        type: "Complementary",
        score: 82,
        description: "Opposite colors — bold and high-contrast",
        tip: "Use 80/20 ratio: dominant + accent for balance",
      };
    }
  }

  if (chromatic.length >= 3) {
    const sorted = [...hues].sort((a, b) => a - b);
    const gaps = [
      sorted[1] - sorted[0],
      sorted[2] - sorted[1],
      360 - sorted[2] + sorted[0],
    ];
    const isTriadic = gaps.every((g) => g > 90 && g < 150);
    if (isTriadic) {
      return {
        type: "Triadic",
        score: 75,
        description: "Three-way balance — vibrant and energetic",
        tip: "Let one color dominate at 60%, the others at 20% each",
      };
    }
  }

  const score = Math.max(30, 70 - hues.length * 5);
  return {
    type: "Neutral",
    score,
    description:
      score > 50
        ? "Eclectic mix — expressive style"
        : "High contrast — consider simplifying",
    tip: "Try removing one color piece to sharpen the look",
  };
}

// ─── Preset Palettes ──────────────────────────────────────────────────────────

interface PresetPalette {
  name: string;
  colors: string[];
  mood: string;
}

const PRESET_PALETTES: PresetPalette[] = [
  {
    name: "Coastal",
    colors: ["#D6EAF8", "#85C1E9", "#F5F5DC", "#FDFEFE", "#2E86C1"],
    mood: "Relaxed and breezy",
  },
  {
    name: "Earth Tones",
    colors: ["#8B6914", "#C4A882", "#D4C5A9", "#6B4226", "#A0522D"],
    mood: "Grounded and warm",
  },
  {
    name: "Monochrome",
    colors: ["#0D0D0D", "#404040", "#808080", "#B0B0B0", "#F5F5F5"],
    mood: "Sleek and timeless",
  },
  {
    name: "French Girl",
    colors: ["#1C2951", "#E8D5C4", "#C0392B", "#F5EEE6", "#2C3E50"],
    mood: "Effortlessly chic",
  },
  {
    name: "Power Suit",
    colors: ["#1A1A2E", "#16213E", "#C9A96E", "#E8E8E8", "#2C2C54"],
    mood: "Bold and authoritative",
  },
  {
    name: "Y2K Brights",
    colors: ["#FF69B4", "#00BFFF", "#7FFF00", "#FF8C00", "#DA70D6"],
    mood: "Playful and electric",
  },
];

// ─── Mood pills ───────────────────────────────────────────────────────────────

const MOOD_PILLS = [
  "Minimal",
  "Street",
  "Boho",
  "Glam",
  "Casual",
  "Formal",
  "Y2K",
  "Dark Academia",
];

// ─── Fallback inspiration images ─────────────────────────────────────────────

const FALLBACK_IMAGES = [
  {
    id: "f1",
    imageUrl:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80",
    title: "Minimalist White",
    sourceUrl: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&q=60",
    width: 400,
    height: 600,
  },
  {
    id: "f2",
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
    title: "Street Style Edit",
    sourceUrl: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=60",
    width: 400,
    height: 500,
  },
  {
    id: "f3",
    imageUrl:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80",
    title: "Boho Layers",
    sourceUrl: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200&q=60",
    width: 400,
    height: 550,
  },
  {
    id: "f4",
    imageUrl:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
    title: "Glam Evening",
    sourceUrl: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&q=60",
    width: 400,
    height: 600,
  },
  {
    id: "f5",
    imageUrl:
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80",
    title: "Casual Chic",
    sourceUrl: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=200&q=60",
    width: 400,
    height: 480,
  },
  {
    id: "f6",
    imageUrl:
      "https://images.unsplash.com/photo-1542295669297-4d352b042bca?w=400&q=80",
    title: "Dark Academia",
    sourceUrl: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1542295669297-4d352b042bca?w=200&q=60",
    width: 400,
    height: 520,
  },
  {
    id: "f7",
    imageUrl:
      "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400&q=80",
    title: "Formal Power",
    sourceUrl: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=200&q=60",
    width: 400,
    height: 600,
  },
  {
    id: "f8",
    imageUrl:
      "https://images.unsplash.com/photo-1475180429745-6d521173e7e1?w=400&q=80",
    title: "Y2K Vibes",
    sourceUrl: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1475180429745-6d521173e7e1?w=200&q=60",
    width: 400,
    height: 500,
  },
];

// ─── Score Ring SVG ───────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "#C9A96E"
      : score >= 60
        ? "#8B9BE8"
        : score >= 40
          ? "#F0A050"
          : "#E07070";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#F0E8DC"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">
          / 100
        </span>
      </div>
    </div>
  );
}

// ─── Color Wheel ──────────────────────────────────────────────────────────────

function ColorWheel({ selectedColors }: { selectedColors: string[] }) {
  const hsls = selectedColors.map(getHSL);
  const chromatic = hsls.filter(([, s]) => s > 15);

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="w-40 h-40 rounded-full shadow-lg"
        style={{
          background:
            "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
        }}
      >
        {/* White center overlay for donut effect */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className="rounded-full bg-[#F5EEE6] shadow-inner"
            style={{ width: "60px", height: "60px" }}
          />
        </div>
      </div>
      {/* Color dots positioned on the wheel */}
      {chromatic.slice(0, 6).map(([h, s, l], i) => {
        const angle = (h - 90) * (Math.PI / 180);
        const r = 52;
        const x = 80 + r * Math.cos(angle);
        const y = 80 + r * Math.sin(angle);
        return (
          <div
            key={i}
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md"
            style={{
              backgroundColor: hslToHex(h, s, l),
              left: `${x - 10}px`,
              top: `${y - 10}px`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Inspiration Card ─────────────────────────────────────────────────────────

function InspirationCard({
  pin,
  onClick,
}: {
  pin: InspirationPin;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const bgColors = [
    "#E8D5C4",
    "#D4C5E2",
    "#C5D4E2",
    "#D4E2C5",
    "#E2D4C5",
    "#C5E2D4",
  ];
  const fallbackBg = bgColors[parseInt(pin.id.replace(/\D/g, "0")) % bgColors.length] ?? "#E8D5C4";

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer group relative shadow-sm hover:shadow-md transition-shadow"
      style={{ breakInside: "avoid", marginBottom: "12px" }}
      onClick={onClick}
    >
      <div className="relative overflow-hidden">
        {imgError ? (
          <div
            className="w-full flex items-center justify-center"
            style={{ backgroundColor: fallbackBg, minHeight: "160px" }}
          >
            <Sparkles size={32} className="text-white/60" />
          </div>
        ) : (
          <img
            src={pin.imageUrl}
            alt={pin.title}
            className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium leading-tight line-clamp-2">
          {pin.title}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ breakInside: "avoid", marginBottom: "12px" }}
    >
      <Skeleton style={{ height: `${height}px` }} className="w-full rounded-xl" />
    </div>
  );
}

// ─── Recreate Modal ───────────────────────────────────────────────────────────

function RecreateModal({
  pin,
  wardrobe,
  onClose,
}: {
  pin: InspirationPin;
  wardrobe: ClothingItem[];
  onClose: () => void;
}) {
  const topItems = wardrobe.filter((i) => i.category === "tops").slice(0, 1);
  const bottomItems = wardrobe.filter((i) => i.category === "pants" || i.category === "shorts").slice(0, 1);
  const shoeItems = wardrobe.filter((i) => i.category === "shoes").slice(0, 1);
  const matchedItems = [...topItems, ...bottomItems, ...shoeItems].slice(0, 3);

  // Fill with any items if not enough
  const remaining = wardrobe
    .filter((i) => !matchedItems.find((m) => m.id === i.id))
    .slice(0, 3 - matchedItems.length);
  const displayItems = [...matchedItems, ...remaining].slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col h-full max-w-lg mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-white/80 text-sm"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <p className="text-white font-semibold text-sm">Recreate This Look</p>
          <div className="w-16" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {/* Inspiration image */}
          <div className="rounded-2xl overflow-hidden mb-5 aspect-[3/4] w-full">
            <img
              src={pin.imageUrl}
              alt={pin.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Matched pieces */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <p className="text-white font-semibold mb-1 text-sm">
              From your wardrobe
            </p>
            <p className="text-white/60 text-xs mb-4">
              These pieces can recreate a similar vibe
            </p>

            {displayItems.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-white/50 text-sm">
                  Add items to your wardrobe to get matches
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {displayItems.map((item) => (
                  <div key={item.id} className="text-center">
                    <div
                      className="aspect-square rounded-xl overflow-hidden mb-2 border border-white/20"
                      style={{
                        backgroundColor: item.imageUrl ? undefined : item.color,
                        backgroundImage: item.imageUrl
                          ? `url(${item.imageUrl})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <p className="text-white text-[11px] font-medium leading-tight truncate">
                      {item.name}
                    </p>
                    <p className="text-white/50 text-[10px] capitalize">
                      {item.category}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wardrobe Item Swatch ─────────────────────────────────────────────────────

function WardrobeSwatch({
  item,
  selected,
  onToggle,
}: {
  item: ClothingItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const [hsl] = [getHSL(item.color)];
  const hex = hslToHex(...hsl);

  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border",
        selected
          ? "border-[#C9A96E] bg-[#FDF8F0] shadow-sm"
          : "border-transparent hover:border-[#E8DDD0]"
      )}
      title={item.name}
    >
      <div
        className="w-10 h-10 rounded-full border-2 shadow-sm transition-all"
        style={{
          backgroundColor: item.imageUrl ? undefined : hex,
          backgroundImage: item.imageUrl
            ? `url(${item.imageUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderColor: selected ? "#C9A96E" : "#E8DDD0",
        }}
      />
      <span
        className={cn(
          "text-[10px] font-medium leading-tight text-center line-clamp-1 max-w-[56px]",
          selected ? "text-[#C9A96E]" : "text-muted-foreground"
        )}
      >
        {item.name}
      </span>
    </button>
  );
}

// ─── Tab Types ────────────────────────────────────────────────────────────────

type TabId = "inspire" | "color";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Inspired() {
  const [activeTab, setActiveTab] = useState<TabId>("inspire");
  const [activeMood, setActiveMood] = useState<string>("Minimal");
  const [searchQuery, setSearchQuery] = useState<string>("Minimal");
  const [selectedPin, setSelectedPin] = useState<InspirationPin | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // Inspiration pins query
  const {
    data: pins,
    isLoading: pinsLoading,
  } = useQuery<InspirationPin[]>({
    queryKey: ["inspire", activeMood],
    queryFn: async () => {
      try {
        return await api.get<InspirationPin[]>(
          `/api/inspire?mood=${encodeURIComponent(activeMood)}`
        );
      } catch {
        // Return fallback on any error
        return FALLBACK_IMAGES;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Wardrobe query
  const { data: wardrobe = [] } = useQuery<ClothingItem[]>({
    queryKey: ["wardrobe"],
    queryFn: () => api.get<ClothingItem[]>("/api/wardrobe"),
  });

  const displayPins: InspirationPin[] = pins ?? FALLBACK_IMAGES;

  // Color theory
  const selectedItems = wardrobe.filter((item) => selectedItemIds.has(item.id));
  const selectedColors = selectedItems.map((i) => i.color);
  const harmonyResult = analyzeColorHarmony(selectedColors);

  // Suggested pairings: find wardrobe items not selected that would improve harmony
  const unselectedItems = wardrobe.filter((i) => !selectedItemIds.has(i.id));
  const suggestedPairings = (() => {
    if (selectedColors.length === 0) return unselectedItems.slice(0, 3);
    // Pick items whose color adds the best harmony
    return unselectedItems
      .map((item) => {
        const testColors = [...selectedColors, item.color];
        const testResult = analyzeColorHarmony(testColors);
        return { item, score: testResult.score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => r.item);
  })();

  function handleMoodPill(mood: string) {
    setActiveMood(mood);
    setSearchQuery(mood);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveMood(searchQuery);
  }

  function toggleItem(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 6) {
        next.add(id);
      }
      return next;
    });
  }

  const harmonyColors: Record<HarmonyType, string> = {
    Monochromatic: "#C9A96E",
    Complementary: "#E07070",
    Analogous: "#70B87A",
    Triadic: "#8B9BE8",
    Neutral: "#A0A0A0",
    Achromatic: "#606060",
  };

  useEffect(() => {
    // Preselect up to 4 wardrobe items when entering color tab
    if (activeTab === "color" && selectedItemIds.size === 0 && wardrobe.length > 0) {
      const initial = new Set(wardrobe.slice(0, 4).map((i) => i.id));
      setSelectedItemIds(initial);
    }
  }, [activeTab, wardrobe, selectedItemIds.size]);

  return (
    <Layout>
      <div className="min-h-screen" style={{ backgroundColor: "#F5EEE6" }}>
        {/* Header */}
        <div className="px-5 pt-8 pb-4">
          <p
            className="text-xs font-bold tracking-widest uppercase mb-1"
            style={{ color: "#C9A96E" }}
          >
            Discover
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Get Inspired
          </h1>
          <p className="text-sm text-muted-foreground">
            Style inspo and color harmony tools
          </p>
        </div>

        {/* Tab pills */}
        <div className="px-5 mb-5">
          <div
            className="flex gap-2 p-1 rounded-2xl w-fit"
            style={{ backgroundColor: "#EDE5DC" }}
          >
            {(
              [
                { id: "inspire" as const, label: "Inspire Me", icon: Sparkles },
                { id: "color" as const, label: "Color Theory", icon: Palette },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  activeTab === id
                    ? "bg-[#C9A96E] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Tab: Inspire Me ─── */}
        {activeTab === "inspire" && (
          <div className="px-5 pb-24">
            {/* Search bar */}
            <form onSubmit={handleSearchSubmit} className="mb-4 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search styles, vibes..."
                className="w-full pl-9 pr-9 py-3 rounded-2xl border border-[#E8DDD0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/40 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <X size={15} />
                </button>
              )}
            </form>

            {/* Mood pills */}
            <div
              className="flex gap-2 overflow-x-auto pb-3 mb-5"
              style={{ scrollbarWidth: "none" }}
            >
              {MOOD_PILLS.map((mood) => (
                <button
                  key={mood}
                  onClick={() => handleMoodPill(mood)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all border",
                    activeMood === mood
                      ? "text-white border-[#C9A96E]"
                      : "bg-white text-foreground border-[#E8DDD0] hover:border-[#C9A96E]"
                  )}
                  style={
                    activeMood === mood
                      ? { backgroundColor: "#C9A96E" }
                      : undefined
                  }
                >
                  {mood}
                </button>
              ))}
            </div>

            {/* Masonry grid */}
            {pinsLoading ? (
              <div
                style={{
                  columns: 2,
                  columnGap: "12px",
                }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard
                    key={i}
                    height={[200, 280, 240, 320, 260, 200, 300, 240][i] ?? 240}
                  />
                ))}
              </div>
            ) : displayPins.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Sparkles size={28} style={{ color: "#C9A96E" }} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  No inspiration found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try a different mood or search term
                </p>
              </div>
            ) : (
              <div
                style={{
                  columns: 2,
                  columnGap: "12px",
                }}
              >
                {displayPins.map((pin) => (
                  <InspirationCard
                    key={pin.id}
                    pin={pin}
                    onClick={() => setSelectedPin(pin)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Color Theory ─── */}
        {activeTab === "color" && (
          <div className="px-5 pb-24 space-y-5">
            {/* Wardrobe color picker */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0E8DC]">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-foreground text-sm">
                  Build Your Outfit
                </p>
                <span className="text-xs text-muted-foreground">
                  {selectedItemIds.size}/6 items
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Tap pieces to analyze their color harmony
              </p>

              {wardrobe.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    Add items to your wardrobe to use the color analyzer
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {wardrobe.slice(0, 24).map((item) => (
                    <WardrobeSwatch
                      key={item.id}
                      item={item}
                      selected={selectedItemIds.has(item.id)}
                      onToggle={() => toggleItem(item.id)}
                    />
                  ))}
                </div>
              )}

              {selectedItemIds.size > 0 && (
                <button
                  onClick={() => setSelectedItemIds(new Set())}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <X size={12} />
                  Clear selection
                </button>
              )}
            </div>

            {/* Harmony result */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0E8DC]">
              <p className="font-semibold text-foreground text-sm mb-4">
                Harmony Analysis
              </p>

              {selectedColors.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    Select items above to analyze color harmony
                  </p>
                </div>
              ) : (
                <div className="flex gap-4 items-center">
                  <ScoreRing score={harmonyResult.score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                        style={{
                          backgroundColor:
                            harmonyColors[harmonyResult.type] ?? "#A0A0A0",
                        }}
                      >
                        {harmonyResult.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1.5">
                      {harmonyResult.description}
                    </p>
                    <div
                      className="text-xs rounded-xl px-3 py-2 leading-relaxed"
                      style={{ backgroundColor: "#FDF8F0", color: "#8B6914" }}
                    >
                      Tip: {harmonyResult.tip}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Color wheel */}
            {selectedColors.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0E8DC]">
                <p className="font-semibold text-foreground text-sm mb-4">
                  Color Wheel
                </p>
                <div className="flex items-center justify-around">
                  <ColorWheel selectedColors={selectedColors} />
                  <div className="space-y-2">
                    {selectedItems.slice(0, 6).map((item) => {
                      const hsl = getHSL(item.color);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2"
                        >
                          <div
                            className="w-4 h-4 rounded-full border border-white shadow-sm shrink-0"
                            style={{ backgroundColor: hslToHex(...hsl) }}
                          />
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {item.color} — {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Suggested pairings */}
            {suggestedPairings.length > 0 && selectedColors.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0E8DC]">
                <p className="font-semibold text-foreground text-sm mb-1">
                  Suggested Pairings
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  These pieces would improve your color harmony
                </p>
                <div className="space-y-3">
                  {suggestedPairings.map((item) => {
                    const hsl = getHSL(item.color);
                    const hex = hslToHex(...hsl);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-[#FDF8F0]"
                        onClick={() => toggleItem(item.id)}
                      >
                        <div
                          className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#F0E8DC]"
                          style={{
                            backgroundColor: item.imageUrl ? undefined : hex,
                            backgroundImage: item.imageUrl
                              ? `url(${item.imageUrl})`
                              : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.color} · {item.category}
                          </p>
                        </div>
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0"
                          style={{ backgroundColor: hex }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preset palettes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0E8DC]">
              <p className="font-semibold text-foreground text-sm mb-1">
                Curated Palettes
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Classic fashion color combinations
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PRESET_PALETTES.map((palette) => (
                  <div
                    key={palette.name}
                    className="p-3 rounded-xl border border-[#F0E8DC] hover:border-[#C9A96E] transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-foreground mb-2">
                      {palette.name}
                    </p>
                    <div className="flex gap-1 mb-2">
                      {palette.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {palette.mood}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recreate Modal */}
      {selectedPin && (
        <RecreateModal
          pin={selectedPin}
          wardrobe={wardrobe}
          onClose={() => setSelectedPin(null)}
        />
      )}
    </Layout>
  );
}
