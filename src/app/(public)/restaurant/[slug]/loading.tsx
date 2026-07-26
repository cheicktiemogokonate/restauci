import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingRestaurantPage() {
  return (
    <main className="min-h-screen bg-background">
      <Skeleton className="h-[70vh] w-full rounded-none" />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2"><div className="space-y-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /></div><Skeleton className="aspect-[4/3] w-full rounded-2xl" /></div>
        <div className="border-y py-10"><Skeleton className="h-8 w-48" /><div className="mt-6 grid gap-4 sm:grid-cols-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div></div>
      </div>
    </main>
  );
}
