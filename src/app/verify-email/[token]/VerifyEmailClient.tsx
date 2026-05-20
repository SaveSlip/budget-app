"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

export function VerifyEmailClient({ autoLoginToken }: { autoLoginToken: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!autoLoginToken) {
      router.replace("/signin");
      return;
    }

    signIn("autologin", { token: autoLoginToken, redirect: false }).then((result) => {
      if (result?.ok) {
        router.replace("/dashboard");
      } else {
        router.replace("/signin?verified=true");
      }
    });
  }, [autoLoginToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
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
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Budgify</h1>
            <Loader2 className="h-6 w-6 animate-spin text-primary mt-2" />
            <p className="text-muted-foreground text-sm">Signing you in…</p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
