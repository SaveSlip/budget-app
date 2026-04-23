// src/app/dashboard/settings/categories/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { categories as initialCategories, Category } from "@/app/lib/mockData";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/FadeIn";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from "lucide-react";

export default function CategorySettingsPage() {
  // We load our fake database into React State so we can manipulate it locally
  const [cats, setCats] = useState<Category[]>(initialCategories);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"income" | "expense">("expense");

  // State for inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCategory: Category = {
      id: newCatName.toLowerCase().replace(/\s+/g, "-"), // Create a URL-friendly slug
      name: newCatName,
      type: newCatType,
    };

    setCats([...cats, newCategory]);
    setNewCatName(""); // Reset the input
  };

  const handleDelete = (id: string) => {
    setCats(cats.filter((c) => c.id !== id));
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const saveEdit = (id: string) => {
    setCats(cats.map((c) => (c.id === id ? { ...c, name: editName } : c)));
    setEditingId(null);
  };

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6">
      {/* Header and Back Button */}
      <FadeIn delay={0.1}>
        <div className="flex items-center">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </FadeIn>

      <div className="grid gap-6 md:grid-cols-12">
        {/* LEFT COLUMN: Add New Category */}
        <div className="md:col-span-4">
          <FadeIn delay={0.2}>
            <Card className="border-white/5 bg-white/5 backdrop-blur-sm sticky top-24">
              <CardHeader>
                <CardTitle className="text-white">New Category</CardTitle>
                <CardDescription className="text-slate-400">
                  Add a rule for the auto-parser.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleAddCategory}
                  className="flex flex-col gap-4"
                >
                  <Input
                    placeholder="e.g. Sushi Funds"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="bg-black/40 border-white/10 text-white placeholder:text-slate-500"
                  />

                  {/* Super simple toggle for Income vs Expense */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newCatType === "expense" ? "default" : "outline"}
                      className={`flex-1 ${newCatType === "expense" ? "bg-rose-600 hover:bg-rose-500 text-white" : "border-white/10 text-slate-400"}`}
                      onClick={() => setNewCatType("expense")}
                    >
                      Expense
                    </Button>
                    <Button
                      type="button"
                      variant={newCatType === "income" ? "default" : "outline"}
                      className={`flex-1 ${newCatType === "income" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border-white/10 text-slate-400"}`}
                      onClick={() => setNewCatType("income")}
                    >
                      Income
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-slate-100 text-slate-900 hover:bg-white"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                  </Button>
                </form>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* RIGHT COLUMN: The Category List */}
        <div className="md:col-span-8">
          <FadeIn delay={0.3}>
            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Active Categories</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage how your transactions will be automatically labeled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {cats.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-black/20 hover:bg-black/40 transition-colors group"
                    >
                      {/* Left Side: Name and Badge */}
                      <div className="flex items-center gap-3 flex-1">
                        <Badge
                          className={
                            cat.type === "income"
                              ? "bg-emerald-500/20 text-emerald-400 border-none w-20 justify-center"
                              : "bg-rose-500/20 text-rose-400 border-none w-20 justify-center"
                          }
                        >
                          {cat.type}
                        </Badge>

                        {/* Inline Editing Logic */}
                        {editingId === cat.id ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-slate-900 border-emerald-500/50 text-white h-8 max-w-[200px]"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-slate-200">
                            {cat.name}
                          </span>
                        )}
                      </div>

                      {/* Right Side: Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingId === cat.id ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              onClick={() => saveEdit(cat.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-slate-300 hover:bg-white/10"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                              onClick={() => startEditing(cat)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              onClick={() => handleDelete(cat.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}

                  {cats.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      No categories left. Your parser is going to be very
                      confused.
                    </div>
                  )}
                </ul>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
