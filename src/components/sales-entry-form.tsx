"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { formatISO } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrashIcon } from "lucide-react";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { queryClient, platformsApi, salesApi, type Sale } from "@/lib/api";

const PLATFORM_FEES: Record<string, number> = {
  Megatix: 5,
  "Ticketmelon": 3,
  "Resident Advisor": 4,
  "At Door": 0,
};

const schema = z.object({
  platformId: z.string().optional(),
  ticketType: z.string().optional(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n > 0, "Quantity must be greater than 0"),
  pricePerTicket: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n > 0, "Price must be greater than 0"),
  feeInput: z.string().optional(),
  fees: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
  saleDate: z.string().optional(),
});

// Parse fee input: "15%" → percentage, "100" → fixed amount
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

function deriveFeeInputFromTotal(totalFees: number | null | undefined, quantity: number, pricePerTicket: number): string {
  if (!totalFees) return "";
  const totalPrice = quantity * pricePerTicket;
  if (totalPrice > 0) {
    const percentage = (totalFees / totalPrice) * 100;
    if (Number.isInteger(percentage)) {
      return `${percentage}%`;
    }
  }
  return totalFees.toString();
}

export type SaleData = {
  id: string;
  platform?: { id: string; name: string } | null;
  ticketType?: string | null;
  quantity: number;
  pricePerTicket: number;
  fees?: number | null;
  saleDate?: Date | string | number | null;
};

interface SalesEntryFormProps {
  eventId: string;
  sale?: SaleData;
  onDelete?: () => void;
}

export default function SalesEntryForm({ eventId, sale, onDelete }: SalesEntryFormProps) {
  const router = useRouter();
  const platforms = useQuery(platformsApi.list());
  const isEditMode = !!sale;

  const [feeInputValue, setFeeInputValue] = useState("");

  const createMutation = useMutation({
    mutationFn: (input: {
      eventId: string;
      platformId?: string | null;
      ticketType?: string | null;
      quantity: number;
      pricePerTicket: number;
      fees?: number;
    }) => salesApi.create(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales", "byEvent", { eventId }] }),
        queryClient.invalidateQueries({ queryKey: ["events", "byId", { id: eventId }] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] }),
      ]);
      toast.success("Sale added");
      router.push(`/events/${eventId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      platformId?: string | null;
      ticketType?: string | null;
      quantity: number;
      pricePerTicket: number;
      fees?: number;
    }) => salesApi.update(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["sales", "byEvent", { eventId }] });
      const previousSales = queryClient.getQueryData(["sales", "byEvent", { eventId }]);
      const platform = platforms.data?.find((p) => p.id === input.platformId);
      queryClient.setQueryData(["sales", "byEvent", { eventId }], (old: Sale[] | undefined) =>
        old?.map((s) =>
          s.id === input.id
            ? ({
                ...s,
                platformId: input.platformId ?? null,
                platform: platform
                  ? { ...platform }
                  : null,
                ticketType: input.ticketType ?? null,
                quantity: input.quantity,
                pricePerTicket: input.pricePerTicket,
                fees: input.fees ?? null,
              } as typeof s)
            : s,
        ),
      );
      return { previousSales };
    },
    onError: (err, input, context) => {
      if (context?.previousSales) {
        queryClient.setQueryData(["sales", "byEvent", { eventId }], context.previousSales);
      }
      toast.error(err.message);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales", "byEvent", { eventId }] }),
        queryClient.invalidateQueries({ queryKey: ["events", "byId", { id: eventId }] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] }),
      ]);
    },
    onSuccess: () => {
      toast.success("Sale updated");
      router.push(`/events/${eventId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (saleId: string) => salesApi.delete(saleId),
    onMutate: async (saleId) => {
      await queryClient.cancelQueries({ queryKey: ["sales", "byEvent", { eventId }] });
      const previousSales = queryClient.getQueryData(["sales", "byEvent", { eventId }]);
      queryClient.setQueryData(["sales", "byEvent", { eventId }], (old: Sale[] | undefined) =>
        old?.filter((s) => s.id !== saleId),
      );
      return { previousSales };
    },
    onError: (err, saleId, context) => {
      if (context?.previousSales) {
        queryClient.setQueryData(["sales", "byEvent", { eventId }], context.previousSales);
      }
      toast.error(err.message);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales", "byEvent", { eventId }] }),
        queryClient.invalidateQueries({ queryKey: ["events", "byId", { id: eventId }] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] }),
      ]);
    },
    onSuccess: () => {
      toast.success("Sale deleted");
      if (onDelete) {
        onDelete();
      } else {
        router.push(`/events/${eventId}`);
      }
    },
  });

  const platformFeeMap = useMemo(() => {
    return new Map(
      (platforms.data ?? []).map((p) => {
        const feePercent = PLATFORM_FEES[p.name] ?? 0;
        return [p.id, `${feePercent}%`];
      }),
    );
  }, [platforms.data]);

  const defaultValues = useMemo(() => {
    if (isEditMode && sale) {
      const feeInput = deriveFeeInputFromTotal(sale.fees, sale.quantity, sale.pricePerTicket);
      return {
        platformId: sale.platform?.id ?? "",
        ticketType: sale.ticketType ?? "General Admission",
        quantity: sale.quantity.toString(),
        pricePerTicket: sale.pricePerTicket.toString(),
        feeInput,
        fees: sale.fees?.toString() ?? "",
        saleDate: sale.saleDate
          ? formatISO(
              typeof sale.saleDate === "string" ? new Date(sale.saleDate) : sale.saleDate,
              { representation: "date" }
            )
          : formatISO(new Date(), { representation: "date" }),
      };
    }
    return {
      platformId: "",
      ticketType: "General Admission",
      quantity: "1",
      pricePerTicket: "0",
      feeInput: "",
      fees: undefined,
      saleDate: formatISO(new Date(), { representation: "date" }),
    };
  }, [isEditMode, sale]);

  const form = useForm({
    defaultValues,
    validators: { onSubmit: schema as any },
    onSubmit: async ({ value }) => {
      const parsed = schema.parse(value);
      const totalPrice = parsed.pricePerTicket * parsed.quantity;
      const totalFees = calculateFee(parsed.feeInput ?? "", totalPrice);

      if (isEditMode && sale) {
        await updateMutation.mutateAsync({
          id: sale.id,
          platformId: parsed.platformId?.trim() ? parsed.platformId : undefined,
          ticketType: parsed.ticketType?.trim() ? parsed.ticketType.trim() : undefined,
          quantity: parsed.quantity,
          pricePerTicket: parsed.pricePerTicket,
          fees: totalFees,
        });
      } else {
        await createMutation.mutateAsync({
          eventId,
          platformId: parsed.platformId?.trim() ? parsed.platformId : undefined,
          ticketType: parsed.ticketType?.trim() ? parsed.ticketType.trim() : undefined,
          quantity: parsed.quantity,
          pricePerTicket: parsed.pricePerTicket,
          fees: totalFees,
        });
      }
    },
  });

  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handlePlatformChange = (value: string | null) => {
    if (value === null) return;
    form.setFieldValue("platformId", value);

    const defaultFee = platformFeeMap.get(value);
    if (defaultFee) {
      setFeeInputValue(defaultFee);
      form.setFieldValue("feeInput", defaultFee);
    } else {
      setFeeInputValue("");
      form.setFieldValue("feeInput", "");
    }
  };

  const handleDelete = () => {
    if (isEditMode && sale && confirm("Are you sure you want to delete this sale?")) {
      deleteMutation.mutate(sale.id);
    }
  };

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle className="text-sm">{isEditMode ? "Edit sale" : "Manual sale entry"}</CardTitle>
      </CardHeader>
      <CardContent>
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
                      onValueChange={handlePlatformChange}
                    >
                      <SelectTrigger className="rounded-none">
                        {displayLabel ?? (
                          <span className="text-muted-foreground">
                            {platforms.isLoading ? "Loading…" : "Select platform"}
                          </span>
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
                    className="rounded-none"
                    autoComplete="off"
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
                <Label htmlFor={field.name}>Sale date (for your reference)</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="rounded-none"
                />
                <p className="text-xs text-muted-foreground">
                  Current API records the timestamp automatically.
                </p>
              </div>
            )}
          </form.Field>

          <div className="grid gap-4 md:grid-cols-3 items-start">
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
                    className="rounded-none"
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
                    className="rounded-none"
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
                const quantityValue = form.getFieldValue("quantity") ?? 1;
                const totalPrice = Number(priceValue) * Number(quantityValue);
                const totalFee = calculateFee(field.state.value, totalPrice);
                const parsed = parseFeeInput(field.state.value);

                return (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Fees (optional)</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setFeeInputValue(e.target.value);
                      }}
                      placeholder="e.g., 5% or 50"
                      className="rounded-none"
                    />
                    <p className="left-0 text-xs text-muted-foreground">
                      {totalFee !== undefined
                        ? `Total: ${totalFee.toFixed(2)} ฿${parsed?.isPercentage ? `` : ""}`
                        : "\u00A0"}
                    </p>
                  </div>
                );
              }}
            </form.Field>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {isEditMode ? (
              <Button
                type="button"
                variant="destructive"
                className="rounded-none"
                onClick={handleDelete}
                disabled={busy}
              >
                <TrashIcon className="mr-2 size-4" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-none" onClick={() => router.back()} disabled={busy}>
                Cancel
              </Button>
              <form.Subscribe>
                {(state) => (
                  <Button type="submit" className="rounded-none" disabled={!state.canSubmit || state.isSubmitting || busy}>
                    {busy ? (isEditMode ? "Updating…" : "Saving…") : (isEditMode ? "Update" : "Add sale")}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
