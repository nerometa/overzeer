"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

import { CalendarPlusIcon, ChevronRightIcon, Trash2Icon } from "lucide-react";

export default function EventsPage() {
  const events = useQuery(trpc.events.list.queryOptions());

  const deleteMutation = useMutation({
    mutationFn: (input: { id: string }) => trpcClient.events.delete.mutate(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.events.list.queryKey() });
      toast.success("Event deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Everything you’re tracking, sorted by date."
        crumbs={[{ label: "Events" }]}
        actions={
          <Button asChild className="rounded-none">
            <Link href="/events/new">
              <CalendarPlusIcon className="mr-2 size-4" />
              New event
            </Link>
          </Button>
        }
      />

      {events.isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-none" />
          ))}
        </div>
      ) : events.isError ? (
        <EmptyState title="Couldn’t load events" description={events.error.message} />
      ) : events.data?.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create your first event to start tracking sales and projections."
          action={{ label: "Create event", href: "/events/new" }}
        />
      ) : (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="text-sm">Event list</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Venue</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.data
                  ?.slice()
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <Link className="hover:underline underline-offset-4" href={`/events/${e.id}`}>
                          {e.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(e.date), "PPP")}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {e.venue ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="rounded-none">
                            <Link href={`/events/${e.id}`}>
                              Open <ChevronRightIcon className="ml-1 size-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-none"
                                  aria-label="Delete event"
                                />
                              }
                            >
                              <Trash2Icon className="size-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-none">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete “{e.name}”?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the event and its analytics. This action can’t be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="rounded-none"
                                  onClick={() => deleteMutation.mutate({ id: e.id })}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
