import Link from "next/link";
import { ArrowLeft, ShieldCheck, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { FadeIn } from "@/components/FadeIn";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const BANKS = [
  {
    name: "TD Bank",
    steps: [
      "Sign in to TD Online Banking at td.com",
      "Select the account you want to export from My Accounts",
      "Click Download (or Export) near the transaction history",
      "Choose CSV as the file format and set your desired date range",
      "Click Download and save the file to your computer",
    ],
  },
  {
    name: "RBC Royal Bank",
    steps: [
      "Sign in to RBC Online Banking at rbc.com",
      "Go to My Accounts and select the account",
      "Click Download Transactions (found above the transaction list)",
      "Select CSV format and your date range",
      "Click Download",
    ],
  },
  {
    name: "Scotiabank",
    steps: [
      "Sign in to Scotia Online at scotiabank.com",
      "Select your account from the Accounts overview",
      "Go to Transaction History",
      "Click the Download button and select CSV",
      "Choose your date range and download",
    ],
  },
  {
    name: "BMO Bank of Montreal",
    steps: [
      "Sign in to BMO Online Banking at bmo.com",
      "Select your account",
      "Click Download Transactions above the transaction list",
      "Choose CSV and set your date range",
      "Click Download",
    ],
  },
  {
    name: "CIBC",
    steps: [
      "Sign in to CIBC Online Banking at cibc.com",
      "Select your account from the Accounts page",
      "Click Download near the transaction history",
      "Select CSV as the file format",
      "Set your date range and click Download",
    ],
  },
  {
    name: "Tangerine",
    steps: [
      "Sign in at tangerine.ca",
      "Select your account",
      "Click Transactions, then Download Transactions",
      "Choose CSV format and set your date range",
      "Click Download",
    ],
  },
  {
    name: "EQ Bank",
    steps: [
      "Sign in at eqbank.ca",
      "Go to your account and click Activity",
      "Click Export or Download",
      "Select CSV format and your date range",
      "Click Export to download the file",
    ],
  },
];

export default function ReferencePage() {
  return (
    <div className="space-y-6">
      {/* Back to dashboard */}
      <FadeIn delay={0.1}>
        <div>
          <Link href="/dashboard/settings/profile">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
            </Button>
          </Link>
        </div>
      </FadeIn>

      <div className="grid gap-6 md:grid-cols-12">
        {/* LEFT COLUMN: sidebar nav */}
        <div className="md:col-span-4 space-y-2">
          <FadeIn delay={0.2}>
            <div className="flex flex-col gap-1 sticky top-24">
              <Link href="/dashboard/settings/profile">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                >
                  Profile
                </Button>
              </Link>
              <Link href="/dashboard/settings/reference">
                <Button
                  variant="ghost"
                  className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Reference
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* RIGHT COLUMN: content */}
        <div className="md:col-span-8 flex flex-col gap-6">

          {/* Security & Privacy */}
          <FadeIn delay={0.3}>
            <GlassCard>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Security &amp; Privacy</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      How Budgify handles your financial data.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>
                      <strong className="text-foreground">Your data is private.</strong> We never sell, share,
                      or use your financial data for any purpose other than displaying it back to you.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>
                      <strong className="text-foreground">Encrypted in transit.</strong> All data is
                      transmitted over HTTPS.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>
                      <strong className="text-foreground">No third-party data sharing.</strong> Your account
                      and transaction history are visible only to you.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>
                      <strong className="text-foreground">Full control.</strong> You can delete your account
                      and all associated data at any time from{" "}
                      <Link
                        href="/dashboard/settings/profile"
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        Profile Settings
                      </Link>
                      .
                    </span>
                  </li>
                </ul>
              </CardContent>
            </GlassCard>
          </FadeIn>

          {/* How to use Budgify */}
          <FadeIn delay={0.4}>
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-foreground">How to Use Budgify</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Get up and running in two steps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      1
                    </span>
                    <span>
                      <strong className="text-foreground">Download your CSV from your bank.</strong> Each
                      bank has a slightly different export flow — see the bank-by-bank guide below.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      2
                    </span>
                    <span>
                      <strong className="text-foreground">Import via Accounts → Import CSV.</strong> Budgify
                      will parse your transactions and automatically assign categories based on your rules.
                    </span>
                  </li>
                </ol>
              </CardContent>
            </GlassCard>
          </FadeIn>

          {/* Bank CSV guides */}
          <FadeIn delay={0.5}>
            <GlassCard>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Downloading CSVs from Canadian Banks</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Step-by-step instructions for each major Canadian bank.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {BANKS.map((bank, i) => (
                    <div key={bank.name}>
                      {i > 0 && <div className="border-t border-border mb-6" />}
                      <p className="text-sm font-semibold text-foreground mb-2">{bank.name}</p>
                      <ol className="space-y-1.5 text-sm text-muted-foreground list-none">
                        {bank.steps.map((step, j) => (
                          <li key={j} className="flex gap-2.5">
                            <span className="shrink-0 text-primary font-medium w-4 text-right">
                              {j + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </CardContent>
            </GlassCard>
          </FadeIn>

        </div>
      </div>
    </div>
  );
}
