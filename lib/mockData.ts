// lib/mockData.ts

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  categoryId: string; // The URL slug
};

export type Category = {
  id: string; // The URL slug (e.g., 'side-hustle')
  name: string;
  type: "income" | "expense";
};

export const categories: Category[] = [
  { id: "housing", name: "Housing", type: "expense" },
  { id: "groceries", name: "Groceries", type: "expense" },
  { id: "coffee", name: "Coffee", type: "expense" },
  { id: "salary", name: "Salary", type: "income" },
  { id: "side-hustle", name: "Side Hustle", type: "income" },
];

export const transactions: Transaction[] = [
  {
    id: "t1",
    date: "2026-04-01",
    description: "TechCorp Inc. Payroll",
    amount: 5000,
    categoryId: "salary",
  },
  {
    id: "t2",
    date: "2026-04-01",
    description: "Downtown Apartments",
    amount: 1500,
    categoryId: "housing",
  },
  {
    id: "t3",
    date: "2026-04-04",
    description: "Whole Foods Market",
    amount: 210.5,
    categoryId: "groceries",
  },
  {
    id: "t4",
    date: "2026-04-05",
    description: "Starbucks #492",
    amount: 6.5,
    categoryId: "coffee",
  },
  {
    id: "t5",
    date: "2026-04-08",
    description: "Freelance Client XYZ",
    amount: 240,
    categoryId: "side-hustle",
  },
  {
    id: "t6",
    date: "2026-04-12",
    description: "Trader Joe's",
    amount: 115.2,
    categoryId: "groceries",
  },
  {
    id: "t7",
    date: "2026-04-15",
    description: "Local Roasters",
    amount: 18.5,
    categoryId: "coffee",
  },
  {
    id: "t8",
    date: "2026-04-18",
    description: "Costco Wholesale",
    amount: 124.3,
    categoryId: "groceries",
  },
];

// Helper to fake a database query
export function getTransactionsByCategory(categoryId: string) {
  return transactions.filter((t) => t.categoryId === categoryId);
}

// Helper to fake the aggregated totals for the dashboard table
export function getCategoryBreakdown() {
  return categories
    .map((cat) => {
      const total = transactions
        .filter((t) => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...cat, amount: total };
    })
    .filter((cat) => cat.amount > 0); // Only return categories that have data
}
