'use client';
import { useState, useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { SiPython, SiNumpy, SiPandas, SiScikitlearn, SiTensorflow, SiDocker, SiRedis, SiFlask, SiMongodb, SiGit } from "react-icons/si";
import { TbLayoutKanban } from "react-icons/tb";
import * as Popover from "@radix-ui/react-popover";
import technologiesData from "@/data/technologies.json";
import { technologiesSchema } from "@/lib/schemas";

// Icon mapping for technology icons
const iconMap = {
  SiPython, SiNumpy, SiPandas, SiScikitlearn, SiTensorflow, SiDocker, SiRedis,
  SiFlask, SiMongodb, SiGit, TbLayoutKanban,
} as const;

export default function Technologies() {
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [isClicked, setIsClicked] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse and validate data
  const { technologies } = technologiesSchema.parse(technologiesData);
  const { primary: primarySkills, additional: techGroups } = technologies;

  const handleMouseEnter = (label: string) => {
    if (isClicked === label) return;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setOpenPopover(label);
  };

  const handleMouseLeave = () => {
    if (isClicked) return;
    
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenPopover(null);
    }, 150);
  };

  const handleClick = (label: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (isClicked === label) {
      setIsClicked(null);
      setOpenPopover(null);
    } else {
      setIsClicked(label);
      setOpenPopover(label);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <h2 className="title text-2xl sm:text-3xl">technical skills</h2>
      
      {/* Primary Skills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {primarySkills.map((skill) => {
          const Icon = iconMap[skill.icon as keyof typeof iconMap];
          return (
            <div
              key={skill.name}
              className="flex flex-col items-center justify-center rounded-lg border bg-muted px-2 py-3 shadow-sm"
              style={{ minWidth: 80 }}
            >
              <Icon className="mb-1 text-2xl text-primary" />
              <span className="text-xs font-medium text-center text-muted-foreground">
                {skill.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Additional Technologies */}
      <div className="flex flex-col gap-4">
        <h3 className="title text-lg sm:text-xl">and more:</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {techGroups.map((group) => {
            const Icon = iconMap[group.icon as keyof typeof iconMap];
            return (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => handleMouseEnter(group.label)}
                onMouseLeave={handleMouseLeave}
              >
                <Popover.Root open={openPopover === group.label}>
                  <Popover.Trigger asChild>
                    <button
                      className="flex flex-col items-center justify-center rounded-lg border bg-muted px-2 py-3 shadow-sm hover:bg-secondary transition-colors cursor-pointer focus:outline-none focus:ring-0 w-full"
                      style={{ minWidth: 80 }}
                      onClick={() => handleClick(group.label)}
                    >
                      <Icon className="mb-1 text-2xl text-primary" />
                      <span className="text-xs font-medium text-center text-muted-foreground">
                        {group.label}
                      </span>
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      side="bottom"
                      align="center"
                      sideOffset={8}
                      className="z-50 rounded-lg border bg-popover p-4 shadow-lg flex flex-wrap gap-2 min-w-[180px] max-w-[280px]"
                      onMouseEnter={() => handleMouseEnter(group.label)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {group.items.map((item) => (
                        <Badge key={item} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
} 