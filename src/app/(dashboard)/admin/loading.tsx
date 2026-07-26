import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "@/components/motion/loader";

export default function AdminLoading() {
  return (
    <div className="min-h-full space-y-6 bg-[#FAFAFA] p-6 lg:p-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Loader
            variant="dots"
            size={24}
            label="Chargement de l’administration"
            className="text-emerald-600"
          />
          <span className="text-sm font-medium text-muted-foreground">
            Chargement de l’administration…
          </span>
        </div>
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>

      <div className="flex min-h-72 items-center justify-center rounded-xl border bg-white">
        <Loader
          variant="bars"
          size={40}
          label="Chargement des données"
          className="text-emerald-600"
        />
      </div>
    </div>
  );
}
