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
    technologies,
    links,
  } = experience;

  return (
    <li className="relative ml-8 py-6 pl-4">
      <span className="absolute -left-[1.12rem] top-8 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary/80 shadow-[0_0_0_3px_rgba(0,0,0,0.05)] dark:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]" />
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

      <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h2 className="text-base font-semibold leading-tight">{name}</h2>
            {title && <p className="text-sm text-muted-foreground">{title}</p>}
          </div>
          {start && (
            <time className="text-xs font-medium text-muted-foreground">
              <span>{start}</span>
              <span>{" – "}</span>
              <span>{end ? end : "Present"}</span>
            </time>
          )}
        </div>

        {description && (
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {description.map((desc, i) => (
              <li key={i} className="flex gap-2 leading-relaxed">
                <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
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
