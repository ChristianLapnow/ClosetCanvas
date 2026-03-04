import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface Requirement {
  label: string;
  test: (pw: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "At least one uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "At least one lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "At least one number", test: (pw) => /[0-9]/.test(pw) },
];

function getStrength(pw: string): { level: "weak" | "medium" | "strong"; score: number } {
  const score = REQUIREMENTS.filter((r) => r.test(pw)).length;
  if (score <= 1) return { level: "weak", score };
  if (score <= 3) return { level: "medium", score };
  return { level: "strong", score };
}

const STRENGTH_CONFIG = {
  weak: { label: "Weak", color: "bg-red-500", textColor: "text-red-500", bars: 1 },
  medium: { label: "Medium", color: "bg-amber-400", textColor: "text-amber-500", bars: 2 },
  strong: { label: "Strong", color: "bg-green-500", textColor: "text-green-600", bars: 3 },
};

interface ShowState {
  current: boolean;
  new: boolean;
  confirm: boolean;
}

export function ChangePasswordForm() {
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState<ShowState>({ current: false, new: false, confirm: false });
  const [errors, setErrors] = useState<Partial<Record<keyof ChangePasswordPayload, string>>>({});

  const strength = getStrength(newPassword);
  const strengthConfig = STRENGTH_CONFIG[strength.level];

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordPayload) =>
      api.patch<{ message: string }>("/api/profile/password", data),
    onSuccess: () => {
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setExpanded(false);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 429) {
        toast.error("Too many attempts. Please wait a moment and try again.");
      } else if (err instanceof Error) {
        toast.error(err.message || "Failed to change password. Try again.");
      } else {
        toast.error("Failed to change password. Try again.");
      }
    },
  });

  function validate(): boolean {
    const newErrors: Partial<Record<keyof ChangePasswordPayload, string>> = {};
    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required.";
    }
    if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one uppercase letter.";
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one lowercase letter.";
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one number.";
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    mutation.mutate({ currentPassword, newPassword, confirmPassword });
  }

  function handleToggle() {
    if (expanded) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    }
    setExpanded((v) => !v);
  }

  function toggleShow(field: keyof ShowState) {
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-4 active:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Lock size={14} className="text-blue-600" />
          </div>
          <h3 className="font-bold text-sm">Change Password</h3>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Current password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Lock size={11} /> Current Password
            </Label>
            <div className="relative">
              <Input
                type={show.current ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={`h-10 text-sm pr-10 ${errors.currentPassword ? "border-destructive" : ""}`}
                disabled={mutation.isPending}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => toggleShow("current")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.currentPassword ? (
              <p className="text-xs text-destructive">{errors.currentPassword}</p>
            ) : null}
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Lock size={11} /> New Password
            </Label>
            <div className="relative">
              <Input
                type={show.new ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={`h-10 text-sm pr-10 ${errors.newPassword ? "border-destructive" : ""}`}
                disabled={mutation.isPending}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => toggleShow("new")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {show.new ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.newPassword ? (
              <p className="text-xs text-destructive">{errors.newPassword}</p>
            ) : null}

            {/* Strength indicator — only shown when typing */}
            {newPassword.length > 0 && (
              <div className="space-y-2 pt-1">
                {/* Bar row */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          bar <= strengthConfig.bars ? strengthConfig.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-semibold ${strengthConfig.textColor}`}>
                    {strengthConfig.label}
                  </span>
                </div>

                {/* Requirements checklist */}
                <div className="grid grid-cols-2 gap-1">
                  {REQUIREMENTS.map((req) => {
                    const met = req.test(newPassword);
                    return (
                      <div key={req.label} className="flex items-center gap-1.5">
                        <div
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            met ? "bg-green-500" : "bg-muted"
                          }`}
                        >
                          {met ? (
                            <Check size={8} className="text-white" strokeWidth={3} />
                          ) : (
                            <X size={8} className="text-muted-foreground" strokeWidth={3} />
                          )}
                        </div>
                        <span
                          className={`text-xs transition-colors ${
                            met ? "text-green-600" : "text-muted-foreground"
                          }`}
                        >
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Lock size={11} /> Confirm New Password
            </Label>
            <div className="relative">
              <Input
                type={show.confirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`h-10 text-sm pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                disabled={mutation.isPending}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => toggleShow("confirm")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            ) : null}
            {/* Match indicator */}
            {confirmPassword.length > 0 && !errors.confirmPassword ? (
              <div className="flex items-center gap-1.5">
                {newPassword === confirmPassword ? (
                  <>
                    <Check size={12} className="text-green-500" strokeWidth={3} />
                    <span className="text-xs text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <X size={12} className="text-destructive" strokeWidth={3} />
                    <span className="text-xs text-destructive">Passwords do not match</span>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10 gap-1.5"
              onClick={handleToggle}
              disabled={mutation.isPending}
            >
              <X size={13} />
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 h-10 gap-1.5 bg-blue-600 hover:bg-blue-700"
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
                  Update Password
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
