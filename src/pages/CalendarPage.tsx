import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { CalendarEntry, Outfit } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plane, Sparkles, CalendarDays, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(getDaysInMonth(year, month)).padStart(2, "0")}`;

  const { data: entries } = useQuery({
    queryKey: ["calendar", year, month],
    queryFn: () =>
      api.get<CalendarEntry[]>(`/api/calendar?startDate=${startDate}&endDate=${endDate}`),
  });

  const { data: outfits } = useQuery({
    queryKey: ["outfits"],
    queryFn: () => api.get<Outfit[]>("/api/outfits"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ date, outfitId }: { date: string; outfitId: string | null }) => {
      const existing = entries?.find((e) => e.date === date);
      if (existing) {
        return api.put<CalendarEntry>(`/api/calendar/${existing.id}`, { outfitId });
      }
      return api.post<CalendarEntry>("/api/calendar", { date, outfitId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Calendar updated!");
    },
    onError: () => toast.error("Failed to update calendar"),
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setSheetOpen(true);
  }

  const entryMap = new Map(entries?.map((e) => [e.date, e]) ?? []);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const selectedEntry = selectedDate ? entryMap.get(selectedDate) : null;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <Layout>
      <div className="px-4 pt-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plan Ahead</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Schedule your outfits</p>
          </div>
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-border">
            <Plane size={18} className="text-foreground" />
          </button>
        </div>

        {/* Month nav */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-base">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={`${d}-${i}`} className="py-1.5 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const entry = entryMap.get(dateStr);
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="flex flex-col items-center py-1 relative"
                >
                  <span
                    className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all",
                      isToday
                        ? "bg-accent text-white font-bold"
                        : entry?.outfit
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {day}
                  </span>
                  {entry?.outfit && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Packing Assistant CTA - blue/purple gradient */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #5B73E8 0%, #7B5EAE 50%, #9B4FC4 100%)" }}
        >
          <div className="relative z-10">
            <span className="text-xs font-bold tracking-widest text-white/80 bg-white/20 px-2 py-1 rounded-full">
              PACKING ASSISTANT
            </span>
            <h3 className="text-white font-bold text-lg mt-2 mb-1">
              Plan for your next trip
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Never overpack or forget essentials
            </p>
            <button
              onClick={() => navigate("/packing")}
              className="bg-white text-purple-600 px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
            >
              Start packing
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
            <Plane size={80} className="text-white" />
          </div>
        </div>
      </div>

      {/* Day detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-5">
            <SheetTitle>
              {selectedDate
                ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Select a day"}
            </SheetTitle>
          </SheetHeader>

          {selectedDate && (
            <div className="space-y-5 pb-4">
              {/* Current outfit */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Planned Outfit
                </p>
                {selectedEntry?.outfit ? (
                  <div className="bg-secondary rounded-xl p-4 flex items-center gap-3">
                    <Sparkles size={16} className="text-accent shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{selectedEntry.outfit.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedEntry.outfit.items.length} pieces</p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-xl p-5 text-center">
                    <CalendarDays size={24} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No outfit planned</p>
                  </div>
                )}
              </div>

              {/* Assign outfit */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Assign Outfit
                </p>
                <Select
                  value={selectedEntry?.outfitId ?? "none"}
                  onValueChange={(val) =>
                    assignMutation.mutate({
                      date: selectedDate,
                      outfitId: val === "none" ? null : val,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an outfit..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground">
                      No outfit
                    </SelectItem>
                    {outfits?.map((outfit) => (
                      <SelectItem key={outfit.id} value={outfit.id}>
                        {outfit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
