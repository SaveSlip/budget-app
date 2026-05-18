"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Trash, Loader2, Mail, ShieldCheck, ShieldOff, AlertTriangle, X, LogOut } from "lucide-react";
import {
  sendHouseholdInvite,
  cancelHouseholdInvite,
  removeHouseholdMember,
  grantHouseholdAccess,
  revokeHouseholdAccess,
  leaveHousehold,
} from "@/app/actions/household";
import type { HouseholdMember, HouseholdInvite } from "@/lib/data/budget";

interface HouseholdMembersListProps {
  members: HouseholdMember[];
  pendingInvites: HouseholdInvite[];
  isMaster: boolean;
  householdId: string;
}

export function HouseholdMembersList({ members, pendingInvites, isMaster, householdId }: HouseholdMembersListProps) {
  const { update } = useSession();
  const router = useRouter();

  const [removeTarget, setRemoveTarget] = useState<HouseholdMember | null>(null);
  const [deleteData, setDeleteData] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [accessLoadingId, setAccessLoadingId] = useState<string | null>(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [cancellingToken, setCancellingToken] = useState<string | null>(null);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    await removeHouseholdMember(removeTarget.id, deleteData);
    setIsRemoving(false);
    setRemoveTarget(null);
    setDeleteData(false);
  };

  const handleToggleAccess = async (member: HouseholdMember) => {
    setAccessLoadingId(member.id);
    if (member.canViewHousehold) {
      await revokeHouseholdAccess(member.id);
    } else {
      await grantHouseholdAccess(member.id);
    }
    setAccessLoadingId(null);
  };

  const handleSendInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    const result = await sendHouseholdInvite({ email: inviteEmail });
    setIsInviting(false);
    if (result.error) {
      setInviteError(result.error);
    } else {
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInviteForm(false);
      setTimeout(() => setInviteSuccess(null), 4000);
    }
  };

  const handleCancelInvite = async (token: string) => {
    setCancellingToken(token);
    await cancelHouseholdInvite(token);
    setCancellingToken(null);
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    setLeaveError(null);
    const result = await leaveHousehold();
    if (result.error) {
      setLeaveError(result.error);
      setIsLeaving(false);
      return;
    }
    await update({ refreshHousehold: true });
    router.push("/dashboard");
  };

  return (
    <div className="space-y-4">
      {/* Invite success banner */}
      {inviteSuccess && (
        <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-md font-medium">
          {inviteSuccess}
        </div>
      )}

      {/* Current Members */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No members yet. Invite people to join your household.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{member.name}</p>
                {member.email && member.email !== member.name && (
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                )}
                {member.canViewHousehold && (
                  <p className="text-xs text-primary mt-0.5">Household view access</p>
                )}
              </div>
              {isMaster && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAccess(member)}
                    disabled={accessLoadingId === member.id}
                    title={member.canViewHousehold ? "Revoke household access" : "Grant household access"}
                    className={`transition-colors disabled:opacity-50 ${
                      member.canViewHousehold
                        ? "text-primary hover:text-destructive"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                    aria-label={member.canViewHousehold ? "Revoke household access" : "Grant household access"}
                  >
                    {accessLoadingId === member.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : member.canViewHousehold ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => { setRemoveTarget(member); setDeleteData(false); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove member"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pending Invites (admin only) */}
      {isMaster && pendingInvites.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Invites</p>
          {pendingInvites.map((invite) => (
            <div
              key={invite.token}
              className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{invite.email}</p>
                <p className="text-xs text-muted-foreground">Invite pending</p>
              </div>
              <button
                onClick={() => handleCancelInvite(invite.token)}
                disabled={cancellingToken === invite.token}
                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                aria-label="Cancel invite"
              >
                {cancellingToken === invite.token ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Invite Form (admin only) */}
      {isMaster && (
        <div className="pt-2 border-t border-border">
          {showInviteForm ? (
            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isInviting}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                >
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invite"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInviteForm(false); setInviteError(null); }}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-9 px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setShowInviteForm(true); setInviteError(null); }}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Mail className="w-4 h-4" /> Invite Member by Email
            </button>
          )}
        </div>
      )}

      {/* Leave Household (members only) */}
      {!isMaster && (
        <div className="pt-2 border-t border-border">
          <button
            onClick={() => setShowLeaveDialog(true)}
            className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Leave Household
          </button>
        </div>
      )}

      {/* Remove Member Dialog */}
      {removeTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Remove {removeTarget.name}?
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              What should happen to {removeTarget.name}&apos;s financial data?
            </p>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!deleteData ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
                <input
                  type="radio"
                  checked={!deleteData}
                  onChange={() => setDeleteData(false)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Keep financial data</p>
                  <p className="text-xs text-muted-foreground">Remove from household only. Their transactions and accounts are preserved.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${deleteData ? "border-destructive bg-destructive/5" : "border-border hover:border-border/80"}`}>
                <input
                  type="radio"
                  checked={deleteData}
                  onChange={() => setDeleteData(true)}
                  className="mt-0.5 accent-destructive"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Delete all data</p>
                  <p className="text-xs text-muted-foreground">Permanently delete all their transactions, accounts, and categories. Cannot be undone.</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setRemoveTarget(null); setDeleteData(false); }}
                disabled={isRemoving}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-9 px-4 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 disabled:opacity-50"
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Remove Member"
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Leave Household Dialog */}
      {showLeaveDialog && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Leave Household?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              You will be removed from this household and become a standalone account. Your financial data will be preserved.
            </p>
            {leaveError && <p className="text-sm text-destructive font-medium">{leaveError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowLeaveDialog(false); setLeaveError(null); }}
                disabled={isLeaving}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-9 px-4 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 disabled:opacity-50"
              >
                {isLeaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Leave Household"
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
