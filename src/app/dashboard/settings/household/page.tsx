import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getHousehold } from "@/app/actions/household";
import { GlassCard } from "@/components/GlassCard";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, CreditCard, Users } from "lucide-react";
import { CreateHouseholdForm } from "@/components/CreateHouseholdForm";
import { HouseholdMembersList } from "@/components/HouseholdMembersList";

export default async function HouseholdSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { household, members } = await getHousehold();
  const isMaster = household?.masterUserId === session.user.id;

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
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5">
                  <User className="w-4 h-4 mr-2" /> Profile
                </Button>
              </Link>
              <Link href="/dashboard/settings/accounts">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-foreground/5">
                  <CreditCard className="w-4 h-4 mr-2" /> Accounts
                </Button>
              </Link>
              <Link href="/dashboard/settings/household">
                <Button variant="secondary" className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
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
                Household
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your household and switch between member budgets.
              </p>
            </div>
          </FadeIn>

          {!household ? (
            <FadeIn delay={0.4}>
              <GlassCard title="Create a Household">
                <p className="text-sm text-muted-foreground mb-4">
                  Create a household to manage budgets for multiple family members from one account.
                </p>
                <CreateHouseholdForm />
              </GlassCard>
            </FadeIn>
          ) : (
            <>
              <FadeIn delay={0.4}>
                <GlassCard>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{household.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isMaster ? "You are the master of this household" : "You are a member"}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </FadeIn>

              <FadeIn delay={0.5}>
                <GlassCard title="Members">
                  <HouseholdMembersList
                    members={members}
                    isMaster={isMaster}
                    householdId={household.id}
                  />
                </GlassCard>
              </FadeIn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
