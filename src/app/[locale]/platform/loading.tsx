import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformLoading() {
  return (
    <div>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-8 w-80 max-w-full" />
      <Skeleton className="mt-3 h-4 w-[480px] max-w-full" />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-40" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
