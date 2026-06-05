"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, LayoutDashboard, BarChart3, RefreshCw, FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "budgify-welcome-seen";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Welcome to Budgify
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your personal finance tracker — here&apos;s everything you need to know before you start.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1 max-h-[65vh] overflow-y-auto pr-1">

          {/* Security & Privacy */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex gap-3 mb-3">
              <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Your data is private &amp; secure</p>
                <p className="text-xs text-muted-foreground mt-0.5">Zero-trust architecture — your finances stay yours</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary shrink-0 mt-0.5">✓</span>
                <span>
                  <strong className="text-foreground">We never sell or share your data.</strong> Your financial information is used for one purpose only — displaying it back to you.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary shrink-0 mt-0.5">✓</span>
                <span>
                  <strong className="text-foreground">Encrypted at rest and in transit.</strong> All data is stored in encrypted DynamoDB tables on AWS and transmitted exclusively over HTTPS.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary shrink-0 mt-0.5">✓</span>
                <span>
                  <strong className="text-foreground">No third-party access.</strong> We don't connect to your bank directly — you download a CSV and import it yourself. No bank credentials ever touch Budgify.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary shrink-0 mt-0.5">✓</span>
                <span>
                  <strong className="text-foreground">Delete anytime.</strong> You can permanently delete your account and all associated data from Profile Settings at any time.
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t border-border" />

          {/* What you can do */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">What you can do with Budgify</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex gap-3">
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Track income &amp; expenses</p>
                  <p className="text-xs text-muted-foreground">Monthly and yearly cash flow overview with spending vs. budget progress bars.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Budget benchmarking</p>
                  <p className="text-xs text-muted-foreground">See a budget health score, category breakdowns, 3-month trend sparklines, and AI-generated quarterly suggestions.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Recurring transactions</p>
                  <p className="text-xs text-muted-foreground">Track subscriptions and bills on daily, weekly, monthly, or yearly schedules in one place.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <FileUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Smart CSV import</p>
                  <p className="text-xs text-muted-foreground">Upload your bank CSV — Budgify auto-detects columns, auto-categorizes merchants, and checks for duplicates before importing.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Getting started steps */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">How to get started</p>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">1</span>
                <span>
                  <strong className="text-foreground">Download your bank CSV.</strong> See the{" "}
                  <Link
                    href="/dashboard/settings/reference"
                    onClick={dismiss}
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Reference page
                  </Link>{" "}
                  in Settings for step-by-step instructions for TD, RBC, Scotiabank, BMO, CIBC, Tangerine, and EQ Bank.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">2</span>
                <span>
                  <strong className="text-foreground">Create an account</strong> under <strong className="text-foreground">Accounts</strong>, then use <strong className="text-foreground">Import CSV</strong> to bulk-import your transactions.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">3</span>
                <span>
                  <strong className="text-foreground">Set budget limits</strong> in Settings → Categories, then visit <strong className="text-foreground">Benchmarking</strong> to see how you&apos;re tracking.
                </span>
              </li>
            </ol>
          </div>

        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <Link href="/dashboard/settings/reference" onClick={dismiss}>
            <Button variant="outline" size="sm" className="gap-1.5">
              Open Reference Guide <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button size="sm" onClick={dismiss} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
