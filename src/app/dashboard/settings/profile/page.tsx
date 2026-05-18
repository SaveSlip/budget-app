import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db";
import { ProfileSettingsClient } from "@/components/ProfileSettingsClient";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getUserProfile(session.user.email ?? "");

  return (
    <ProfileSettingsClient
      initialName={profile?.name ?? ""}
      email={session.user.email ?? ""}
      isMaster={session.user.role === "MASTER"}
    />
  );
}
