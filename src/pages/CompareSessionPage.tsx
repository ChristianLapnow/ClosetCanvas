import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Trophy,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Backend response types ────────────────────────────────────────────────────

interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  imageUrl: string | null;
}

interface OutfitItem {
  id: string;
  clothingItem: ClothingItem;
}

interface BackendOutfit {
  id: string;
  name: string;
  occasion: string | null;
  mood: string | null;
  imageUrl: string | null;
  items: OutfitItem[];
}

interface BackendOption {
  id: string;
  position: number;
  addedByUserId: string;
  outfit: BackendOutfit;
}

interface BackendVote {
  id: string;
  votedByUserId: string;
  outfitId: string;
  reaction: string | null;
  comment: string | null;
  createdAt: string;
}

interface BackendSession {
  id: string;
  status: "open" | "voted" | "closed";
  createdAt: string;
  calendarDate: string | null;
  winnerOutfitId: string | null;
  options: BackendOption[];
  votes: BackendVote[];
  partnerName: string | null;
}

// ─── UI types ─────────────────────────────────────────────────────────────────

interface VoteData {
  outfitId: string;
  reaction: string | null;
  comment: string | null;
}

type Reaction = "❤️" | "🔥" | "😍" | "🤔";

const REACTIONS: Reaction[] = ["❤️", "🔥", "😍", "🤔"];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BackendSession["status"] }) {
  const map: Record<BackendSession["status"], { label: string; className: string }> = {
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

// ─── Score ────────────────────────────────────────────────────────────────────

function computeScore(outfit: BackendOutfit): number {
  const base = 60;
  const bonus = Math.min(outfit.items.length * 7, 35);
  return base + bonus;
}

// ─── Outfit Card ──────────────────────────────────────────────────────────────

function OutfitCard({ outfit }: { outfit: BackendOutfit }) {
  const score = computeScore(outfit);
  const firstItem = outfit.items[0]?.clothingItem;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div
        className="w-full h-48 flex items-center justify-center relative"
        style={{
          backgroundColor: firstItem?.color ?? "#2A2A2A",
          backgroundImage: firstItem?.imageUrl ? `url(${firstItem.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!firstItem?.imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 flex-wrap p-4">
            {outfit.items.slice(0, 4).map((oi) => (
              <div
                key={oi.id}
                className="w-14 h-14 rounded-xl border-2 border-white/30 shadow-md"
                style={{
                  backgroundColor: oi.clothingItem.color ?? "#555",
                  backgroundImage: oi.clothingItem.imageUrl ? `url(${oi.clothingItem.imageUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ))}
          </div>
        )}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
          <p className="text-xs font-bold text-white">{score}%</p>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-base mb-1">{outfit.name}</h3>
        <div className="flex gap-2 flex-wrap mb-3">
          {outfit.occasion && (
            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
              {outfit.occasion}
            </span>
          )}
          {outfit.mood && (
            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
              {outfit.mood}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {outfit.items.map((oi) => (
            <span
              key={oi.id}
              className="text-[10px] font-medium bg-background border border-border px-2 py-0.5 rounded-full capitalize"
            >
              {oi.clothingItem.name} · {oi.clothingItem.category}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Voting Panel ─────────────────────────────────────────────────────────────

interface VotingPanelProps {
  outfit: BackendOutfit;
  myVote: VoteData | null;
  partnerVote: VoteData | null;
  onVote: (outfitId: string, reaction: string, comment: string) => void;
  isVoting: boolean;
  sessionStatus: BackendSession["status"];
}

function VotingPanel({ outfit, myVote, partnerVote, onVote, isVoting, sessionStatus }: VotingPanelProps) {
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);
  const [comment, setComment] = useState("");

  const isForThisOutfit = myVote?.outfitId === outfit.id;
  const partnerVotedThis = partnerVote?.outfitId === outfit.id;
  const canVote = sessionStatus === "open" || sessionStatus === "voted";

  if (!canVote) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 mt-3">
      {isForThisOutfit ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-green-500" />
            <p className="text-sm font-semibold text-green-600">Your vote: {outfit.name}</p>
          </div>
          <p className="text-lg">{myVote?.reaction}</p>
          {myVote?.comment && (
            <p className="text-sm text-muted-foreground italic">"{myVote.comment}"</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Vote for this outfit</p>
          <div className="flex gap-2">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedReaction(r)}
                className={cn(
                  "w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all",
                  selectedReaction === r
                    ? "border-[#C9A96E] scale-110 bg-[#C9A96E]/10"
                    : "border-border bg-background"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 200))}
            placeholder="Add a comment... (optional)"
            rows={2}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={() => onVote(outfit.id, selectedReaction ?? "❤️", comment)}
            disabled={isVoting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
          >
            {isVoting ? (
              <><Loader2 size={14} className="animate-spin" /> Voting...</>
            ) : (
              "Vote for this outfit"
            )}
          </button>
        </div>
      )}

      {partnerVotedThis && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Partner's vote</p>
          <div className="flex items-center gap-2">
            <span className="text-lg">{partnerVote?.reaction}</span>
            {partnerVote?.comment && (
              <p className="text-sm text-muted-foreground italic">"{partnerVote.comment}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Winner Dialog ─────────────────────────────────────────────────────────────

interface WinnerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  outfits: BackendOutfit[];
  calendarDate: string | null;
  onClose: (winnerId: string, saveToFavorites: boolean, planDate: string) => void;
  isClosing: boolean;
}

function WinnerDialog({ open, onOpenChange, outfits, calendarDate, onClose, isClosing }: WinnerDialogProps) {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [saveToFavorites, setSaveToFavorites] = useState(true);
  const [planDate, setPlanDate] = useState(calendarDate ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Pick a Winner
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">Select the winning outfit</p>

          <div className="space-y-2">
            {outfits.map((outfit) => (
              <button
                key={outfit.id}
                onClick={() => setWinnerId(outfit.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl p-3 border-2 transition-all text-left",
                  winnerId === outfit.id
                    ? "border-[#C9A96E] bg-[#C9A96E]/10"
                    : "border-border bg-background"
                )}
              >
                <div
                  className="w-10 h-10 rounded-xl shrink-0"
                  style={{
                    backgroundColor: outfit.items[0]?.clothingItem.color ?? "#555",
                    backgroundImage: outfit.items[0]?.clothingItem.imageUrl
                      ? `url(${outfit.items[0].clothingItem.imageUrl})`
                      : undefined,
                    backgroundSize: "cover",
                  }}
                />
                <div>
                  <p className="text-sm font-semibold">{outfit.name}</p>
                  <p className="text-xs text-muted-foreground">{outfit.items.length} pieces</p>
                </div>
                {winnerId === outfit.id && (
                  <Check size={16} className="ml-auto text-[#C9A96E]" />
                )}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToFavorites}
              onChange={(e) => setSaveToFavorites(e.target.checked)}
              className="w-4 h-4 accent-[#C9A96E]"
            />
            <span className="text-sm">Save winner to Favorites</span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Plan to calendar date
            </label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 text-white"
              style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
              disabled={!winnerId || isClosing}
              onClick={() => {
                if (winnerId) onClose(winnerId, saveToFavorites, planDate);
              }}
            >
              {isClosing ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Closing...</>
              ) : (
                "Confirm Winner"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Celebration Banner ────────────────────────────────────────────────────────

function CelebrationBanner({ winnerName }: { winnerName: string }) {
  return (
    <div
      className="rounded-2xl p-5 text-center mb-4"
      style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
    >
      <div className="text-4xl mb-2">🏆</div>
      <p className="text-xs font-bold tracking-widest text-white/70 mb-1">WINNER</p>
      <h3 className="text-white font-bold text-xl">{winnerName}</h3>
      <p className="text-white/70 text-sm mt-1">Winner saved!</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompareSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const myUserId = sessionData?.user?.id ?? null;

  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationName, setCelebrationName] = useState("");

  const { data: session, isLoading } = useQuery<BackendSession>({
    queryKey: ["couple-session", id],
    queryFn: () => api.get<BackendSession>(`/api/couple/sessions/${id}`),
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: (data: { outfitId: string; reaction: string; comment: string }) =>
      api.post(`/api/couple/sessions/${id}/vote`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple-session", id] });
      toast.success("Vote recorded!");
    },
    onError: () => toast.error("Failed to record vote"),
  });

  const closeMutation = useMutation({
    mutationFn: (data: { winnerOutfitId: string; autoSaveToFavorites: boolean; autoPlaneToCalendar: boolean }) =>
      api.post<BackendSession>(`/api/couple/sessions/${id}/close`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["couple-session", id] });
      queryClient.invalidateQueries({ queryKey: ["couple-sessions"] });
      const winnerOutfit = data?.options?.find((o) => o.outfit.id === data.winnerOutfitId);
      const name = winnerOutfit?.outfit.name ?? "Winner";
      setCelebrationName(name);
      setShowCelebration(true);
      setWinnerDialogOpen(false);
      toast.success(`${name} wins!`);
      setTimeout(() => {
        navigate("/couple");
      }, 3000);
    },
    onError: () => toast.error("Failed to close session"),
  });

  function handleVote(outfitId: string, reaction: string, comment: string) {
    voteMutation.mutate({ outfitId, reaction, comment });
  }

  function handleCloseSession(winnerId: string, saveToFavorites: boolean, planDate: string) {
    closeMutation.mutate({
      winnerOutfitId: winnerId,
      autoSaveToFavorites: saveToFavorites,
      autoPlaneToCalendar: !!planDate,
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-semibold mb-2">Session not found</p>
          <button
            onClick={() => navigate("/couple")}
            className="text-sm text-accent underline"
          >
            Back to Couple Mode
          </button>
        </div>
      </div>
    );
  }

  // Extract outfits from options (sorted by position)
  const outfits = (session.options ?? [])
    .sort((a, b) => a.position - b.position)
    .map((o) => o.outfit);

  // Identify my vote and partner's vote
  const myVote: VoteData | null = myUserId
    ? (session.votes?.find((v) => v.votedByUserId === myUserId) ?? null)
    : null;
  const partnerVote: VoteData | null = myUserId
    ? (session.votes?.find((v) => v.votedByUserId !== myUserId) ?? null)
    : null;

  const currentOutfit = outfits[activeOutfitIndex];
  const canShowClose =
    session.status === "voted" ||
    (session.status === "open" && (myVote !== null || partnerVote !== null));

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/couple")}
          className="w-9 h-9 bg-card rounded-full flex items-center justify-center shadow-sm border border-border"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-base">Compare Session</p>
            <StatusBadge status={session.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(session.createdAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })}
            {session.calendarDate ? ` · Planned for ${session.calendarDate}` : ""}
          </p>
        </div>
      </div>

      <div className="px-4 pb-32">
        {/* Celebration */}
        {showCelebration && (
          <CelebrationBanner winnerName={celebrationName} />
        )}

        {/* Outfit Carousel */}
        {outfits.length > 0 && currentOutfit && (
          <>
            {/* Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setActiveOutfitIndex((i) => Math.max(0, i - 1))}
                disabled={activeOutfitIndex === 0}
                className="w-9 h-9 bg-card rounded-full flex items-center justify-center border border-border disabled:opacity-30 transition-opacity"
              >
                <ArrowLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-muted-foreground">
                Outfit {activeOutfitIndex + 1} of {outfits.length}
              </p>
              <button
                onClick={() => setActiveOutfitIndex((i) => Math.min(outfits.length - 1, i + 1))}
                disabled={activeOutfitIndex === outfits.length - 1}
                className="w-9 h-9 bg-card rounded-full flex items-center justify-center border border-border disabled:opacity-30 transition-opacity"
              >
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 mb-4">
              {outfits.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveOutfitIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === activeOutfitIndex ? "w-6 bg-[#C9A96E]" : "w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Current outfit */}
            <OutfitCard outfit={currentOutfit} />

            {/* Voting */}
            {session.status !== "closed" && (
              <VotingPanel
                outfit={currentOutfit}
                myVote={myVote}
                partnerVote={partnerVote}
                onVote={handleVote}
                isVoting={voteMutation.isPending}
                sessionStatus={session.status}
              />
            )}

            {/* Winner display for closed session */}
            {session.status === "closed" && session.winnerOutfitId && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
                <Trophy size={22} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-600 mb-0.5">WINNER</p>
                  <p className="text-sm font-semibold">
                    {outfits.find((o) => o.id === session.winnerOutfitId)?.name ?? "Outfit"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* All outfits summary strip */}
        {session.status !== "closed" && outfits.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">All Outfits</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {outfits.map((outfit, i) => (
                <button
                  key={outfit.id}
                  onClick={() => setActiveOutfitIndex(i)}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                    i === activeOutfitIndex ? "border-[#C9A96E]" : "border-border bg-card"
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-xl"
                    style={{
                      backgroundColor: outfit.items[0]?.clothingItem.color ?? "#555",
                      backgroundImage: outfit.items[0]?.clothingItem.imageUrl
                        ? `url(${outfit.items[0].clothingItem.imageUrl})`
                        : undefined,
                      backgroundSize: "cover",
                    }}
                  />
                  <p className="text-[10px] font-medium text-center max-w-[64px] truncate">{outfit.name}</p>
                  {myVote?.outfitId === outfit.id && (
                    <span className="text-[10px] text-[#C9A96E] font-bold">Your vote</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pick a Winner */}
        {canShowClose && !showCelebration && (
          <div className="mt-6">
            <button
              onClick={() => setWinnerDialogOpen(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)" }}
            >
              <Trophy size={16} /> Pick a Winner
            </button>
          </div>
        )}
      </div>

      {/* Winner Dialog */}
      {session && (
        <WinnerDialog
          open={winnerDialogOpen}
          onOpenChange={setWinnerDialogOpen}
          outfits={outfits}
          calendarDate={session.calendarDate}
          onClose={handleCloseSession}
          isClosing={closeMutation.isPending}
        />
      )}
    </div>
  );
}
