"use client";

import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
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
}: {
  rows: SaleRow[];
  compact?: boolean;
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

          return (
            <TableRow key={s.id}>
              <TableCell className="text-muted-foreground">
                {d ? format(d, compact ? "MMM d" : "PPP") : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className="rounded-none"
                  style={{ borderColor: pColor }}
                >
                  <span className="mr-2 inline-block size-2.5 rounded-none" style={{ backgroundColor: pColor }} />
                  {pName}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.ticketType ? s.ticketType : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(s.quantity)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(gross)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
