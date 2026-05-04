"use client";

import { useState } from "react";
import { z } from "zod";
import { createCategory } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
  limit: z.coerce.number().nonnegative("Budget limit must be 0 or greater"),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof categoryFormSchema>, string>>;

export function CategoryForm() {
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("0");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const parsed = categoryFormSchema.safeParse({ name, limit });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setIsSubmitting(true);
    const result = await createCategory({ name: parsed.data.name, limit: parsed.data.limit });
    setIsSubmitting(false);

    if (result.error) {
      setServerError(result.error);
    } else {
      setName("");
      setLimit("0");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Category Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Groceries"
          disabled={isSubmitting}
          className="mt-1.5"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Monthly Limit ($)
        </label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Set to 0 if you do not want to track a budget limit.
        </p>
        {fieldErrors.limit && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.limit}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-500">{serverError}</p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Category"
        )}
      </Button>
    </form>
  );
}
