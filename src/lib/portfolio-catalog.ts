import careerData from "@/data/career.json";
import projectsData from "@/data/projects.json";
import technologiesData from "@/data/technologies.json";

type Project = {
  name: string;
  description: string;
  tags?: string[];
  duration?: string;
  team?: string;
  blogSlug?: string;
  demoUrl?: string;
};

type Job = {
  name: string;
  title: string;
  start: string;
  end?: string;
  description?: string[];
};

type TechGroup = {
  label: string;
  items: string[];
};

/**
 * Compact, complete catalog from repo JSON. Vector search often misses
 * projects.json and returns duplicate blog chunks instead.
 */
export function buildPortfolioCatalog(): string {
  const projects = (projectsData.projects as Project[])
    .map((project) => {
      const bits = [
        project.duration,
        project.team ? `Team: ${project.team}` : "",
        project.tags?.length ? `Tech: ${project.tags.join(", ")}` : "",
        project.blogSlug ? `Blog: /blog/${project.blogSlug}` : "",
        project.demoUrl ? `Demo: ${project.demoUrl}` : "",
      ].filter(Boolean);
      return `- ${project.name}: ${project.description} (${bits.join("; ")})`;
    })
    .join("\n");

  const jobs = (careerData.career as Job[])
    .map((job) => {
      const dates = job.end ? `${job.start} - ${job.end}` : `${job.start} - Present`;
      const bullets = (job.description ?? [])
        .map((line) => `  - ${line}`)
        .join("\n");
      return `- ${job.title} at ${job.name} (${dates})\n${bullets}`;
    })
    .join("\n");

  const tech = technologiesData.technologies as {
    primary?: { name: string }[];
    additional?: TechGroup[];
  };
  const primary = (tech.primary ?? []).map((item) => item.name).join(", ");
  const extra = (tech.additional ?? [])
    .map((group) => `- ${group.label}: ${group.items.join(", ")}`)
    .join("\n");

  return [
    "Portfolio catalog (complete; use this for overview questions):",
    "",
    "Projects:",
    projects,
    "",
    "Work experience:",
    jobs,
    "",
    "Skills:",
    `Primary: ${primary}`,
    extra,
  ].join("\n");
}
