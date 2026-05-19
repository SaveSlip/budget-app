import Link from "next/link";
import { XCircle, Clock, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { validateResetTokenAction } from "@/app/actions/auth";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await validateResetTokenAction(token);

  if (result.success) {
    return <ResetPasswordForm token={token} />;
  }

  const isExpiredOrSuperseded =
    (result.reason === "expired" || result.reason === "superseded") &&
    !!result.email;

  const title =
    result.reason === "superseded"
      ? "Link no longer valid"
      : "Reset link expired";

  const description =
    result.reason === "superseded"
      ? "A newer reset email was sent after this link. Please use the most recent email or request a new link."
      : "This password reset link has expired. Reset links are valid for 1 hour.";

  const resendHref = isExpiredOrSuperseded
    ? `/forgot-password?resend=1&email=${encodeURIComponent(result.email!)}`
    : "/forgot-password";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
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

          <Card className="border-border bg-card shadow-xl">
            <CardHeader className="space-y-1 text-center pt-8 pb-4">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                  {result.reason === "expired" ? (
                    <Clock className="h-7 w-7 text-destructive" />
                  ) : (
                    <XCircle className="h-7 w-7 text-destructive" />
                  )}
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {title}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 pb-8">
              <Link href={resendHref}>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5">
                  Send new reset link
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
