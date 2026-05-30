// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent } from "./card";

describe("Card UI components", () => {
  it("Card renders with default size", () => {
    const { container } = render(<Card>content</Card>);
    expect(container.querySelector("[data-slot='card']")).toBeTruthy();
  });

  it("Card renders with sm size", () => {
    const { container } = render(<Card size="sm">content</Card>);
    expect(container.querySelector("[data-size='sm']")).toBeTruthy();
  });

  it("CardHeader renders", () => {
    const { container } = render(<CardHeader>header</CardHeader>);
    expect(container.querySelector("[data-slot='card-header']")).toBeTruthy();
  });

  it("CardTitle renders", () => {
    const { container } = render(<CardTitle>title</CardTitle>);
    expect(container.querySelector("[data-slot='card-title']")).toBeTruthy();
  });

  it("CardDescription renders", () => {
    const { container } = render(<CardDescription>desc</CardDescription>);
    expect(container.querySelector("[data-slot='card-description']")).toBeTruthy();
  });

  it("CardAction renders", () => {
    const { container } = render(<CardAction>action</CardAction>);
    expect(container.querySelector("[data-slot='card-action']")).toBeTruthy();
  });

  it("CardContent renders", () => {
    const { container } = render(<CardContent>body</CardContent>);
    expect(container.querySelector("[data-slot='card-content']")).toBeTruthy();
  });

  it("CardFooter renders", () => {
    const { container } = render(<CardFooter>footer</CardFooter>);
    expect(container.querySelector("[data-slot='card-footer']")).toBeTruthy();
  });
});
