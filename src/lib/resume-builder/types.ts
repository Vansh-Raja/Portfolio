export interface HeaderState {
  name: string;
  phone: string;
  email: string;
  website: string;
}

export interface SectionToggles {
  education: boolean;
  experience: boolean;
  projects: boolean;
  certifications: boolean;
  skills: boolean;
}

export interface EducationEntry {
  dataIndex: number;
  enabled: boolean;
}

export interface ExperienceEntry {
  dataIndex: number;
  enabled: boolean;
  enabledBullets: boolean[];
  customBullets: string[];
}

export interface ProjectEntry {
  dataIndex: number;
  enabled: boolean;
  showLink: boolean;
  descriptionOverride?: string;
}

export interface CertificationEntry {
  dataIndex: number;
  enabled: boolean;
}

export interface SkillItem {
  name: string;
  enabled: boolean;
}

export interface SkillCategory {
  label: string;
  enabled: boolean;
  items: SkillItem[];
}

export interface CustomSection {
  id: string;
  title: string;
  bullets: string[];
}

export interface ResumeFormState {
  header: HeaderState;
  fontFamily: string;
  sections: SectionToggles;
  sectionOrder: (keyof SectionToggles)[];
  experienceOrder: number[];
  projectOrder: number[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  skills: SkillCategory[];
  customSections: CustomSection[];
}

export type ResumeAction =
  | { type: "SET_HEADER"; field: keyof HeaderState; value: string }
  | { type: "TOGGLE_SECTION"; section: keyof SectionToggles }
  | { type: "TOGGLE_EDUCATION"; index: number }
  | { type: "TOGGLE_EXPERIENCE"; index: number }
  | {
      type: "TOGGLE_EXPERIENCE_BULLET";
      entryIndex: number;
      bulletIndex: number;
    }
  | {
      type: "ADD_CUSTOM_BULLET";
      entryIndex: number;
      bullet: string;
    }
  | {
      type: "REMOVE_CUSTOM_BULLET";
      entryIndex: number;
      bulletIndex: number;
    }
  | { type: "TOGGLE_PROJECT"; index: number }
  | { type: "TOGGLE_PROJECT_LINK"; index: number }
  | {
      type: "SET_PROJECT_DESCRIPTION";
      index: number;
      value: string | undefined;
    }
  | { type: "TOGGLE_CERTIFICATION"; index: number }
  | { type: "TOGGLE_SKILL_CATEGORY"; index: number }
  | { type: "TOGGLE_SKILL_ITEM"; categoryIndex: number; itemIndex: number }
  | { type: "ADD_CUSTOM_SECTION" }
  | { type: "REMOVE_CUSTOM_SECTION"; id: string }
  | {
      type: "UPDATE_CUSTOM_SECTION";
      id: string;
      field: "title" | "bullets";
      value: string | string[];
    }
  | { type: "SET_FONT"; value: string }
  | { type: "MOVE_SECTION"; key: keyof SectionToggles; direction: -1 | 1 }
  | { type: "MOVE_EXPERIENCE"; index: number; direction: -1 | 1 }
  | { type: "MOVE_PROJECT"; index: number; direction: -1 | 1 }
  | { type: "RESET"; state: ResumeFormState };
