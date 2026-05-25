"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogPanel } from "@/components/LogPanel";
import type { Category, Account } from "@/lib/data/budget";

interface AddTransactionDialogProps {
  categories: Category[];
  accounts: Account[];
}

export function AddTransactionDialog({ categories, accounts }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <PlusCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
        </DialogHeader>
        <LogPanel categories={categories} accounts={accounts} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
