"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Lock, Mail, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { signinSchema, type SigninInput } from "@/lib/validations/auth";
import ThemeToggle from "@/components/ThemeToggle";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/FadeIn";

export default function SigninPage() {
  const router = useRouter();
  const { status } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SigninInput>({
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const onSubmit = async (data: SigninInput) => {
    setServerError(null);

    const parsed = signinSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof SigninInput;
        setError(field, { message: issue.message });
      }
      return;
    }

    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      setServerError("Invalid credentials. Please try again.");
      return;
    }

    router.push("/dashboard");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (status === "authenticated") return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] dark:bg-neutral-950 relative overflow-hidden">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md px-4 z-10">
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-500 mb-4 border border-orange-200 dark:border-orange-500/30">
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
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Budgify
            </h1>
          </div>

          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 shadow-xl">
            <CardHeader className="space-y-1 text-center pt-8">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Sign In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {serverError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md text-center font-medium">
                    {serverError}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      {...register("email")}
                      type="email"
                      placeholder="user@enterprise.com"
                      className={`pl-10 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-orange-500 focus:border-orange-500 ${
                        errors.email ? "border-red-500" : ""
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500 pl-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      {...register("password")}
                      type="password"
                      placeholder="••••••••"
                      className={`pl-10 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-orange-500 focus:border-orange-500 ${
                        errors.password ? "border-red-500" : ""
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 pl-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6 text-lg transition-all shadow-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 text-center text-sm text-gray-500 dark:text-gray-400 pb-8">
              <p>
                <Link
                  href="/forgot-password"
                  className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                >
                  Forgot your password?
                </Link>
              </p>
              <p>
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-orange-600 hover:text-orange-700 font-bold hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
