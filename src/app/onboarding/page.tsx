import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile, docClient, TABLE_NAME } from "@/lib/db";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import ThemeToggle from "@/components/ThemeToggle";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/signin");

  const profile = await getUserProfile(session.user.email);
  if (profile?.onboardingCompleted) redirect("/dashboard");

  const linkResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${session.user.id}`,
        ":prefix": "HOUSEHOLD_MEMBER#",
      },
      Limit: 1,
    }),
  );
  const isInvitedMember = (linkResult.Items?.length ?? 0) > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <OnboardingFlow isInvitedMember={isInvitedMember} />
    </div>
  );
}
