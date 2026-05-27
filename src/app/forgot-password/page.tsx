// src/app/forgot-password/page.tsx
"use client";

import { useState, Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Mail, Loader2, Wallet, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  forgotPasswordSchema,
  ForgotPasswordInput,
} from "@/lib/validations/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn } from "@/components/FadeIn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forgotPasswordAction } from "@/app/actions/auth";

type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resendParam = searchParams.get("resend");
  const emailParam = searchParams.get("email") ?? "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    defaultValues: { email: "" },
  });

  // Auto-send when arriving from an expired/superseded reset link
  useEffect(() => {
    if (resendParam !== "1" || !emailParam) return;

    setIsSending(true);
    forgotPasswordAction({ email: emailParam })
      .then((response) => {
        const res = response as ActionResponse;
        if (res.error === "unverified") {
          router.replace(`/check-email?email=${encodeURIComponent(emailParam)}`);
        } else if (res.error) {
          setServerError(res.error ?? "Failed to send reset email.");
        } else {
          setSentEmail(emailParam);
          setIsSuccess(true);
        }
      })
      .catch(() => setServerError("Network error. Please try again."))
      .finally(() => setIsSending(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null);

    const parsed = forgotPasswordSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError("email", { message: issue.message });
      }
      return;
    }

    try {
      const response = (await forgotPasswordAction(parsed.data)) as ActionResponse;

      if (response.error === "unverified") {
        router.push(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
        return;
      }

      if (response.error) {
        setServerError(response.error);
        return;
      }

      setSentEmail(parsed.data.email);
      setIsSuccess(true);
    } catch {
      setServerError("Network error. Please try again.");
    }
  };

  // Loading state while auto-sending
  if (isSending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md px-4 z-10">
          <FadeIn delay={0.1}>
            <div className="flex flex-col items-center mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                <Wallet className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Budgify
              </h1>
              <p className="text-muted-foreground mt-2">
                Enterprise Financial Intelligence
              </p>
            </div>
            <Card className="border-border bg-card shadow-lg">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Sending reset link…</p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="w-full max-w-md px-4 z-10">
          <FadeIn delay={0.1}>
            <div className="flex flex-col items-center mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                <Wallet className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Budgify
              </h1>
              <p className="text-muted-foreground mt-2">
                Enterprise Financial Intelligence
              </p>
            </div>

            <Card className="border-border bg-card shadow-lg">
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-success" />
                </div>
                <CardTitle className="text-2xl text-foreground">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="font-medium text-foreground">
                    {sentEmail}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-sm text-muted-foreground mb-4">
                  Didn&apos;t receive the email? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccess(false);
                      window.history.replaceState(null, "", "/forgot-password");
                    }}
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                </div>
              </CardContent>
              <CardFooter className="text-center flex justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Link
                    href="/signin"
                    className="text-primary hover:underline text-sm"
                  >
                    ← Back to sign in
                  </Link>
                  <span className="text-muted-foreground text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-primary hover:underline">
                      Sign up
                    </Link>
                  </span>
                </div>
              </CardFooter>
            </Card>
          </FadeIn>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="w-full max-w-md px-4 z-10">
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Budgify
            </h1>
            <p className="text-muted-foreground mt-2">
              Enterprise Financial Intelligence
            </p>
          </div>

          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl text-foreground">
                Forgot Password
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter your email address and we&apos;ll send you a link to reset
                your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {serverError && (
                  <div className="p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md text-center font-medium">
                    {serverError}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...register("email")}
                      type="email"
                      placeholder="user@enterprise.com"
                      className={`pl-10 bg-input/50 border-border text-foreground focus:border-primary ${
                        errors.email
                          ? "border-destructive focus:border-destructive"
                          : ""
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive pl-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-center flex justify-center">
              <Link
                href="/signin"
                className="text-primary hover:underline text-sm"
              >
                ← Back to sign in
              </Link>
            </CardFooter>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
