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

const PAGE_SIZE = 25
const PREFETCH_SIZE = 50

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  initialCursor: string | null
  embedded?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  initialCursor,
  embedded = false,
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
      <div className="flex items-center gap-2 pb-4">
        <Input
          placeholder="Filter descriptions..."
          value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("description")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Select
          value={monthFilter}
          onValueChange={(val) => setMonthFilter(val)}
        >
          <SelectTrigger className="w-40">
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
        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-2"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {selectedCount} selected
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteAllConfirm(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete All
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} record(s)
        </span>
        {embedded && (
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoadingAll}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>
      <div className="rounded-md border border-border">
        <Table>
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
              <Download className="mr-2 h-4 w-4" />
              Export CSV
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
