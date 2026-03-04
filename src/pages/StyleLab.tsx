import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { ClothingItem, Outfit, OutfitSuggestion } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Plus, ArrowRight, Save, X, User, Lightbulb, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WeatherData {
  name: string;
  sys?: { country?: string };
  main?: { temp?: number; feels_like?: number; humidity?: number };
  weather?: Array<{ id?: number; description?: string; main?: string }>;
  wind?: { speed?: number };
}

function getWeatherEmoji(id?: number): string {
  if (!id) return "🌡️";
  if (id >= 200 && id < 300) return "⛈️";
  if (id >= 300 && id < 400) return "🌦️";
  if (id >= 500 && id < 600) return "🌧️";
  if (id >= 600 && id < 700) return "❄️";
  if (id >= 700 && id < 800) return "🌫️";
  if (id === 800) return "☀️";
  if (id === 801 || id === 802) return "⛅";
  if (id === 803 || id === 804) return "☁️";
  return "🌡️";
}

function mapWeatherToCategory(data: WeatherData): string | null {
  const id = data.weather?.[0]?.id;
  const temp = data.main?.temp ?? 20;
  if (!id) return null;
  if (id >= 500 && id < 700) return "rainy";
  if (id >= 600 && id < 700) return "cold";
  if (temp < 10) return "cold";
  if (id === 800 || id === 801) return "sunny";
  if (id >= 802) return "cloudy";
  return "sunny";
}

const MOODS = [
  { id: "cute", label: "Cute", emoji: "🎀" },
  { id: "classy", label: "Classy", emoji: "✨" },
  { id: "comfy", label: "Comfy", emoji: "☁️" },
  { id: "date-night", label: "Date Night", emoji: "💋" },
  { id: "boss-girl", label: "Boss Girl", emoji: "👑" },
  { id: "sporty", label: "Sporty", emoji: "🏃" },
];

const WEATHER = [
  { id: "sunny", label: "Sunny", emoji: "☀️" },
  { id: "cloudy", label: "Cloudy", emoji: "☁️" },
  { id: "rainy", label: "Rainy", emoji: "🌧️" },
  { id: "cold", label: "Cold", emoji: "❄️" },
];

export default function StyleLab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [activeWeather, setActiveWeather] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const { data: wardrobe } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: () => api.get<ClothingItem[]>("/api/wardrobe"),
  });

  const suggestMutation = useMutation({
    mutationFn: () =>
      api.get<OutfitSuggestion>("/api/outfits/suggest"),
    onSuccess: (data) => {
      setSelectedItems(data.items);
      toast.success("Outfit suggested!");
    },
    onError: () => toast.error("Add some clothes to your wardrobe first"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; itemIds: string[]; mood?: string }) =>
      api.post<Outfit>("/api/outfits", {
        name: data.name,
        itemIds: data.itemIds,
        mood: data.mood,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Outfit saved!");
      setSaveDialogOpen(false);
      setOutfitName("");
      setSelectedItems([]);
    },
    onError: () => toast.error("Failed to save outfit"),
  });

  const hasWardrobe = (wardrobe ?? []).length > 0;

  function fetchWeather() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLoadingWeather(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const data = await api.get<WeatherData>(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&units=metric`
          );
          setWeatherData(data);
          const category = mapWeatherToCategory(data);
          if (category) setActiveWeather(category);
          toast.success("Weather updated!");
        } catch {
          toast.error("Could not fetch weather");
        } finally {
          setLoadingWeather(false);
        }
      },
      () => {
        toast.error("Location access denied");
        setLoadingWeather(false);
      }
    );
  }

  return (
    <Layout>
      <div className="px-4 pt-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Style Lab</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Mix, match &amp; create</p>
          </div>
          <button
            onClick={() => setSaveDialogOpen(true)}
            className="bg-foreground text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={14} />
            New
          </button>
        </div>

        {/* Mood section */}
        <div className="mb-5">
          <p className="text-sm font-semibold mb-3">What's your vibe today?</p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setActiveMood(activeMood === mood.id ? null : mood.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all border",
                  activeMood === mood.id
                    ? "bg-foreground text-white border-foreground"
                    : "bg-white text-foreground border-border"
                )}
              >
                <span>{mood.emoji}</span>
                {mood.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weather section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Weather</p>
            <button
              onClick={fetchWeather}
              disabled={loadingWeather}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-border text-foreground disabled:opacity-50"
            >
              {loadingWeather ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <MapPin size={11} />
              )}
              {loadingWeather ? "Fetching..." : "Get weather"}
            </button>
          </div>

          {/* Real weather pill */}
          {weatherData && weatherData.main && weatherData.weather && (
            <div className="flex items-center gap-2 mb-3 bg-white border border-border rounded-full px-3 py-1.5 text-xs w-fit">
              <MapPin size={11} className="text-accent shrink-0" />
              <span className="font-medium">
                {weatherData.name}{weatherData.sys?.country ? `, ${weatherData.sys.country}` : ""}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold">{Math.round(weatherData.main.temp ?? 0)}°C</span>
              <span>{getWeatherEmoji(weatherData.weather[0]?.id)}</span>
              <span className="text-muted-foreground capitalize">{weatherData.weather[0]?.description}</span>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {WEATHER.map((w) => (
              <button
                key={w.id}
                onClick={() => setActiveWeather(activeWeather === w.id ? null : w.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all border",
                  activeWeather === w.id
                    ? "bg-foreground text-white border-foreground"
                    : "bg-white text-foreground border-border"
                )}
              >
                <span>{w.emoji}</span>
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Your Outfit section */}
        <div className="mb-5">
          <p className="text-sm font-semibold mb-3">Your Outfit</p>
          {!hasWardrobe ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground mb-3">
                Add some clothes to your wardrobe first!
              </p>
              <button
                onClick={() => navigate("/wardrobe")}
                className="bg-foreground text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                Go to Wardrobe
              </button>
            </div>
          ) : selectedItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <Sparkles size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Tap "Get AI Suggestions" below to build an outfit
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex gap-2 flex-wrap mb-3">
                {selectedItems.map((item) => (
                  <div key={item.id} className="relative">
                    <div
                      className="w-16 h-16 rounded-xl border border-border"
                      style={{
                        backgroundColor: item.imageUrl ? undefined : item.color,
                        backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <button
                      onClick={() => setSelectedItems((prev) => prev.filter((i) => i.id !== item.id))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-white rounded-full flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className="flex-1 bg-foreground text-white py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-1.5"
                >
                  <Save size={14} />
                  Save Outfit
                </button>
                <button
                  onClick={() => setSelectedItems([])}
                  className="px-4 py-2.5 rounded-full text-sm font-medium border border-border bg-white"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Outfit of the Day CTA */}
        <div className="bg-foreground rounded-2xl p-5 mb-4 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-xs font-bold tracking-widest text-accent bg-accent/20 px-2 py-1 rounded-full">
              OUTFIT OF THE DAY
            </span>
            <h3 className="text-white font-bold text-lg mt-2 mb-1">
              Get AI-powered suggestions
            </h3>
            <p className="text-white/60 text-sm mb-4">
              Based on your mood, weather &amp; style
            </p>
            <button
              onClick={() => suggestMutation.mutate()}
              disabled={suggestMutation.isPending}
              className="bg-accent px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
              style={{ color: "#3B1F6B" }}
            >
              <Sparkles size={14} style={{ color: "#3B1F6B" }} />
              {suggestMutation.isPending ? "Generating..." : "Generate Outfit"}
              <ArrowRight size={14} style={{ color: "#3B1F6B" }} />
            </button>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
            <Sparkles size={80} className="text-white" />
          </div>
        </div>

        {/* Two smaller feature cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="bg-[#3B4A9E] rounded-2xl p-4 text-white cursor-pointer active:scale-95 transition-transform"
            onClick={() => navigate("/outfit-studio")}
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <User size={20} className="text-white" />
            </div>
            <p className="font-semibold text-sm leading-tight">Outfit Studio</p>
            <p className="text-white/60 text-xs mt-1">Try on a mannequin</p>
          </div>
          <div className="bg-[#C4517A] rounded-2xl p-4 text-white cursor-pointer active:scale-95 transition-transform" onClick={() => navigate("/inspired")}>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <Lightbulb size={20} className="text-white" />
            </div>
            <p className="font-semibold text-sm leading-tight">Get Inspired</p>
            <p className="text-white/60 text-xs mt-1">Browse style ideas</p>
          </div>
        </div>
      </div>

      {/* Save outfit dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Save Outfit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="e.g. Sunday Brunch Look"
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!outfitName.trim() || saveMutation.isPending || selectedItems.length === 0}
                onClick={() =>
                  saveMutation.mutate({
                    name: outfitName,
                    itemIds: selectedItems.map((i) => i.id),
                    mood: activeMood ?? undefined,
                  })
                }
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
