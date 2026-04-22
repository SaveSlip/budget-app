// app/dashboard/layout.tsx
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col relative">
      {/* Semi-transparent blur header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md p-4">
        <div className="mx-auto max-w-6xl flex items-center gap-3">
          {/* Custom SVG Logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-emerald-500"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            HSMT <span className="text-emerald-500">9000</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 p-6 z-10">{children}</main>
    </div>
  );
}
