import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GlassCardProps extends Omit<React.ComponentProps<typeof Card>, "title"> {
  title?: string;
  children?: React.ReactNode;
}

export function GlassCard({
  className,
  title,
  children,
  ...props
}: GlassCardProps) {
  return (
    <Card
      className={cn(
        "border-border bg-card/80 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {title && (
        <CardHeader>
          <CardTitle className="text-foreground">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
