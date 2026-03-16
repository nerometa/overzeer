import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <Card className="rounded-none">
      <CardContent className="p-6">
        <div className="max-w-lg">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Nothing here yet
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight">{title}</div>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}

          {action ? (
            <div className="mt-4">
              <Button asChild className="rounded-none">
                <Link href={action.href as any}>{action.label}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
