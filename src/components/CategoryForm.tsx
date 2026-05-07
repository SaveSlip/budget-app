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

export function CategoryForm() {
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

        if (result.error) {
          form.setError("root", { message: result.error });
        } else {
          form.reset();
          router.refresh();
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
              <FormLabel className="text-white">Category Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Groceries"
                  disabled={isPending}
                  {...field}
                  className="bg-black/20 border-white/10 text-white"
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
              <FormLabel className="text-white">Monthly Limit ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  disabled={isPending}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="bg-black/20 border-white/10 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
          <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          {isPending ? "Creating..." : "Add Category"}
        </Button>
      </form>
    </Form>
  );
}
