"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ExpandedState,
  getExpandedRowModel,
  Row,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, FileDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react'
import { useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Testimonial } from "@/types/testimonials"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface DataTableProps<TData> {
  columns: ColumnDef<TData, string>[]
  data: TData[]
}

function HtmlContent({ html }: { html: string }) {
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: html }} 
      className="prose prose-sm max-w-none break-words"
      style={{
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
        hyphens: 'auto',
        whiteSpace: 'normal',
        maxWidth: '100%'
      }}
    />
  )
}

const exportToPDF = (data: Testimonial[]) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Add header section (centered)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  const companyName = "Gong Komodo Tour"
  const companyNameWidth = doc.getTextWidth(companyName)
  const companyNameX = (pageWidth - companyNameWidth) / 2
  const companyNameY = 20
  doc.text(companyName, companyNameX, companyNameY)

  // Address and phone (centered below company name)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const address = [
    "Jl. Ciung Wanara I No.42, Renon,",
    "Kec. Denpasar Tim., Kota Denpasar,",
    "Bali 80234",
    "0812-3867-588"
  ]

  let yPos = companyNameY + 10
  address.forEach(line => {
    const lineWidth = doc.getTextWidth(line)
    const lineX = (pageWidth - lineWidth) / 2
    doc.text(line, lineX, yPos)
    yPos += 6
  })

  // Add divider line
  doc.setLineWidth(0.5)
  doc.line(14, yPos + 5, pageWidth - 14, yPos + 5)

  // Add report title (centered)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  const reportTitle = "Testimonial Report"
  const reportTitleWidth = doc.getTextWidth(reportTitle)
  const reportTitleX = (pageWidth - reportTitleWidth) / 2
  doc.text(reportTitle, reportTitleX, yPos + 20)

  // Add generated date (right aligned)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const dateText = `Generated on: ${new Date().toLocaleString()}`
  doc.text(dateText, pageWidth - 14, yPos + 30, { align: 'right' })

  // Define the columns for the table
  const tableColumn = [
    "No",
    "Nama Customer",
    "Rating",
    "Review",
    "Status",
    "Highlight",
    "Created At",
    "Updated At"
  ]

  // Map the data to match the columns
  const tableRows = data.map((item, index) => [
    index + 1,
    item.customer_name,
    item.rating,
    item.review,
    item.is_approved ? "Approved" : "Pending",
    item.is_highlight ? "Yes" : "No",
    new Date(item.created_at).toLocaleString(),
    new Date(item.updated_at).toLocaleString(),
  ])

  // Generate the table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: yPos + 40,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center' }, // No
      1: { halign: 'left' },   // Nama Customer
      2: { halign: 'center' }, // Rating
      3: { halign: 'left' },   // Review
      4: { halign: 'center' }, // Status
      5: { halign: 'center' }, // Highlight
      6: { halign: 'center' }, // Created At
      7: { halign: 'center' }, // Updated At
    },
  })

  // Save the PDF
  doc.save("testimonial-report.pdf")
}

export function DataTable({
  columns,
  data,
}: DataTableProps<Testimonial>) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const renderSubComponent = ({ row }: { row: Row<Testimonial> }) => {
    const testimonial = row.original
    const trip = testimonial.trip

    return (
      <div className="p-4 bg-muted/50 rounded-lg w-full overflow-hidden" data-testimonial-detail>
        <div className="space-y-4 w-full max-w-full">
          <div className="bg-white p-4 rounded-lg shadow-sm w-full overflow-hidden max-w-full">
            <h4 className="font-semibold text-lg mb-4 text-gray-800 border-b pb-2 break-words">Detail Testimonial</h4>
            <div className="grid gap-4 w-full max-w-full">
              <div className="space-y-4 w-full max-w-full">
                {/* Review Section */}
                <div className="w-full max-w-full">
                  <p className="text-gray-600 font-medium mb-2">Review:</p>
                  <div className="bg-gray-50 p-3 rounded-md w-full max-w-full overflow-x-auto">
                    <div 
                      className="w-full max-w-full text-gray-800 text-sm leading-relaxed"
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        hyphens: 'auto',
                        whiteSpace: 'pre-wrap',
                        maxWidth: '100%',
                        overflowX: 'auto'
                      }}
                    >
                      {testimonial.review}
                    </div>
                  </div>
                </div>

                {/* Trip Information */}
                {trip && (
                  <div className="w-full max-w-full">
                    <p className="text-gray-600 font-medium mb-2">Paket Tour:</p>
                    <div className="bg-gray-50 p-3 rounded-md overflow-auto max-w-full w-full">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-full">
                        <div className="w-full max-w-full">
                          <p className="text-gray-600 text-sm mb-1">Nama Paket</p>
                          <div className="bg-white p-2 rounded border border-gray-100 w-full max-w-full overflow-hidden">
                            <p className="text-gray-800 font-medium break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{trip.name}</p>
                          </div>
                        </div>
                        <div className="w-full max-w-full">
                          <p className="text-gray-600 text-sm mb-1">Tipe</p>
                          <div className="bg-white p-2 rounded border border-gray-100 w-full max-w-full overflow-hidden">
                            <p className="text-gray-800 font-medium break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{trip.type}</p>
                          </div>
                        </div>
                        <div className="w-full max-w-full">
                          <p className="text-gray-600 text-sm mb-1">Include</p>
                          <div className="bg-white p-2 rounded border border-gray-100 overflow-auto max-w-full w-full">
                            <div className="prose prose-sm max-w-none break-words overflow-wrap-anywhere" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                              <HtmlContent html={trip.include || ""} />
                            </div>
                          </div>
                        </div>
                        <div className="w-full max-w-full">
                          <p className="text-gray-600 text-sm mb-1">Exclude</p>
                          <div className="bg-white p-2 rounded border border-gray-100 overflow-auto max-w-full w-full">
                            <div className="prose prose-sm max-w-none break-words overflow-wrap-anywhere" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                              <HtmlContent html={trip.exclude || ""} />
                            </div>
                          </div>
                        </div>
                        <div className="w-full max-w-full">
                          <p className="text-gray-600 text-sm mb-1">Meeting Point</p>
                          <div className="bg-white p-2 rounded border border-gray-100 w-full max-w-full overflow-hidden">
                            <p className="text-gray-800 font-medium break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{trip.meeting_point}</p>
                          </div>
                        </div>
                        <div className="w-full max-w-full">
                          <p className="text-gray-600 text-sm mb-1">Note</p>
                          <div className="bg-white p-2 rounded border border-gray-100 overflow-auto max-w-full w-full">
                            <div className="prose prose-sm max-w-none break-words overflow-wrap-anywhere" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                              <HtmlContent html={trip.note || ""} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Information */}
                <div className="w-full max-w-full">
                  <p className="text-gray-600 font-medium mb-2">Informasi Customer:</p>
                  <div className="bg-gray-50 p-3 rounded-md overflow-auto max-w-full w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-full">
                      <div className="w-full max-w-full">
                        <p className="text-gray-600 text-sm mb-1">Nama Lengkap</p>
                        <div className="bg-white p-2 rounded border border-gray-100 w-full max-w-full overflow-hidden">
                          <p className="text-gray-800 font-medium break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{testimonial.customer_name}</p>
                        </div>
                      </div>
                      <div className="w-full max-w-full">
                        <p className="text-gray-600 text-sm mb-1">Email</p>
                        <div className="bg-white p-2 rounded border border-gray-100 w-full max-w-full overflow-hidden">
                          <p className="text-gray-800 font-medium break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{testimonial.customer_email}</p>
                        </div>
                      </div>
                      <div className="w-full max-w-full">
                        <p className="text-gray-600 text-sm mb-1">No. HP</p>
                        <div className="bg-white p-2 rounded border border-gray-100 w-full max-w-full overflow-hidden">
                          <p className="text-gray-800 font-medium break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{testimonial.customer_phone || "-"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Source</p>
                        <div className="bg-white p-2 rounded border border-gray-100">
                          <Badge className={`${testimonial.source === "internal" ? "bg-blue-500" : "bg-green-500"} text-white`}>
                            {testimonial.source === "internal" ? "Internal" : "External"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Testimonial Information */}
                <div className="w-full max-w-full">
                  <p className="text-gray-600 font-medium mb-2">Informasi Tambahan:</p>
                  <div className="bg-gray-50 p-3 rounded-md overflow-auto max-w-full w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full max-w-full">
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Highlight</p>
                        <div className="bg-white p-2 rounded border border-gray-100">
                          <Badge className={`${testimonial.is_highlight ? "bg-yellow-500" : "bg-gray-500"} text-white`}>
                            {testimonial.is_highlight ? "Ya" : "Tidak"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Tanggal Dibuat</p>
                        <div className="bg-white p-2 rounded border border-gray-100">
                          <p className="text-gray-800 font-medium break-words">{formatDate(testimonial.created_at)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Tanggal Diperbarui</p>
                        <div className="bg-white p-2 rounded border border-gray-100">
                          <p className="text-gray-800 font-medium break-words">{formatDate(testimonial.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getExpandedRowModel: getExpandedRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
      pagination,
    },
  })

  return (
    <div className="w-full max-w-full overflow-hidden">
      <style jsx global>{`
        /* Global word-wrap untuk semua elemen */
        * {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* Prose styling */
        .prose * {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          hyphens: auto !important;
          white-space: normal !important;
          max-width: 100% !important;
        }
        .prose p, .prose div, .prose span, .prose li, .prose td, .prose th, .prose ul, .prose ol {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          hyphens: auto !important;
          white-space: normal !important;
          max-width: 100% !important;
        }
        .prose table {
          table-layout: fixed !important;
          width: 100% !important;
        }
        .prose table td, .prose table th {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          hyphens: auto !important;
          white-space: normal !important;
          max-width: 100% !important;
        }
        .prose img {
          max-width: 100% !important;
          height: auto !important;
        }
        .prose pre, .prose code {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          white-space: pre-wrap !important;
          max-width: 100% !important;
        }
        
        /* Detail testimonial section */
        [data-testimonial-detail] {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          max-width: 100% !important;
        }
        
        [data-testimonial-detail] * {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          max-width: 100% !important;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #888 #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #666;
        }
      `}</style>
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between py-4 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full lg:w-auto">
          <Input
            placeholder="Filter berdasarkan nama customer..."
            value={(table.getColumn("customer_name")?.getFilterValue() as string) || ""}
            onChange={(event) =>
              table.getColumn("customer_name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm w-full sm:w-auto"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Kolom <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const columnLabels: Record<string, string> = {
                    customer_name: "Nama Customer",
                    customer_email: "Email Customer",
                    rating: "Rating",
                    source: "Source",
                    is_approved: "Status",
                    is_highlight: "Highlight"
                  }
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {columnLabels[column.id] || column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {table.getSelectedRowModel().rows.length > 0 && (
            <>
              <Button
                variant="destructive"
                onClick={() =>
                  console.log(
                    "Delete selected rows:",
                    table.getSelectedRowModel().rows.map((row) => (row.original as Testimonial).id)
                  )
                }
                className="text-xs sm:text-sm"
              >
                Hapus Terpilih ({table.getSelectedRowModel().rows.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToPDF(table.getSelectedRowModel().rows.map(row => row.original as Testimonial))}
                className="text-xs sm:text-sm"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export Terpilih ({table.getSelectedRowModel().rows.length})
              </Button>
            </>
          )}
          <Button 
            onClick={() => router.push('/dashboard/testimonials/create')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white transition-colors duration-200 text-xs sm:text-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Testimonial
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600 text-white transition-colors duration-200 text-xs sm:text-sm"
            variant="outline"
            onClick={() => exportToPDF(table.getFilteredRowModel().rows.map(row => row.original as Testimonial))}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto w-full">
        <Table className="w-full table-fixed" style={{ minWidth: '1000px' }}>
          <colgroup>
            <col style={{ width: '40px' }} />
            <col style={{ width: '40px' }} />
            <col style={{ width: '50px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '60px' }} />
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan} className="whitespace-nowrap text-center">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="break-words">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow key={`${row.id}-expanded`}>
                      <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                        {renderSubComponent({ row })}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 bg-gray-50 rounded-b-md gap-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-x-6">
          <div className="flex items-center gap-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-x-2 lg:gap-x-3">
            <div className="text-sm whitespace-nowrap">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-x-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 