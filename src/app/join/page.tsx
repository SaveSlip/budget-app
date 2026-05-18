import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { acceptHouseholdInvite } from "@/app/actions/household";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, Users } from "lucide-react";

interface JoinPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <JoinError message="Invalid invite link. No token provided." />;
  }

  // Look up the invite
  const { Item: invite } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" },
    }),
  );

  if (!invite) {
    return <JoinError message="This invite link is invalid or has already been used." />;
  }

  if (new Date(invite.expiresAt as string) < new Date()) {
    return <JoinError message="This invite link has expired. Ask the household admin to send a new invite." />;
  }

  if (invite.status !== "PENDING") {
    return <JoinError message="This invite has already been accepted or declined." />;
  }

  const session = await auth();

  // Not signed in — redirect to signup/signin with invite token
  if (!session?.user) {
    redirect(`/signup?invite=${token}`);
  }

  const userEmail = session.user.email ?? "";
  const inviteEmail = (invite.email as string).toLowerCase();

  // Signed in but wrong email
  if (userEmail.toLowerCase() !== inviteEmail) {
    return (
      <JoinLayout>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <CardTitle className="text-xl font-bold text-center text-foreground">Wrong Account</CardTitle>
        <CardDescription className="text-center text-muted-foreground mt-2">
          This invite was sent to <strong>{invite.email as string}</strong>, but you are signed in as <strong>{userEmail}</strong>.
          Please sign in with the correct account to accept this invite.
        </CardDescription>
        <div className="mt-6 flex flex-col gap-3">
          <Link href={`/signin?invite=${token}`}>
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Sign in with the right account
            </Button>
          </Link>
        </div>
      </JoinLayout>
    );
  }

  // Correct user — accept the invite
  const result = await acceptHouseholdInvite(token);

  if (result.error) {
    return <JoinError message={result.error} />;
  }

  redirect("/onboarding");
}

function JoinError({ message }: { message: string }) {
  return (
    <JoinLayout>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <CardTitle className="text-xl font-bold text-center text-foreground">Invite Unavailable</CardTitle>
      <CardDescription className="text-center text-muted-foreground mt-2">{message}</CardDescription>
      <div className="mt-6">
        <Link href="/dashboard">
          <Button variant="outline" className="w-full">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </JoinLayout>
  );
}

function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 border border-primary/20">
              <Users className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Budgify</h1>
          </div>
          <Card className="border-border bg-card shadow-xl">
            <CardHeader className="pt-8 pb-2">
              <CardContent className="px-0">{children}</CardContent>
            </CardHeader>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
