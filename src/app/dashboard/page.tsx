// app/dashboard/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadBankStatement } from "./actions";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload Statement</CardTitle>
          <CardDescription>
            Hand over your financial secrets in CSV or PDF format. We promise
            it's secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadBankStatement} className="flex flex-col gap-4">
            <Input
              type="file"
              name="statement"
              accept=".csv, .pdf"
              required
              className="cursor-pointer"
            />
            <Button type="submit">Upload to AWS</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
