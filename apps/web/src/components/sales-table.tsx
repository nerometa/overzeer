"use client";

import { format } from "date-fns";
import { MoreHorizontalIcon, PenIcon, TrashIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import { platformColor } from "@/lib/platform-colors";

export type SaleRow = {
  id: string;
  saleDate?: Date | string | null;
  platform?: { name: string; colorHex?: string | null } | null;
  ticketType?: string | null;
  quantity: number;
  pricePerTicket: number;
  fees?: number | null;
};

export default function SalesTable({
  rows,
  compact = false,
  editHref,
  onDelete,
}: {
  rows: SaleRow[];
  compact?: boolean;
  editHref?: (sale: SaleRow) => string;
  onDelete?: (saleId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Gross</TableHead>
          {(editHref || onDelete) && <TableHead className="w-[50px]"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => {
          const d = s.saleDate
            ? typeof s.saleDate === "string"
              ? new Date(s.saleDate)
              : s.saleDate
            : null;
          const gross = s.quantity * s.pricePerTicket + (s.fees ?? 0);
          const pName = s.platform?.name ?? "Manual";
          const pColor = platformColor(pName, s.platform?.colorHex);
          const href = editHref?.(s);

          return (
            <TableRow key={s.id} className={href ? "cursor-pointer" : undefined}>
              <TableCell className="text-muted-foreground">
                {href ? (
                  <Link href={href as any} className="block">
                    {d ? format(d, compact ? "MMM d" : "PPP") : "—"}
                  </Link>
                ) : (
                  d ? format(d, compact ? "MMM d" : "PPP") : "—"
                )}
              </TableCell>
              <TableCell>
                {href ? (
                  <Link href={href as any} className="block">
                    <Badge
                      variant="secondary"
                      className="rounded-none"
                      style={{ borderColor: pColor }}
                    >
                      <span className="mr-2 inline-block size-2.5 rounded-none" style={{ backgroundColor: pColor }} />
                      {pName}
                    </Badge>
                  </Link>
                ) : (
                  <Badge
                    variant="secondary"
                    className="rounded-none"
                    style={{ borderColor: pColor }}
                  >
                    <span className="mr-2 inline-block size-2.5 rounded-none" style={{ backgroundColor: pColor }} />
                    {pName}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {href ? (
                  <Link href={href as any} className="block">
                    {s.ticketType ? s.ticketType : "—"}
                  </Link>
                ) : (
                  s.ticketType ? s.ticketType : "—"
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {href ? (
                  <Link href={href as any} className="block">
                    {formatNumber(s.quantity)}
                  </Link>
                ) : (
                  formatNumber(s.quantity)
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {href ? (
                  <Link href={href as any} className="block">
                    {formatCurrency(gross)}
                  </Link>
                ) : (
                  formatCurrency(gross)
                )}
              </TableCell>
              {(editHref || onDelete) && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button 
                        className="p-1 hover:bg-accent rounded-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {editHref && (
                        <DropdownMenuItem onClick={() => {}}>
                          <Link href={editHref(s) as any} className="flex items-center w-full">
                            <PenIcon className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {onDelete && editHref && <DropdownMenuSeparator />}
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(s.id)}
                        >
			  <span className="inline-flex items-center w-full">
                            <TrashIcon className="mr-2 h-4 w-4" />
                            Delete
			  </span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
