import { Headset } from "lucide-react";

import { APP_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
        <Headset aria-hidden="true" className="size-[18px]" strokeWidth={2.2} />
        <span className="absolute -end-0.5 -bottom-0.5 size-2 rounded-full border-2 border-background bg-success" />
      </span>
      {showWordmark ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="text-[17px] font-semibold tracking-tight">{APP_CONFIG.nameAr}</span>
          <span className="mt-1 text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            {APP_CONFIG.name}
          </span>
        </span>
      ) : null}
    </span>
  );
}
