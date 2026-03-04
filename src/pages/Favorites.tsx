import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { Outfit } from "@/types";
import { Heart, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Favorites() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: outfits } = useQuery({
    queryKey: ["outfits"],
    queryFn: () => api.get<Outfit[]>("/api/outfits"),
  });

  const favMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.put<Outfit>(`/api/outfits/${id}`, { isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
    },
    onError: () => toast.error("Failed to update favorite"),
  });

  const favoriteOutfits = (outfits ?? []).filter((o) => o.isFavorite);

  return (
    <Layout>
      <div className="px-4 pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Favorites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {favoriteOutfits.length} saved {favoriteOutfits.length === 1 ? "look" : "looks"}
          </p>
        </div>

        {/* Empty state */}
        {favoriteOutfits.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm mb-4">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-pink-500" />
            </div>
            <h3 className="font-semibold text-base mb-1">No favorites yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Save your best outfit combinations to find them here
            </p>
            <button
              onClick={() => navigate("/style")}
              className="bg-foreground text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 mx-auto w-fit"
            >
              <Sparkles size={14} />
              Create an Outfit
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {favoriteOutfits.map((outfit) => (
              <div key={outfit.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <div className="flex gap-1.5 shrink-0">
                  {outfit.items.slice(0, 3).map((oi) => (
                    <div
                      key={oi.id}
                      className="w-12 h-12 rounded-xl border border-border"
                      style={{
                        backgroundColor: oi.clothingItem.imageUrl ? undefined : oi.clothingItem.color,
                        backgroundImage: oi.clothingItem.imageUrl ? `url(${oi.clothingItem.imageUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{outfit.name}</p>
                  <p className="text-xs text-muted-foreground">{outfit.items.length} pieces</p>
                </div>
                <button
                  onClick={() => favMutation.mutate({ id: outfit.id, isFavorite: false })}
                  className="shrink-0"
                >
                  <Heart size={18} className="fill-pink-500 text-pink-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Inspiration CTA - pink gradient */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #E85D8A 0%, #C4517A 50%, #9B2D5E 100%)" }}
        >
          <div className="relative z-10">
            <span className="text-xs font-bold tracking-widest text-white/80 bg-white/20 px-2 py-1 rounded-full">
              NEED INSPIRATION?
            </span>
            <h3 className="text-white font-bold text-lg mt-2 mb-1">
              Generate new looks
            </h3>
            <p className="text-white/70 text-sm mb-4">
              AI will suggest outfits just for you
            </p>
            <button
              onClick={() => navigate("/style")}
              className="bg-white text-pink-600 px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
            >
              Try it now
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
            <Heart size={80} className="text-white" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
