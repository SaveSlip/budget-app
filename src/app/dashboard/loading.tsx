// src/app/dashboard/loading.tsx
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center space-y-4">
      <div className="flex items-center justify-center rounded-full bg-primary/10 p-4 border border-primary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-foreground">
          Loading Dashboard
        </h3>
        <p className="text-sm text-muted-foreground">
          Retrieving secure financial data...
        </p>
      </div>
    </div>
  );
}
