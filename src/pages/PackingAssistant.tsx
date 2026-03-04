import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ClothingItem } from "@/types";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Plane, Check, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OCCASION_OPTIONS = [
  { key: "casual", label: "Casual", emoji: "👟" },
  { key: "formal", label: "Formal", emoji: "👔" },
  { key: "work", label: "Work", emoji: "💼" },
  { key: "sport", label: "Sport", emoji: "🏃" },
];

function generatePackingList(wardrobe: ClothingItem[], days: number, occasions: string[]) {
  const items: ClothingItem[] = [];
  const usedIds = new Set<string>();

  const getItems = (categories: string[], maxCount: number) => {
    return wardrobe
      .filter((i) => categories.includes(i.category) && !usedIds.has(i.id))
      .filter((i) => occasions.length === 0 || occasions.includes(i.occasion) || i.occasion === "all")
      .slice(0, maxCount);
  };

  // Tops/dresses: one per 1.5 days
  const topCount = Math.ceil(days / 1.5);
  const tops = getItems(["tops", "dresses"], topCount);
  tops.forEach((i) => { usedIds.add(i.id); items.push(i); });

  // Bottoms: one per 2 days (can rewear)
  const bottomCount = Math.ceil(days / 2);
  const bottoms = getItems(["pants", "shorts"], bottomCount);
  bottoms.forEach((i) => { usedIds.add(i.id); items.push(i); });

  // Outerwear: 1-2 pieces
  const outerCount = Math.min(2, Math.ceil(days / 3));
  const outer = getItems(["outerwear"], outerCount);
  outer.forEach((i) => { usedIds.add(i.id); items.push(i); });

  // Shoes: 1-3 pairs
  const shoeCount = Math.min(3, Math.ceil(days / 3) + 1);
  const shoes = getItems(["shoes"], shoeCount);
  shoes.forEach((i) => { usedIds.add(i.id); items.push(i); });

  // Accessories: 2-3 pieces
  const accItems = getItems(["accessories", "bags"], 3);
  accItems.forEach((i) => { usedIds.add(i.id); items.push(i); });

  return items;
}

export default function PackingAssistant() {
  const navigate = useNavigate();
  const [tripName, setTripName] = useState("");
  const [days, setDays] = useState(5);
  const [occasions, setOccasions] = useState<string[]>(["casual"]);
  const [generated, setGenerated] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const { data: wardrobe = [] } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: () => api.get<ClothingItem[]>("/api/wardrobe"),
  });

  const packingList = useMemo(() => {
    if (!generated) return [];
    return generatePackingList(wardrobe, days, occasions);
  }, [generated, wardrobe, days, occasions]);

  const grouped = useMemo(() => {
    const g: Record<string, ClothingItem[]> = {};
    for (const item of packingList) {
      if (!g[item.category]) g[item.category] = [];
      g[item.category].push(item);
    }
    return g;
  }, [packingList]);

  const checkedCount = checked.size;
  const totalCount = packingList.length;

  function toggleOccasion(key: string) {
    setOccasions((prev) =>
      prev.includes(key) ? prev.filter((o) => o !== key) : [...prev, key]
    );
    setGenerated(false);
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const CATEGORY_LABEL: Record<string, string> = {
    tops: "Tops", pants: "Pants", shorts: "Shorts", dresses: "Dresses",
    outerwear: "Outerwear", shoes: "Shoes", accessories: "Accessories", bags: "Bags",
  };

  return (
    <Layout>
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white border border-border">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Packing Assistant</h1>
            <p className="text-xs text-muted-foreground">Smart suggestions from your wardrobe</p>
          </div>
        </div>

        {!generated ? (
          <div className="space-y-5">
            {/* Trip details */}
            <div className="bg-white rounded-2xl p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Trip Details</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Destination / Trip Name</label>
                  <Input
                    placeholder="e.g. Paris weekend, Business trip..."
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Number of Days: <span className="text-accent font-bold">{days}</span></label>
                  <input
                    type="range" min={1} max={21} value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1 day</span><span>1 week</span><span>3 weeks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Occasions */}
            <div className="bg-white rounded-2xl p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Occasions</p>
              <div className="grid grid-cols-2 gap-2">
                {OCCASION_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => toggleOccasion(o.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
                      occasions.includes(o.key)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    <span>{o.emoji}</span>
                    {o.label}
                    {occasions.includes(o.key) && <Check size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #5B73E8 0%, #7B5EAE 50%, #9B4FC4 100%)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-base mb-1">Ready to pack?</p>
                  <p className="text-white/70 text-xs">{wardrobe.length} items in your wardrobe</p>
                </div>
                <Button
                  onClick={() => { setGenerated(true); setChecked(new Set()); }}
                  className="bg-white text-purple-700 font-semibold rounded-xl px-4"
                  disabled={wardrobe.length === 0}
                >
                  <Plane size={15} className="mr-1.5" />
                  Generate List
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="bg-white rounded-2xl p-4 border border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-base text-foreground">{tripName || "Your Trip"}</p>
                <p className="text-xs text-muted-foreground">{days} days · {totalCount} items suggested</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-accent">{checkedCount}/{totalCount}</p>
                <p className="text-xs text-muted-foreground">packed</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`, background: "#C9A96E" }}
              />
            </div>

            {totalCount === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-border">
                <Package size={36} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold text-foreground mb-1">Not enough items</p>
                <p className="text-sm text-muted-foreground">Add more clothes to your wardrobe first</p>
                <Button className="mt-4" onClick={() => navigate("/wardrobe")}>Go to Wardrobe</Button>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="bg-white rounded-2xl border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-semibold text-sm text-foreground">{CATEGORY_LABEL[category] ?? category}</p>
                    <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                  </div>
                  {items.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 transition-colors",
                        idx < items.length - 1 && "border-b border-border",
                        checked.has(item.id) ? "bg-accent/5" : "bg-white"
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                          checked.has(item.id) ? "bg-accent border-accent" : "border-muted-foreground/30"
                        )}
                      >
                        {checked.has(item.id) && <Check size={11} color="white" strokeWidth={3} />}
                      </div>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: "#D4C8BC" }} />
                      )}
                      <div className="text-left min-w-0">
                        <p className={cn("text-sm font-medium truncate", checked.has(item.id) ? "line-through text-muted-foreground" : "text-foreground")}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.color} · {item.brand ?? item.occasion}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}

            <Button variant="outline" className="w-full" onClick={() => setGenerated(false)}>
              Adjust &amp; Regenerate
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
