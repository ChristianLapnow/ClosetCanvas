import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ClothingItemCard } from "@/components/ClothingItemCard";
import { AddItemDialog } from "@/components/AddItemDialog";
import { api } from "@/lib/api";
import { ClothingItem } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Shirt, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "all", label: "All", icon: "✦" },
  { id: "tops", label: "Tops", icon: "👕" },
  { id: "pants", label: "Pants", icon: "👖" },
  { id: "shorts", label: "Shorts", icon: "🩳" },
  { id: "dresses", label: "Dresses", icon: "👗" },
  { id: "outerwear", label: "Outerwear", icon: "🧥" },
  { id: "shoes", label: "Shoes", icon: "👟" },
  { id: "accessories", label: "Accessories", icon: "💍" },
  { id: "bags", label: "Bags", icon: "👜" },
] as const;

export default function Wardrobe() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [category, setCategory] = useState("all");

  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);

  const { data: items, isLoading } = useQuery({
    queryKey: ["wardrobe", category],
    queryFn: () => api.get<ClothingItem[]>(`/api/wardrobe?${params.toString()}`),
  });

  const { data: allItems } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: () => api.get<ClothingItem[]>("/api/wardrobe"),
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.put<ClothingItem>(`/api/wardrobe/${id}`, { isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
    },
    onError: () => toast.error("Failed to update favorite"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/wardrobe/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
      toast.success("Item removed from wardrobe");
    },
    onError: () => toast.error("Failed to delete item"),
  });

  const displayItems = items ?? [];
  const allItemsData = allItems ?? [];

  function getCategoryCount(catId: string): number {
    if (catId === "all") return allItemsData.length;
    return allItemsData.filter((i) => i.category === catId).length;
  }

  return (
    <Layout>
      <div className="px-4 pt-8 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Closet</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allItemsData.length} {allItemsData.length === 1 ? "piece" : "pieces"} in your wardrobe
            </p>
          </div>
        </div>

        {/* Category tabs - horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 mt-4 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
                  isActive
                    ? "bg-foreground text-white"
                    : "bg-white text-foreground border border-border"
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[3/4] rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Shirt size={40} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Your closet is empty</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Start adding your clothes to build your digital wardrobe
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="bg-foreground text-white px-6 py-3 rounded-full font-medium text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayItems.map((item) => (
              <ClothingItemCard
                key={item.id}
                item={item}
                onFavoriteToggle={(id, isFavorite) =>
                  favoriteMutation.mutate({ id, isFavorite })
                }
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-accent/90 transition-colors"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
      >
        <Plus size={24} />
      </button>

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} />
    </Layout>
  );
}
