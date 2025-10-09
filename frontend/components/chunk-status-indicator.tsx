import type { ChunkStatus } from "@/types/chunk"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Edit, Plus, Trash2 } from "lucide-react"

interface ChunkStatusIndicatorProps {
  status: ChunkStatus
  size?: "sm" | "md"
}

export function ChunkStatusIndicator({ status, size = "md" }: ChunkStatusIndicatorProps) {
  const iconSize = size === "sm" ? 12 : 16

  const statusConfig = {
    unchanged: {
      icon: <CheckCircle size={iconSize} />,
      label: "Unchanged",
      variant: "secondary" as const,
      className: "bg-green-100 text-green-800 border-green-200",
    },
    modified: {
      icon: <Edit size={iconSize} />,
      label: "Modified",
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    new: {
      icon: <Plus size={iconSize} />,
      label: "New",
      variant: "secondary" as const,
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    deleted: {
      icon: <Trash2 size={iconSize} />,
      label: "Deleted",
      variant: "secondary" as const,
      className: "bg-red-100 text-red-800 border-red-200",
    },
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} rounded-2xl flex items-center gap-1 ${size === "sm" ? "text-xs px-2 py-1" : ""}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  )
}
