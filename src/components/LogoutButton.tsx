"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearFilterStorage } from "@/lib/clearFilterStorage";

export function LogoutButton() {
  const { data: session } = useSession();
  const handleLogout = () => {
    clearFilterStorage(session?.user?.id ?? "");
    signOut({ callbackUrl: "/signin" });
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
    >
      <LogOut className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">Log Out</span>
    </Button>
  );
}
