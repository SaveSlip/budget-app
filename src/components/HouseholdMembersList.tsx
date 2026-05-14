"use client";

import { useState } from "react";
import { Trash, Loader2, UserPlus } from "lucide-react";
import { addHouseholdMember, removeHouseholdMember } from "@/app/actions/household";
import type { HouseholdMember } from "@/lib/data/budget";

interface HouseholdMembersListProps {
  members: HouseholdMember[];
  isMaster: boolean;
  householdId: string;
}

export function HouseholdMembersList({ members, isMaster }: HouseholdMembersListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await removeHouseholdMember(id);
    setDeletingId(null);
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
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
            </div>
            {isMaster && (
              <button
                onClick={() => handleDelete(member.id)}
                disabled={deletingId === member.id}
                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                aria-label="Remove member"
              >
                {deletingId === member.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash className="w-3.5 h-3.5" />
                )}
              </button>
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
    </div>
  );
}
