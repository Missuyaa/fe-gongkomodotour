"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Testimonial } from "@/types/testimonials"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Star, Trash, Pencil, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"

interface ColumnsProps {
  onDelete: (testimonial: Testimonial) => void;
}

const ActionsCell = ({ testimonial, onDelete }: { testimonial: Testimonial, onDelete: (testimonial: Testimonial) => void }) => {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/dashboard/testimonials/${testimonial.id}/edit`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Buka menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(testimonial)} className="text-red-600">
          <Trash className="mr-2 h-4 w-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns = ({ onDelete }: ColumnsProps): ColumnDef<Testimonial>[] => [
  {
    id: "expander",
    header: () => null,
    cell: ({ row }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => row.toggleExpanded()}
          className="p-0 w-6 h-6"
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      )
    },
    enableHiding: false,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="w-[30px]">
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          className="cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="w-[30px]">
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          className="cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "no",
    header: "No",
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination
      const globalIndex = row.index + 1 + pageIndex * pageSize
      return <div className="w-[50px] min-w-[50px] text-center font-medium">{globalIndex}</div>
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "customer_name",
    accessorKey: "customer_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0"
        >
          Nama Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    cell: ({ row }) => {
      const name = row.getValue("customer_name") as string
      return (
        <div 
          className="w-full break-words text-xs px-1 leading-tight"
          style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            maxWidth: '100%',
            lineHeight: '1.2'
          }}
        >
          {name}
        </div>
      )
    },
  },
  {
    id: "customer_email",
    accessorKey: "customer_email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0"
        >
          Email Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    cell: ({ row }) => {
      const email = row.getValue("customer_email") as string
      return (
        <div 
          className="w-full break-words text-xs px-1 leading-tight"
          style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            maxWidth: '100%',
            lineHeight: '1.2'
          }}
        >
          {email}
        </div>
      )
    },
  },
  {
    accessorKey: "rating",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0"
        >
          Rating
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    cell: ({ row }) => {
      const rating = row.original.rating
      return (
        <div className="w-full flex justify-center px-1">
          <div className="flex items-center">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">({rating})</span>
          </div>
        </div>
      )
    }
  },
  {
    accessorKey: "source",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0"
        >
          Source
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    cell: ({ row }) => {
      const source = row.original.source
      return (
        <div className="w-full flex justify-center px-1">
          <Badge className={`${source === "internal" ? "bg-blue-500" : "bg-green-500"} text-white text-xs px-2 py-1`}>
            {source === "internal" ? "Internal" : "External"}
          </Badge>
        </div>
      )
    }
  },
  {
    accessorKey: "is_approved",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    cell: ({ row }) => {
      const isApproved = row.original.is_approved
      return (
        <div className="w-full flex justify-center px-1">
          <Badge className={`${isApproved ? "bg-emerald-500" : "bg-red-500"} text-white text-xs px-2 py-1`}>
            {isApproved ? "Disetujui" : "Pending"}
          </Badge>
        </div>
      )
    }
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0"
        >
          Tanggal
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <div 
          className="w-full break-words text-xs px-1 leading-tight text-center"
          style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            maxWidth: '100%',
            lineHeight: '1.2'
          }}
        >
          {formatDate(row.original.created_at)}
        </div>
      )
    }
  },
  {
    id: "actions",
    header: () => null,
    cell: ({ row }) => {
      const testimonial = row.original;
      return (
        <div className="w-full flex justify-center px-1">
          <ActionsCell testimonial={testimonial} onDelete={onDelete} />
        </div>
      );
    },
    enableHiding: false,
  },
] 