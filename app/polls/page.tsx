"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PollItem = { id: string; title: string; description: string; tags?: string[] };

export default function PollsIndexPage() {
  const [query, setQuery] = useState("");

  const polls: PollItem[] = [
    { id: "1", title: "Favorite programming language?", description: "Vote for your top language.", tags: ["dev", "languages"] },
    { id: "2", title: "Best JS framework?", description: "React, Vue, Svelte, or Angular?", tags: ["javascript", "frameworks"] },
    { id: "3", title: "Tabs or Spaces?", description: "Choose wisely.", tags: ["dev", "formatting"] },
    { id: "4", title: "Dark mode all the time?", description: "Dark vs Light.", tags: ["ui", "theme"] }
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return polls;
    return polls.filter((p) =>
      [p.title, p.description, ...(p.tags || [])].some((v) => v.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search polls by title, description, or tag"
          className="sm:max-w-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((poll) => (
          <Link key={poll.id} href={`/polls/${poll.id}`}>
            <Card className="h-full transition hover:shadow-md">
              <CardHeader>
                <CardTitle className="line-clamp-1">{poll.title}</CardTitle>
                <CardDescription className="line-clamp-2">{poll.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(poll.tags || []).map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No polls match your search.</p>
      )}
    </div>
  );
}


