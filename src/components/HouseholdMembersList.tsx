"use client";

import { useState } from "react";
import { Trash, Loader2, UserPlus, ShieldCheck, ShieldOff, AlertTriangle } from "lucide-react";
import {
  addHouseholdMember,
  removeHouseholdMember,
  grantHouseholdAccess,
  revokeHouseholdAccess,
} from "@/app/actions/household";
import type { HouseholdMember } from "@/lib/data/budget";

interface HouseholdMembersListProps {
  members: HouseholdMember[];
  isMaster: boolean;
  householdId: string;
}

export function HouseholdMembersList({ members, isMaster }: HouseholdMembersListProps) {
  const [removeTarget, setRemoveTarget] = useState<HouseholdMember | null>(null);
  const [deleteData, setDeleteData] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [accessLoadingId, setAccessLoadingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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

  const handleAdd = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError(null);
    const result = await addHouseholdMember({ name, email: email || undefined });
    setIsAdding(false);
    if (result.error) {
      setAddError(result.error);
    } else {
      setName("");
      setEmail("");
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No members yet. Add household members to manage their budgets.
        </p>
      ) : (
        members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{member.name}</p>
              {member.email && (
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

      {isMaster && (
        <>
          {showForm ? (
            <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t border-border">
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Email <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isAdding}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                >
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Member"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setAddError(null); }}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground h-9 px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors pt-1"
            >
              <UserPlus className="w-4 h-4" /> Add Member
            </button>
          )}
        </>
      )}

      {/* Remove Member Dialog */}
      {removeTarget && (
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
      )}
    </div>
  );
}
