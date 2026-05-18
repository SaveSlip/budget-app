"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Trash, Loader2, Mail, ShieldCheck, ShieldOff, AlertTriangle, X, LogOut, Users, LogIn, Crown, ShieldPlus, ShieldMinus } from "lucide-react";
import {
  sendHouseholdInvite,
  cancelHouseholdInvite,
  removeHouseholdMember,
  grantHouseholdAccess,
  revokeHouseholdAccess,
  leaveHousehold,
  addNonUserMember,
  sendNonUserInvite,
  transferAdminRole,
  addCoAdmin,
  revokeCoAdmin,
} from "@/app/actions/household";
import { validateUserSwitch } from "@/app/actions/switchUser";
import type { HouseholdMember, HouseholdInvite } from "@/lib/data/budget";

interface HouseholdMembersListProps {
  members: HouseholdMember[];
  pendingInvites: HouseholdInvite[];
  isMaster: boolean;
  isOriginalAdmin: boolean;
  householdId: string;
  masterUserId: string;
  currentUserId: string;
}

export function HouseholdMembersList({ members, pendingInvites, isMaster, isOriginalAdmin, householdId, masterUserId, currentUserId }: HouseholdMembersListProps) {
  const { update } = useSession();
  const router = useRouter();

  const [removeTarget, setRemoveTarget] = useState<HouseholdMember | null>(null);
  const [deleteData, setDeleteData] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [accessLoadingId, setAccessLoadingId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [cancellingToken, setCancellingToken] = useState<string | null>(null);

  const [showNonUserForm, setShowNonUserForm] = useState(false);
  const [nonUserName, setNonUserName] = useState("");
  const [isAddingNonUser, setIsAddingNonUser] = useState(false);
  const [nonUserError, setNonUserError] = useState<string | null>(null);

  const [inviteNonUserTarget, setInviteNonUserTarget] = useState<HouseholdMember | null>(null);
  const [nonUserInviteEmail, setNonUserInviteEmail] = useState("");
  const [isSendingNonUserInvite, setIsSendingNonUserInvite] = useState(false);
  const [nonUserInviteError, setNonUserInviteError] = useState<string | null>(null);
  const [nonUserInviteSuccess, setNonUserInviteSuccess] = useState<string | null>(null);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const [transferTarget, setTransferTarget] = useState<HouseholdMember | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [coAdminTarget, setCoAdminTarget] = useState<HouseholdMember | null>(null);
  const [coAdminAction, setCoAdminAction] = useState<"grant" | "revoke">("grant");
  const [isUpdatingCoAdmin, setIsUpdatingCoAdmin] = useState(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    await removeHouseholdMember(removeTarget.id, deleteData);
    setIsRemoving(false);
    setRemoveTarget(null);
    setDeleteData(false);
  };

  const handleEnterMember = async (member: HouseholdMember) => {
    setSwitchingId(member.id);
    const result = await validateUserSwitch(member.id);
    if (!result.error) {
      await update({ activeUserId: member.id });
      router.push("/dashboard");
    }
    setSwitchingId(null);
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

  const handleSendNonUserInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inviteNonUserTarget) return;
    setIsSendingNonUserInvite(true);
    setNonUserInviteError(null);
    const result = await sendNonUserInvite({ nonUserId: inviteNonUserTarget.id, email: nonUserInviteEmail });
    setIsSendingNonUserInvite(false);
    if (result.error) {
      setNonUserInviteError(result.error);
    } else {
      setNonUserInviteSuccess(`Invite sent to ${nonUserInviteEmail}`);
      setNonUserInviteEmail("");
      setInviteNonUserTarget(null);
      setTimeout(() => setNonUserInviteSuccess(null), 4000);
    }
  };

  const handleAddNonUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingNonUser(true);
    setNonUserError(null);
    const result = await addNonUserMember({ name: nonUserName });
    setIsAddingNonUser(false);
    if (result.error) {
      setNonUserError(result.error);
    } else {
      setNonUserName("");
      setShowNonUserForm(false);
    }
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

  const handleTransferAdmin = async () => {
    if (!transferTarget) return;
    setIsTransferring(true);
    setAdminActionError(null);
    const result = await transferAdminRole(transferTarget.id);
    if (result.error) {
      setAdminActionError(result.error);
      setIsTransferring(false);
      return;
    }
    await update({ refreshHousehold: true });
    router.push("/dashboard");
  };

  const handleCoAdminAction = async () => {
    if (!coAdminTarget) return;
    setIsUpdatingCoAdmin(true);
    setAdminActionError(null);
    const result = coAdminAction === "grant"
      ? await addCoAdmin(coAdminTarget.id)
      : await revokeCoAdmin(coAdminTarget.id);
    setIsUpdatingCoAdmin(false);
    if (result.error) {
      setAdminActionError(result.error);
      return;
    }
    setCoAdminTarget(null);
  };

  const nonUserIdsWithPendingInvite = new Set(
    pendingInvites.filter(i => i.nonUserId).map(i => i.nonUserId!)
  );
  const nonUserIdToName = new Map(
    members.filter(m => m.isNonUser).map(m => [m.id, m.name])
  );

  return (
    <div className="space-y-4">
      {/* Invite success banners */}
      {inviteSuccess && (
        <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-md font-medium">
          {inviteSuccess}
        </div>
      )}
      {nonUserInviteSuccess && (
        <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-md font-medium">
          {nonUserInviteSuccess}
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{member.name || member.email || "Unknown"}</p>
                  {member.id === currentUserId && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                  {member.role === "MASTER" && member.id === masterUserId && (
                    <span className="text-xs text-amber-500 font-medium">Admin</span>
                  )}
                  {member.role === "MASTER" && member.id !== masterUserId && (
                    <span className="text-xs text-primary font-medium">Co-admin</span>
                  )}
                </div>
                {member.isNonUser ? (
                  <p className="text-xs text-muted-foreground italic">no account</p>
                ) : (
                  member.name && member.email && member.email !== member.name && (
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  )
                )}
                {member.canViewHousehold && (
                  <p className="text-xs text-primary mt-0.5">Household view access</p>
                )}
              </div>
              {isMaster && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEnterMember(member)}
                    disabled={switchingId === member.id}
                    title="Enter member's budget"
                    className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    aria-label="Enter member's budget"
                  >
                    {switchingId === member.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {member.isNonUser && (
                    <button
                      onClick={() => {
                        if (!nonUserIdsWithPendingInvite.has(member.id)) {
                          setInviteNonUserTarget(member);
                          setNonUserInviteEmail("");
                          setNonUserInviteError(null);
                        }
                      }}
                      title={nonUserIdsWithPendingInvite.has(member.id) ? "Invite already sent" : "Invite to create account"}
                      className={`transition-colors ${
                        nonUserIdsWithPendingInvite.has(member.id)
                          ? "text-primary cursor-default"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                      aria-label={nonUserIdsWithPendingInvite.has(member.id) ? "Invite already sent" : "Invite to create account"}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {member.id !== masterUserId && (
                    <>
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
                      {isOriginalAdmin && !member.isNonUser && (
                        <>
                          {member.role === "MASTER" ? (
                            <button
                              onClick={() => { setCoAdminTarget(member); setCoAdminAction("revoke"); setAdminActionError(null); }}
                              title="Revoke co-admin"
                              className="text-primary hover:text-destructive transition-colors"
                              aria-label="Revoke co-admin"
                            >
                              <ShieldMinus className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => { setCoAdminTarget(member); setCoAdminAction("grant"); setAdminActionError(null); }}
                              title="Make co-admin"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              aria-label="Make co-admin"
                            >
                              <ShieldPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => { setTransferTarget(member); setAdminActionError(null); }}
                            title="Transfer admin role"
                            className="text-muted-foreground hover:text-amber-500 transition-colors"
                            aria-label="Transfer admin role"
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => { setRemoveTarget(member); setDeleteData(false); }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove member"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
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
                {invite.nonUserId && nonUserIdToName.get(invite.nonUserId) ? (
                  <>
                    <p className="text-sm font-medium text-foreground">{nonUserIdToName.get(invite.nonUserId)}</p>
                    <p className="text-xs text-muted-foreground">{invite.email}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground">{invite.email}</p>
                )}
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
        <div className="pt-2 border-t border-border space-y-3">
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
              onClick={() => { setShowInviteForm(true); setInviteError(null); setShowNonUserForm(false); }}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Mail className="w-4 h-4" /> Invite Member by Email
            </button>
          )}

          {showNonUserForm ? (
            <form onSubmit={handleAddNonUser} className="space-y-3">
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Member name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John"
                  value={nonUserName}
                  onChange={(e) => setNonUserName(e.target.value)}
                  className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {nonUserError && <p className="text-sm text-destructive">{nonUserError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isAddingNonUser}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                >
                  {isAddingNonUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Member"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNonUserForm(false); setNonUserError(null); }}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-9 px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setShowNonUserForm(true); setNonUserError(null); setShowInviteForm(false); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-4 h-4" /> Add Member (No Account)
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
              {!removeTarget.isNonUser && (
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
              )}
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

      {/* Transfer Admin Dialog */}
      {transferTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Transfer Admin to {transferTarget.name}?
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              You will lose admin access. {transferTarget.name} will become the new household admin with full authority.
            </p>
            {adminActionError && <p className="text-sm text-destructive font-medium">{adminActionError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setTransferTarget(null); setAdminActionError(null); }}
                disabled={isTransferring}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-9 px-4 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferAdmin}
                disabled={isTransferring}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-amber-500 text-white hover:bg-amber-500/90 h-9 px-4 disabled:opacity-50"
              >
                {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : "Transfer Admin"}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Co-Admin Grant / Revoke Dialog */}
      {coAdminTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                {coAdminAction === "grant" ? (
                  <ShieldPlus className="w-5 h-5 text-primary" />
                ) : (
                  <ShieldMinus className="w-5 h-5 text-destructive" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {coAdminAction === "grant" ? `Make ${coAdminTarget.name} Co-Admin?` : `Revoke Co-Admin from ${coAdminTarget.name}?`}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {coAdminAction === "grant"
                ? `Both you and ${coAdminTarget.name} will have admin access. You can revoke this at any time.`
                : `${coAdminTarget.name} will be returned to a regular member.`}
            </p>
            {adminActionError && <p className="text-sm text-destructive font-medium">{adminActionError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setCoAdminTarget(null); setAdminActionError(null); }}
                disabled={isUpdatingCoAdmin}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-9 px-4 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCoAdminAction}
                disabled={isUpdatingCoAdmin}
                className={`flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 disabled:opacity-50 ${
                  coAdminAction === "grant"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
              >
                {isUpdatingCoAdmin ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : coAdminAction === "grant" ? (
                  "Make Co-Admin"
                ) : (
                  "Revoke Co-Admin"
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Invite Non-User to Create Account Dialog */}
      {inviteNonUserTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Invite {inviteNonUserTarget.name}</h2>
                <p className="text-xs text-muted-foreground">They&apos;ll join with their existing data preserved</p>
              </div>
            </div>
            <form onSubmit={handleSendNonUserInvite} className="space-y-3">
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  placeholder="member@example.com"
                  value={nonUserInviteEmail}
                  onChange={(e) => setNonUserInviteEmail(e.target.value)}
                  className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {nonUserInviteError && <p className="text-sm text-destructive">{nonUserInviteError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setInviteNonUserTarget(null); setNonUserInviteError(null); }}
                  disabled={isSendingNonUserInvite}
                  className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-9 px-4 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingNonUserInvite}
                  className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                >
                  {isSendingNonUserInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
