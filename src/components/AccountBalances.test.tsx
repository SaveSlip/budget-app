// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccountBalances } from "./AccountBalances";
import type { Account, Transaction } from "@/lib/data/budget";

vi.mock("@/app/actions/accounts", () => ({ deleteAccount: vi.fn().mockResolvedValue({ success: true }) }));

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: "a1",
  name: "Chequing",
  accountType: "CHECKING",
  initialBalance: 1000,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  pk: "USER#u1",
  sk: "TX#2026-05-01#t1",
  id: "t1",
  description: "Test",
  amount: 100,
  date: "2026-05-01",
  category: "Food",
  type: "TRANSACTION",
  transactionType: "EXPENSE",
  createdAt: "2026-05-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("AccountBalances", () => {
  it("shows empty state when no accounts", () => {
    render(<AccountBalances accounts={[]} transactions={[]} />);
    expect(screen.getByText(/No accounts yet/)).toBeTruthy();
  });

  it("renders each account name", () => {
    const accounts = [makeAccount({ name: "Main" }), makeAccount({ id: "a2", name: "Savings", accountType: "SAVINGS" })];
    render(<AccountBalances accounts={accounts} transactions={[]} />);
    expect(screen.getByText("Main")).toBeTruthy();
    expect(screen.getByText("Savings")).toBeTruthy();
  });

  it("computes balance using initial balance + transactions", () => {
    const account = makeAccount({ initialBalance: 500 });
    const txns = [makeTx({ accountId: "a1", amount: 200, transactionType: "INCOME" })];
    render(<AccountBalances accounts={[account]} transactions={txns} />);
    expect(screen.getByText("$700.00")).toBeTruthy();
  });

  it("shows negative balance in destructive colour", () => {
    const account = makeAccount({ initialBalance: 0 });
    const txns = [makeTx({ accountId: "a1", amount: 100, transactionType: "EXPENSE" })];
    const { container } = render(<AccountBalances accounts={[account]} transactions={txns} />);
    // balance is rendered as split text nodes inside a span — query the span directly
    const spans = container.querySelectorAll("span.font-mono");
    const balanceSpan = Array.from(spans).find((s) => s.textContent?.includes("100.00"));
    expect(balanceSpan?.className).toContain("text-destructive");
  });

  it("inverts balance display for CREDIT accounts (negative balance shown with minus prefix)", () => {
    const account = makeAccount({ accountType: "CREDIT", initialBalance: 0 });
    const txns = [makeTx({ accountId: "a1", amount: 200, transactionType: "EXPENSE" })];
    const { container } = render(<AccountBalances accounts={[account]} transactions={txns} />);
    const spans = container.querySelectorAll("span.font-mono");
    const balanceSpan = Array.from(spans).find((s) => s.textContent?.includes("200.00"));
    expect(balanceSpan?.textContent).toContain("-");
  });

  it("treats NaN amount as 0 in balance computation", () => {
    const account = makeAccount({ initialBalance: 100 });
    const txns = [makeTx({ accountId: "a1", amount: NaN })];
    const { container } = render(<AccountBalances accounts={[account]} transactions={txns} />);
    const spans = container.querySelectorAll("span.font-mono");
    const balanceSpan = Array.from(spans).find((s) => s.textContent?.includes("100.00"));
    expect(balanceSpan).toBeTruthy();
  });

  it("adds income to non-credit account balance", () => {
    const account = makeAccount({ initialBalance: 0 });
    const txns = [makeTx({ accountId: "a1", amount: 500, transactionType: "INCOME" })];
    const { container } = render(<AccountBalances accounts={[account]} transactions={txns} />);
    const spans = container.querySelectorAll("span.font-mono");
    const balanceSpan = Array.from(spans).find((s) => s.textContent?.includes("500.00"));
    expect(balanceSpan).toBeTruthy();
  });

  it("subtracts income from CREDIT account balance (reduces debt)", () => {
    const account = makeAccount({ accountType: "CREDIT", initialBalance: 500 });
    const txns = [makeTx({ accountId: "a1", amount: 100, transactionType: "INCOME" })];
    const { container } = render(<AccountBalances accounts={[account]} transactions={txns} />);
    // balance = 500 - 100 = 400 (CREDIT income reduces balance), displayBalance = -400
    const spans = container.querySelectorAll("span.font-mono");
    const balanceSpan = Array.from(spans).find((s) => s.textContent?.includes("400.00"));
    expect(balanceSpan).toBeTruthy();
  });

  it("renders Net Worth row", () => {
    render(<AccountBalances accounts={[makeAccount()]} transactions={[]} />);
    expect(screen.getByText("Net Worth")).toBeTruthy();
  });

  it("renders delete button and can click it", async () => {
    render(<AccountBalances accounts={[makeAccount()]} transactions={[]} />);
    const btn = screen.getByLabelText("Delete account");
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
  });

  it("shows all account type icons without error", () => {
    const types: Account["accountType"][] = ["CHECKING", "SAVINGS", "CREDIT", "CASH", "INVESTMENT", "OTHER"];
    const accounts = types.map((t, i) => makeAccount({ id: `a${i}`, accountType: t }));
    render(<AccountBalances accounts={accounts} transactions={[]} />);
    expect(screen.getAllByLabelText("Delete account").length).toBe(6);
  });

  it("falls back to MoreHorizontal icon for unknown account type", () => {
    const account = makeAccount({ accountType: "UNKNOWN" as any });
    const { container } = render(<AccountBalances accounts={[account]} transactions={[]} />);
    // Should render without error; icon falls back to MoreHorizontal
    expect(container.querySelector("[aria-label='Delete account']")).toBeTruthy();
  });
});
