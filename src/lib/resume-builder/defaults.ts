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
