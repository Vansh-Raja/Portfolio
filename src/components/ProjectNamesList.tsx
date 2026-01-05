"use client";

import data from "@/data/projects.json";
import { projectSchema } from "@/lib/schemas";
import Link from "next/link";

export default function ProjectNamesList() {
  const projects = projectSchema.parse(data).projects;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
      {projects.map((project, index) => {
        const href = project.blogSlug
          ? `/blog/${project.blogSlug}`
          : "/projects";

        return (
          <span key={project.name} className="inline-flex items-center">
            <Link
              href={href}
              className="transition-colors hover:text-foreground"
            >
              {project.name}
            </Link>
            {index < projects.length - 1 && (
              <span className="ml-1 select-none">·</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
