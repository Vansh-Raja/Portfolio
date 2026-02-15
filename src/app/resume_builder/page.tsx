import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Resume Builder",
  robots: { index: false, follow: false },
};

const ResumeBuilder = dynamic(
  () => import("@/components/resume-builder/ResumeBuilder"),
  { ssr: false },
);

export default function ResumeBuilderPage() {
  return <ResumeBuilder />;
}
