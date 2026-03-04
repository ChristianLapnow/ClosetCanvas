import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { ClothingItem } from "@/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["tops", "pants", "shorts", "dresses", "outerwear", "shoes", "accessories", "bags"]),
  color: z.string().min(1, "Color is required"),
  season: z.enum(["spring", "summer", "fall", "winter", "all"]),
  occasion: z.enum(["casual", "formal", "work", "sport", "party", "all"]),
  brand: z.string().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  isFavorite: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemDialog({ open, onOpenChange }: AddItemDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", category: "tops", color: "#000000",
      season: "all", occasion: "casual",
      brand: "", imageUrl: "", notes: "", isFavorite: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post<ClothingItem>("/api/wardrobe", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Item added to your wardrobe!");
      form.reset();
      setPreviewUrl(null);
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to add item. Please try again."),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      const url = await uploadFile(file);
      form.setValue("imageUrl", url);
      setPreviewUrl(url);
      URL.revokeObjectURL(localUrl);
    } catch {
      toast.error("Photo upload failed. You can still add the item without a photo.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    setPreviewUrl(null);
    form.setValue("imageUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose(v: boolean) {
    if (!v) { setPreviewUrl(null); form.reset(); }
    onOpenChange(v);
  }

  function onSubmit(data: FormValues) {
    mutation.mutate({
      ...data,
      brand: data.brand || undefined,
      imageUrl: data.imageUrl || undefined,
      notes: data.notes || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-xl font-bold">Add to Wardrobe</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-5 pb-6 pt-4">

            {/* Photo Upload */}
            <div>
              <p className="text-sm font-medium mb-2">Photo</p>
              {previewUrl ? (
                <div className="relative w-full rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: "4/3" }}>
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={28} className="text-white animate-spin" />
                    </div>
                  )}
                  {!uploading && (
                    <button type="button" onClick={removePhoto}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
                      <X size={14} className="text-white" />
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-2 hover:bg-muted/60 transition-colors"
                  style={{ aspectRatio: "4/3" }}>
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Camera size={24} className="text-accent" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Take or upload a photo</p>
                  <p className="text-xs text-muted-foreground">Tap to choose from your gallery</p>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl><Input placeholder="e.g. White linen blazer" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Category + Color */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["tops","pants","shorts","dresses","outerwear","shoes","accessories","bags"].map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={field.value} onChange={field.onChange}
                        className="w-10 h-10 rounded-lg border border-input cursor-pointer shrink-0" />
                      <Input value={field.value} onChange={field.onChange} placeholder="#000000" className="flex-1" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Season + Occasion */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="season" render={({ field }) => (
                <FormItem>
                  <FormLabel>Season</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["all","spring","summer","fall","winter"].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="occasion" render={({ field }) => (
                <FormItem>
                  <FormLabel>Occasion</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["all","casual","formal","work","sport","party"].map(o => (
                        <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Brand */}
            <FormField control={form.control} name="brand" render={({ field }) => (
              <FormItem>
                <FormLabel>Brand <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Input placeholder="e.g. Zara, H&M, Vintage..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={mutation.isPending || uploading}>
                {uploading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Uploading...</>
                  : mutation.isPending ? <><Loader2 size={14} className="animate-spin mr-1.5" />Adding...</>
                  : <><ImagePlus size={14} className="mr-1.5" />Add Item</>}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
