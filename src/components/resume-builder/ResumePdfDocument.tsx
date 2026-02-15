"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
} from "@react-pdf/renderer";
import type { ResumeFormState, SectionToggles } from "@/lib/resume-builder/types";
import careerData from "@/data/career.json";
import educationData from "@/data/education.json";
import projectsData from "@/data/projects.json";
import certificationsData from "@/data/certifications.json";

const fontBase =
  typeof window !== "undefined" ? window.location.origin : "";

const fontFamilies = [
  { family: "EBGaramond", prefix: "EBGaramond" },
  { family: "Lora", prefix: "Lora" },
  { family: "CrimsonText", prefix: "CrimsonText" },
  { family: "Inter", prefix: "Inter" },
  { family: "Roboto", prefix: "Roboto" },
] as const;

for (const { family, prefix } of fontFamilies) {
  Font.register({
    family,
    fonts: [
      { src: `${fontBase}/fonts/${prefix}-Regular.ttf`, fontWeight: "normal" },
      { src: `${fontBase}/fonts/${prefix}-Bold.ttf`, fontWeight: "bold" },
      {
        src: `${fontBase}/fonts/${prefix}-Italic.ttf`,
        fontWeight: "normal",
        fontStyle: "italic",
      },
      {
        src: `${fontBase}/fonts/${prefix}-BoldItalic.ttf`,
        fontWeight: "bold",
        fontStyle: "italic",
      },
    ],
  });
}

const s = StyleSheet.create({
  page: {
    fontSize: 10.5,
    paddingHorizontal: 40,
    paddingVertical: 30,
    lineHeight: 1.3,
  },
  headerName: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  headerContactRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    fontSize: 10.5,
  },
  contactLink: {
    color: "#000000",
    textDecoration: "underline",
    fontSize: 10.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 2,
    marginTop: 2,
    marginBottom: 4,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 4,
  },
  entryTitle: {
    fontWeight: "bold",
    fontSize: 10.5,
    flex: 1,
  },
  entryDate: {
    fontWeight: "bold",
    fontSize: 10.5,
    textAlign: "right",
    flexShrink: 0,
  },
  entrySubtitle: {
    fontStyle: "italic",
    fontSize: 9.5,
    marginBottom: 2,
    color: "#333333",
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 12,
    marginBottom: 1,
  },
  bulletDot: {
    width: 10,
    fontSize: 10.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
  },
  bulletDateRow: {
    flexDirection: "row",
    paddingLeft: 12,
    marginBottom: 1,
  },
  bulletDateText: {
    flex: 1,
    fontSize: 10.5,
  },
  bulletDateRight: {
    fontSize: 10.5,
    textAlign: "right",
    flexShrink: 0,
    fontStyle: "italic",
  },
  toolsUsed: {
    paddingLeft: 0,
    marginTop: 1,
    marginBottom: 2,
    fontSize: 10.5,
  },
  projectTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 4,
  },
  projectName: {
    fontWeight: "bold",
    fontSize: 10.5,
  },
  projectLink: {
    fontSize: 8.5,
    color: "#000000",
    textDecoration: "underline",
    fontStyle: "italic",
  },
  projectDesc: {
    fontSize: 10.5,
    marginBottom: 1,
  },
  certBullet: {
    flexDirection: "row",
    paddingLeft: 12,
    marginBottom: 1,
  },
  skillRow: {
    flexDirection: "row",
    marginBottom: 1,
  },
  skillLabel: {
    fontWeight: "bold",
    fontSize: 10.5,
    flexShrink: 0,
  },
  skillItems: {
    fontSize: 10.5,
    flex: 1,
  },
  educationTitle: {
    fontWeight: "bold",
    fontSize: 10.5,
  },
});

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>{"\u2022"}</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

interface Props {
  state: ResumeFormState;
}

export default function ResumePdfDocument({ state }: Props) {
  const sectionOrder = state.sectionOrder ?? ["education", "experience", "projects", "certifications", "skills"] as (keyof SectionToggles)[];
  const expOrder = state.experienceOrder ?? state.experience.map((_, i) => i);
  const projOrder = state.projectOrder ?? state.projects.map((_, i) => i);

  const renderSection: Record<keyof SectionToggles, () => React.ReactNode> = {
    education: () => {
      const enabled = state.education.filter((e) => e.enabled);
      if (enabled.length === 0) return null;
      return (
        <View>
          <Text style={s.sectionTitle}>Academic Qualification</Text>
          {enabled.map((entry) => {
            const data = educationData.education[entry.dataIndex];
            if (!data) return null;
            const desc = data.description ?? [];
            const grade = desc.find(
              (d) => d.toLowerCase().startsWith("grade") || d.toLowerCase().startsWith("aggregate"),
            );
            return (
              <View key={entry.dataIndex} style={{ marginBottom: 2 }}>
                <Text style={s.educationTitle}>
                  <Text style={{ fontWeight: "bold" }}>{data.title}, </Text>
                  <Text>{data.name};</Text>
                </Text>
                <Text style={{ fontSize: 10.5 }}>
                  {grade ? `${grade}; ` : ""}{data.end ?? ""}
                </Text>
              </View>
            );
          })}
        </View>
      );
    },

    experience: () => {
      const orderedEnabled = expOrder.filter((i) => state.experience[i]?.enabled);
      if (orderedEnabled.length === 0) return null;
      return (
        <View>
          <Text style={s.sectionTitle}>Internships</Text>
          {orderedEnabled.map((entryIdx) => {
            const entry = state.experience[entryIdx];
            const data = careerData.career[entry.dataIndex];
            if (!data) return null;
            const dateRange = `[${data.start} \u2013 ${data.end ?? "Current"}]`;
            const enabledBullets = (data.description ?? []).filter(
              (_, i) => entry.enabledBullets[i],
            );
            const allBullets = [...enabledBullets, ...entry.customBullets];
            return (
              <View key={entryIdx}>
                <View style={s.entryRow}>
                  <Text style={s.entryTitle}>
                    {data.title}, {data.name}, Nagpur
                  </Text>
                  <Text style={s.entryDate}>{dateRange}</Text>
                </View>
                {allBullets.map((bullet, i) => (
                  <Bullet key={i}>{bullet}</Bullet>
                ))}
                {data.technologies && data.technologies.length > 0 && (
                  <Text style={s.toolsUsed}>
                    <Text style={{ fontWeight: "bold" }}>Tools Used: </Text>
                    {data.technologies.join(", ")}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      );
    },

    projects: () => {
      const orderedEnabled = projOrder.filter((i) => state.projects[i]?.enabled);
      if (orderedEnabled.length === 0) return null;
      return (
        <View>
          <Text style={s.sectionTitle}>Projects</Text>
          {orderedEnabled.map((entryIdx) => {
            const entry = state.projects[entryIdx];
            const data = projectsData.projects[entry.dataIndex];
            if (!data) return null;
            const ghLink = data.links.find((l) => l.icon === "github")?.href;
            const description = entry.descriptionOverride ?? data.description;
            return (
              <View key={entryIdx}>
                <View style={s.projectTitleRow}>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", flex: 1 }}>
                    <Text style={s.projectName}>{data.name} </Text>
                    {entry.showLink && ghLink && (
                      <Link src={ghLink} style={s.projectLink}>
                        <Text>[{ghLink}]</Text>
                      </Link>
                    )}
                  </View>
                  {data.duration && (
                    <Text style={s.entryDate}>[{data.duration}]</Text>
                  )}
                </View>
                <Text style={s.projectDesc}>{description}</Text>
                {data.tags.length > 0 && (
                  <Text style={s.toolsUsed}>
                    <Text style={{ fontWeight: "bold" }}>Tools Used: </Text>
                    {data.tags.join(", ")}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      );
    },

    certifications: () => {
      const enabled = state.certifications.filter((e) => e.enabled);
      if (enabled.length === 0) return null;
      return (
        <View>
          <Text style={s.sectionTitle}>Certifications</Text>
          {enabled.map((entry) => {
            const data = certificationsData.certifications[entry.dataIndex];
            if (!data) return null;
            return (
              <View key={entry.dataIndex} style={s.certBullet}>
                <Text style={s.bulletDot}>{"\u2022"}</Text>
                <Text style={s.bulletText}>
                  {"\u201C"}{data.name}{"\u201D"} by {data.issuer}, {data.date}
                </Text>
              </View>
            );
          })}
        </View>
      );
    },

    skills: () => {
      const enabled = state.skills.filter((e) => e.enabled);
      if (enabled.length === 0) return null;
      const rows = enabled.map((cat, i) => {
        const enabledItems = cat.items.filter((item) => item.enabled).map((item) => item.name);
        if (enabledItems.length === 0) return null;
        return (
          <View key={i} style={s.skillRow}>
            <Text style={s.skillLabel}>{cat.label}: </Text>
            <Text style={s.skillItems}>{enabledItems.join(", ")}</Text>
          </View>
        );
      }).filter(Boolean);
      if (rows.length === 0) return null;
      return (
        <View>
          <Text style={s.sectionTitle}>Technical Skills</Text>
          {rows}
        </View>
      );
    },
  };

  return (
    <Document>
      <Page size="A4" style={[s.page, { fontFamily: state.fontFamily }]}>
        {/* Header */}
        <Text style={s.headerName}>{state.header.name}</Text>
        <View style={s.headerContactRow}>
          {[state.header.phone, state.header.email, state.header.website]
            .filter(Boolean)
            .map((item, i, arr) => (
              <View key={i} style={{ flexDirection: "row" }}>
                {item?.includes("@") ? (
                  <Link src={`mailto:${item}`} style={s.contactLink}>
                    <Text>{item}</Text>
                  </Link>
                ) : item?.startsWith("http") ? (
                  <Link src={item} style={s.contactLink}>
                    <Text>{item.replace(/^https?:\/\/(www\.)?/, "")}</Text>
                  </Link>
                ) : (
                  <Text style={{ fontSize: 10.5 }}>{item}</Text>
                )}
                {i < arr.length - 1 && (
                  <Text style={{ fontSize: 10.5, paddingHorizontal: 6 }}>|</Text>
                )}
              </View>
            ))}
        </View>

        {/* Sections in order */}
        {sectionOrder.map((k) => {
          if (!state.sections[k]) return null;
          return <View key={k}>{renderSection[k]()}</View>;
        })}

        {/* Custom Sections */}
        {state.customSections.map((section) => {
          if (!section.title) return null;
          const bullets = section.bullets.filter(Boolean);
          return (
            <View key={section.id}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              {bullets.map((bullet, i) => (
                <Bullet key={i}>{bullet}</Bullet>
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
