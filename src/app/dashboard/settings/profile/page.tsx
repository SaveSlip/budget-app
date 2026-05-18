import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getHousehold } from "@/app/actions/household";
import { getUserProfile } from "@/lib/db";
import { ProfileSettingsClient } from "@/components/ProfileSettingsClient";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [{ household }, profile] = await Promise.all([
    getHousehold(),
    getUserProfile(session.user.email ?? ""),
  ]);
  const pin =
    session.user.role === "MASTER" ? (household?.pin ?? undefined) : undefined;

  return (
    <ProfileSettingsClient
      initialName={profile?.name ?? ""}
      email={session.user.email ?? ""}
      householdPin={pin}
      isMaster={session.user.role === "MASTER"}
    />
  );
}
