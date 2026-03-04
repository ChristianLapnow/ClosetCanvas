import { ClothingItem } from "@/types";
import { Heart, Shirt, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClothingItemCardProps {
  item: ClothingItem;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
  onClick?: (item: ClothingItem) => void;
  isSelected?: boolean;
  onDelete?: (id: string) => void;
}

export function ClothingItemCard({
  item,
  onFavoriteToggle,
  onClick,
  isSelected,
  onDelete,
}: ClothingItemCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm",
        isSelected ? "ring-2 ring-accent" : "",
        onClick ? "hover:shadow-md" : ""
      )}
      onClick={() => onClick?.(item)}
    >
      {/* Image or placeholder */}
      <div className="aspect-[3/4] relative bg-secondary overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3"
            style={{ background: `linear-gradient(135deg, ${item.color}22, ${item.color}55)` }}>
            <div className="w-16 h-16 rounded-full border-4 border-white/60 shadow-inner"
              style={{ backgroundColor: item.color }} />
            <Shirt size={18} className="text-white/60" />
          </div>
        )}

        {/* Color dot overlay */}
        <div
          className="absolute bottom-2 left-2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: item.color }}
        />

        {/* Delete button */}
        {onDelete && (
          <button
            className="absolute top-2 left-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <Trash2 size={13} className="text-destructive" />
          </button>
        )}

        {/* Favorite button */}
        {onFavoriteToggle && (
          <button
            className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(item.id, !item.isFavorite);
            }}
          >
            <Heart
              size={13}
              className={cn(
                item.isFavorite ? "fill-pink-500 text-pink-500" : "text-muted-foreground"
              )}
            />
          </button>
        )}

        {item.isFavorite && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center group-hover:hidden shadow-sm">
            <Heart size={13} className="fill-pink-500 text-pink-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
        {item.brand && (
          <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded-full">
            {item.category}
          </span>
          {item.timesWorn > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {item.timesWorn}x
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
