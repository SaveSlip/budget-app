import { describe, it, expect } from "vitest";
import { CategorySchema } from "./budget";

describe("CategorySchema", () => {
  const valid = { name: "Food", limit: 500 };

  it("accepts a valid category", () => {
    expect(CategorySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an optional id", () => {
    const result = CategorySchema.safeParse({ ...valid, id: "cat-1" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("cat-1");
  });

  it("accepts id omitted", () => {
    const result = CategorySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBeUndefined();
  });

  it("rejects empty name", () => {
    expect(CategorySchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("accepts limit of 0", () => {
    expect(CategorySchema.safeParse({ ...valid, limit: 0 }).success).toBe(true);
  });

  it("rejects negative limit", () => {
    expect(CategorySchema.safeParse({ ...valid, limit: -1 }).success).toBe(false);
  });
});
