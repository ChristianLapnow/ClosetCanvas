import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Shirt, Sparkles, Heart, CalendarDays, User } from "lucide-react";

const navItems = [
  { path: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { path: "/style", label: "Style", icon: Sparkles },
  { path: "/favorites", label: "Favorites", icon: Heart },
  { path: "/plan", label: "Plan", icon: CalendarDays },
  { path: "/me", label: "Me", icon: User },
];

export function AppNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-t border-white/20 shadow-[0_-4px_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 min-w-[56px] py-1"
            >
              <div
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-2xl transition-all",
                  isActive
                    ? "bg-gradient-to-br from-[#C9A96E] to-[#A07850]"
                    : "bg-transparent"
                )}
              >
                <Icon
                  size={20}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-white" : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              <div
                className={cn(
                  "w-1 h-1 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-[#C9A96E] scale-100 opacity-100"
                    : "bg-transparent scale-0 opacity-0"
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
