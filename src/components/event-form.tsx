"use client";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { formatISO } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, eventsApi } from "@/lib/api";

type Event = {
  id: string;
  name: string;
  date: string;
  venue?: string | null;
  totalCapacity?: number | null;
};

const schema = z.object({
  name: z.string().min(2, "Event name is required"),
  date: z.string().min(1, "Date is required"),
  venue: z.string().optional(),
  totalCapacity: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "number") return v;
      const trimmed = v.trim();
      if (!trimmed) return undefined;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : undefined;
    }),
});

export default function EventForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Event;
}) {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (input: {
      name: string;
      date: string;
      venue?: string;
      totalCapacity?: number;
    }) => eventsApi.create(input),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created");
      router.push(`/events/${created.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      date?: string;
      venue?: string | null;
      totalCapacity?: number | null;
    }) => eventsApi.update(input),
    onSuccess: async () => {
      if (!initial) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["events", initial.id] }),
      ]);
      toast.success("Event updated");
      router.push(`/events/${initial.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm({
    defaultValues: {
      name: initial?.name ?? "",
      date: initial?.date
        ? initial.date.slice(0, 10)
        : formatISO(new Date(), { representation: "date" }),
      venue: initial?.venue ?? "",
      totalCapacity:
        typeof initial?.totalCapacity === "number" ? String(initial.totalCapacity) : "",
    },
    validators: {
      onSubmit: schema as any,
    },
    onSubmit: async ({ value }) => {
      const parsed = schema.parse(value);
      const payload = {
        name: parsed.name,
        date: new Date(parsed.date).toISOString(),
        venue: parsed.venue?.trim() ? parsed.venue.trim() : undefined,
        totalCapacity: parsed.totalCapacity,
      };
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
      } else {
        if (!initial) throw new Error("Missing initial event");
        await updateMutation.mutateAsync({
          id: initial.id,
          ...payload,
          venue: parsed.venue?.trim() ? parsed.venue.trim() : null,
          totalCapacity: parsed.totalCapacity ?? null,
        });
      }
    },
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle className="text-sm">{mode === "create" ? "Create event" : "Edit event"}</CardTitle>
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
          <form.Field name="name">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Warehouse Session"
                />
                {field.state.meta.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500">
                    {typeof err === "string" ? err : (err as any)?.message ?? "Invalid"}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <div className="grid gap-4 md:grid-cols-2">
            <form.Field name="date">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Date</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="date"
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

            <form.Field name="totalCapacity">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Capacity (optional)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    inputMode="numeric"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="1200"
                  />
                  {field.state.meta.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500">
                      {typeof err === "string" ? err : (err as any)?.message ?? "Invalid"}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="venue">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Venue (optional)</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Docklands"
                />
              </div>
            )}
          </form.Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => router.back()}
              disabled={busy}
            >
              Cancel
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button type="submit" className="rounded-none" disabled={!state.canSubmit || state.isSubmitting || busy}>
                  {busy ? "Saving…" : mode === "create" ? "Create" : "Save"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
