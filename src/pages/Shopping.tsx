import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { ShoppingItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, Plus, ExternalLink, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const addSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["tops", "pants", "shorts", "dresses", "outerwear", "shoes", "accessories", "bags"]),
  color: z.string().optional(),
  brand: z.string().optional(),
  price: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

type AddFormValues = z.infer<typeof addSchema>;

const priorityConfig = {
  high: { label: "High", className: "bg-red-100 text-red-700" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700" },
  low: { label: "Low", className: "bg-green-100 text-green-700" },
};

export default function Shopping() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [filterPurchased, setFilterPurchased] = useState<string>("pending");

  const params = new URLSearchParams();
  if (filterPurchased !== "all") params.set("isPurchased", filterPurchased === "purchased" ? "true" : "false");

  const { data: items, isLoading } = useQuery({
    queryKey: ["shopping", filterPurchased],
    queryFn: () => api.get<ShoppingItem[]>(`/api/shopping?${params.toString()}`),
  });

  const form = useForm<AddFormValues>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      name: "",
      category: "tops",
      color: "",
      brand: "",
      price: "",
      url: "",
      notes: "",
      priority: "medium",
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: AddFormValues) =>
      api.post<ShoppingItem>("/api/shopping", {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined,
        color: data.color || undefined,
        brand: data.brand || undefined,
        url: data.url || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Item added to wishlist!");
      form.reset();
      setAddOpen(false);
    },
    onError: () => toast.error("Failed to add item"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isPurchased }: { id: string; isPurchased: boolean }) =>
      api.put<ShoppingItem>(`/api/shopping/${id}`, { isPurchased }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast.error("Failed to update item"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/shopping/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Item removed");
    },
    onError: () => toast.error("Failed to remove item"),
  });

  const displayItems = items ?? [];

  return (
    <Layout>
      <div className="px-4 pt-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wishlist</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track items you want to buy</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="bg-foreground text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {["pending", "purchased", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterPurchased(f)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all capitalize",
                filterPurchased === f
                  ? "bg-foreground text-white"
                  : "bg-white text-foreground border border-border"
              )}
            >
              {f === "pending" ? "To Buy" : f === "purchased" ? "Purchased" : "All"}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <ShoppingBag size={40} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Your wishlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Add items you want to buy to keep track of your wishlist
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="bg-foreground text-white px-6 py-3 rounded-full font-medium text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Add first item
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={(id, val) => toggleMutation.mutate({ id, isPurchased: val })}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>Add to Wishlist</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cream trench coat" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["tops", "pants", "shorts", "dresses", "outerwear", "shoes", "accessories", "bags"].map((c) => (
                            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Zara" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adding..." : "Add to List"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (id: string, isPurchased: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const priority = priorityConfig[item.priority];

  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-opacity",
        item.isPurchased && "opacity-60"
      )}
    >
      <button
        onClick={() => onToggle(item.id, !item.isPurchased)}
        className={cn(
          "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          item.isPurchased
            ? "bg-green-500 border-green-500 text-white"
            : "border-border hover:border-green-400"
        )}
      >
        {item.isPurchased && <Check size={14} strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn("font-semibold text-sm", item.isPurchased && "line-through text-muted-foreground")}>
            {item.name}
          </p>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priority.className)}>
            {priority.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {item.brand && (
            <span className="text-xs text-muted-foreground">{item.brand}</span>
          )}
          <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
          {item.price !== null && (
            <span className="text-xs text-accent font-semibold">${item.price}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={15} />
          </a>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
