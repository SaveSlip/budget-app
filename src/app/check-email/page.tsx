"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, CheckCircle } from "lucide-react";
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
import ThemeToggle from "@/components/ThemeToggle";
import { resendVerificationEmail } from "@/app/actions/auth";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";
  const [manualEmail, setManualEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const email = emailParam || manualEmail;

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setResendMessage(null);
    setResendError(null);

    const result = await resendVerificationEmail(email);

    setIsResending(false);
    if (result.error === "This email is already verified. Please sign in.") {
      setResendMessage("Your email is already verified! Sign in to continue.");
    } else if (result.error) {
      setResendError(result.error);
    } else {
      setResendMessage("Verification email resent! Check your inbox.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md px-4 z-10">
        <FadeIn delay={0.1}>
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
            <CardHeader className="space-y-1 text-center pt-8 pb-4">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Check your inbox
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                {emailParam ? (
                  <>
                    We sent a verification link to{" "}
                    <span className="font-semibold text-foreground">
                      {emailParam}
                    </span>
                    . Click the link in that email to activate your account.
                  </>
                ) : (
                  "Enter your email address below to resend the verification link."
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pb-2">
              {resendError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md text-center font-medium">
                  {resendError}
                </div>
              )}
              {resendMessage && (
                <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-md text-center font-medium flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {resendMessage}
                </div>
              )}

              {!emailParam && (
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="bg-muted border-border text-foreground focus:ring-primary focus:border-primary"
                  disabled={isResending}
                />
              )}

              {emailParam && (
                <div className="p-4 bg-muted/50 rounded-lg border border-border text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">
                    Didn&apos;t receive an email?
                  </p>
                  <p>Check your spam or junk folder, or click below to resend.</p>
                </div>
              )}

              <Button
                onClick={handleResend}
                disabled={isResending || !email}
                variant="outline"
                className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  "Resend verification email"
                )}
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground pb-8 pt-4">
              <p>
                Already verified?{" "}
                <Link
                  href="/signin"
                  className="text-primary hover:text-primary/80 font-bold hover:underline"
                >
                  Sign in →
                </Link>
              </p>
            </CardFooter>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  );
}
