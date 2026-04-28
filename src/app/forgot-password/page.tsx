// src/app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Loader2, Wallet, CheckCircle } from "lucide-react";
import Link from "next/link";
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

// Import the Server Action
import { forgotPasswordAction } from "@/app/actions/auth";

// 1. Define the expected response shape to fix the TypeScript Union Error
type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  resetLink?: string;
};

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null);

    try {
      // 2. Cast the response to our type so Next.js compiles successfully
      const response = (await forgotPasswordAction(data)) as ActionResponse;

      if (response.error) {
        setServerError(response.error);
        return;
      }

      // Store the reset link for development testing
      if (response.resetLink) {
        console.log("Reset link:", response.resetLink);
      }

      setIsSuccess(true);
    } catch {
      // 3. Added 'error' parameter to fix strict TS linting rules
      setServerError("Network error. Please try again.");
    }
  };

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
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-foreground">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="font-medium text-foreground">
                    {getValues("email")}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {/* 4. Changed <p> to <div> here to fix the React Hydration crash */}
                <div className="text-sm text-muted-foreground mb-4">
                  Didn&apos;t receive the email? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => setIsSuccess(false)}
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                </div>
                {process.env.NODE_ENV === "development" && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800 font-medium">
                      Development Mode
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Check the browser console for the reset link.
                    </p>
                  </div>
                )}
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
