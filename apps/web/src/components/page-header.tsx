"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type Crumb = {
  label: string;
  href?: string;
};

export default function PageHeader({
  title,
  description,
  crumbs,
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 ? (
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            {crumbs.map((c, idx) => {
              const last = idx === crumbs.length - 1;
              return (
                <span key={`${c.label}-${idx}`} className="inline-flex items-center">
                  <BreadcrumbItem>
                    {last || !c.href ? (
                      <BreadcrumbPage>{c.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={c.href as any} />}>{c.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!last ? <BreadcrumbSeparator /> : null}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className={cn("flex items-start justify-between gap-4")}> 
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
