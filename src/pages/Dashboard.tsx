import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { WardrobeStats, Outfit } from "@/types";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shirt, Sparkles, Star, ShoppingBag, Plus, CalendarDays, LucideIcon } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 ${accent ? "bg-foreground text-primary-foreground border-foreground" : "bg-card border-border"}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-accent/20" : "bg-secondary"}`}>
        <Icon size={20} className={accent ? "text-accent" : "text-foreground"} />
      </div>
      <div>
        <p className={`text-2xl font-playfair font-semibold ${accent ? "text-primary-foreground" : "text-foreground"}`}>{value}</p>
        <p className={`text-xs font-dmsans ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{label}</p>
      </div>
    </div>
  );
}

function OutfitPreviewCard({ outfit }: { outfit: Outfit }) {
  const previewItem = outfit.items[0]?.clothingItem;
  return (
    <Link to="/style-lab" className="group block">
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
          {previewItem?.imageUrl ? (
            <img
              src={previewItem.imageUrl}
              alt={outfit.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1">
                {outfit.items.slice(0, 3).map((oi) => (
                  <div
                    key={oi.id}
                    className="w-6 h-6 rounded-full border-2 border-white"
                    style={{ backgroundColor: oi.clothingItem.color }}
                  />
                ))}
              </div>
              <Sparkles size={20} className="text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="p-3">
          <p className="font-dmsans font-medium text-sm truncate">{outfit.name}</p>
          <p className="text-xs text-muted-foreground font-dmsans">{outfit.items.length} pieces</p>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<WardrobeStats>("/api/stats"),
  });

  const { data: outfits, isLoading: outfitsLoading } = useQuery({
    queryKey: ["outfits"],
    queryFn: () => api.get<Outfit[]>("/api/outfits"),
  });

  const recentOutfits = outfits?.slice(0, 6) ?? [];

  return (
    <Layout>
      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-dmsans text-accent uppercase tracking-widest mb-2">Welcome back</p>
          <h1 className="font-playfair text-4xl md:text-5xl font-semibold text-foreground leading-tight">
            Your Virtual<br />
            <span className="italic">Wardrobe</span>
          </h1>
          <p className="mt-3 text-muted-foreground font-dmsans text-sm max-w-sm">
            Style is a way to say who you are without having to speak.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link to="/wardrobe">
            <Button className="gap-2 font-dmsans">
              <Plus size={16} />
              Add Item
            </Button>
          </Link>
          <Link to="/style-lab">
            <Button variant="outline" className="gap-2 font-dmsans">
              <Sparkles size={16} />
              Create Outfit
            </Button>
          </Link>
          <Link to="/ootd">
            <Button variant="outline" className="gap-2 font-dmsans">
              <Star size={16} />
              Today's Look
            </Button>
          </Link>
          <Link to="/calendar">
            <Button variant="outline" className="gap-2 font-dmsans">
              <CalendarDays size={16} />
              Plan Ahead
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard label="Wardrobe Items" value={stats?.totalItems ?? 0} icon={Shirt} accent />
              <StatCard label="Outfits" value={stats?.totalOutfits ?? 0} icon={Sparkles} />
              <StatCard label="Favorites" value={stats?.favoriteItems ?? 0} icon={Star} />
              <StatCard label="Wishlist" value={stats?.pendingShoppingItems ?? 0} icon={ShoppingBag} />
            </>
          )}
        </div>

        {/* Recent Outfits */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-playfair text-xl font-semibold">Recent Outfits</h2>
            <Link to="/style-lab">
              <Button variant="ghost" size="sm" className="text-xs font-dmsans text-muted-foreground">
                View all
              </Button>
            </Link>
          </div>

          {outfitsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : recentOutfits.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
              <Sparkles size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="font-playfair text-lg text-foreground mb-1">No outfits yet</p>
              <p className="text-sm text-muted-foreground font-dmsans mb-4">Head to Style Lab to create your first look</p>
              <Link to="/style-lab">
                <Button size="sm" className="font-dmsans">Create an outfit</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentOutfits.map((outfit) => (
                <OutfitPreviewCard key={outfit.id} outfit={outfit} />
              ))}
            </div>
          )}
        </div>

        {/* Most worn */}
        {stats && stats.mostWornItems.length > 0 && (
          <div className="mt-10">
            <h2 className="font-playfair text-xl font-semibold mb-5">Most Worn</h2>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {stats.mostWornItems.slice(0, 5).map((item, i) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-xs text-muted-foreground font-dmsans w-5">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium font-dmsans">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-dmsans capitalize">{item.category}</p>
                  </div>
                  <span className="text-xs font-dmsans text-accent font-semibold">{item.timesWorn}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
