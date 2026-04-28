// src/app/dashboard/error.tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn } from "@/components/FadeIn";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a production environment, you would log this to an observability platform like Sentry or Datadog
    console.error("Dashboard caught an error:", error);
  }, [error]);

  return (
    <div className="flex h-[80vh] w-full items-center justify-center p-4">
      <FadeIn>
        <Card className="max-w-md border-destructive/20 bg-card shadow-lg">
          <CardHeader className="space-y-1 text-center items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2 border border-destructive/20">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-foreground">
              System Error
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We encountered an issue retrieving your financial data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="rounded-md bg-muted p-3 w-full text-center border border-border">
              <p className="text-xs font-mono text-muted-foreground wrap-break-word">
                {error.message || "An unexpected system fault occurred."}
              </p>
            </div>
            <Button
              onClick={() => reset()}
              variant="outline"
              className="w-full border-border hover:bg-accent hover:text-accent-foreground"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Attempt Recovery
            </Button>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
