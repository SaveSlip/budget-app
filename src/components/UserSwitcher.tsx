"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Users, Check } from "lucide-react";
import Link from "next/link";
import { validateUserSwitch } from "@/app/actions/switchUser";
import type { HouseholdMember } from "@/lib/data/budget";

interface UserSwitcherProps {
  members: HouseholdMember[];
  householdName: string;
  canViewHousehold: boolean;
  onClose: () => void;
}

export function UserSwitcher({ members, householdName, canViewHousehold, onClose }: UserSwitcherProps) {
  const { data: session, update } = useSession();
  const [switching, setSwitching] = useState<string | null>(null);

  const activeUserId = session?.user?.activeUserId ?? session?.user?.id;

  const handleSwitch = async (targetId: string) => {
    setSwitching(targetId);
    const result = await validateUserSwitch(targetId);
    if (!result.error) {
      await update({ activeUserId: targetId });
    }
    setSwitching(null);
  };

  return (
    <div className="px-4 py-2 border-b border-border">
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="w-3 h-3 text-muted-foreground" />
        {canViewHousehold ? (
          <Link
            href="/dashboard/household"
            onClick={onClose}
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors"
          >
            {householdName}
          </Link>
        ) : (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {householdName}
          </p>
        )}
      </div>

      {members.map((member) => {
        const isActive = activeUserId === member.id;
        return (
          <button
            key={member.id}
            onClick={() => handleSwitch(member.id)}
            disabled={isActive || switching !== null}
            className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            } disabled:cursor-default`}
          >
            <span>
            {member.name}
            {member.isNonUser && (
              <span className="ml-1 text-xs text-muted-foreground">(no account)</span>
            )}
          </span>
            {switching === member.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isActive ? (
              <Check className="w-3 h-3" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
