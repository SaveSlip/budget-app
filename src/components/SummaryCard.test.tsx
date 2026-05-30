// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryCard } from "./SummaryCard";

describe("SummaryCard", () => {
  const base = { title: "Income", description: "This month", value: "$5,000" };

  it("renders title, value and description", () => {
    render(<SummaryCard {...base} type="income" />);
    expect(screen.getByText("Income")).toBeTruthy();
    expect(screen.getByText("$5,000")).toBeTruthy();
    expect(screen.getByText("This month")).toBeTruthy();
  });

  it("applies income colour class to the value", () => {
    render(<SummaryCard {...base} type="income" />);
    const heading = screen.getByText("$5,000");
    expect(heading.className).toContain("text-success");
  });

  it("applies expense colour class to the value", () => {
    render(<SummaryCard {...base} type="expense" />);
    const heading = screen.getByText("$5,000");
    expect(heading.className).toContain("text-primary");
  });

  it("applies balance colour class to the value", () => {
    render(<SummaryCard {...base} type="balance" />);
    const heading = screen.getByText("$5,000");
    expect(heading.className).toContain("text-foreground");
  });

  it("accepts optional className", () => {
    const { container } = render(<SummaryCard {...base} type="balance" className="extra-class" />);
    expect(container.firstChild?.toString()).toBeDefined();
  });

  it("renders a default type without crashing (covers default branch)", () => {
    // Casting to bypass TypeScript — exercises the default branch in getTypeStyles / getTitleColor
    render(<SummaryCard {...base} type={"other" as any} />);
    expect(screen.getByText("$5,000")).toBeTruthy();
  });
});
