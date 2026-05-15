import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getHousehold } from "@/app/actions/household";
import { ProfileSettingsClient } from "@/components/ProfileSettingsClient";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { household } = await getHousehold();
  const pin =
    session.user.role === "MASTER" ? (household?.pin ?? undefined) : undefined;

  return (
    <ProfileSettingsClient
      initialName={session.user.name ?? ""}
      email={session.user.email ?? ""}
      householdPin={pin}
      isMaster={session.user.role === "MASTER"}
    />
  );
}
