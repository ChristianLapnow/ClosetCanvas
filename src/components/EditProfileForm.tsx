import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface UpdateProfileInput {
  name?: string;
  email?: string;
}

interface EditProfileFormProps {
  name: string;
  email: string;
}

export function EditProfileForm({ name, email }: EditProfileFormProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState(name);
  const [formEmail, setFormEmail] = useState(email);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      api.patch<UserProfile>("/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Profile updated successfully.");
      setEditing(false);
      setErrors({});
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update profile. Try again.");
    },
  });

  function validate(): boolean {
    const newErrors: { name?: string; email?: string } = {};
    if (formName.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    }
    if (formName.trim().length > 50) {
      newErrors.name = "Name must be at most 50 characters.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleCancel() {
    setFormName(name);
    setFormEmail(email);
    setErrors({});
    setEditing(false);
  }

  function handleSave() {
    if (!validate()) return;
    const payload: UpdateProfileInput = {};
    if (formName.trim() !== name) payload.name = formName.trim();
    if (formEmail.trim() !== email) payload.email = formEmail.trim();
    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }
    mutation.mutate(payload);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <User size={14} className="text-accent" />
          </div>
          <h3 className="font-bold text-sm">Edit Profile</h3>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-full active:bg-accent/20 transition-colors"
          >
            <Pencil size={11} />
            Edit
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Name field */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <User size={11} /> Name
          </Label>
          {editing ? (
            <div>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Your name"
                className={`h-10 text-sm ${errors.name ? "border-destructive" : ""}`}
                disabled={mutation.isPending}
              />
              {errors.name ? (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 rounded-lg">
              <span className="text-sm font-medium">{name || "—"}</span>
            </div>
          )}
        </div>

        {/* Email field */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Mail size={11} /> Email
          </Label>
          {editing ? (
            <div>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="your@email.com"
                className={`h-10 text-sm ${errors.email ? "border-destructive" : ""}`}
                disabled={mutation.isPending}
              />
              {errors.email ? (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">{email || "—"}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {editing && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10 gap-1.5"
              onClick={handleCancel}
              disabled={mutation.isPending}
            >
              <X size={13} />
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 h-10 gap-1.5 bg-accent hover:bg-accent/90"
              onClick={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  <Check size={13} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
