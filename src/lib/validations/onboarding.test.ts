import { describe, it, expect } from "vitest";
import { onboardingNameSchema } from "./onboarding";

describe("onboardingNameSchema", () => {
  it("accepts a valid name", () => {
    expect(onboardingNameSchema.safeParse({ name: "Aman" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(onboardingNameSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts a name of exactly 80 characters", () => {
    expect(onboardingNameSchema.safeParse({ name: "a".repeat(80) }).success).toBe(true);
  });

  it("rejects a name longer than 80 characters", () => {
    expect(onboardingNameSchema.safeParse({ name: "a".repeat(81) }).success).toBe(false);
  });
});
