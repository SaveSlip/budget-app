import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "border-foreground/5 bg-foreground/5 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
