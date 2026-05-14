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
    id: "dining-out",
    name: "Dining Out",
    keywords: ["restaurant", "takeout", "take out", "delivery", "coffee", "cafe", "fast food", "doordash", "ubereats", "grubhub", "skip the dishes", "bar", "pub", "brunch", "dining"],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    keywords: ["netflix", "spotify", "movies", "games", "concert", "streaming", "disney", "hulu", "apple tv", "youtube premium", "music", "cinema", "theater", "theatre", "recreation"],
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
    id: "personal-care",
    name: "Personal Care",
    keywords: ["haircut", "gym", "salon", "spa", "fitness", "beauty", "barber", "hair", "nails", "massage", "yoga", "pilates", "workout"],
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
];

export function findUniversalCategory(name: string): UniversalCategory | undefined {
  const normalized = name.toLowerCase().trim();
  return UNIVERSAL_CATEGORIES.find((uc) =>
    uc.keywords.some((kw) => normalized.includes(kw) || kw.includes(normalized))
  );
}
