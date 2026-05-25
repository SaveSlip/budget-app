import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAccounts, getTransactionTrend } from "@/lib/data/budget";
import { GlassCard } from "@/components/GlassCard";
import { AccountBalances } from "@/components/AccountBalances";
import { AccountForm } from "@/components/AccountForm";
import { FadeIn } from "@/components/FadeIn";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    getTransactionTrend(24),
  ]);

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto space-y-8 pt-4">
      <FadeIn delay={0.1}>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Accounts
          </h2>
          <p className="text-muted-foreground">
            Manage your bank accounts, credit cards, and wallets.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <GlassCard title="Account Balances">
          <AccountBalances accounts={accounts} transactions={transactions} />
        </GlassCard>
      </FadeIn>

      <FadeIn delay={0.3}>
        <GlassCard title="Add Account">
          <AccountForm />
        </GlassCard>
      </FadeIn>
    </div>
  );
}
