import Link from "next/link";
import UserNav from "@/components/UserNav";
import { DashboardNav } from "@/components/DashboardNav";
import { getHousehold } from "@/app/actions/household";
import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ household, members }, session] = await Promise.all([
    getHousehold(),
    auth(),
  ]);
  const isMaster = session?.user?.role === "MASTER";
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar - Enlarged and Aligned */}
      <nav className="border-b border-border bg-background">
        {/* We use the same 80% container logic here so the logo aligns exactly with the content below */}
        <div className="mx-auto w-[95%] md:w-[90%] lg:w-[80%] max-w-7xl py-5 flex items-center justify-between">
          {/* Left Aligned Logo (Increased Size) */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">Budgify</span>
          </Link>

          {/* Middle Navigation */}
          <DashboardNav />

          {/* Right Aligned Actions */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {/* Log Out button removed from here, it now lives inside the UserNav popout */}
            <UserNav
              householdName={household?.name}
              householdMembers={isMaster ? members : []}
            />
          </div>
        </div>
      </nav>

      <main className="mx-auto w-[95%] md:w-[90%] lg:w-[80%] max-w-7xl py-8">
        {children}
      </main>
    </div>
  );
}
