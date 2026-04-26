"use client";

import { useState } from "react";
import Link from "next/link";
import { categories as initialCategories, Category } from "@/app/lib/mockData";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/FadeIn";
import { GlassCard } from "@/components/GlassCard";
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
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/10"
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
            <GlassCard className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-foreground">New Category</CardTitle>
                <CardDescription className="text-muted-foreground">
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
                    className="bg-background/40 border-foreground/10 text-foreground placeholder:text-muted-foreground"
                  />

                  {/* Super simple toggle for Income vs Expense */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newCatType === "expense" ? "default" : "outline"}
                      className={`flex-1 ${newCatType === "expense" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "border-foreground/10 text-muted-foreground"}`}
                      onClick={() => setNewCatType("expense")}
                    >
                      Expense
                    </Button>
                    <Button
                      type="button"
                      variant={newCatType === "income" ? "default" : "outline"}
                      className={`flex-1 ${newCatType === "income" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "border-foreground/10 text-muted-foreground"}`}
                      onClick={() => setNewCatType("income")}
                    >
                      Income
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                  </Button>
                </form>
              </CardContent>
            </GlassCard>
          </FadeIn>
        </div>

        {/* RIGHT COLUMN: The Category List */}
        <div className="md:col-span-8">
          <FadeIn delay={0.3}>
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-foreground">
                  Active Categories
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage how your transactions will be automatically labeled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {cats.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-foreground/5 bg-background/20 hover:bg-background/40 transition-colors group"
                    >
                      {/* Left Side: Name and Badge */}
                      <div className="flex items-center gap-3 flex-1">
                        <Badge
                          className={
                            cat.type === "income"
                              ? "bg-primary/20 text-primary border-none w-20 justify-center hover:bg-primary/30"
                              : "bg-orange-500/20 text-orange-600 border-none w-20 justify-center hover:bg-orange-500/30"
                          }
                        >
                          {cat.type}
                        </Badge>

                        {/* Inline Editing Logic */}
                        {editingId === cat.id ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-background border-primary/50 text-foreground h-8 max-w-50"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-foreground">
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
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => saveEdit(cat.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
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
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                              onClick={() => startEditing(cat)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                    <div className="p-8 text-center text-muted-foreground">
                      No categories left. Your parser is going to be very
                      confused.
                    </div>
                  )}
                </ul>
              </CardContent>
            </GlassCard>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
