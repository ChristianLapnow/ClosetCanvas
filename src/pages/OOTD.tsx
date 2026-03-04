import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { OutfitSuggestion, Outfit } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Heart, Save, Star, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function OutfitItemTile({ item }: { item: OutfitSuggestion["items"][number] }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden group transition-all hover:shadow-md hover:-translate-y-1">
      <div className="aspect-[3/4] bg-muted relative overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div
              className="w-20 h-20 rounded-full opacity-70 shadow-inner"
              style={{ backgroundColor: item.color }}
            />
            <Shirt size={24} className="text-muted-foreground opacity-40" />
          </div>
        )}
        <div
          className="absolute bottom-2 left-2 w-4 h-4 rounded-full border-2 border-white shadow"
          style={{ backgroundColor: item.color }}
        />
      </div>
      <div className="p-3">
        <p className="font-dmsans font-medium text-sm truncate">{item.name}</p>
        {item.brand && (
          <p className="text-xs text-muted-foreground font-dmsans">{item.brand}</p>
        )}
        <Badge className="mt-1.5 text-[10px] bg-secondary text-secondary-foreground border-0 capitalize">
          {item.category}
        </Badge>
      </div>
    </div>
  );
}

export default function OOTD() {
  const queryClient = useQueryClient();
  const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [outfitName, setOutfitName] = useState("Today's Look");

  const { data: outfits, isLoading: outfitsLoading } = useQuery({
    queryKey: ["outfits"],
    queryFn: () => api.get<Outfit[]>("/api/outfits"),
  });

  const suggestMutation = useMutation({
    mutationFn: () => api.get<OutfitSuggestion>("/api/outfits/suggest"),
    onSuccess: (data) => setSuggestion(data),
    onError: () => toast.error("Couldn't generate a suggestion — make sure you have items in your wardrobe"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; itemIds: string[] }) =>
      api.post<Outfit>("/api/outfits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Outfit saved!");
      setSaveDialogOpen(false);
    },
    onError: () => toast.error("Failed to save outfit"),
  });

  const favMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.put<Outfit>(`/api/outfits/${id}`, { isFavorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outfits"] }),
  });

  const favoriteOutfits = outfits?.filter((o) => o.isFavorite) ?? [];
  const recentOutfits = outfits?.slice(0, 8) ?? [];

  return (
    <Layout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-dmsans text-accent uppercase tracking-widest mb-1">Daily Style</p>
          <h1 className="font-playfair text-3xl md:text-4xl font-semibold">Outfit of the Day</h1>
          <p className="text-sm text-muted-foreground font-dmsans mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Hero suggestion area */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden mb-10">
          {suggestion ? (
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-dmsans text-muted-foreground uppercase tracking-widest mb-1">Today's Look</p>
                  <p className="font-dmsans text-sm text-foreground/80 max-w-sm italic">"{suggestion.reason}"</p>
                  <div className="flex gap-2 mt-2">
                    {suggestion.occasion && (
                      <Badge className="text-xs capitalize bg-secondary text-secondary-foreground border-0">
                        {suggestion.occasion}
                      </Badge>
                    )}
                    {suggestion.season && (
                      <Badge className="text-xs capitalize bg-secondary text-secondary-foreground border-0">
                        {suggestion.season}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-dmsans"
                    onClick={() => suggestMutation.mutate()}
                    disabled={suggestMutation.isPending}
                  >
                    <RefreshCw size={13} className={cn(suggestMutation.isPending && "animate-spin")} />
                    Try Another
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 font-dmsans"
                    onClick={() => setSaveDialogOpen(true)}
                  >
                    <Save size={13} />
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {suggestion.items.map((item) => (
                  <OutfitItemTile key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-5">
                <Star size={32} className="text-accent" />
              </div>
              <h2 className="font-playfair text-2xl font-semibold mb-2">What should I wear?</h2>
              <p className="text-sm text-muted-foreground font-dmsans mb-6 max-w-xs">
                Let us pick the perfect outfit from your wardrobe for today
              </p>
              <Button
                className="gap-2 font-dmsans px-6"
                onClick={() => suggestMutation.mutate()}
                disabled={suggestMutation.isPending}
              >
                <Star size={15} />
                {suggestMutation.isPending ? "Finding your look..." : "Generate Today's Outfit"}
              </Button>
            </div>
          )}
        </div>

        {/* Favorite outfits */}
        {favoriteOutfits.length > 0 && (
          <div className="mb-10">
            <h2 className="font-playfair text-xl font-semibold mb-5 flex items-center gap-2">
              <Heart size={18} className="fill-rose-500 text-rose-500" />
              Favorites
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoriteOutfits.slice(0, 4).map((outfit) => (
                <OutfitHistoryCard
                  key={outfit.id}
                  outfit={outfit}
                  onFavoriteToggle={(id, fav) => favMutation.mutate({ id, isFavorite: fav })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Outfit history */}
        <div>
          <h2 className="font-playfair text-xl font-semibold mb-5">Outfit History</h2>
          {outfitsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : recentOutfits.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl">
              <p className="text-sm text-muted-foreground font-dmsans">No saved outfits yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentOutfits.map((outfit) => (
                <OutfitHistoryCard
                  key={outfit.id}
                  outfit={outfit}
                  onFavoriteToggle={(id, fav) => favMutation.mutate({ id, isFavorite: fav })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-playfair">Save This Look</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              placeholder="Outfit name..."
              className="font-dmsans"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 font-dmsans" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 font-dmsans"
                disabled={!outfitName.trim() || saveMutation.isPending || !suggestion}
                onClick={() => {
                  if (!suggestion) return;
                  saveMutation.mutate({
                    name: outfitName,
                    itemIds: suggestion.items.map((i) => i.id),
                  });
                }}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function OutfitHistoryCard({
  outfit,
  onFavoriteToggle,
}: {
  outfit: Outfit;
  onFavoriteToggle: (id: string, isFavorite: boolean) => void;
}) {
  const previewItem = outfit.items[0]?.clothingItem;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden group">
      <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
        {previewItem?.imageUrl ? (
          <img
            src={previewItem.imageUrl}
            alt={outfit.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="flex gap-1.5 flex-wrap justify-center p-4">
            {outfit.items.slice(0, 4).map((oi) => (
              <div
                key={oi.id}
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: oi.clothingItem.color }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium font-dmsans truncate">{outfit.name}</p>
          <p className="text-[10px] text-muted-foreground font-dmsans">{outfit.items.length} pieces</p>
        </div>
        <button
          onClick={() => onFavoriteToggle(outfit.id, !outfit.isFavorite)}
          className="shrink-0 ml-2"
        >
          <Heart
            size={14}
            className={cn(
              "transition-colors",
              outfit.isFavorite
                ? "fill-rose-500 text-rose-500"
                : "text-muted-foreground hover:text-rose-400"
            )}
          />
        </button>
      </div>
    </div>
  );
}
