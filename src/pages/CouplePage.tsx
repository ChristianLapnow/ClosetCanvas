import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { Outfit } from "@/types";
import {
  Heart,
  Users,
  Copy,
  Check,
  Trophy,
  Plus,
  Loader2,
  X,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoupleData {
  id: string;
  inviteCode: string;
  user1Id: string;
  user2Id: string | null;
  status: string;
  partnerName: string | null;
  partnerEmail: string | null;
  createdAt: string;
}

interface CoupleOption {
  id: string;
  position: number;
  outfit: {
    id: string;
    name: string;
  };
}

interface CoupleSession {
  id: string;
  status: "open" | "voted" | "closed";
  createdAt: string;
  winnerOutfitId: string | null;
  options: CoupleOption[];
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CoupleSession["status"] }) {
  const map: Record<CoupleSession["status"], { label: string; className: string }> = {
    open: { label: "Open", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    voted: { label: "Voted", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    closed: { label: "Closed", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  };
  const { label, className } = map[status];
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", className)}>
      {label}
    </span>
  );
}

// ─── Not Paired ───────────────────────────────────────────────────────────────

function NotPaired({ onPaired }: { onPaired: () => void }) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Poll for partner connection when we have an invite code
  useEffect(() => {
    if (!inviteCode) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.get<CoupleData>("/api/couple");
        if (data && (data.status === "active" || data.user2Id !== null)) {
          clearInterval(interval);
          onPaired();
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [inviteCode, onPaired]);

  const generateMutation = useMutation({
    mutationFn: () => api.post<{ inviteCode: string; id: string }>("/api/couple/invite"),
    onSuccess: (data) => {
      setInviteCode(data.inviteCode);
    },
    onError: () => toast.error("Failed to generate invite code"),
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.post("/api/couple/join", { inviteCode: code }),
    onSuccess: () => {
      toast.success("Connected with your partner!");
      onPaired();
    },
    onError: (err: Error) => toast.error(err?.message ?? "Invalid code or already connected"),
  });

  async function handleCopy() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Code copied!");
    } catch {
      toast.error("Could not copy code");
    }
  }

  return (
    <div className="px-4 pt-8 pb-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #E85D8A 0%, #9B4FC4 100%)" }}
        >
          <Users size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Connect with your partner</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Share outfit decisions together</p>
      </div>

      <div className="space-y-4">
        {/* Create Invite Card */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="font-bold text-base mb-1">Start a connection</h3>
          <p className="text-xs text-muted-foreground mb-4">Generate a code and share it with your partner</p>

          {inviteCode ? (
            <div className="space-y-4">
              <div className="bg-background rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Your invite code</p>
                <p className="text-4xl font-bold tracking-[0.3em] text-foreground font-mono">{inviteCode}</p>
              </div>
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border border-border bg-background"
              >
                {copied ? (
                  <><Check size={15} className="text-green-500" /> Copied!</>
                ) : (
                  <><Copy size={15} /> Copy code</>
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center">Share this code with your partner</p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={13} className="animate-spin" />
                Waiting for partner...
              </div>
            </div>
          ) : (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
            >
              {generateMutation.isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Generating...</>
              ) : (
                <><Link2 size={15} /> Generate invite code</>
              )}
            </button>
          )}
        </div>

        {/* Join Card */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="font-bold text-base mb-1">Have a code?</h3>
          <p className="text-xs text-muted-foreground mb-4">Enter your partner's invite code to connect</p>

          <div className="space-y-3">
            <Input
              placeholder="Enter 6-char code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              className="text-center text-lg font-bold tracking-[0.3em] font-mono uppercase bg-background"
              maxLength={6}
            />
            <button
              onClick={() => joinMutation.mutate(joinCode)}
              disabled={joinCode.length !== 6 || joinMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
            >
              {joinMutation.isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Connecting...</>
              ) : (
                <><Heart size={15} /> Connect</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Session Dialog ────────────────────────────────────────────────────────

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (sessionId: string) => void;
}

function NewSessionDialog({ open, onOpenChange, onCreated }: NewSessionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [calendarDate, setCalendarDate] = useState("");

  const { data: outfits = [], isLoading: loadingOutfits } = useQuery({
    queryKey: ["outfits"],
    queryFn: () => api.get<Outfit[]>("/api/outfits"),
    enabled: open,
  });

  interface SessionCreateResponse {
    id: string;
  }

  const createMutation = useMutation({
    mutationFn: (data: { outfitIds: string[]; calendarDate?: string }) =>
      api.post<SessionCreateResponse>("/api/couple/sessions", data),
    onSuccess: (data) => {
      toast.success("Session created!");
      onCreated(data.id);
      onOpenChange(false);
      setSelectedIds([]);
      setCalendarDate("");
    },
    onError: () => toast.error("Failed to create session"),
  });

  function toggleOutfit(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast.error("Max 3 outfits per session");
        return prev;
      }
      return [...prev, id];
    });
  }

  function handleCreate() {
    if (selectedIds.length < 2) {
      toast.error("Select at least 2 outfits");
      return;
    }
    createMutation.mutate({
      outfitIds: selectedIds,
      calendarDate: calendarDate || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={18} className="text-accent" /> Create Compare Session
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pt-1" style={{ scrollbarWidth: "none" }}>
          <p className="text-sm text-muted-foreground">Select 2–3 outfits to compare</p>

          {loadingOutfits ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : outfits.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No outfits yet. Create some in Outfit Studio first.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {outfits.map((outfit) => {
                const isSelected = selectedIds.includes(outfit.id);
                const firstItem = outfit.items[0]?.clothingItem;
                return (
                  <button
                    key={outfit.id}
                    onClick={() => toggleOutfit(outfit.id)}
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 transition-all text-left",
                      isSelected ? "border-[#C9A96E] shadow-lg" : "border-transparent"
                    )}
                  >
                    <div
                      className="h-20 w-full"
                      style={{
                        backgroundColor: firstItem?.color ?? "#4B4B4B",
                        backgroundImage: firstItem?.imageUrl ? `url(${firstItem.imageUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <div className="bg-card px-2 py-1.5">
                      <p className="text-xs font-semibold truncate">{outfit.name}</p>
                      <p className="text-[10px] text-muted-foreground">{outfit.items.length} pieces</p>
                    </div>
                    {isSelected && (
                      <div
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #C9A96E, #A07850)" }}
                      >
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Auto-plan to calendar date (optional)
            </label>
            <Input
              type="date"
              value={calendarDate}
              onChange={(e) => setCalendarDate(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-border mt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1 text-white"
            style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
            disabled={selectedIds.length < 2 || createMutation.isPending}
            onClick={handleCreate}
          >
            {createMutation.isPending ? (
              <><Loader2 size={14} className="animate-spin mr-1" /> Creating...</>
            ) : (
              "Create Session"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Paired Dashboard ─────────────────────────────────────────────────────────

function PairedDashboard({ couple, onDisconnect }: { couple: CoupleData; onDisconnect: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["couple-sessions"],
    queryFn: () => api.get<CoupleSession[]>("/api/couple/sessions"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete("/api/couple"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      toast.success("Disconnected from partner");
      onDisconnect();
    },
    onError: () => toast.error("Failed to disconnect"),
  });

  function handleSessionCreated(sessionId: string) {
    queryClient.invalidateQueries({ queryKey: ["couple-sessions"] });
    navigate(`/couple/session/${sessionId}`);
  }

  const partnerDisplay = couple.partnerName || couple.partnerEmail || "Partner";
  const partnerInitial = partnerDisplay[0].toUpperCase();

  return (
    <div className="px-4 pt-8 pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Couple Mode</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Compare outfits with your partner</p>
      </div>

      {/* Partner Card */}
      <div className="bg-card rounded-2xl p-4 mb-5 border border-border flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ background: "linear-gradient(135deg, #E85D8A 0%, #9B4FC4 100%)" }}
        >
          {partnerInitial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-pink-500 fill-pink-500 shrink-0" />
            <p className="text-sm font-semibold truncate">Connected with {partnerDisplay}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-xs text-muted-foreground">Active partner</p>
          </div>
        </div>
        <button
          onClick={() => setDisconnectConfirmOpen(true)}
          className="text-xs font-semibold text-destructive border border-destructive/30 px-3 py-1.5 rounded-full hover:bg-destructive/10 transition-colors shrink-0"
        >
          Disconnect
        </button>
      </div>

      {/* Sessions Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold">Compare Sessions</h2>
        <button
          onClick={() => setNewSessionOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-full"
          style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
        >
          <Plus size={13} /> New Session
        </button>
      </div>

      {loadingSessions ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center border border-border">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #E85D8A22 0%, #9B4FC422 100%)" }}
          >
            <Users size={24} className="text-muted-foreground" />
          </div>
          <p className="font-semibold text-sm mb-1">No sessions yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Create a session to compare outfits with your partner
          </p>
          <button
            onClick={() => setNewSessionOpen(true)}
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-full"
            style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
          >
            Create your first session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const outfitCount = session.options?.length ?? 0;
            const winnerOption = session.winnerOutfitId
              ? session.options?.find((o) => o.outfit.id === session.winnerOutfitId)
              : null;
            return (
              <div key={session.id} className="bg-card rounded-2xl p-4 border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <StatusBadge status={session.status} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(session.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {outfitCount} outfit{outfitCount !== 1 ? "s" : ""}
                  </p>
                </div>

                {session.status === "closed" && winnerOption ? (
                  <div className="flex items-center gap-2 mt-2 bg-amber-500/10 rounded-xl px-3 py-2">
                    <Trophy size={14} className="text-amber-500 shrink-0" />
                    <p className="text-xs font-semibold text-amber-600">
                      Winner: {winnerOption.outfit.name}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/couple/session/${session.id}`)}
                    className="w-full mt-2 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
                  >
                    View Session
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Session Dialog */}
      <NewSessionDialog
        open={newSessionOpen}
        onOpenChange={setNewSessionOpen}
        onCreated={handleSessionCreated}
      />

      {/* Disconnect Confirmation */}
      <Dialog open={disconnectConfirmOpen} onOpenChange={setDisconnectConfirmOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X size={18} className="text-destructive" /> Disconnect Partner
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will disconnect you from <strong>{partnerDisplay}</strong>. Your session history will be preserved.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDisconnectConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={disconnectMutation.isPending}
                onClick={() => disconnectMutation.mutate()}
              >
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CouplePage() {
  const queryClient = useQueryClient();

  const { data: couple, isLoading } = useQuery<CoupleData | null>({
    queryKey: ["couple"],
    queryFn: async () => {
      try {
        const result = await api.get<CoupleData>("/api/couple");
        // Only show as paired if status is active
        if (!result || result.status !== "active") return null;
        return result;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  function handlePaired() {
    queryClient.invalidateQueries({ queryKey: ["couple"] });
  }

  function handleDisconnect() {
    queryClient.invalidateQueries({ queryKey: ["couple"] });
  }

  return (
    <Layout>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 size={28} className="animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : couple ? (
        <PairedDashboard couple={couple} onDisconnect={handleDisconnect} />
      ) : (
        <NotPaired onPaired={handlePaired} />
      )}
    </Layout>
  );
}
