// src/app/page.tsx
"use client";

import { Lock, Mail, Loader2, Key, Wallet } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/FadeIn";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthentication = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

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
                Sign in
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Authenticate to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuthentication} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="user@enterprise.com"
                      required
                      className="pl-10 bg-input/50 border-border text-foreground focus:border-primary"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      required
                      className="pl-10 bg-input/50 border-border text-foreground focus:border-primary"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-border bg-transparent text-foreground hover:bg-muted"
                onClick={handleAuthentication}
                disabled={isLoading}
              >
                <Key className="mr-2 h-4 w-4" />
                Single Sign-On (SSO)
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
