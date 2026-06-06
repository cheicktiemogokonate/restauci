import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingRestaurantPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-[40px] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <Skeleton className="h-10 w-1/3 rounded-full" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <Skeleton className="h-14 w-full rounded-[32px]" />
              <Skeleton className="h-6 w-5/6 rounded-full" />
              <Skeleton className="h-6 w-4/6 rounded-full" />
            </div>
            <div className="space-y-4 rounded-[32px] border border-slate-200 bg-slate-100 p-6">
              <Skeleton className="h-44 w-full rounded-3xl" />
              <Skeleton className="h-6 w-1/2 rounded-full" />
              <Skeleton className="h-6 w-2/3 rounded-full" />
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-12 w-48 rounded-full" />
          <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <Skeleton key={index} className="h-60 rounded-[32px]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
