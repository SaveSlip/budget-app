"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Users, Check, X } from "lucide-react";
import { acceptHouseholdInvite, declineHouseholdInvite } from "@/app/actions/household";
import type { HouseholdInvite } from "@/lib/data/budget";

interface PendingInviteCardProps {
  invite: HouseholdInvite;
}

export function PendingInviteCard({ invite }: PendingInviteCardProps) {
  const { update } = useSession();
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    const result = await acceptHouseholdInvite(invite.token);
    if (result.error) {
      setError(result.error);
      setIsAccepting(false);
      return;
    }
    await update({ refreshHousehold: true });
    router.refresh();
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    setError(null);
    const result = await declineHouseholdInvite(invite.token);
    if (result.error) {
      setError(result.error);
      setIsDeclining(false);
      return;
    }
    setDismissed(true);
  };

  return (
    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0 mt-0.5">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Household Invite
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            <strong>{invite.inviterName}</strong> invited you to join <strong>{invite.householdName}</strong>.
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={isAccepting || isDeclining}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 disabled:opacity-50 gap-1.5"
        >
          {isAccepting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Accept
        </button>
        <button
          onClick={handleDecline}
          disabled={isAccepting || isDeclining}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-8 px-3 disabled:opacity-50 gap-1.5"
        >
          {isDeclining ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
          Decline
        </button>
      </div>
    </div>
  );
}
