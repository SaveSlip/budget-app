"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/FadeIn";
import { GlassCard } from "@/components/GlassCard";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Loader2,
  Moon,
  Sun,
  Monitor,
  Save,
  CreditCard,
  Users,
  Copy,
  CheckCircle,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { updateUserName } from "@/app/actions/onboarding";
import { deleteAccount } from "@/app/actions/auth";

interface ProfileSettingsClientProps {
  initialName: string;
  email: string;
  householdPin?: string;
  isMaster?: boolean;
}

export function ProfileSettingsClient({
  initialName,
  email,
  householdPin,
  isMaster,
}: ProfileSettingsClientProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { theme, setTheme } = useTheme();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    const result = await updateUserName(name.trim());

    setIsSaving(false);
    if (result.error) {
      setSaveError(result.error);
    } else {
      setSaveMessage("Profile saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");
    const result = await deleteAccount();
    if (result.error) {
      setDeleteError(result.error);
      setIsDeleting(false);
    } else {
      router.push("/signin");
    }
  };

  const handleCopyPin = () => {
    if (householdPin) {
      navigator.clipboard.writeText(householdPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 pb-12">
      <FadeIn delay={0.1}>
        <div className="flex items-center">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </FadeIn>

      <div className="grid gap-6 md:grid-cols-12">
        {/* LEFT COLUMN: Navigation Sidebar */}
        <div className="md:col-span-4 space-y-2">
          <FadeIn delay={0.2}>
            <div className="flex flex-col gap-1 sticky top-24">
              <Link href="/dashboard/settings/profile">
                <Button
                  variant="secondary"
                  className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                >
                  <User className="w-4 h-4 mr-2" /> Profile
                </Button>
              </Link>
              <Link href="/dashboard/settings/accounts">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  <CreditCard className="w-4 h-4 mr-2" /> Accounts
                </Button>
              </Link>
              <Link href="/dashboard/settings/household">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  <Users className="w-4 h-4 mr-2" /> Household
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* RIGHT COLUMN: Settings Forms */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* Personal Info */}
          <FadeIn delay={0.3}>
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-foreground">
                  Personal Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Update your identity on the mainframe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 bg-background/40 border-foreground/10 text-foreground focus:border-primary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={email}
                        readOnly
                        className="pl-10 bg-background/20 border-foreground/10 text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <div className="h-5">
                      {saveError && (
                        <p className="text-sm text-destructive font-medium">
                          {saveError}
                        </p>
                      )}
                      {saveMessage && (
                        <p className="text-sm text-primary font-medium">
                          {saveMessage}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-30"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" /> Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </GlassCard>
          </FadeIn>

          {/* Security */}
          <FadeIn delay={0.4}>
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-foreground">Security</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage your Zero-Trust credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-background/40 border-foreground/10 text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Leave blank to keep current"
                      className="pl-10 bg-background/40 border-foreground/10 text-foreground"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-background/20 border-t border-foreground/5 mt-4 pt-6">
                <Button
                  variant="outline"
                  className="border-foreground/10 text-muted-foreground hover:text-foreground hover:bg-foreground/5 ml-auto"
                >
                  Update Password
                </Button>
              </CardFooter>
            </GlassCard>
          </FadeIn>

          {/* Preferences */}
          <FadeIn delay={0.5}>
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-foreground">Preferences</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Customize your dashboard experience.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg bg-background/20">
                  <div className="space-y-0.5">
                    <div className="font-medium text-foreground">
                      Theme Preference
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Toggle between Dark and Light mode.
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-md border border-border">
                    <button
                      onClick={() => setTheme("light")}
                      aria-label="Light mode"
                      className={`flex-1 flex justify-center p-1.5 rounded text-muted-foreground hover:text-foreground ${theme === "light" ? "bg-card shadow-sm text-foreground" : ""}`}
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      aria-label="System theme"
                      className={`flex-1 flex justify-center p-1.5 rounded text-muted-foreground hover:text-foreground ${theme === "system" ? "bg-card shadow-sm text-foreground" : ""}`}
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      aria-label="Dark mode"
                      className={`flex-1 flex justify-center p-1.5 rounded text-muted-foreground hover:text-foreground ${theme === "dark" ? "bg-card shadow-sm text-foreground" : ""}`}
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </GlassCard>
          </FadeIn>

          {/* Household PIN — master only */}
          {householdPin && (
            <FadeIn delay={0.6}>
              <GlassCard>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                      <KeyRound className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground">
                        Household PIN
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Share this code with family members so they can join
                        your household.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-5 rounded-xl border-2 border-primary/20 bg-primary/5">
                    <p className="text-3xl font-mono font-bold tracking-[0.4em] text-foreground">
                      {householdPin}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPin}
                      className="border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />{" "}
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Members who sign up for Budgify can enter this PIN during
                    onboarding to link their account to your household.
                  </p>
                </CardContent>
              </GlassCard>
            </FadeIn>
          )}

          {/* Danger Zone */}
          <FadeIn delay={0.7}>
            <GlassCard className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Danger Zone</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Permanently delete your account and all associated data.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Once you delete your account, all your transactions, accounts, categories, and settings will be permanently removed. This action cannot be undone.
                </p>
                {isMaster && (
                  <p className="text-sm text-destructive font-medium">
                    As a household master, your entire household and all member records will also be permanently deleted.
                  </p>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="mt-2"
                >
                  Delete Account
                </Button>
              </CardContent>
            </GlassCard>
          </FadeIn>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Delete Account?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently delete your account and all associated data. This action is <strong className="text-foreground">irreversible</strong>.
            </p>
            {isMaster && (
              <p className="text-sm text-destructive">
                Your household and all its member records will also be deleted.
              </p>
            )}
            {deleteError && (
              <p className="text-sm text-destructive font-medium">{deleteError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteDialog(false); setDeleteError(""); }}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                ) : (
                  "Yes, delete my account"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
