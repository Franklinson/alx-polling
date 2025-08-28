import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPollPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Poll</CardTitle>
        <CardDescription>Create a new poll with options.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="What should we vote on?" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="Add more context (optional)" />
        </div>
        <div className="space-y-2">
          <Label>Options</Label>
          <Input placeholder="Option 1" />
          <Input placeholder="Option 2" />
          <Input placeholder="Option 3" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Create</Button>
      </CardFooter>
    </Card>
  );
}


