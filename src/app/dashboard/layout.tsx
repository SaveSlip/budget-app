// app/dashboard/layout.tsx
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Hyper-Secure Money Tracker 9000
        </h1>
      </header>
      <main className="flex-1 p-6">
        {/* This is where your pages will magically render */}
        {children}
      </main>
    </div>
  );
}
