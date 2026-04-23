// src/app/dashboard/layout.tsx
import { User, LogOut, Fingerprint } from "lucide-react";
import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col relative">
      {/* Semi-transparent blur header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md p-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
          {/* LEFT SIDE: Logo & Brand */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/30">
              <Fingerprint className="h-6 w-6 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
              Nexus<span className="text-emerald-500">Vault</span>
            </h1>
          </Link>

          {/* RIGHT SIDE: Action Buttons */}
          <div className="flex items-center gap-3">
            {/* The Eject Seat (Log Out) */}
            {/* Pointing to "/" violently drops them back at the root login page */}
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Log Out</span>
              </Button>
            </Link>

            {/* The BIGGER Profile Settings Link */}
            <Link href="/dashboard/settings/profile">
              {/* Bumped from h-10 w-10 to h-12 w-12, and icon from h-5 to h-6 */}
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full h-12 w-12 transition-colors"
              >
                <User className="h-6 w-6" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 z-10">{children}</main>
    </div>
  );
}
