import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0">{action}</div>
      )}
    </header>
  );
}
