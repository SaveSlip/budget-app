import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCategories, getAccounts } from "@/lib/data/budget";
import { listRecurringTransactions } from "@/app/actions/recurring";
import { GlassCard } from "@/components/GlassCard";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, CreditCard, RefreshCw, Users } from "lucide-react";
import { RecurringTransactionForm } from "@/components/RecurringTransactionForm";
import { RecurringList } from "@/components/RecurringList";

interface RecurringPageProps {
  searchParams: Promise<{ onboarding?: string }>;
}

export default async function RecurringSettingsPage({ searchParams }: RecurringPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const params = await searchParams;
  const isOnboarding = params.onboarding === "true";

  const [categories, accounts, recurring] = await Promise.all([
    getCategories(),
    getAccounts(),
    listRecurringTransactions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 pb-12">
      <FadeIn delay={0.1}>
        <div className="flex items-center">
          <Link href={isOnboarding ? "/dashboard" : "/dashboard/settings/profile"}>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isOnboarding ? "Go to Dashboard" : "Back to Settings"}
            </Button>
          </Link>
        </div>
      </FadeIn>

      {isOnboarding && (
        <FadeIn delay={0.15}>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-5">
            <h3 className="font-semibold text-foreground mb-1">
              Set up your recurring expenses
            </h3>
            <p className="text-sm text-muted-foreground">
              Add fixed monthly costs like rent, subscriptions, or loan payments.
              Budgify will automatically log them each month so you never miss an entry.
            </p>
          </div>
        </FadeIn>
      )}

      <div className="grid gap-6 md:grid-cols-12">
        {/* Settings Sidebar */}
        {!isOnboarding && (
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
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  >
                    <CreditCard className="w-4 h-4 mr-2" /> Accounts
                  </Button>
                </Link>
                <Link href="/dashboard/settings/recurring">
                  <Button
                    variant="secondary"
                    className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Recurring
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
        )}

        {/* Main Content */}
        <div className={isOnboarding ? "col-span-12" : "md:col-span-8"}>
          <div className="flex flex-col gap-6">
            <FadeIn delay={0.3}>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Recurring Transactions
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Fixed expenses and income that repeat automatically each period.
                </p>
              </div>
            </FadeIn>

            {recurring.length > 0 && (
              <FadeIn delay={0.35}>
                <RecurringList recurring={recurring} categories={categories} accounts={accounts} />
              </FadeIn>
            )}

            <FadeIn delay={0.4}>
              <GlassCard title="Add Recurring Transaction">
                <RecurringTransactionForm
                  categories={categories}
                  accounts={accounts}
                />
              </GlassCard>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  );
}
