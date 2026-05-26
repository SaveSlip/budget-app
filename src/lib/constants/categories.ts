export interface UniversalCategory {
  id: string;
  name: string;
  keywords: string[];
}

export const UNIVERSAL_CATEGORIES: UniversalCategory[] = [
  {
    id: "housing",
    name: "Housing",
    keywords: ["rent", "mortgage", "property tax", "hoa", "home", "landlord", "lease", "apartment", "condo"],
  },
  {
    id: "food-groceries",
    name: "Food & Groceries",
    keywords: ["groceries", "grocery", "supermarket", "costco", "whole foods", "walmart food", "food", "produce", "loblaws", "metro", "safeway", "kroger"],
  },
  {
    id: "transportation",
    name: "Transportation",
    keywords: ["gas", "fuel", "uber", "lyft", "transit", "parking", "car", "vehicle", "bus", "subway", "train", "taxi", "petrol", "auto"],
  },
  {
    id: "healthcare",
    name: "Healthcare",
    keywords: ["doctor", "pharmacy", "dentist", "hospital", "medical", "health", "clinic", "prescription", "therapy", "vision", "optometrist"],
  },
  {
    id: "utilities",
    name: "Utilities",
    keywords: ["electricity", "water", "internet", "phone", "hydro", "cable", "broadband", "gas bill", "sewer", "wifi", "cell", "mobile plan"],
  },
  {
    id: "entertainment-dining",
    name: "Entertainment & Dining",
    keywords: ["restaurant", "takeout", "take out", "delivery", "coffee", "cafe", "fast food", "doordash", "ubereats", "grubhub", "skip the dishes", "bar", "pub", "brunch", "dining", "movies", "games", "concert", "music", "cinema", "theater", "theatre", "recreation"],
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    keywords: ["netflix", "spotify", "hulu", "disney", "apple tv", "youtube premium", "youtube", "subscription", "membership", "patreon", "twitch", "streaming", "prime video", "amazon prime", "apple one", "peacock", "paramount"],
  },
  {
    id: "shopping",
    name: "Shopping",
    keywords: ["amazon", "clothing", "clothes", "shoes", "retail", "mall", "fashion", "apparel", "electronics", "home goods", "ikea", "target", "merchandise"],
  },
  {
    id: "education",
    name: "Education",
    keywords: ["tuition", "books", "courses", "school", "college", "university", "student", "textbooks", "udemy", "coursera", "learning", "classes"],
  },
  {
    id: "savings-investments",
    name: "Savings & Investments",
    keywords: ["savings", "investment", "etf", "stocks", "rrsp", "tfsa", "401k", "roth", "ira", "mutual fund", "brokerage", "crypto", "pension", "retirement"],
  },
  {
    id: "insurance",
    name: "Insurance",
    keywords: ["insurance", "life insurance", "auto insurance", "home insurance", "tenant insurance", "renters insurance", "coverage", "premium", "policy"],
  },
  {
    id: "miscellaneous",
    name: "Miscellaneous",
    keywords: ["misc", "miscellaneous", "other", "general"],
  },
];

export const UNIVERSAL_INCOME_CATEGORIES: UniversalCategory[] = [
  {
    id: "income-salary",
    name: "Salary",
    keywords: ["salary", "payroll", "paycheck", "wages", "direct deposit", "employment income"],
  },
  {
    id: "income-freelance",
    name: "Freelance",
    keywords: ["freelance", "contract", "consulting", "self-employed", "gig", "invoice", "client payment"],
  },
  {
    id: "income-investment",
    name: "Investment Returns",
    keywords: ["dividend", "interest", "capital gains", "returns", "brokerage deposit", "etf income"],
  },
  {
    id: "income-rental",
    name: "Rental Income",
    keywords: ["rent received", "rental income", "tenant payment", "sublease income"],
  },
  {
    id: "income-business",
    name: "Business Income",
    keywords: ["business income", "revenue", "sales", "profit", "business deposit"],
  },
  {
    id: "income-internal-transfer",
    name: "Internal Transfer",
    keywords: ["transfer", "internal transfer", "payment from", "credit card payment", "account transfer", "interac transfer", "e-transfer"],
  },
  {
    id: "income-other",
    name: "Other Income",
    keywords: ["refund", "rebate", "gift", "bonus", "tax return", "cashback", "transfer in"],
  },
];

export function findUniversalCategory(name: string): UniversalCategory | undefined {
  const normalized = name.toLowerCase().trim();
  return UNIVERSAL_CATEGORIES.find((uc) =>
    uc.keywords.some((kw) => normalized.includes(kw) || kw.includes(normalized))
  );
}

export function applyUserRules(
  description: string,
  transactionType: "EXPENSE" | "INCOME",
  rules: { merchantKeyword: string; categoryName: string; transactionType: string }[]
): string | null {
  const normalized = description.toLowerCase();
  const match = rules.find(
    (r) => r.transactionType === transactionType && normalized.includes(r.merchantKeyword)
  );
  return match ? match.categoryName : null;
}

export function autoMatchCategory(
  description: string,
  transactionType: "EXPENSE" | "INCOME"
): string {
  const normalized = description.toLowerCase().trim();
  const pool =
    transactionType === "INCOME" ? UNIVERSAL_INCOME_CATEGORIES : UNIVERSAL_CATEGORIES;

  const match = pool.find((uc) =>
    uc.keywords.some((kw) => normalized.includes(kw))
  );

  return match ? match.name : "Uncategorized";
}
