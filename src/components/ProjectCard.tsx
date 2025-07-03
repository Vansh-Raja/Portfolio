"use client";

import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Project } from "@/lib/schemas";
import Image from "next/image";
import Link from "next/link";
import Markdown from "react-markdown";
import Icon from "./Icon";
import { useState } from "react";

interface Props {
  project: Project;
}

// Helper to pick a category based on project name
function getCategory(name: string) {
  const categories = ["ai", "book", "album", "movie", "game", "fashion", "dashboard", "crm", "finance", "calendar", "messenger"];
  // Use char code sum for deterministic but varied selection
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return categories[sum % categories.length];
}

export function ProjectCard({ project }: Props) {
  const { name, href, description, image, tags, links, duration, team } = project;
  const [imageError, setImageError] = useState(false);

  // Use lorem.space as fallback (returns jpg/png)
  const category = getCategory(name);
  const fallbackUrl = `https://api.lorem.space/image/${category}?w=500&h=300&hash=${encodeURIComponent(name)}`;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        {image && !imageError ? (
          <Link href={href || image}>
            <Image
              src={image}
              alt={name}
              width={500}
              height={300}
              className="h-40 w-full object-cover object-top"
              onError={() => setImageError(true)}
            />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <CardTitle>{name}</CardTitle>
        <Markdown className="prose max-w-full text-pretty font-sans text-xs text-muted-foreground dark:prose-invert">
          {description}
        </Markdown>
      </CardContent>
      <CardFooter className="flex h-full flex-col items-start justify-between gap-4">
        {tags && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.toSorted().map((tag) => (
              <Badge
                key={tag}
                className="px-1 py-0 text-[10px]"
                variant="secondary"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {links && links.length > 0 && (
          <div className="flex flex-row flex-wrap items-start gap-1">
            {links.toSorted().map((link, idx) => (
              <Link href={link?.href} key={idx} target="_blank">
                <Badge key={idx} className="flex gap-2 px-2 py-1 text-[10px]">
                  <Icon name={link.icon} className="size-3" />
                  {link.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
