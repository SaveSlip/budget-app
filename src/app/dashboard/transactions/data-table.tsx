"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Download, Loader2, Trash2 } from "lucide-react"
import Papa from "papaparse"
import { batchDeleteTransactions, deleteAllTransactions, getTransactionsBatch } from "@/app/actions/transactions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TransactionActions } from "@/components/TransactionActions"
import type { Category, Account } from "@/lib/data/budget"

const PAGE_SIZE = 25
const PREFETCH_SIZE = 50

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  initialCursor: string | null
  embedded?: boolean
  initialCategories?: Category[]
  initialAccounts?: Account[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  initialCursor,
  embedded = false,
  initialCategories = [],
  initialAccounts = [],
}: DataTableProps<TData, TValue>) {
  const [visibleData, setVisibleData] = React.useState<TData[]>(data)
  // IDs of rows just appended — cleared after one frame so animation fires once
  const [newRowIds, setNewRowIds] = React.useState<Set<string>>(new Set())

  const bufferRef = React.useRef<TData[]>([])
  const cursorRef = React.useRef<string | null>(initialCursor)
  const hasLoadedAllRef = React.useRef(initialCursor === null)
  const isRevealingRef = React.useRef(false)

  const [isFetching, setIsFetching] = React.useState(false)
  const [isLoadingAll, setIsLoadingAll] = React.useState(false)
  const [exhausted, setExhausted] = React.useState(initialCursor === null)

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = React.useState(false)
  const [isDeletingAll, setIsDeletingAll] = React.useState(false)
  const [monthFilter, setMonthFilter] = React.useState<string>("all")

  const sentinelRef = React.useRef<HTMLDivElement>(null)

  // Reset everything when the server re-renders after a mutation
  React.useEffect(() => {
    bufferRef.current = []
    cursorRef.current = initialCursor
    hasLoadedAllRef.current = initialCursor === null
    isRevealingRef.current = false
    setVisibleData(data)
    setNewRowIds(new Set())
    setExhausted(initialCursor === null)
    setIsFetching(false)
  }, [data, initialCursor])

  const prefetchIntoBuffer = React.useCallback(async () => {
    if (isFetching || hasLoadedAllRef.current) return
    const cursor = cursorRef.current
    if (!cursor) return
    setIsFetching(true)
    try {
      const result = await getTransactionsBatch(cursor, PREFETCH_SIZE)
      bufferRef.current = [...bufferRef.current, ...result.transactions as TData[]]
      cursorRef.current = result.nextCursor
      if (!result.nextCursor) hasLoadedAllRef.current = true
    } finally {
      setIsFetching(false)
    }
  }, [isFetching])

  // Kick off first prefetch on mount so buffer is ready before first scroll
  React.useEffect(() => {
    if (!exhausted && bufferRef.current.length === 0) {
      prefetchIntoBuffer()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const revealNextPage = React.useCallback(() => {
    if (isRevealingRef.current) return
    if (bufferRef.current.length === 0) {
      if (hasLoadedAllRef.current) setExhausted(true)
      return
    }

    isRevealingRef.current = true
    const next = bufferRef.current.slice(0, PAGE_SIZE)
    bufferRef.current = bufferRef.current.slice(PAGE_SIZE)

    const ids = new Set(next.map((row) => (row as { id?: string }).id ?? ""))

    setVisibleData((prev) => [...prev, ...next])
    setNewRowIds(ids)

    // Clear the animation markers after one frame — prevents re-animation on re-render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNewRowIds(new Set())
        isRevealingRef.current = false
      })
    })

    if (hasLoadedAllRef.current && bufferRef.current.length === 0) {
      setExhausted(true)
    }

    if (!hasLoadedAllRef.current && bufferRef.current.length < PAGE_SIZE) {
      prefetchIntoBuffer()
    }
  }, [prefetchIntoBuffer])

  // IntersectionObserver: trigger reveal when sentinel enters viewport
  React.useEffect(() => {
    const el = sentinelRef.current
    if (!el || exhausted) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) revealNextPage() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [revealNextPage, exhausted])

  // Load all remaining pages at once for search / filter accuracy
  const loadAllRemaining = React.useCallback(async () => {
    if (isLoadingAll) return
    setIsLoadingAll(true)
    try {
      const accumulated: TData[] = [...bufferRef.current]
      bufferRef.current = []
      let currentCursor = cursorRef.current
      while (currentCursor) {
        const result = await getTransactionsBatch(currentCursor, 100)
        accumulated.push(...result.transactions as TData[])
        currentCursor = result.nextCursor
      }
      cursorRef.current = null
      hasLoadedAllRef.current = true
      setVisibleData((prev) => [...prev, ...accumulated])
      setExhausted(true)
    } finally {
      setIsLoadingAll(false)
    }
  }, [isLoadingAll])

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>()
    visibleData.forEach((row) => {
      const d = (row as { date?: string }).date
      if (d && d.length >= 7) months.add(d.slice(0, 7))
    })
    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }, [visibleData])

  const filteredData = React.useMemo(() => {
    if (monthFilter === "all") return visibleData
    return visibleData.filter((row) => {
      const d = (row as { date?: string }).date
      return d?.startsWith(monthFilter)
    })
  }, [visibleData, monthFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    autoResetPageIndex: false,
    state: { sorting, columnFilters, rowSelection },
  })

  const descriptionFilter = (table.getColumn("description")?.getFilterValue() as string) ?? ""
  React.useEffect(() => {
    if ((descriptionFilter || monthFilter !== "all") && !exhausted) {
      loadAllRemaining()
    }
  }, [descriptionFilter, monthFilter, exhausted, loadAllRemaining])

  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length

  async function handleDeleteAll() {
    setIsDeletingAll(true)
    await deleteAllTransactions()
    setRowSelection({})
    setIsDeletingAll(false)
    setShowDeleteAllConfirm(false)
  }

  async function handleBulkDelete() {
    setIsDeleting(true)
    const items = selectedRows.map((row) => {
      const tx = row.original as { id: string; date: string }
      return { id: tx.id, date: tx.date }
    })
    await batchDeleteTransactions(items)
    setRowSelection({})
    setIsDeleting(false)
    setShowDeleteConfirm(false)
  }

  function handleExport() {
    const rows = table.getFilteredRowModel().rows.map((row) => {
      const r = row.original as Record<string, unknown>
      return {
        Date: r.date,
        Description: r.description,
        Category: r.category,
        Amount: r.amount,
      }
    })
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tableContent = (
    <>
      <div className="flex flex-col gap-2 pb-4 lg:flex-row lg:items-center lg:gap-x-3">
        {/* Filters — top row / left on desktop */}
        <div className="flex items-center gap-2 lg:flex-1">
          <Input
            placeholder="Filter descriptions..."
            value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("description")?.setFilterValue(event.target.value)
            }
            className="flex-1 min-w-0"
          />
          <Select
            value={monthFilter}
            onValueChange={(val) => setMonthFilter(val)}
          >
            <SelectTrigger className="w-28 sm:w-36 shrink-0">
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {new Date(m + "-02").toLocaleString("default", { month: "long", year: "numeric" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Delete Selected — own right-aligned row on mobile/tablet only */}
        {selectedCount > 0 && (
          <div className="flex justify-end lg:hidden">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Selected ({selectedCount})
            </Button>
          </div>
        )}

        {/* Record count + actions — bottom row / right on desktop */}
        <div className="flex items-center gap-2 justify-end">
          {selectedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Selected ({selectedCount})
            </Button>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {table.getFilteredRowModel().rows.length} record(s)
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteAllConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete All
          </Button>
          {embedded && (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoadingAll}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-md border border-border">
        {/* Desktop table */}
        <Table className="hidden md:table">
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-border">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowId = (row.original as { id?: string }).id ?? ""
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={newRowIds.has(rowId) ? "animate-tx-row-in" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Mobile stacked list */}
        <div className="md:hidden flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border cursor-pointer accent-primary shrink-0"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => { if (el) el.indeterminate = table.getIsSomePageRowsSelected() }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Select all"
          />
          <div className="flex-1 min-w-0">Description</div>
          <div className="shrink-0 text-right">Amount</div>
        </div>
        <div className="md:hidden divide-y divide-border">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const tx = row.original as { id: string; date: string; description: string; category: string; amount: number; transactionType?: "INCOME" | "EXPENSE"; createdAt: string; accountId?: string }
              const rowId = tx.id
              const isIncome = tx.transactionType === "INCOME"
              const amount = Math.abs(tx.amount)
              const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
              const date = new Date(tx.date).toLocaleDateString("en-US", { timeZone: "UTC" })
              return (
                <div
                  key={row.id}
                  className={`flex items-start gap-3 px-4 py-3 ${newRowIds.has(rowId) ? "animate-tx-row-in" : ""} ${row.getIsSelected() ? "bg-muted/50" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border cursor-pointer accent-primary shrink-0 self-center"
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onChange={row.getToggleSelectedHandler()}
                    aria-label="Select row"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-xs text-muted-foreground">{date}</span>
                      <Badge variant="secondary" className="text-xs w-fit">{tx.category}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`font-mono text-sm font-semibold tracking-tighter ${isIncome ? "text-green-500" : "text-red-500"}`}>
                      {isIncome ? "+" : "-"}{formatted}
                    </span>
                    <TransactionActions
                      transaction={tx}
                      initialCategories={initialCategories}
                      initialAccounts={initialAccounts}
                    />
                  </div>
                </div>
              )
            })
          ) : (
            <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
              No results.
            </div>
          )}
        </div>
      </div>

      {!exhausted && (
        <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2 min-h-16">
          {isFetching ? (
            <div className="animate-fade-in flex flex-col items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-muted animate-pulse" />
                <Loader2 className="h-5 w-5 animate-spin text-primary absolute" />
              </div>
              <span className="text-xs text-muted-foreground animate-pulse">Loading more…</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/50 select-none">↓ scroll for more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          {isLoadingAll
            ? "Loading all transactions for search…"
            : exhausted
            ? `${table.getFilteredRowModel().rows.length} record(s)`
            : `${visibleData.length} loaded — scroll for more`}
        </span>
        {isLoadingAll && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </>
  )

  return (
    <>
      {embedded ? (
        tableContent
      ) : (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-foreground">Transactions</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoadingAll}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Export CSV</span>
            </Button>
          </CardHeader>
          <CardContent>{tableContent}</CardContent>
        </Card>
      )}

      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold uppercase tracking-wide">Warning</span>
            </div>
            <AlertDialogTitle className="text-xl">Delete all transactions?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  This action is <strong>permanent and irreversible.</strong> Every transaction in your account will be deleted from the database — including records not currently visible on screen.
                </div>
                <p className="text-sm text-muted-foreground">
                  Your account balance history, spending trends, and all categorized entries will be lost. There is no way to recover this data after deletion.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, delete everything"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} transaction{selectedCount !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedCount} transaction{selectedCount !== 1 ? "s" : ""} from your ledger. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
