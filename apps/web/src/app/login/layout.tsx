export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto grid min-h-svh max-w-[980px] grid-cols-1 items-stretch gap-0 md:grid-cols-2">
        <div className="hidden border-r md:block">
          <div className="relative h-full overflow-hidden bg-[radial-gradient(65%_60%_at_30%_35%,oklch(0.92_0.06_260)_0%,transparent_60%),radial-gradient(60%_55%_at_65%_65%,oklch(0.92_0.06_20)_0%,transparent_55%)]">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.145_0_0/0.15))] dark:bg-[linear-gradient(to_bottom,transparent,oklch(0.985_0_0/0.08))]" />
            <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,oklch(0.145_0_0/0.12)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.145_0_0/0.10)_1px,transparent_1px)] [background-size:56px_56px] dark:opacity-[0.12]" />
            <div className="relative p-10">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Overzeer
              </div>
              <div className="mt-3 max-w-sm text-2xl font-semibold tracking-tight">
                Centralized analytics for ticket sales.
              </div>
              <div className="mt-2 max-w-sm text-sm text-muted-foreground">
                Revenue, velocity, and projections—cleanly in one place.
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 md:px-8">
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
