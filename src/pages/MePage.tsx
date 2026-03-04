import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { WardrobeStats } from "@/types";
import {
  Shirt,
  Sparkles,
  Heart,
  LogOut,
  Trash2,
  Users,
  ArrowRight,
  Plus,
  CalendarDays,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession, signOut } from "@/lib/auth-client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EditProfileForm } from "@/components/EditProfileForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

const CATEGORY_ICONS: Record<string, string> = {
  tops: "👕",
  pants: "👖",
  shorts: "🩳",
  dresses: "👗",
  outerwear: "🧥",
  shoes: "👟",
  accessories: "💍",
  bags: "👜",
};

export default function MePage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<WardrobeStats>("/api/stats"),
  });

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate("/welcome");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete("/api/account");
      await signOut();
      toast.success("Account deleted.");
      navigate("/welcome");
    } catch {
      toast.error("Failed to delete account. Try again.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // Initials avatar
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <Layout>
      <div className="px-4 pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Style</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Wardrobe insights</p>
        </div>

        {/* Profile card */}
        <div className="bg-foreground rounded-2xl p-5 mb-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-foreground shrink-0"
            style={{ background: "linear-gradient(135deg, #C9A96E, #A07850)" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base truncate">{user?.name ?? "My Closet"}</h3>
            <p className="text-white/60 text-sm truncate">{user?.email ?? ""}</p>
            <span className="inline-block mt-1.5 text-xs font-semibold text-accent bg-accent/20 px-2 py-0.5 rounded-full">
              Starter
            </span>
          </div>
        </div>

        {/* Couple Mode card */}
        <div
          className="rounded-2xl p-4 mb-4 flex items-center gap-4 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #E85D8A 0%, #9B4FC4 100%)" }}
          onClick={() => navigate("/couple")}
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Users size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold tracking-widest text-white/70">COUPLE MODE</span>
            <p className="text-white font-bold text-sm">Connect with your partner</p>
            <p className="text-white/60 text-xs">Share outfit decisions &amp; AR try-ons</p>
          </div>
          <ArrowRight size={18} className="text-white/70 shrink-0" />
        </div>

        {/* Stat cards */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <Shirt size={20} className="mx-auto text-accent mb-1" />
              <p className="font-bold text-xl">{stats?.totalItems ?? 0}</p>
              <p className="text-xs text-muted-foreground">Items</p>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <Sparkles size={20} className="mx-auto text-accent mb-1" />
              <p className="font-bold text-xl">{stats?.totalOutfits ?? 0}</p>
              <p className="text-xs text-muted-foreground">Outfits</p>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <Heart size={20} className="mx-auto text-pink-500 mb-1" />
              <p className="font-bold text-xl">{stats?.favoriteOutfits ?? 0}</p>
              <p className="text-xs text-muted-foreground">Favorites</p>
            </div>
          </div>
        )}

        {/* Wardrobe Breakdown */}
        {stats && Object.keys(stats.itemsByCategory).length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="font-bold text-sm mb-3">Wardrobe Breakdown</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.itemsByCategory as Record<string, number>)
                .filter(([, count]) => (count as number) > 0)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{CATEGORY_ICONS[cat] ?? "👔"}</span>
                      <span className="text-sm font-medium capitalize">{cat}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{count as number}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* AI Shopping Assistant */}
        <div
          className="rounded-2xl p-5 mb-3 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #E85D8A 0%, #C4517A 100%)" }}
        >
          <div className="relative z-10">
            <span className="text-xs font-bold tracking-widest text-white/70 bg-white/20 px-2 py-1 rounded-full">
              AI SHOPPING ASSISTANT
            </span>
            <h3 className="text-white font-bold text-base mt-2 mb-3">Find your next favorite piece</h3>
            <button
              onClick={() => navigate("/shopping")}
              className="bg-white text-pink-600 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"
            >
              <ShoppingBag size={14} /> Shop now <ArrowRight size={14} />
            </button>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10">
            <ShoppingBag size={70} className="text-white" />
          </div>
        </div>

        {/* Style Insights */}
        <div
          className="rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07840 100%)" }}
        >
          <div className="relative z-10">
            <span className="text-xs font-bold tracking-widest text-white/70 bg-white/20 px-2 py-1 rounded-full">
              STYLE INSIGHTS
            </span>
            <h3 className="text-white font-bold text-base mt-2 mb-3">Build your capsule wardrobe</h3>
            <button className="bg-white text-amber-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2" onClick={() => navigate("/shopping")}>
              <Sparkles size={14} /> View insights <ArrowRight size={14} />
            </button>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10">
            <Sparkles size={70} className="text-white" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
          <h3 className="font-bold text-sm px-4 pt-4 pb-2">Quick Actions</h3>
          {[
            { label: "Add New Item", icon: Plus, action: () => navigate("/wardrobe") },
            { label: "Generate Outfit", icon: Sparkles, action: () => navigate("/style") },
            { label: "Plan This Week", icon: CalendarDays, action: () => navigate("/plan") },
          ].map(({ label, icon: Icon, action }, i) => (
            <button
              key={label}
              onClick={action}
              className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-muted transition-colors ${i < 2 ? "border-b border-border" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-accent" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <ArrowRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Edit Profile */}
        <EditProfileForm
          name={user?.name ?? ""}
          email={user?.email ?? ""}
        />

        {/* Change Password */}
        <ChangePasswordForm />

        {/* Account Actions */}
        <div className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden">
          <h3 className="font-bold text-sm px-4 pt-4 pb-2">Account</h3>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted transition-colors border-b border-border"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">{signingOut ? "Signing out..." : "Sign Out"}</span>
            </div>
            <ArrowRight size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="text-destructive" />
              <span className="text-sm font-medium text-destructive">Delete Account</span>
            </div>
            <ArrowRight size={16} className="text-destructive/50" />
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={18} /> Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will permanently delete your account and all your wardrobe data — items, outfits, and plans. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
