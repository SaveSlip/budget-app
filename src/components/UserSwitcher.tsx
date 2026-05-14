"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Users, Check } from "lucide-react";
import { validateUserSwitch } from "@/app/actions/switchUser";
import type { HouseholdMember } from "@/lib/data/budget";

interface UserSwitcherProps {
  members: HouseholdMember[];
  householdName: string;
}

export function UserSwitcher({ members, householdName }: UserSwitcherProps) {
  const { data: session, update } = useSession();
  const [switching, setSwitching] = useState<string | null>(null);

  const activeUserId = session?.user?.activeUserId ?? session?.user?.id;
  const isSelf = activeUserId === session?.user?.id;

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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {householdName}
        </p>
      </div>

      {/* Switch back to self */}
      <button
        onClick={() => handleSwitch(session?.user?.id ?? "")}
        disabled={isSelf || switching !== null}
        className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors mb-1 ${
          isSelf
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        } disabled:cursor-default`}
      >
        <span>Me</span>
        {isSelf && <Check className="w-3 h-3" />}
      </button>

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
            <span>{member.name}</span>
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
