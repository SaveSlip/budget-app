"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createAccount } from "@/app/actions/accounts";

const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Chequing" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CREDIT", label: "Credit Card" },
  { value: "CASH", label: "Cash" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "OTHER", label: "Other" },
] as const;

export function AccountForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "" as string,
    initialBalance: "0",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    if (!formData.type) {
      setError("Please select an account type.");
      setIsSubmitting(false);
      return;
    }

    const result = await createAccount({
      name: formData.name,
      type: formData.type as (typeof ACCOUNT_TYPES)[number]["value"],
      initialBalance: Number(formData.initialBalance),
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setFormData({ name: "", type: "", initialBalance: "0" });
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Account Name
        </label>
        <input
          type="text"
          required
          placeholder="e.g., Chase Checking, AMEX Gold"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Account Type
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value,
              })
            }
            className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="" disabled>Select account type</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Current Balance
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={formData.initialBalance}
              onChange={(e) =>
                setFormData({ ...formData, initialBalance: e.target.value })
              }
              onFocus={(e) => {
                if (e.target.value === "0") setFormData({ ...formData, initialBalance: "" });
              }}
              onBlur={(e) => {
                if (e.target.value === "") setFormData({ ...formData, initialBalance: "0" });
              }}
              className="flex h-10 w-full rounded-md border border-border bg-transparent pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && (
        <p className="text-sm text-green-500">Account added successfully.</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          "Add Account"
        )}
      </button>
    </form>
  );
}
