"use client";

import { usePathname } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import Sidebar from "@/components/sidebar";
import UserMenu from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { PanelLeftIcon } from "lucide-react";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-svh bg-background">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-12 items-center justify-between px-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open navigation"
                  className="shrink-0"
                />
              }
            >
              <PanelLeftIcon className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="border-b">
                <SheetTitle className="tracking-tight">Overzeer</SheetTitle>
              </SheetHeader>
              <Sidebar currentPath={pathname} variant="mobile" />
            </SheetContent>
          </Sheet>

          <div className="text-sm font-medium tracking-tight">Overzeer</div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-svh border-r bg-sidebar text-sidebar-foreground lg:block">
          <Sidebar currentPath={pathname} variant="desktop" />
        </aside>

        <main className="min-w-0">
          {/* Desktop top row */}
          <div className="sticky top-0 z-30 hidden border-b bg-background/70 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:block">
            <div className="flex items-center justify-end gap-2">
              <ModeToggle />
              <UserMenu />
            </div>
          </div>

          <div className="px-4 py-6 lg:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
