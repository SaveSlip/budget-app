"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Lock, Loader2, Wallet, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  resetPasswordSchema,
  ResetPasswordInput,
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
import { resetPasswordAction } from "@/app/actions/auth";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);

    const parsed = resetPasswordSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordInput;
        setError(field, { message: issue.message });
      }
      return;
    }

    try {
      const response = await resetPasswordAction(token, parsed.data);

      if (response.error) {
        setServerError(response.error);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => router.push("/signin"), 3000);
    } catch {
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
                  Password Reset Successful
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your password has been successfully reset. You can now sign in
                  with your new password.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Redirecting to sign in page...
                </p>
              </CardContent>
              <CardFooter className="text-center flex justify-center">
                <Link href="/signin" className="text-primary hover:underline text-sm">
                  Go to sign in
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
                Reset Password
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter your new password below.
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
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...register("password")}
                      type="password"
                      placeholder="New password"
                      className={`pl-10 bg-input/50 border-border text-foreground focus:border-primary ${
                        errors.password
                          ? "border-destructive focus:border-destructive"
                          : ""
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive pl-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...register("confirmPassword")}
                      type="password"
                      placeholder="Confirm new password"
                      className={`pl-10 bg-input/50 border-border text-foreground focus:border-primary ${
                        errors.confirmPassword
                          ? "border-destructive focus:border-destructive"
                          : ""
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive pl-1">
                      {errors.confirmPassword.message}
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
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-center flex justify-center">
              <Link href="/signin" className="text-primary hover:underline text-sm">
                ← Back to sign in
              </Link>
            </CardFooter>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
