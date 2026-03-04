import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ClothingItem, Outfit } from "@/types";
import { ArrowLeft, Save, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MannequinModel, { BodyProps, getBodyZoneRects } from "@/components/outfit-studio/MannequinModel";
import ClothingLayer from "@/components/outfit-studio/ClothingLayer";

type SliderKey = keyof BodyProps;

const SLIDERS: { key: SliderKey; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "shoulders", label: "Shoulders" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "legs", label: "Legs" },
];

const DEFAULT_BODY: BodyProps = { height: 50, shoulders: 50, waist: 50, hips: 50, chest: 50, legs: 50 };

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "tops", label: "Tops" },
  { key: "pants", label: "Pants" },
  { key: "shorts", label: "Shorts" },
  { key: "dresses", label: "Dresses" },
  { key: "outerwear", label: "Outer" },
  { key: "shoes", label: "Shoes" },
  { key: "bags", label: "Bags" },
  { key: "accessories", label: "Acc" },
];

const CATEGORY_COLORS: Record<string, string> = {
  tops: "#D4B8A0",
  pants: "#B8C8D4",
  shorts: "#A8BED4",
  dresses: "#D4B8C8",
  outerwear: "#B8D4C0",
  shoes: "#D4C8A0",
  accessories: "#C8B8D4",
  bags: "#D4CEB8",
};

// ─── Slider Component ─────────────────────────────────────────────────────────

function BodySlider({
  keyName,
  label,
  value,
  onChange,
}: {
  keyName: SliderKey;
  label: string;
  value: number;
  onChange: (k: SliderKey, v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#6B5E52" }}>
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums" style={{ color: "#C9A96E" }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(keyName, parseInt(e.target.value, 10))}
        className="body-slider"
        style={{ "--val": `${value}%` } as React.CSSProperties}
      />
    </div>
  );
}

// ─── Wardrobe Card ────────────────────────────────────────────────────────────

function WardrobeCard({
  item,
  isSelected,
  onToggle,
}: {
  item: ClothingItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="relative flex flex-col overflow-hidden transition-all duration-150"
      style={{
        borderRadius: 12,
        border: isSelected ? "2.5px solid #C9A96E" : "1.5px solid #E8E0D8",
        background: "white",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(201,169,110,0.18)"
          : "0 1px 3px rgba(0,0,0,0.06)",
        transform: isSelected ? "scale(0.97)" : "scale(1)",
      }}
    >
      <div
        className="aspect-square w-full overflow-hidden"
        style={{ borderRadius: "10px 10px 0 0" }}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: CATEGORY_COLORS[item.category] ?? "#D4C8BC" }}
          >
            <span className="text-xs font-semibold uppercase text-white/80">
              {item.category[0]}
            </span>
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p
          className="text-[11px] font-medium leading-tight line-clamp-1"
          style={{ color: "#3D3028" }}
        >
          {item.name}
        </p>
        <p className="text-[10px]" style={{ color: "#9E8E82" }}>
          {item.color}
        </p>
      </div>
      {isSelected && (
        <div
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "#C9A96E" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5l2.5 2.5L8 3"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OutfitStudio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [body, setBody] = useState<BodyProps>(DEFAULT_BODY);
  const [selected, setSelected] = useState<ClothingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [saveOpen, setSaveOpen] = useState(false);
  const [outfitName, setOutfitName] = useState("");

  const { data: wardrobe = [], isLoading } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: () => api.get<ClothingItem[]>("/api/wardrobe"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; itemIds: string[] }) =>
      api.post<Outfit>("/api/outfits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      toast.success("Outfit saved!");
      setSaveOpen(false);
      setOutfitName("");
      setSelected([]);
    },
    onError: () => toast.error("Failed to save outfit"),
  });

  function handleSliderChange(key: SliderKey, value: number) {
    setBody((prev) => ({ ...prev, [key]: value }));
  }

  function toggleItem(item: ClothingItem) {
    setSelected((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev.filter((i) => i.id !== item.id);
      const isAcc = item.category === "accessories" || item.category === "bags";
      if (isAcc) return [...prev, item];
      const filtered = prev.filter((i) => {
        if (item.category === "dresses")
          return !["dresses", "tops", "pants", "shorts", "outerwear"].includes(i.category);
        if (item.category === "tops" || item.category === "outerwear")
          return !["tops", "outerwear", "dresses"].includes(i.category);
        if (item.category === "pants" || item.category === "shorts")
          return !["pants", "shorts", "dresses"].includes(i.category);
        return i.category !== item.category;
      });
      return [...filtered, item];
    });
  }

  const filtered = useMemo(() => {
    return activeCategory === "all"
      ? wardrobe
      : wardrobe.filter((i) => i.category === activeCategory);
  }, [wardrobe, activeCategory]);

  const bodyMeasurements = useMemo(() => getBodyZoneRects(body), [body]);
  const svgViewHeight = useMemo(() => {
    const f = bodyMeasurements.feet;
    return f.y + f.height + 20;
  }, [bodyMeasurements]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#F5EEE6", fontFamily: "Inter, sans-serif" }}
    >
      <style>{`
        .body-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: linear-gradient(to right, #C9A96E calc(var(--val, 50%)), #E8E0D8 calc(var(--val, 50%)));
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .body-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #C9A96E;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .body-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #C9A96E;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>

      {/* HEADER */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: "white",
          borderBottom: "1px solid #EDE5DB",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "#6B5E52" }}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="text-center">
          <p className="text-base font-bold" style={{ color: "#1E1E1E" }}>
            Outfit Studio
          </p>
          <p className="text-[11px]" style={{ color: "#9E8E82" }}>
            {selected.length > 0
              ? `${selected.length} item${selected.length !== 1 ? "s" : ""} selected`
              : "Build your look"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="p-1.5 rounded-lg"
              style={{ background: "#F5EEE6" }}
            >
              <RotateCcw size={15} color="#9E8E82" />
            </button>
          )}
          <button
            onClick={() =>
              selected.length > 0 ? setSaveOpen(true) : toast.error("Select items first")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg"
            style={{
              background: selected.length > 0 ? "#C9A96E" : "#E8E0D8",
              color: selected.length > 0 ? "white" : "#9E8E82",
            }}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>

      {/* MANNEQUIN CANVAS */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{
          minHeight: "52vh",
          background: "#EDE5DB",
          borderBottom: "1px solid #D4C8BC",
        }}
      >
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, #C9A96E 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Item count badge */}
        {selected.length > 0 && (
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold z-10"
            style={{
              background: "#C9A96E",
              color: "white",
              boxShadow: "0 2px 8px rgba(201,169,110,0.3)",
            }}
          >
            {selected.length} on model
          </div>
        )}

        {/* Empty state hint */}
        {selected.length === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
            <p
              className="text-xs font-medium"
              style={{ color: "#A89686", letterSpacing: "0.05em" }}
            >
              Tap items below to dress the model
            </p>
          </div>
        )}

        {/* SVG Canvas */}
        <svg
          viewBox={`0 0 200 ${svgViewHeight}`}
          className="relative z-10"
          style={{
            height: "48vh",
            maxHeight: 520,
            width: "auto",
            filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.10))",
          }}
        >
          <ClothingLayer
            items={selected}
            body={body}
            viewHeight={svgViewHeight}
            onRemove={(id) => setSelected((prev) => prev.filter((i) => i.id !== id))}
          />
          <MannequinModel body={body} />
        </svg>
      </div>

      {/* BODY PROPORTIONS PANEL */}
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ background: "white", borderBottom: "1px solid #EDE5DB" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: "#1E1E1E" }}>
            Body Proportions
          </p>
          <button
            onClick={() => setBody(DEFAULT_BODY)}
            className="text-xs font-medium px-2.5 py-1 rounded-md"
            style={{ background: "#F5EEE6", color: "#9E8E82" }}
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          {SLIDERS.map((s) => (
            <BodySlider
              key={s.key}
              keyName={s.key}
              label={s.label}
              value={body[s.key]}
              onChange={handleSliderChange}
            />
          ))}
        </div>
      </div>

      {/* WARDROBE */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#F5EEE6" }}>
        {/* Category tabs */}
        <div
          className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORY_TABS.filter(
            (t) => t.key === "all" || wardrobe.some((i) => i.category === t.key)
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-all"
              style={{
                background: activeCategory === tab.key ? "#C9A96E" : "white",
                color: activeCategory === tab.key ? "white" : "#6B5E52",
                border: activeCategory === tab.key ? "none" : "1px solid #E8E0D8",
                boxShadow:
                  activeCategory === tab.key ? "0 2px 8px rgba(201,169,110,0.3)" : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div
          className="flex-1 overflow-y-auto px-4 pb-24"
          style={{ scrollbarWidth: "none" }}
        >
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl animate-pulse"
                  style={{ background: "#E8E0D8" }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "#E8E0D8" }}
              >
                <span className="text-2xl">👗</span>
              </div>
              <p className="text-sm font-medium" style={{ color: "#9E8E82" }}>
                No items yet
              </p>
              <button
                onClick={() => navigate("/wardrobe")}
                className="text-sm font-semibold"
                style={{ color: "#C9A96E" }}
              >
                Add to Wardrobe
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((item) => (
                <WardrobeCard
                  key={item.id}
                  item={item}
                  isSelected={selected.some((i) => i.id === item.id)}
                  onToggle={() => toggleItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SAVE DIALOG */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent
          className="max-w-sm mx-4"
          style={{ background: "white", borderRadius: 20, border: "none" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold" style={{ color: "#1E1E1E" }}>
              Save Outfit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex gap-2 flex-wrap">
              {selected.map((item) => (
                <div
                  key={item.id}
                  className="relative w-12 h-12 rounded-lg overflow-hidden"
                  style={{ border: "1.5px solid #E8E0D8" }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: CATEGORY_COLORS[item.category] ?? "#D4C8BC" }}
                    />
                  )}
                  <button
                    onClick={() => toggleItem(item)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.5)" }}
                  >
                    <X size={8} color="white" />
                  </button>
                </div>
              ))}
            </div>
            <Input
              placeholder="Outfit name..."
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              style={{
                borderRadius: 10,
                border: "1.5px solid #E8E0D8",
                background: "#FAF7F4",
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSaveOpen(false)}
                className="flex-1 rounded-xl"
                style={{ border: "1.5px solid #E8E0D8", color: "#6B5E52" }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl font-semibold"
                style={{ background: "#C9A96E", color: "white", border: "none" }}
                disabled={!outfitName.trim() || saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    name: outfitName,
                    itemIds: selected.map((i) => i.id),
                  })
                }
              >
                {saveMutation.isPending ? "Saving..." : "Save Outfit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
