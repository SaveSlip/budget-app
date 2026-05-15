import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import ThemeToggle from "@/components/ThemeToggle";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const profile = await getUserProfile(session.user.email);
  if (profile?.onboardingCompleted) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <OnboardingFlow />
    </div>
  );
}
