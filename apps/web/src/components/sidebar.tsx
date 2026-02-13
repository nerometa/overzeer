"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { BarChart3Icon, CalendarDaysIcon, Settings2Icon } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3Icon },
  { href: "/events", label: "Events", icon: CalendarDaysIcon },
  { href: "/settings", label: "Settings", icon: Settings2Icon, disabled: true },
] as const;

export default function Sidebar({
  currentPath,
  variant,
}: {
  currentPath: string;
  variant: "desktop" | "mobile";
}) {
  const content = (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
              Ticket analytics
            </div>
            <div className="text-lg font-semibold tracking-tight">Overzeer</div>
          </div>
          <Badge variant="secondary" className="rounded-none text-[10px]">
            Phase 3
          </Badge>
        </div>
      </div>
      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1">
        <nav className="p-3">
          <div className="grid gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                currentPath === item.href ||
                (item.href !== "/dashboard" && currentPath.startsWith(item.href));

              const base =
                "group flex items-center gap-2 rounded-none px-3 py-2 text-sm transition-colors";
              const activeCls =
                "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm";
              const idleCls =
                "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground";
              const disabledCls = "opacity-50 pointer-events-none";

              const isDisabled = (item as any).disabled;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-disabled={isDisabled}
                  className={cn(base, active ? activeCls : idleCls, isDisabled && disabledCls)}
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{item.label}</span>
                  {isDisabled ? (
                    <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
                      soon
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-4 pb-4">
          <div className="rounded-none border border-sidebar-border bg-sidebar/40 p-3">
            <div className="text-xs font-medium">Tip</div>
            <div className="mt-1 text-xs text-sidebar-foreground/70">
              Add manual sales for door / cash to keep projections honest.
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
          {variant === "desktop" ? "Centralized analytics hub" : "Navigation"}
        </div>
      </div>
    </div>
  );

  return variant === "mobile" ? (
    <div className="h-full bg-sidebar text-sidebar-foreground">{content}</div>
  ) : (
    content
  );
}
