import Link from "next/link";
import { XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { verifyEmailToken } from "@/app/actions/auth";
import { VerifyEmailClient } from "./VerifyEmailClient";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verifyEmailToken(token);

  if (result.success && result.autoLoginToken) {
    return <VerifyEmailClient autoLoginToken={result.autoLoginToken} />;
  }

  if (result.reason === "invalid") {
    return <VerifyEmailClient autoLoginToken={null} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                    <XCircle className="h-7 w-7 text-destructive" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Verification failed
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                  {result.error ?? "This verification link is invalid or has already been used."}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-3 pb-8">
                <Link href={result.email ? `/check-email?email=${encodeURIComponent(result.email)}` : "/check-email"}>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5">
                    Request a new verification email
                  </Button>
                </Link>
                <Link href="/signin">
                  <Button
                    variant="outline"
                    className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  >
                    Back to sign in
                  </Button>
                </Link>
              </CardContent>
            </Card>
        </FadeIn>
      </div>
    </div>
  );
}
