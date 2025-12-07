import dynamicIconImports from "lucide-react/dynamicIconImports";
import { z } from "zod";

export const ContactFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required." })
    .min(2, { message: "Must be at least 2 characters." }),
  email: z
    .string()
    .min(1, { message: "Email is required." })
    .email("Invalid email."),
  message: z.string().min(1, { message: "Message is required." }),
});

const iconLink = z.object({
  name: z.string(),
  href: z.string().url(),
  icon: z.custom<keyof typeof dynamicIconImports>(),
});
export type IconLink = z.infer<typeof iconLink>;

const project = z.object({
  name: z.string(),
  description: z.string(),
  href: z.string().url().optional(),
  image: z.string().optional(),
  tags: z.array(z.string()),
  links: z.array(iconLink),
  duration: z.string().optional(),
  team: z.string().optional(),
});
export const projectSchema = z.object({ projects: z.array(project) });
export type Project = z.infer<typeof project>;

const experience = z.object({
  name: z.string(),
  href: z.string(),
  title: z.string(),
  logo: z.string(),
  start: z.string(),
  end: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  description: z.array(z.string()).optional(),
  links: z.array(iconLink).optional(),
});
export type Experience = z.infer<typeof experience>;

export const careerSchema = z.object({ career: z.array(experience) });
export const educationSchema = z.object({ education: z.array(experience) });
export const socialSchema = z.object({ socials: z.array(iconLink) });

const primarySkill = z.object({
  name: z.string(),
  icon: z.string(),
});

const additionalCategory = z.object({
  label: z.string(),
  icon: z.string(),
  items: z.array(z.string()),
});

const technologies = z.object({
  primary: z.array(primarySkill),
  additional: z.array(additionalCategory),
});

export const technologiesSchema = z.object({ technologies });
export type PrimarySkill = z.infer<typeof primarySkill>;
export type AdditionalCategory = z.infer<typeof additionalCategory>;
export type Technologies = z.infer<typeof technologies>;
