import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { SummaryCard } from "@/components/SummaryCard";
import { AnimateSection } from "@/components/AnimateSection";
import { DashboardFilters } from "@/components/DashboardFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHouseholdOverviewData } from "@/app/actions/household";
import { columns } from "./columns";
import { HouseholdDataTable } from "./data-table";
import type { HouseholdTransactionRow } from "./columns";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function HouseholdOverviewPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const isMaster = session.user.role === "MASTER";
  const canView = isMaster || session.user.canViewHousehold;
  if (!canView) redirect("/dashboard");

  const resolvedParams = await searchParams;
  const activeMonth = resolvedParams.month || format(new Date(), "yyyy-MM");

  const result = await getHouseholdOverviewData(activeMonth);
  if (result.error || !result.household || !result.balance) redirect("/dashboard");

  const { household, members = [], balance, transactions } = result;

  const netCashFlow = balance.totalIncome - balance.totalExpenses;

  const realMembers = members.filter((m) => !m.isNonUser);

  const rows: HouseholdTransactionRow[] = (transactions ?? []).map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount,
    date: tx.date,
    category: tx.category,
    transactionType: tx.transactionType,
    memberName: tx.memberName,
    addedByName: tx.addedByName,
    createdAt: tx.createdAt,
  }));

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto space-y-8">
      <AnimateSection delay={0}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{household.name}</h1>
            <p className="text-sm text-muted-foreground">Household Overview</p>
          </div>
          <DashboardFilters />
        </div>
      </AnimateSection>

      {/* Summary cards */}
      <AnimateSection delay={0.08}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Combined Income"
            value={`$${fmt(balance.totalIncome)}`}
            description="All members this period"
            type="income"
          />
          <SummaryCard
            title="Combined Expenses"
            value={`$${fmt(balance.totalExpenses)}`}
            description="All members this period"
            type="expense"
          />
          <SummaryCard
            title="Net Cash Flow"
            value={`${netCashFlow >= 0 ? "+" : ""}$${fmt(Math.abs(netCashFlow))}`}
            description={netCashFlow >= 0 ? "Positive cash flow" : "Negative cash flow"}
            type={netCashFlow >= 0 ? "income" : "expense"}
          />
        </div>
      </AnimateSection>

      {/* Per-member breakdown */}
      {realMembers.length > 0 && (
        <AnimateSection delay={0.14}>
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Member Breakdown</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {realMembers.map((member) => {
                const memberData = balance.perMember[member.id];
                const income = memberData?.income ?? 0;
                const expenses = memberData?.expenses ?? 0;
                const net = income - expenses;
                return (
                  <Card key={member.id} className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {member.name}
                        {member.id === household.masterUserId && (
                          <span className="text-xs font-normal text-amber-500">Admin</span>
                        )}
                        {member.role === "MASTER" && member.id !== household.masterUserId && (
                          <span className="text-xs font-normal text-primary">Co-admin</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Income</span>
                        <span className="text-green-500 font-mono">${fmt(income)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expenses</span>
                        <span className="text-red-500 font-mono">${fmt(expenses)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                        <span className="text-muted-foreground">Net</span>
                        <span className={`font-mono font-semibold ${net >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {net >= 0 ? "+" : ""}${fmt(Math.abs(net))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </AnimateSection>
      )}

      {/* Full transaction table — admins only */}
      {isMaster && rows.length >= 0 && (
        <AnimateSection delay={0.2}>
          <HouseholdDataTable
            columns={columns}
            data={rows}
            members={realMembers.map((m) => ({ id: m.id, name: m.name }))}
          />
        </AnimateSection>
      )}
    </div>
  );
}
