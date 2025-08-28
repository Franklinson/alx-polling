import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Poll #{id}</CardTitle>
        <CardDescription>Placeholder poll details page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge>Open</Badge>
        </div>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          <li>Option A</li>
          <li>Option B</li>
          <li>Option C</li>
        </ul>
      </CardContent>
      <CardFooter className="gap-2">
        <Button>Vote</Button>
        <Button variant="outline">Results</Button>
      </CardFooter>
    </Card>
  );
}


