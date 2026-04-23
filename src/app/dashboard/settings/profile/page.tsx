// src/app/dashboard/settings/profile/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/FadeIn";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Loader2,
  Moon,
  Sun,
  Save,
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
              className="text-slate-400 hover:text-white hover:bg-white/10"
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
                  className="w-full justify-start bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                >
                  <User className="w-4 h-4 mr-2" /> Profile
                </Button>
              </Link>
              <Link href="/dashboard/settings/categories">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5"
                >
                  {/* Re-using the layout logic to make it look like a real app */}
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
            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Personal Information
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Update your identity on the mainframe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 bg-black/40 border-white/10 text-white focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-black/40 border-white/10 text-white focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <p className="text-sm text-emerald-400 font-medium h-5">
                      {saveMessage}
                    </p>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[120px]"
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
            </Card>
          </FadeIn>

          {/* Form 2: Security (Password) */}
          <FadeIn delay={0.4}>
            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Security</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage your Zero-Trust credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-black/40 border-white/10 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="Leave blank to keep current"
                      className="pl-10 bg-black/40 border-white/10 text-white"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-black/20 border-t border-white/5 mt-4 pt-6">
                <Button
                  variant="outline"
                  className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 ml-auto"
                >
                  Update Password
                </Button>
              </CardFooter>
            </Card>
          </FadeIn>

          {/* Form 3: Preferences (The Joke) */}
          <FadeIn delay={0.5}>
            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Preferences</CardTitle>
                <CardDescription className="text-slate-400">
                  Customize your dashboard experience.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-black/20">
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-200">
                      Theme Preference
                    </div>
                    <div className="text-sm text-slate-500">
                      Toggle between Dark and Light mode.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-emerald-500/20 text-emerald-400 cursor-default hover:bg-emerald-500/20 hover:text-emerald-400"
                    >
                      <Moon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      onClick={handleLightModeRejection}
                    >
                      <Sun className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
