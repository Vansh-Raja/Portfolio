import { Experience } from "@/lib/schemas";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/Avatar";
import { Badge } from "./ui/Badge";
import Icon from "./Icon";

interface Props {
  experience: Experience;
}

export default function TimelineItem({ experience }: Props) {
  const {
    name,
    href,
    title,
    logo,
    start,
    end,
    description,
    highlights,
    technologies,
    links,
  } = experience;

  return (
    <li className="relative ml-8 py-6 pl-4">
      <span className="absolute -left-[1.14rem] top-8 h-3 w-3 rounded-full border-4 border-background bg-primary/80 shadow-[0_0_0_3px_rgba(0,0,0,0.05)] dark:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]" />
      <Link
        href={href}
        target="_blank"
        className="absolute -left-16 top-5 flex items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <Avatar className="size-12 border">
          <AvatarImage
            src={logo}
            alt={name}
            className="bg-background object-contain"
          />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="rounded-xl border border-border/80 bg-card/70 px-4 py-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold leading-tight">{name}</h2>
            {title && <p className="text-sm text-muted-foreground">{title}</p>}
          </div>
          {start && (
            <time className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <span>{start}</span>
              <span>{" – "}</span>
              <span>{end ? end : "Present"}</span>
            </time>
          )}
        </div>

        {highlights && highlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {highlights.map((item, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-secondary/60 text-xs font-medium"
              >
                {item}
              </Badge>
            ))}
          </div>
        )}

        {description && (
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {description.map((desc, i) => (
              <li key={i} className="flex gap-2 leading-relaxed">
                <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                <span>{desc}</span>
              </li>
            ))}
          </ul>
        )}

        {(technologies && technologies.length > 0) || (links && links.length > 0) ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {technologies?.map((tech, idx) => (
              <Badge
                key={`${tech}-${idx}`}
                variant="outline"
                className="bg-muted/40 text-xs font-medium"
              >
                {tech}
              </Badge>
            ))}
            {links?.map((link, idx) => (
              <Link href={link.href} key={idx}>
                <Badge title={link.name} className="flex gap-2">
                  <Icon
                    name={link.icon}
                    aria-hidden="true"
                    className="size-3"
                  />
                  {link.name}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
