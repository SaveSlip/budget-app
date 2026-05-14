"use client";

import { useState } from "react";
import Link from "next/link";
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
  Save,
  CreditCard,
  RefreshCw,
  Users,
} from "lucide-react";

export default function ProfileSettingsPage() {
  // Hardcoded fake data because our database is currently just vibes
  const [name, setName] = useState("Aman Brar");
  const [email, setEmail] = useState("admin@amanbrar.pro");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");

    // Fake the network request
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage("Profile securely encrypted and saved to AWS.");

      // Clear the success message after 3 seconds
      setTimeout(() => setSaveMessage(""), 3000);
    }, 1500);
  };

  const handleLightModeRejection = () => {
    alert(
      "Access Denied: Light mode is for spreadsheets. We are building a platform.",
    );
  };

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 pb-12">
      {/* Header and Back Button */}
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
        {/* LEFT COLUMN: Navigation Sidebar (Fake for now) */}
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
              <Link href="/dashboard/settings/recurring">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Recurring
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
              <Link href="/dashboard/settings/categories">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  Category Rules
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* RIGHT COLUMN: The Settings Forms */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* Form 1: Personal Info */}
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
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-background/40 border-foreground/10 text-foreground focus:border-primary/50"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <p className="text-sm text-primary font-medium h-5">
                      {saveMessage}
                    </p>
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

          {/* Form 2: Security (Password) */}
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

          {/* Form 3: Preferences (The Joke) */}
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
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-primary/20 text-primary cursor-default hover:bg-primary/20 hover:text-primary"
                    >
                      <Moon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLightModeRejection}
                    >
                      <Sun className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </GlassCard>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
