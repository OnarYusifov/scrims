import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const tableBase =
  "w-full border-separate border-spacing-0 font-mono text-sm text-gray-900 dark:text-terminal-muted"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn(
      tableBase,
      "overflow-hidden rounded-lg border border-terminal-border bg-white/70 dark:bg-terminal-panel/80",
      className,
    )}
    {...props}
  />
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-terminal-panel/60 text-xs uppercase tracking-widest text-terminal-muted dark:bg-terminal-panel",
      className,
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("bg-white/80 dark:bg-transparent", className)} {...props} />
))
TableBody.displayName = "TableBody"

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  asChild?: boolean
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "tr"

    return (
      <Comp
        ref={ref}
        className={cn(
          "border-b border-terminal-border/60 transition-colors hover:bg-terminal-panel/40 data-[state=selected]:bg-matrix-500/10",
          className,
        )}
        {...props}
      />
    )
  },
)
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-5 py-3 text-left text-xs font-semibold uppercase text-terminal-muted",
      className,
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-5 py-4 text-sm text-gray-900 dark:text-matrix-400", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "caption-bottom mt-4 text-left text-xs uppercase text-terminal-muted",
      className,
    )}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption }

