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
  getPaginationRowModel,
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
import { Download, Loader2, Trash2 } from "lucide-react"
import Papa from "papaparse"
import { batchDeleteTransactions } from "@/app/actions/transactions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  embedded?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  embedded = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [monthFilter, setMonthFilter] = React.useState<string>("all")

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>()
    data.forEach((row) => {
      const d = (row as { date?: string }).date
      if (d && d.length >= 7) months.add(d.slice(0, 7))
    })
    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }, [data])

  const filteredData = React.useMemo(() => {
    if (monthFilter === "all") return data
    return data.filter((row) => {
      const d = (row as { date?: string }).date
      return d?.startsWith(monthFilter)
    })
  }, [data, monthFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    autoResetPageIndex: false,
    state: {
      sorting,
      columnFilters,
      pagination,
      rowSelection,
    },
  })

  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length

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
          onValueChange={(val) => {
            setMonthFilter(val)
            setPagination((p) => ({ ...p, pageIndex: 0 }))
          }}
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
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} record(s)
        </span>
        {embedded && (
          <Button variant="outline" size="sm" onClick={handleExport}>
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
      <div className="flex items-center justify-end gap-2 pt-4">
        <span className="text-xs text-muted-foreground mr-auto">
          Page {pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <span className="text-xs text-muted-foreground">Rows per page</span>
        <Select
          value={pagination.pageSize === Number.MAX_SAFE_INTEGER ? "all" : String(pagination.pageSize)}
          onValueChange={(val) => {
            const size = val === "all" ? Number.MAX_SAFE_INTEGER : Number(val)
            setPagination({ pageIndex: 0, pageSize: size })
          }}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        {pagination.pageSize !== Number.MAX_SAFE_INTEGER && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </>
        )}
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
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>{tableContent}</CardContent>
        </Card>
      )}

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
