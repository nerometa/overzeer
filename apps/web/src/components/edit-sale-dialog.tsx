"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { formatISO } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

import type { SaleRow } from "./sales-table";

const schema = z.object({
  platformId: z.union([z.string(), z.null()]).optional(),
  ticketType: z.union([z.string(), z.null()]).optional(),
  quantity: z.number().positive(),
  pricePerTicket: z.number().positive(),
  feeInput: z.string().optional(),
  fees: z.number().min(0).optional(),
});

function parseFeeInput(input: string): { value: number; isPercentage: boolean } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.endsWith("%")) {
    const num = parseFloat(trimmed.slice(0, -1));
    if (Number.isFinite(num)) return { value: num, isPercentage: true };
  } else {
    const num = parseFloat(trimmed);
    if (Number.isFinite(num)) return { value: num, isPercentage: false };
  }
  return null;
}

function calculateFee(feeInput: string, pricePerTicket: number): number | undefined {
  const parsed = parseFeeInput(feeInput);
  if (!parsed) return undefined;

  if (parsed.isPercentage) {
    return (pricePerTicket * parsed.value) / 100;
  } else {
    return parsed.value;
  }
}

const PLATFORM_FEES: Record<string, number> = {
  Megatix: 5,
  "Ticketmelon": 3,
  "Resident Advisor": 4,
  "At Door": 0,
};

export default function EditSaleDialog({
  sale,
  eventId,
  open,
  onOpenChange,
}: {
  sale: SaleRow;
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const platforms = useQuery(trpc.platforms.list.queryOptions());

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      platformId?: string | null;
      ticketType?: string | null;
      quantity: number;
      pricePerTicket: number;
      fees?: number;
    }) => trpcClient.sales.update.mutate(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.sales.byEvent.queryKey({ eventId }) }),
        queryClient.invalidateQueries({ queryKey: trpc.events.byId.queryKey({ id: eventId }) }),
        queryClient.invalidateQueries({ queryKey: trpc.dashboard.overview.queryKey() }),
      ]);
      toast.success("Sale updated");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const initialFeeInput = useMemo(() => {
    if (!sale.fees || sale.quantity === 0) return "";
    const perTicketFee = sale.fees / sale.quantity;
    const price = sale.pricePerTicket;
    if (price > 0) {
      const percentage = (perTicketFee / price) * 100;
      if (Number.isInteger(percentage)) {
        return `${percentage}%`;
      }
    }
    return perTicketFee.toString();
  }, [sale.fees, sale.quantity, sale.pricePerTicket]);

  const platformIdMap = useMemo(() => {
    return new Map((platforms.data ?? []).map((p) => [p.name, p.id]));
  }, [platforms.data]);

  const form = useForm({
    defaultValues: {
      platformId: sale.platform?.name ? platformIdMap.get(sale.platform.name) ?? "" : "",
      ticketType: sale.ticketType ?? "",
      quantity: sale.quantity.toString(),
      pricePerTicket: sale.pricePerTicket.toString(),
      feeInput: initialFeeInput,
      fees: sale.fees?.toString() ?? "",
      saleDate: sale.saleDate
        ? formatISO(
            typeof sale.saleDate === "string"
              ? new Date(sale.saleDate)
              : sale.saleDate,
            { representation: "date" },
          )
        : formatISO(new Date(), { representation: "date" }),
    },
    validators: { onSubmit: schema as any },
    onSubmit: async ({ value }) => {
      const parsed = schema.parse(value);
      const perTicketFee = calculateFee(parsed.feeInput ?? "", parsed.pricePerTicket);
      const totalFees = perTicketFee !== undefined ? perTicketFee * parsed.quantity : undefined;

      await updateMutation.mutateAsync({
        id: sale.id,
        platformId: parsed.platformId?.trim() ? parsed.platformId : undefined,
        ticketType: parsed.ticketType?.trim() ? parsed.ticketType.trim() : undefined,
        quantity: parsed.quantity,
        pricePerTicket: parsed.pricePerTicket,
        fees: totalFees,
      });
    },
  });

  const busy = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Sale</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <form.Field name="platformId">
              {(field) => {
                const platformMap = new Map(
                  (platforms.data ?? []).map((p) => [p.id, p.name]),
                );
                const displayLabel =
                  field.state.value && platformMap.has(field.state.value)
                    ? platformMap.get(field.state.value)
                    : null;

                return (
                  <div className="grid gap-2">
                    <Label>Platform (optional)</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.setValue(v ?? "")}
                    >
                      <SelectTrigger>
                        {displayLabel ?? (
                          <span className="text-muted-foreground">Select platform</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Manual / unknown</SelectItem>
                        {(platforms.data ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="ticketType">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Ticket type (optional)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    list="ticket-type-options"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="General Admission"
                  />
                  <datalist id="ticket-type-options">
                    <option value="Early Bird" />
                    <option value="General Admission" />
                    <option value="VIP" />
                    <option value="At Door" />
                  </datalist>
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="saleDate">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Sale date</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <div className="grid gap-4 md:grid-cols-3">
            <form.Field name="quantity">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Quantity</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    inputMode="numeric"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500">
                      {typeof err === "string" ? err : (err as any)?.message ?? "Invalid"}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="pricePerTicket">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Price per ticket</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    inputMode="decimal"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500">
                      {typeof err === "string" ? err : (err as any)?.message ?? "Invalid"}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="feeInput">
              {(field) => {
                const priceValue = form.getFieldValue("pricePerTicket") ?? 0;
                const perTicketFee = calculateFee(field.state.value, Number(priceValue) || 0);
                const parsed = parseFeeInput(field.state.value);

                return (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Fees (optional)</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., 5% or 50"
                    />
                    <p className="h-4 text-xs text-muted-foreground">
                      {perTicketFee !== undefined
                        ? `${perTicketFee.toFixed(2)} ฿/ticket${parsed?.isPercentage ? ` (${parsed.value}%)` : ""}`
                        : "\u00A0"}
                    </p>
                  </div>
                );
              }}
            </form.Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button type="submit" disabled={!state.canSubmit || state.isSubmitting || busy}>
                  {busy ? "Updating…" : "Update"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}