import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={className ?? "flex flex-col items-center justify-center px-6 py-16 text-center"}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        {icon}
      </div>
      <p className="font-medium text-gray-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
