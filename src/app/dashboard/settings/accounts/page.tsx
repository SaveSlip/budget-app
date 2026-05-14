import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAccounts, getTransactionTrend } from "@/lib/data/budget";
import { GlassCard } from "@/components/GlassCard";
import { AccountBalances } from "@/components/AccountBalances";
import { AccountForm } from "@/components/AccountForm";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, User, Users } from "lucide-react";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    getTransactionTrend(24),
  ]);

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 pb-12">
      <FadeIn delay={0.1}>
        <div className="flex items-center">
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
        {/* Settings Sidebar */}
        <div className="md:col-span-4 space-y-2">
          <FadeIn delay={0.2}>
            <div className="flex flex-col gap-1 sticky top-24">
              <Link href="/dashboard/settings/profile">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  <User className="w-4 h-4 mr-2" /> Profile
                </Button>
              </Link>
              <Link href="/dashboard/settings/accounts">
                <Button
                  variant="secondary"
                  className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                >
                  <CreditCard className="w-4 h-4 mr-2" /> Accounts
                </Button>
              </Link>
              <Link href="/dashboard/settings/household">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                >
                  <Users className="w-4 h-4 mr-2" /> Household
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* Main Content */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <FadeIn delay={0.3}>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Accounts
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your bank accounts, credit cards, and wallets.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <GlassCard title="Account Balances">
              <AccountBalances accounts={accounts} transactions={transactions} />
            </GlassCard>
          </FadeIn>

          <FadeIn delay={0.5}>
            <GlassCard title="Add Account">
              <AccountForm />
            </GlassCard>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
