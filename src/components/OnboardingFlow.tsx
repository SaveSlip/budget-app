"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Users, Loader2, User, CheckCircle, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/FadeIn";
import {
  updateUserName,
  createHouseholdDuringOnboarding,
  completeOnboarding,
} from "@/app/actions/onboarding";
import { saveOnboardingLimits } from "@/app/actions/categories";
import { sendHouseholdInvite } from "@/app/actions/household";
import { UNIVERSAL_CATEGORIES } from "@/lib/constants/categories";

type Step = "name" | "role" | "master" | "budgets" | "done";

const STEP_TOTALS: Record<Step, number> = {
  name: 4,
  role: 4,
  master: 4,
  budgets: 4,
  done: 4,
};

const STEP_NUMBERS: Record<Step, number> = {
  name: 1,
  role: 2,
  master: 3,
  budgets: 4,
  done: 4,
};

export function OnboardingFlow({ isInvitedMember = false }: { isInvitedMember?: boolean }) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [isMasterFlow, setIsMasterFlow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>(
    () => Object.fromEntries(UNIVERSAL_CATEGORIES.map((uc) => [uc.id, ""]))
  );

  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  const clearError = () => setError(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    const result = await sendHouseholdInvite({ email: inviteEmail.trim() });
    setIsInviting(false);
    if (result.error) {
      setInviteError(result.error);
    } else {
      setInvitedEmails((prev) => [...prev, inviteEmail.trim()]);
      setInviteEmail("");
    }
  };

  const handleNameSubmit = async () => {
    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setIsLoading(true);
    clearError();
    const result = await updateUserName(displayName.trim());
    if (result.error) {
      setIsLoading(false);
      setError(result.error);
      return;
    }
    if (isInvitedMember) {
      await completeOnboarding();
      router.push("/dashboard");
      return;
    }
    setIsLoading(false);
    setStep("role");
  };

  const handleMasterSubmit = async () => {
    if (!householdName.trim()) {
      setError("Please enter a household name.");
      return;
    }
    setIsLoading(true);
    clearError();
    const result = await createHouseholdDuringOnboarding(householdName.trim());
    if (result.error) {
      setIsLoading(false);
      setError(result.error);
      return;
    }
    setIsLoading(false);
    setIsMasterFlow(true);
    setStep("budgets");
  };

  const handleSkipHousehold = () => {
    clearError();
    setIsMasterFlow(false);
    setStep("budgets");
  };

  const handleBudgetsSubmit = async () => {
    setIsLoading(true);
    clearError();
    const limits: Record<string, number> = {};
    for (const [id, val] of Object.entries(categoryLimits)) {
      const n = Number(val);
      if (val.trim() !== "" && !isNaN(n) && n > 0) limits[id] = n;
    }
    if (Object.keys(limits).length > 0) {
      await saveOnboardingLimits(limits);
    }
    await completeOnboarding();
    setIsLoading(false);
    if (isMasterFlow) {
      setStep("done");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <FadeIn delay={0.1}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 border border-primary/20 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Budgify
          </h1>
        </div>

        <Card className="border-border bg-card shadow-xl">
          {/* Progress indicator */}
          {step !== "done" && (
            <div className="px-6 pt-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Step {STEP_NUMBERS[step]} of {STEP_TOTALS[step]}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(STEP_NUMBERS[step] / STEP_TOTALS[step]) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Step: Name */}
          {step === "name" && (
            <>
              <CardHeader className="space-y-1 pt-5 pb-4">
                <CardTitle className="text-xl font-bold text-foreground">
                  What should we call you?
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  This name will appear throughout your Budgify account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium">
                    {error}
                  </div>
                )}
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                    placeholder="Your full name"
                    className="pl-10 bg-muted border-border text-foreground focus:ring-primary focus:border-primary"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="pb-8">
                <Button
                  onClick={handleNameSubmit}
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Continue"
                  )}
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step: Role */}
          {step === "role" && (
            <>
              <CardHeader className="space-y-1 pt-5 pb-4">
                <CardTitle className="text-xl font-bold text-foreground">
                  How would you like to use Budgify?
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Create a household for your family, or track your own budget solo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={() => { clearError(); setStep("master"); }}
                  className="w-full p-4 rounded-xl border-2 border-border bg-background/40 hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Home className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        Create a Household
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        You&apos;re the household admin. Invite family members by email to join.
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleSkipHousehold}
                  className="w-full p-4 rounded-xl border-2 border-border bg-background/40 hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        Solo Account
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        Track your own budget independently. You can join a household later if invited.
                      </div>
                    </div>
                  </div>
                </button>
              </CardContent>
              <CardFooter className="pb-8 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep("name")}
                  className="text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step: Master — create household */}
          {step === "master" && (
            <>
              <CardHeader className="space-y-1 pt-5 pb-4">
                <CardTitle className="text-xl font-bold text-foreground">
                  Name your household
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  This is how your household will appear to members you invite.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium">
                    {error}
                  </div>
                )}
                <div className="relative">
                  <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMasterSubmit()}
                    placeholder="e.g. The Johnson Family"
                    className="pl-10 bg-muted border-border text-foreground focus:ring-primary focus:border-primary"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pb-8">
                <Button
                  onClick={handleMasterSubmit}
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Household"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { clearError(); setStep("role"); }}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step: Budgets — set monthly limits */}
          {step === "budgets" && (
            <>
              <CardHeader className="space-y-1 pt-5 pb-3">
                <CardTitle className="text-xl font-bold text-foreground">
                  Set your monthly budgets
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter a monthly spending limit for each category. Leave blank to set later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-85 overflow-y-auto pr-1">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium mb-2">
                    {error}
                  </div>
                )}
                {UNIVERSAL_CATEGORIES.map((uc) => (
                  <div key={uc.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm font-medium text-foreground min-w-0 truncate flex-1">{uc.name}</span>
                    <div className="relative shrink-0 w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={categoryLimits[uc.id]}
                        onChange={(e) =>
                          setCategoryLimits((prev) => ({ ...prev, [uc.id]: e.target.value }))
                        }
                        className="w-full pl-6 pr-2 h-8 rounded-md border border-border bg-muted text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pb-8 pt-4">
                <Button
                  onClick={handleBudgetsSubmit}
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save & Continue"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleBudgetsSubmit}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 text-sm"
                >
                  Skip for now
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step: Done — household created */}
          {step === "done" && (
            <>
              <CardHeader className="space-y-1 pt-8 pb-4 text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    <CheckCircle className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-foreground">
                  Your household is ready!
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Invite family members by email — they&apos;ll receive a link to join your household.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      placeholder="member@email.com"
                      className="pl-10 bg-muted border-border text-foreground focus:ring-primary focus:border-primary"
                      disabled={isInviting}
                      autoFocus
                    />
                  </div>
                  <Button
                    onClick={handleInvite}
                    disabled={isInviting || !inviteEmail.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shrink-0"
                  >
                    {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                  </Button>
                </div>
                {inviteError && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 font-medium">
                    {inviteError}
                  </p>
                )}
                {invitedEmails.length > 0 && (
                  <div className="space-y-1.5">
                    {invitedEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2"
                      >
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pb-8 pt-2">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
                >
                  Go to Dashboard →
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  You can invite more members later from Settings.
                </p>
              </CardFooter>
            </>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
