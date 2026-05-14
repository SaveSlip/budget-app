"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CategorySchema, type CategoryInput } from "@/lib/validations/budget";
import { createCategory } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function CategoryForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<CategoryInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CategorySchema as any),
    defaultValues: {
      name: "",
      limit: 0,
    },
  });

  async function onSubmit(data: CategoryInput) {
    startTransition(async () => {
      try {
        const result = await createCategory(data);

        if (result.error === "universal" && result.universalName) {
          form.setError("name", {
            message: `"${data.name}" is already tracked under the universal category "${result.universalName}". No need to create it separately.`,
          });
        } else if (result.error === "duplicate") {
          form.setError("name", { message: "A category with this name already exists." });
        } else if (result.error) {
          form.setError("root", { message: result.error });
        } else {
          form.reset();
          onSuccess ? onSuccess() : router.refresh();
        }
      } catch {
        form.setError("root", { message: "Something went wrong. Please try again." });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Category Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Groceries"
                  disabled={isPending}
                  {...field}
                  className="bg-background/50 border-border text-foreground"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Monthly Limit ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  disabled={isPending}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                  onFocus={(e) => { if (Number(e.target.value) === 0) field.onChange(""); }}
                  onBlur={(e) => { if (e.target.value === "") field.onChange(0); }}
                  className="bg-background/50 border-border text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </FormControl>
              <FormDescription className="text-muted-foreground/60">
                Set a benchmark to track your spending progress.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Creating..." : "Add Category"}
        </Button>
      </form>
    </Form>
  );
}
