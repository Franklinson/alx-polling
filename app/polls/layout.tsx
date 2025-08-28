import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function PollsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 p-8 sm:p-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Polls Dashboard</h1>
          <p className="max-w-2xl text-muted-foreground">
            Create, share, and vote on polls in seconds. Track results in real time and keep your community engaged.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/polls/new">Create a Poll</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/polls">Browse Polls</Link>
            </Button>
          </div>
        </div>
      </section>
      <Separator />
      <div>{children}</div>
    </div>
  );
}


