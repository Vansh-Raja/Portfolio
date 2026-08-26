import careerData from "@/data/career.json";
import educationData from "@/data/education.json";
import projectsData from "@/data/projects.json";
import certificationsData from "@/data/certifications.json";
import technologiesData from "@/data/technologies.json";
import socialsData from "@/data/socials.json";
import type { ResumeFormState } from "./types";

export function createDefaultState(): ResumeFormState {
  const emailSocial = socialsData.socials.find((s) => s.icon === "mail");
  const emailAddress = emailSocial
    ? emailSocial.href.replace("mailto:", "")
    : "";

  const linkedInSocial = socialsData.socials.find(
    (s) => s.icon === "linkedin",
  );
  const website = linkedInSocial?.href ?? "";

  return {
    header: {
      name: "Vansh Raja",
      phone: "",
      email: emailAddress,
      website,
    },
    fontFamily: "EBGaramond",
    sections: {
      education: true,
      experience: true,
      projects: true,
      certifications: true,
      skills: true,
    },
    sectionOrder: ["education", "experience", "projects", "certifications", "skills"] as const,
    experienceOrder: careerData.career.map((_, i) => i),
    projectOrder: projectsData.projects.map((_, i) => i),
    education: educationData.education.map((_, i) => ({
      dataIndex: i,
      enabled: true,
    })),
    experience: careerData.career.map((entry, i) => ({
      dataIndex: i,
      enabled: true,
      enabledBullets: (entry.description ?? []).map(() => true),
      customBullets: [],
    })),
    projects: projectsData.projects.map((_, i) => ({
      dataIndex: i,
      enabled: i < 4,
      showLink: true,
    })),
    certifications: certificationsData.certifications.map((_, i) => ({
      dataIndex: i,
      enabled: true,
    })),
    skills: technologiesData.technologies.additional.map((cat) => ({
      label: cat.label,
      enabled: true,
      items: cat.items.map((item) => ({ name: item, enabled: true })),
    })),
    customSections: [],
  };
}

/** Keep saved builder toggles, but grow/shrink lists when src/data JSON changes. */
export function alignResumeState(saved: ResumeFormState): ResumeFormState {
  const fresh = createDefaultState();

  const experience = fresh.experience.map((entry) => {
    const prev = saved.experience.find((e) => e.dataIndex === entry.dataIndex);
    if (!prev) return entry;
    return {
      ...entry,
      enabled: prev.enabled,
      customBullets: prev.customBullets ?? [],
      enabledBullets: entry.enabledBullets.map(
        (_, j) => prev.enabledBullets[j] ?? true,
      ),
    };
  });

  const education = fresh.education.map((entry) => {
    const prev = saved.education.find((e) => e.dataIndex === entry.dataIndex);
    return prev ? { ...entry, enabled: prev.enabled } : entry;
  });

  const projects = fresh.projects.map((entry) => {
    const prev = saved.projects.find((e) => e.dataIndex === entry.dataIndex);
    if (!prev) return entry;
    return {
      ...entry,
      enabled: prev.enabled,
      showLink: prev.showLink,
      descriptionOverride: prev.descriptionOverride,
    };
  });

  const certifications = fresh.certifications.map((entry) => {
    const prev = saved.certifications.find(
      (e) => e.dataIndex === entry.dataIndex,
    );
    return prev ? { ...entry, enabled: prev.enabled } : entry;
  });

  const skills = fresh.skills.map((cat) => {
    const prev = saved.skills.find((s) => s.label === cat.label);
    if (!prev) return cat;
    return {
      ...cat,
      enabled: prev.enabled,
      items: cat.items.map((item) => {
        const prevItem = prev.items.find((p) => p.name === item.name);
        return prevItem ? { ...item, enabled: prevItem.enabled } : item;
      }),
    };
  });

  const experienceOrder = mergeOrder(
    saved.experienceOrder,
    fresh.experienceOrder,
  );
  const projectOrder = mergeOrder(saved.projectOrder, fresh.projectOrder);

  return {
    ...fresh,
    header: { ...fresh.header, ...saved.header },
    fontFamily: saved.fontFamily || fresh.fontFamily,
    sections: { ...fresh.sections, ...saved.sections },
    sectionOrder:
      saved.sectionOrder?.length === fresh.sectionOrder.length
        ? saved.sectionOrder
        : fresh.sectionOrder,
    experienceOrder,
    projectOrder,
    education,
    experience,
    projects,
    certifications,
    skills,
    customSections: saved.customSections ?? [],
  };
}

function mergeOrder(saved: number[] | undefined, fresh: number[]): number[] {
  if (!saved?.length) return fresh;
  const extra = fresh.filter((i) => !saved.includes(i));
  return [...extra, ...saved.filter((i) => fresh.includes(i))];
}
