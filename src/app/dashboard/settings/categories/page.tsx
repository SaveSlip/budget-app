"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { createCategory, deleteCategory, listCategories } from "@/app/actions/categories";

interface Category {
  id: string;
  name: string;
  limit: number;
  count: number;
}

export default function CategoriesSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listCategories().then((result) => {
      if (result.categories) {
        setCategories(result.categories as Category[]);
      }
      setIsLoading(false);
    });
  }, []);

  const handleAdd = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setIsSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const nameToSave = newCategory.trim();

    setCategories((prev) => [
      ...prev,
      { id: tempId, name: nameToSave, limit: 0, count: 0 },
    ]);
    setNewCategory("");

    const result = await createCategory({ name: nameToSave, limit: 0 });

    if (result.error) {
      alert("Failed to save category: " + result.error);
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
    } else if (result.id) {
      setCategories((prev) =>
        prev.map((c) => (c.id === tempId ? { ...c, id: result.id! } : c)),
      );
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const snapshot = [...categories];
    setCategories((prev) => prev.filter((c) => c.id !== id));

    const result = await deleteCategory(id);

    if (result.error) {
      alert("Failed to delete category: " + result.error);
      setCategories(snapshot);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Category Configuration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage transaction taxonomies and routing rules.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Add New Category Form */}
        <div className="md:col-span-1">
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Add Category
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Marketing"
                  className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-gray-900 dark:bg-gray-100 px-4 py-2 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Category
              </button>
            </form>
          </div>
        </div>

        {/* Existing Categories List */}
        <div className="md:col-span-2">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="h-10 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Name
                  </th>
                  <th className="h-10 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider text-right">
                    Monthly Limit
                  </th>
                  <th className="h-10 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No categories configured.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-4 font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                      </td>
                      <td className="p-4 text-right text-gray-500 dark:text-gray-400">
                        {category.limit > 0
                          ? `$${category.limit.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
