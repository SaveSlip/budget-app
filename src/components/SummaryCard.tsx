import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  description: string;
  value: string;
  type: "income" | "expense" | "balance";
  className?: string;
}

export function SummaryCard({
  title,
  description,
  value,
  type,
  className,
}: SummaryCardProps) {
  const getTypeStyles = () => {
    switch (type) {
      case "income":
        return "hover:border-primary/30";
      case "expense":
        return "hover:border-orange-500/30";
      case "balance":
        return "hover:border-foreground/30";
      default:
        return "";
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case "income":
        return "text-primary";
      case "expense":
        return "text-orange-600";
      case "balance":
        return "text-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card
      className={cn(
        "h-full border-foreground/5 bg-foreground/5 backdrop-blur-sm transition-all",
        getTypeStyles(),
        className,
      )}
    >
      <CardHeader className="pb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <CardTitle
          className={cn("text-3xl font-mono tracking-tight", getTitleColor())}
        >
          {value}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
