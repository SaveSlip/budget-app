import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.ComponentProps<typeof Card> {}

export function GlassCard({ className, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn("border-foreground/5 bg-foreground/5 backdrop-blur-sm", className)}
      {...props}
    />
  );
}