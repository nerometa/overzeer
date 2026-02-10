"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { formatISO } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  SelectValue,
} from "@/components/ui/select";
import { queryClient, trpc } from "@/utils/trpc";

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

export default function SalesEntryForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const platforms = useQuery(trpc.platforms.list.queryOptions());

  const createMutation = useMutation({
    mutationFn: (input: {
      eventId: string;
      platformId?: string;
      ticketType?: string;
      quantity: number;
      pricePerTicket: number;
      fees?: number;
    }) => trpc.sales.create.mutate(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.sales.byEvent.queryKey({ eventId }) }),
        queryClient.invalidateQueries({ queryKey: trpc.events.byId.queryKey({ id: eventId }) }),
        queryClient.invalidateQueries({ queryKey: trpc.dashboard.overview.queryKey() }),
      ]);
      toast.success("Sale added");
      router.push(`/events/${eventId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm({
    defaultValues: {
      platformId: "",
      ticketType: "General",
      quantity: "1",
      pricePerTicket: "0",
      fees: "0",
      saleDate: formatISO(new Date(), { representation: "date" }),
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const parsed = schema.parse(value);
      await createMutation.mutateAsync({
        eventId,
        platformId: parsed.platformId?.trim() ? parsed.platformId : undefined,
        ticketType: parsed.ticketType?.trim() ? parsed.ticketType.trim() : undefined,
        quantity: parsed.quantity,
        pricePerTicket: parsed.pricePerTicket,
        fees: parsed.fees,
      });
    },
  });

  const busy = createMutation.isPending;

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle className="text-sm">Manual sale entry</CardTitle>
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
              {(field) => (
                <div className="grid gap-2">
                  <Label>Platform (optional)</Label>
                  <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder={platforms.isLoading ? "Loading…" : "Select platform"} />
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
              )}
            </form.Field>

            <form.Field name="ticketType">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Ticket type (optional)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="General"
                    className="rounded-none"
                  />
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
                    className="rounded-none"
                  />
                  {field.state.meta.errors.map((err) => (
                    <p key={err?.message} className="text-xs text-red-500">
                      {err?.message}
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
                  {field.state.meta.errors.map((err) => (
                    <p key={err?.message} className="text-xs text-red-500">
                      {err?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="fees">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Fees (optional)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    inputMode="decimal"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="rounded-none"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-none" onClick={() => router.back()} disabled={busy}>
              Cancel
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button type="submit" className="rounded-none" disabled={!state.canSubmit || state.isSubmitting || busy}>
                  {busy ? "Saving…" : "Add sale"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
