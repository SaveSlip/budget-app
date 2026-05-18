"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, User, CheckCircle } from "lucide-react";
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
  completeOnboarding,
} from "@/app/actions/onboarding";
import { saveOnboardingLimits } from "@/app/actions/categories";
import { UNIVERSAL_CATEGORIES } from "@/lib/constants/categories";

type Step = "name" | "budgets";

const STEP_TOTALS: Record<Step, number> = {
  name: 2,
  budgets: 2,
};

const STEP_NUMBERS: Record<Step, number> = {
  name: 1,
  budgets: 2,
};

export function OnboardingFlow() {
  const router = useRouter();
  const { update } = useSession();

  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>(
    () => Object.fromEntries(UNIVERSAL_CATEGORIES.map((uc) => [uc.id, ""]))
  );

  const clearError = () => setError(null);

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
    await update({ refreshName: true });
    setIsLoading(false);
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
    router.push("/dashboard");
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

          {/* Done indicator (shown briefly before redirect) */}
          {false && (
            <CardHeader className="space-y-1 pt-8 pb-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
              </div>
            </CardHeader>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
