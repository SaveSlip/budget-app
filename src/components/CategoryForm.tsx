"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CategorySchema, type CategoryInput } from "@/lib/validations/budget";
import { addCategory } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "@/components/GlassCard";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function CategoryForm() {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const form = useForm<CategoryInput>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      name: "",
      monthlyAllocated: 0,
      type: "fixed",
    },
  });

  async function onSubmit(data: CategoryInput) {
    setIsPending(true);
    setMessage(null);

    const result = await addCategory(data);

    if (result.success) {
      setMessage({
        type: "success",
        text: "Category established successfully.",
      });
      form.reset();
    } else {
      setMessage({
        type: "error",
        text: result.error || "An unexpected error occurred.",
      });
    }
    setIsPending(false);
  }

  return (
    <GlassCard className="p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <header>
          <h3 className="text-lg font-semibold">Define Category</h3>
          <p className="text-sm text-muted-foreground">
            Establish new allocation parameters.
          </p>
        </header>

        <div className="space-y-2">
          <label className="text-sm font-medium">Category Name</label>
          <Input
            {...form.register("name")}
            placeholder="e.g., AWS Infrastructure"
            className="bg-zinc-950/50"
          />
          {form.formState.errors.name && (
            <p className="text-xs text-red-500">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Allocation</label>
            <Input
              {...form.register("monthlyAllocated", { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="bg-zinc-950/50"
            />
            {form.formState.errors.monthlyAllocated && (
              <p className="text-xs text-red-500">
                {form.formState.errors.monthlyAllocated.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Expense Type</label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="bg-zinc-950/50">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed (Predictable)</SelectItem>
                    <SelectItem value="variable">
                      Variable (Fluctuating)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.type && (
              <p className="text-xs text-red-500">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Category
        </Button>

        {message && (
          <p
            className={`text-sm text-center ${message.type === "success" ? "text-emerald-500" : "text-red-500"}`}
          >
            {message.text}
          </p>
        )}
      </form>
    </GlassCard>
  );
}
