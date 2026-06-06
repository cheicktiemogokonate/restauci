import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingCommandesPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3 rounded-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-[32px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
