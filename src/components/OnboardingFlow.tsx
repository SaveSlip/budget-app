"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Home, Users, Copy, CheckCircle, Loader2, User } from "lucide-react";
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
  createHouseholdWithPin,
  joinHouseholdByPin,
  completeOnboarding,
} from "@/app/actions/onboarding";

type Step = "name" | "role" | "master" | "member" | "done";

const STEP_TOTALS: Record<Step, number> = {
  name: 1,
  role: 2,
  master: 3,
  member: 3,
  done: 3,
};

export function OnboardingFlow() {
  const router = useRouter();
  const { update } = useSession();

  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [pin, setPin] = useState("");
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const clearError = () => setError(null);

  const handleNameSubmit = async () => {
    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setIsLoading(true);
    clearError();
    const result = await updateUserName(displayName.trim());
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("role");
  };

  const handleMasterSubmit = async () => {
    if (!householdName.trim()) {
      setError("Please enter a household name.");
      return;
    }
    setIsLoading(true);
    clearError();
    const result = await createHouseholdWithPin(householdName.trim());
    if (result.error) {
      setIsLoading(false);
      setError(result.error);
      return;
    }
    await completeOnboarding();
    setIsLoading(false);
    setRevealedPin(result.pin!);
    setStep("done");
  };

  const handleMemberSubmit = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError("PIN must be exactly 6 digits.");
      return;
    }
    setIsLoading(true);
    clearError();
    const result = await joinHouseholdByPin(pin);
    if (result.error) {
      setIsLoading(false);
      setError(result.error);
      return;
    }
    await completeOnboarding();
    await update({ refreshHousehold: true });
    setIsLoading(false);
    router.push("/dashboard");
  };

  const handleCopyPin = () => {
    if (revealedPin) {
      navigator.clipboard.writeText(revealedPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stepNumber = step === "done" ? 3 : STEP_TOTALS[step];
  const totalSteps = step === "member" || step === "master" || step === "done" ? 3 : STEP_TOTALS[step];

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
                  Step {stepNumber} of {totalSteps}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
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
                  Set up your own household or join one that already exists.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={() => { clearError(); setStep("master"); }}
                  className="w-full p-4 rounded-xl border-2 border-border bg-background/40 hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Home className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        Create a Household
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        You&apos;re the household master. Get a PIN to share with
                        family members.
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => { clearError(); setStep("member"); }}
                  className="w-full p-4 rounded-xl border-2 border-border bg-background/40 hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        Join a Household
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        Enter the PIN your household master shared with you.
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
                  This is how your household will appear to members who join.
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

          {/* Step: Member — enter PIN */}
          {step === "member" && (
            <>
              <CardHeader className="space-y-1 pt-5 pb-4">
                <CardTitle className="text-xl font-bold text-foreground">
                  Enter your household PIN
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Ask your household master for the 6-digit PIN to join their
                  account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium">
                    {error}
                  </div>
                )}
                <Input
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleMemberSubmit()}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-mono bg-muted border-border text-foreground focus:ring-primary focus:border-primary"
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Your household master can find this PIN in their profile
                  settings.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pb-8">
                <Button
                  onClick={handleMemberSubmit}
                  disabled={isLoading || pin.length !== 6}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Join Household"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { clearError(); setPin(""); setStep("role"); }}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step: Done — PIN reveal for master */}
          {step === "done" && revealedPin && (
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
                  Share this PIN with family members so they can join your
                  household. You can always find it again in your profile
                  settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 rounded-xl border-2 border-primary/20 bg-primary/5 text-center space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Household PIN
                  </p>
                  <p className="text-4xl font-mono font-bold tracking-[0.4em] text-foreground">
                    {revealedPin}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPin}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy PIN
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="pb-8">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
                >
                  Go to Dashboard →
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
