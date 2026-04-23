// src/app/page.tsx
"use client";

import { Lock, Mail, Loader2, Key, Fingerprint } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleFakeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // The Illusion of Security:
    // We make the user stare at a spinning icon for 1.2 seconds so they
    // feel like we are doing serious enterprise cryptography.
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Decorative Elements so it doesn't look empty */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md px-4 z-10">
        <FadeIn delay={0.1}>
          {/* The Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-4 border border-emerald-500/30">
              <Fingerprint className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Nexus<span className="text-emerald-500">Vault</span>
            </h1>
            <p className="text-slate-400 mt-2">
              Zero-Trust Financial Architecture
            </p>
          </div>

          <Card className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl text-white">Sign in</CardTitle>
              <CardDescription className="text-slate-400">
                Enter your credentials to access the mainframe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFakeLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      type="email"
                      placeholder="admin@hacker.com"
                      required
                      className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      required
                      className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Decrypting Vault...
                    </>
                  ) : (
                    "Initialize Session"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black/40 px-2 text-slate-500">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Just for show, clicking this also does the fake login */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                onClick={handleFakeLogin}
                disabled={isLoading}
              >
                <Key className="mr-2 h-4 w-4" />
                Enterprise SSO
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 text-center text-sm text-slate-500 pb-6">
              <p>Strictly restricted to authorized personnel.</p>
              <p>Violators will be logged.</p>
            </CardFooter>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
