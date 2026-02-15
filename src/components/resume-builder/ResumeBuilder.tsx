"use client";

import {
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import { Archivo, Space_Mono } from "next/font/google";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { FONT_OPTIONS } from "@/lib/resume-builder/fonts";
import type {
  ResumeFormState,
  ResumeAction,
  SectionToggles,
} from "@/lib/resume-builder/types";
import { createDefaultState } from "@/lib/resume-builder/defaults";
import {
  saveState,
  loadState,
  clearState,
} from "@/lib/resume-builder/storage";
import ResumePdfDocument from "./ResumePdfDocument";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Loading preview…
      </div>
    ),
  },
);
import careerData from "@/data/career.json";
import educationData from "@/data/education.json";
import projectsData from "@/data/projects.json";
import certificationsData from "@/data/certifications.json";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const RED = "#E63946";
const BLUE = "#457B9D";
const YELLOW = "#F4A261";
const DARK = "#1D3557";

const sColors: Record<keyof SectionToggles, string> = {
  education: RED,
  experience: BLUE,
  projects: YELLOW,
  certifications: DARK,
  skills: RED,
};

const SECTION_LABELS: Record<keyof SectionToggles, string> = {
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  certifications: "Certifications",
  skills: "Skills",
};

/* ── helpers ── */

function swap<T>(arr: T[], a: number, b: number): T[] {
  if (b < 0 || b >= arr.length) return arr;
  const next = [...arr];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/* ── reducer ── */

function reducer(
  state: ResumeFormState,
  action: ResumeAction,
): ResumeFormState {
  switch (action.type) {
    case "SET_HEADER":
      return {
        ...state,
        header: { ...state.header, [action.field]: action.value },
      };
    case "TOGGLE_SECTION":
      return {
        ...state,
        sections: {
          ...state.sections,
          [action.section]: !state.sections[action.section],
        },
      };
    case "TOGGLE_EDUCATION":
      return {
        ...state,
        education: state.education.map((e, i) =>
          i === action.index ? { ...e, enabled: !e.enabled } : e,
        ),
      };
    case "TOGGLE_EXPERIENCE":
      return {
        ...state,
        experience: state.experience.map((e, i) =>
          i === action.index ? { ...e, enabled: !e.enabled } : e,
        ),
      };
    case "TOGGLE_EXPERIENCE_BULLET":
      return {
        ...state,
        experience: state.experience.map((e, i) =>
          i === action.entryIndex
            ? {
                ...e,
                enabledBullets: e.enabledBullets.map((b, j) =>
                  j === action.bulletIndex ? !b : b,
                ),
              }
            : e,
        ),
      };
    case "ADD_CUSTOM_BULLET":
      return {
        ...state,
        experience: state.experience.map((e, i) =>
          i === action.entryIndex
            ? { ...e, customBullets: [...e.customBullets, action.bullet] }
            : e,
        ),
      };
    case "REMOVE_CUSTOM_BULLET":
      return {
        ...state,
        experience: state.experience.map((e, i) =>
          i === action.entryIndex
            ? {
                ...e,
                customBullets: e.customBullets.filter(
                  (_, j) => j !== action.bulletIndex,
                ),
              }
            : e,
        ),
      };
    case "TOGGLE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p, i) =>
          i === action.index ? { ...p, enabled: !p.enabled } : p,
        ),
      };
    case "TOGGLE_PROJECT_LINK":
      return {
        ...state,
        projects: state.projects.map((p, i) =>
          i === action.index ? { ...p, showLink: !p.showLink } : p,
        ),
      };
    case "SET_PROJECT_DESCRIPTION":
      return {
        ...state,
        projects: state.projects.map((p, i) =>
          i === action.index
            ? { ...p, descriptionOverride: action.value }
            : p,
        ),
      };
    case "TOGGLE_CERTIFICATION":
      return {
        ...state,
        certifications: state.certifications.map((c, i) =>
          i === action.index ? { ...c, enabled: !c.enabled } : c,
        ),
      };
    case "TOGGLE_SKILL_CATEGORY":
      return {
        ...state,
        skills: state.skills.map((s, i) =>
          i === action.index ? { ...s, enabled: !s.enabled } : s,
        ),
      };
    case "TOGGLE_SKILL_ITEM":
      return {
        ...state,
        skills: state.skills.map((s, i) =>
          i === action.categoryIndex
            ? {
                ...s,
                items: s.items.map((item, j) =>
                  j === action.itemIndex
                    ? { ...item, enabled: !item.enabled }
                    : item,
                ),
              }
            : s,
        ),
      };
    case "ADD_CUSTOM_SECTION":
      return {
        ...state,
        customSections: [
          ...state.customSections,
          { id: crypto.randomUUID(), title: "", bullets: [] },
        ],
      };
    case "REMOVE_CUSTOM_SECTION":
      return {
        ...state,
        customSections: state.customSections.filter(
          (s) => s.id !== action.id,
        ),
      };
    case "UPDATE_CUSTOM_SECTION":
      return {
        ...state,
        customSections: state.customSections.map((s) =>
          s.id === action.id ? { ...s, [action.field]: action.value } : s,
        ),
      };
    case "SET_FONT":
      return { ...state, fontFamily: action.value };
    case "MOVE_SECTION": {
      const idx = state.sectionOrder.indexOf(action.key);
      return {
        ...state,
        sectionOrder: swap(state.sectionOrder, idx, idx + action.direction),
      };
    }
    case "MOVE_EXPERIENCE": {
      const pos = state.experienceOrder.indexOf(action.index);
      return {
        ...state,
        experienceOrder: swap(
          state.experienceOrder,
          pos,
          pos + action.direction,
        ),
      };
    }
    case "MOVE_PROJECT": {
      const pos = state.projectOrder.indexOf(action.index);
      return {
        ...state,
        projectOrder: swap(state.projectOrder, pos, pos + action.direction),
      };
    }
    case "RESET":
      return action.state;
    default:
      return state;
  }
}

/* ── main component ── */

export default function ResumeBuilder() {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const saved = loadState();
    return saved ?? createDefaultState();
  });

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(state.sectionOrder),
  );
  const [newBullets, setNewBullets] = useState<Record<number, string>>({});
  const [downloading, setDownloading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);

  /* debounced save */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback((s: ResumeFormState) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveState(s), 500);
  }, []);
  useEffect(() => {
    debouncedSave(state);
  }, [state, debouncedSave]);

  /* debounced state for PDF preview (avoids re-render on every keystroke) */
  const [debouncedState, setDebouncedState] = useState(state);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedState(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const memoizedDoc = useMemo(
    () => <ResumePdfDocument state={debouncedState} />,
    [debouncedState],
  );

  const toggleExpand = (k: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const handleReset = () => {
    clearState();
    const fresh = createDefaultState();
    dispatch({ type: "RESET", state: fresh });
    setExpanded(new Set(fresh.sectionOrder));
    setShowResetConfirm(false);
    toast.success("Reset to defaults");
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await pdf(<ResumePdfDocument state={state} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = state.header.name
        ? `${state.header.name.replace(/\s+/g, "_")}_Resume.pdf`
        : "Resume.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error(
        `PDF generation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col overflow-hidden ${archivo.className}`}
      style={{ background: "#FFFDF7", color: DARK }}
    >
      {/* ── Toolbar ── */}
      <header
        className="flex items-center justify-between border-b px-6 py-2"
        style={{ borderColor: "#ddd", background: "#fff" }}
      >
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-[10px] opacity-40 hover:opacity-80"
          >
            &larr;
          </a>
          <div className="flex gap-0.5">
            <div className="h-4 w-1" style={{ background: RED }} />
            <div className="h-4 w-1" style={{ background: BLUE }} />
            <div className="h-4 w-1" style={{ background: YELLOW }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">
            Resume Builder
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="rounded-sm border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition hover:bg-gray-50"
            style={{ borderColor: "#ddd", color: "#999" }}
          >
            Reset
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-sm px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-50"
            style={{ background: RED }}
          >
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </header>

      {/* ── Reset confirmation overlay ── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div
            className="mx-4 w-full max-w-sm rounded-sm border-2 p-6"
            style={{ background: "#fff", borderColor: DARK }}
          >
            <h3
              className="mb-2 text-sm font-black uppercase tracking-wider"
              style={{ color: DARK }}
            >
              Reset all changes?
            </h3>
            <p className="mb-4 text-xs" style={{ color: "#666" }}>
              This will discard all your customizations and restore the
              default resume content. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-sm border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition hover:bg-gray-50"
                style={{ borderColor: "#ddd" }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:brightness-110"
                style={{ background: RED }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen preview overlay ── */}
      {fullscreenPreview && (
        <div
          className="fixed inset-0 z-[200] flex flex-col"
          style={{ background: "#f8f6f0" }}
        >
          <div
            className="flex items-center justify-between border-b px-6 py-2"
            style={{ borderColor: "#ddd", background: "#fff" }}
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="h-4 w-1" style={{ background: RED }} />
                <div className="h-4 w-1" style={{ background: BLUE }} />
                <div className="h-4 w-1" style={{ background: YELLOW }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                Preview
              </span>
            </div>
            <button
              onClick={() => setFullscreenPreview(false)}
              className="rounded-sm border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition hover:bg-gray-50"
              style={{ borderColor: "#ddd", color: DARK }}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 p-4">
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              {memoizedDoc}
            </PDFViewer>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ── Left: continuous scroll form ── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="mx-auto max-w-2xl px-8 py-8">
            {/* Header */}
            <input
              value={state.header.name}
              onChange={(e) =>
                dispatch({
                  type: "SET_HEADER",
                  field: "name",
                  value: e.target.value,
                })
              }
              className="mb-1 w-full border-0 bg-transparent text-3xl font-black uppercase tracking-wide outline-none"
              style={{
                color: DARK,
                borderBottom: `3px solid ${DARK}`,
                paddingBottom: 4,
              }}
            />
            <div className="mt-3 flex flex-wrap gap-4">
              {(["email", "phone", "website"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-bold uppercase ${spaceMono.className}`}
                    style={{ color: BLUE }}
                  >
                    {f}
                  </span>
                  <input
                    value={state.header[f]}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_HEADER",
                        field: f,
                        value: e.target.value,
                      })
                    }
                    className="border-b bg-transparent pb-0.5 text-xs outline-none transition focus:border-[#E63946]"
                    style={{
                      borderColor: "#ddd",
                      color: DARK,
                      width: f === "website" ? 200 : 150,
                    }}
                  />
                </label>
              ))}
            </div>

            {/* Font selector */}
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="h-0.5 flex-1"
                  style={{ background: DARK + "20" }}
                />
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.15em] ${spaceMono.className}`}
                  style={{ color: BLUE }}
                >
                  Typeface
                </span>
                <div
                  className="h-0.5 flex-1"
                  style={{ background: DARK + "20" }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() =>
                      dispatch({ type: "SET_FONT", value: f.value })
                    }
                    className="border-2 px-3 py-1.5 text-[10px] font-bold transition"
                    style={{
                      borderColor:
                        state.fontFamily === f.value ? DARK : "#ddd",
                      color:
                        state.fontFamily === f.value ? DARK : "#999",
                      background:
                        state.fontFamily === f.value
                          ? DARK + "08"
                          : "transparent",
                    }}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`ml-1.5 text-[8px] font-normal ${spaceMono.className}`}
                      style={{ color: "#aaa" }}
                    >
                      {f.style.split(" \u2014 ")[1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Sections in sectionOrder ── */}
            {state.sectionOrder.map((k, sIdx) => {
              const color = sColors[k];
              const isOpen = expanded.has(k);
              return (
                <div key={k} className="mt-8">
                  {/* Geometric divider */}
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="h-0.5 flex-1"
                      style={{ background: color + "30" }}
                    />
                    <div
                      className="h-3 w-3 rotate-45"
                      style={{ background: color }}
                    />
                    <div
                      className="h-0.5 flex-1"
                      style={{ background: color + "30" }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(k)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="text-xs transition"
                          style={{
                            display: "inline-block",
                            transform: isOpen
                              ? "rotate(90deg)"
                              : "rotate(0deg)",
                            color: "#999",
                          }}
                        >
                          &#9654;
                        </span>
                        <h2
                          className="text-lg font-black uppercase tracking-wider"
                          style={{ color }}
                        >
                          {SECTION_LABELS[k]}
                        </h2>
                      </button>
                      {/* Section reorder arrows */}
                      <div className="flex flex-col">
                        <button
                          onClick={() =>
                            dispatch({
                              type: "MOVE_SECTION",
                              key: k,
                              direction: -1,
                            })
                          }
                          disabled={sIdx === 0}
                          className="px-1 text-[8px] leading-none opacity-30 transition hover:opacity-80 disabled:opacity-10"
                          style={{ color }}
                        >
                          &#9650;
                        </button>
                        <button
                          onClick={() =>
                            dispatch({
                              type: "MOVE_SECTION",
                              key: k,
                              direction: 1,
                            })
                          }
                          disabled={
                            sIdx === state.sectionOrder.length - 1
                          }
                          className="px-1 text-[8px] leading-none opacity-30 transition hover:opacity-80 disabled:opacity-10"
                          style={{ color }}
                        >
                          &#9660;
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        dispatch({
                          type: "TOGGLE_SECTION",
                          section: k,
                        })
                      }
                      className="flex h-5 w-9 items-center rounded-full px-0.5 transition"
                      style={{
                        background: state.sections[k] ? color : "#ddd",
                      }}
                    >
                      <span
                        className="block h-4 w-4 rounded-full bg-white shadow transition-transform"
                        style={{
                          transform: state.sections[k]
                            ? "translateX(14px)"
                            : "translateX(0)",
                        }}
                      />
                    </button>
                  </div>

                  {isOpen && state.sections[k] && (
                    <div
                      className="mt-3 space-y-1 border-l-4 pl-4"
                      style={{ borderColor: color }}
                    >
                      {/* ── Education ── */}
                      {k === "education" &&
                        state.education.map((entry, i) => {
                          const data =
                            educationData.education[entry.dataIndex];
                          if (!data) return null;
                          return (
                            <Row
                              key={i}
                              enabled={entry.enabled}
                              onToggle={() =>
                                dispatch({
                                  type: "TOGGLE_EDUCATION",
                                  index: i,
                                })
                              }
                              color={color}
                            >
                              <span className="font-bold">
                                {data.title}
                              </span>
                              , {data.name} &middot; {data.end ?? ""}
                            </Row>
                          );
                        })}

                      {/* ── Experience (ordered) ── */}
                      {k === "experience" &&
                        state.experienceOrder.map(
                          (entryIdx, pos) => {
                            const entry =
                              state.experience[entryIdx];
                            if (!entry) return null;
                            const data =
                              careerData.career[entry.dataIndex];
                            if (!data) return null;
                            return (
                              <div key={entryIdx}>
                                <div className="flex items-center gap-1">
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() =>
                                        dispatch({
                                          type: "MOVE_EXPERIENCE",
                                          index: entryIdx,
                                          direction: -1,
                                        })
                                      }
                                      disabled={pos === 0}
                                      className="px-0.5 text-[7px] leading-none opacity-25 transition hover:opacity-70 disabled:opacity-5"
                                    >
                                      &#9650;
                                    </button>
                                    <button
                                      onClick={() =>
                                        dispatch({
                                          type: "MOVE_EXPERIENCE",
                                          index: entryIdx,
                                          direction: 1,
                                        })
                                      }
                                      disabled={
                                        pos ===
                                        state.experienceOrder
                                          .length -
                                          1
                                      }
                                      className="px-0.5 text-[7px] leading-none opacity-25 transition hover:opacity-70 disabled:opacity-5"
                                    >
                                      &#9660;
                                    </button>
                                  </div>
                                  <div className="flex-1">
                                    <Row
                                      enabled={entry.enabled}
                                      onToggle={() =>
                                        dispatch({
                                          type: "TOGGLE_EXPERIENCE",
                                          index: entryIdx,
                                        })
                                      }
                                      color={color}
                                    >
                                      <span className="font-bold">
                                        {data.title}
                                      </span>{" "}
                                      at {data.name}
                                      <span
                                        className={`ml-2 text-[9px] ${spaceMono.className}`}
                                        style={{ color: "#999" }}
                                      >
                                        {data.start}{" "}
                                        {data.end
                                          ? `\u2013 ${data.end}`
                                          : "\u2013 Current"}
                                      </span>
                                    </Row>
                                  </div>
                                </div>
                                {entry.enabled && (
                                  <>
                                    <div className="ml-6 space-y-0.5 py-1">
                                      {(
                                        data.description ?? []
                                      ).map((b, j) => (
                                        <button
                                          key={j}
                                          onClick={() =>
                                            dispatch({
                                              type: "TOGGLE_EXPERIENCE_BULLET",
                                              entryIndex:
                                                entryIdx,
                                              bulletIndex: j,
                                            })
                                          }
                                          className="flex w-full items-center gap-2 py-0.5 text-left text-[11px] transition hover:bg-black/5"
                                          style={{
                                            color:
                                              entry
                                                .enabledBullets[
                                                j
                                              ]
                                                ? DARK
                                                : "#bbb",
                                          }}
                                        >
                                          <span
                                            className="h-3 w-3 shrink-0 rounded-sm border"
                                            style={{
                                              borderColor:
                                                color,
                                              background:
                                                entry
                                                  .enabledBullets[
                                                  j
                                                ]
                                                  ? color
                                                  : "transparent",
                                            }}
                                          />
                                          <span
                                            style={{
                                              textDecoration:
                                                entry
                                                  .enabledBullets[
                                                  j
                                                ]
                                                  ? "none"
                                                  : "line-through",
                                            }}
                                          >
                                            {b}
                                          </span>
                                        </button>
                                      ))}
                                      {/* Custom bullets */}
                                      {entry.customBullets.map(
                                        (cb, cbIdx) => (
                                          <div
                                            key={`cb-${cbIdx}`}
                                            className="flex items-center gap-2 py-0.5 text-[11px]"
                                            style={{
                                              color: DARK,
                                            }}
                                          >
                                            <span
                                              className="h-3 w-3 shrink-0 rounded-sm"
                                              style={{
                                                background:
                                                  color +
                                                  "40",
                                              }}
                                            />
                                            <span className="flex-1">
                                              {cb}
                                            </span>
                                            <button
                                              onClick={() =>
                                                dispatch(
                                                  {
                                                    type: "REMOVE_CUSTOM_BULLET",
                                                    entryIndex:
                                                      entryIdx,
                                                    bulletIndex:
                                                      cbIdx,
                                                  },
                                                )
                                              }
                                              className="text-[9px] opacity-30 transition hover:opacity-80"
                                              style={{
                                                color: RED,
                                              }}
                                            >
                                              &#10005;
                                            </button>
                                          </div>
                                        ),
                                      )}
                                      {/* Add custom bullet */}
                                      <div className="flex items-center gap-1 pt-1">
                                        <input
                                          value={
                                            newBullets[
                                              entryIdx
                                            ] ?? ""
                                          }
                                          onChange={(e) =>
                                            setNewBullets(
                                              (prev) => ({
                                                ...prev,
                                                [entryIdx]:
                                                  e.target
                                                    .value,
                                              }),
                                            )
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              e.key ===
                                                "Enter" &&
                                              (
                                                newBullets[
                                                  entryIdx
                                                ] ?? ""
                                              ).trim()
                                            ) {
                                              dispatch({
                                                type: "ADD_CUSTOM_BULLET",
                                                entryIndex:
                                                  entryIdx,
                                                bullet:
                                                  newBullets[
                                                    entryIdx
                                                  ]!.trim(),
                                              });
                                              setNewBullets(
                                                (prev) => ({
                                                  ...prev,
                                                  [entryIdx]:
                                                    "",
                                                }),
                                              );
                                            }
                                          }}
                                          placeholder="Add bullet..."
                                          className="flex-1 border-b bg-transparent px-1 py-0.5 text-[10px] outline-none transition focus:border-[#E63946]"
                                          style={{
                                            borderColor:
                                              "#eee",
                                            color: DARK,
                                          }}
                                        />
                                        <button
                                          onClick={() => {
                                            if (
                                              (
                                                newBullets[
                                                  entryIdx
                                                ] ?? ""
                                              ).trim()
                                            ) {
                                              dispatch({
                                                type: "ADD_CUSTOM_BULLET",
                                                entryIndex:
                                                  entryIdx,
                                                bullet:
                                                  newBullets[
                                                    entryIdx
                                                  ]!.trim(),
                                              });
                                              setNewBullets(
                                                (prev) => ({
                                                  ...prev,
                                                  [entryIdx]:
                                                    "",
                                                }),
                                              );
                                            }
                                          }}
                                          className="text-[9px] font-bold transition hover:opacity-80"
                                          style={{
                                            color: color,
                                          }}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    {data.technologies &&
                                      data.technologies.length >
                                        0 && (
                                        <div className="ml-6 mb-1 flex flex-wrap items-center gap-1">
                                          <span
                                            className={`text-[8px] font-bold uppercase ${spaceMono.className}`}
                                            style={{
                                              color: "#999",
                                            }}
                                          >
                                            Tools:
                                          </span>
                                          {data.technologies.map(
                                            (t) => (
                                              <span
                                                key={t}
                                                className="rounded-sm px-1.5 py-0.5 text-[9px]"
                                                style={{
                                                  background:
                                                    color +
                                                    "15",
                                                  color: DARK,
                                                }}
                                              >
                                                {t}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      )}
                                  </>
                                )}
                              </div>
                            );
                          },
                        )}

                      {/* ── Projects (ordered) ── */}
                      {k === "projects" &&
                        state.projectOrder.map(
                          (entryIdx, pos) => {
                            const entry =
                              state.projects[entryIdx];
                            if (!entry) return null;
                            const data =
                              projectsData.projects[
                                entry.dataIndex
                              ];
                            if (!data) return null;
                            const ghLink = data.links.find(
                              (l) => l.icon === "github",
                            )?.href;
                            return (
                              <div key={entryIdx}>
                                <div className="flex items-center gap-1">
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() =>
                                        dispatch({
                                          type: "MOVE_PROJECT",
                                          index: entryIdx,
                                          direction: -1,
                                        })
                                      }
                                      disabled={pos === 0}
                                      className="px-0.5 text-[7px] leading-none opacity-25 transition hover:opacity-70 disabled:opacity-5"
                                    >
                                      &#9650;
                                    </button>
                                    <button
                                      onClick={() =>
                                        dispatch({
                                          type: "MOVE_PROJECT",
                                          index: entryIdx,
                                          direction: 1,
                                        })
                                      }
                                      disabled={
                                        pos ===
                                        state.projectOrder
                                          .length -
                                          1
                                      }
                                      className="px-0.5 text-[7px] leading-none opacity-25 transition hover:opacity-70 disabled:opacity-5"
                                    >
                                      &#9660;
                                    </button>
                                  </div>
                                  <div className="flex-1">
                                    <Row
                                      enabled={entry.enabled}
                                      onToggle={() =>
                                        dispatch({
                                          type: "TOGGLE_PROJECT",
                                          index: entryIdx,
                                        })
                                      }
                                      color={color}
                                    >
                                      <span className="font-bold">
                                        {data.name}
                                      </span>
                                      {data.duration && (
                                        <span
                                          className={`ml-2 text-[9px] ${spaceMono.className}`}
                                          style={{
                                            color: "#999",
                                          }}
                                        >
                                          {data.duration}
                                        </span>
                                      )}
                                    </Row>
                                  </div>
                                </div>
                                {entry.enabled && (
                                  <div className="ml-6 space-y-1 pb-1">
                                    <div
                                      className="text-[10px]"
                                      style={{
                                        color: "#666",
                                      }}
                                    >
                                      {entry.descriptionOverride ??
                                        data.description}
                                    </div>
                                    {ghLink && (
                                      <button
                                        onClick={() =>
                                          dispatch({
                                            type: "TOGGLE_PROJECT_LINK",
                                            index:
                                              entryIdx,
                                          })
                                        }
                                        className="flex items-center gap-1.5 text-[10px] transition hover:bg-black/5"
                                        style={{
                                          color:
                                            entry.showLink
                                              ? DARK
                                              : "#bbb",
                                        }}
                                      >
                                        <span
                                          className="h-3 w-3 shrink-0 rounded-sm border"
                                          style={{
                                            borderColor:
                                              color,
                                            background:
                                              entry.showLink
                                                ? color
                                                : "transparent",
                                          }}
                                        />
                                        <span
                                          className={
                                            spaceMono.className
                                          }
                                          style={{
                                            fontSize: "8px",
                                          }}
                                        >
                                          Show GitHub link
                                        </span>
                                        {entry.showLink && (
                                          <span
                                            className="ml-1 truncate text-[8px]"
                                            style={{
                                              color: "#999",
                                              maxWidth: 200,
                                            }}
                                          >
                                            {ghLink}
                                          </span>
                                        )}
                                      </button>
                                    )}
                                    <div className="flex flex-wrap gap-1">
                                      {data.tags.map(
                                        (t) => (
                                          <span
                                            key={t}
                                            className="rounded-sm px-1.5 py-0.5 text-[9px]"
                                            style={{
                                              background:
                                                color +
                                                "15",
                                              color: DARK,
                                            }}
                                          >
                                            {t}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}

                      {/* ── Certifications ── */}
                      {k === "certifications" &&
                        state.certifications.map((entry, i) => {
                          const data =
                            certificationsData.certifications[
                              entry.dataIndex
                            ];
                          if (!data) return null;
                          return (
                            <Row
                              key={i}
                              enabled={entry.enabled}
                              onToggle={() =>
                                dispatch({
                                  type: "TOGGLE_CERTIFICATION",
                                  index: i,
                                })
                              }
                              color={color}
                            >
                              <span className="font-bold">
                                {data.name}
                              </span>{" "}
                              &mdash; {data.issuer}
                            </Row>
                          );
                        })}

                      {/* ── Skills ── */}
                      {k === "skills" &&
                        state.skills.map((cat, i) => (
                          <div key={i}>
                            <Row
                              enabled={cat.enabled}
                              onToggle={() =>
                                dispatch({
                                  type: "TOGGLE_SKILL_CATEGORY",
                                  index: i,
                                })
                              }
                              color={color}
                            >
                              <span className="font-bold">
                                {cat.label}
                              </span>
                            </Row>
                            {cat.enabled && (
                              <div className="ml-6 flex flex-wrap gap-1 py-1">
                                {cat.items.map(
                                  (item, j) => (
                                    <button
                                      key={j}
                                      onClick={() =>
                                        dispatch({
                                          type: "TOGGLE_SKILL_ITEM",
                                          categoryIndex:
                                            i,
                                          itemIndex: j,
                                        })
                                      }
                                      className="rounded-sm border px-1.5 py-0.5 text-[9px] font-bold transition"
                                      style={{
                                        borderColor:
                                          item.enabled
                                            ? color
                                            : "#eee",
                                        color:
                                          item.enabled
                                            ? DARK
                                            : "#ccc",
                                      }}
                                    >
                                      {item.name}
                                    </button>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Custom Sections ── */}
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="h-0.5 flex-1"
                  style={{ background: DARK + "30" }}
                />
                <div
                  className="h-3 w-3 rotate-45"
                  style={{ background: DARK + "60" }}
                />
                <div
                  className="h-0.5 flex-1"
                  style={{ background: DARK + "30" }}
                />
              </div>
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-black uppercase tracking-wider"
                  style={{ color: DARK + "80" }}
                >
                  Custom Sections
                </h2>
                <button
                  onClick={() =>
                    dispatch({ type: "ADD_CUSTOM_SECTION" })
                  }
                  className="rounded-sm border-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition hover:bg-black/5"
                  style={{ borderColor: DARK + "30", color: DARK }}
                >
                  + Add Section
                </button>
              </div>

              {state.customSections.map((section) => (
                <div
                  key={section.id}
                  className="mt-3 border-l-4 pl-4"
                  style={{ borderColor: DARK + "40" }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      value={section.title}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_CUSTOM_SECTION",
                          id: section.id,
                          field: "title",
                          value: e.target.value,
                        })
                      }
                      placeholder="Section title..."
                      className="flex-1 border-b bg-transparent text-sm font-bold uppercase tracking-wider outline-none transition focus:border-[#E63946]"
                      style={{
                        borderColor: "#ddd",
                        color: DARK,
                      }}
                    />
                    <button
                      onClick={() =>
                        dispatch({
                          type: "REMOVE_CUSTOM_SECTION",
                          id: section.id,
                        })
                      }
                      className="text-[9px] opacity-30 transition hover:opacity-80"
                      style={{ color: RED }}
                    >
                      &#10005;
                    </button>
                  </div>
                  <textarea
                    value={section.bullets.join("\n")}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_CUSTOM_SECTION",
                        id: section.id,
                        field: "bullets",
                        value: e.target.value.split("\n"),
                      })
                    }
                    placeholder={"First bullet point\nSecond bullet point"}
                    rows={3}
                    className="mt-2 w-full resize-none border bg-transparent px-2 py-1.5 text-[11px] outline-none transition focus:border-[#E63946]"
                    style={{
                      borderColor: "#eee",
                      color: DARK,
                    }}
                  />
                </div>
              ))}

              {state.customSections.length === 0 && (
                <p
                  className="mt-2 text-[10px]"
                  style={{ color: "#999" }}
                >
                  No custom sections added yet.
                </p>
              )}
            </div>

            {/* Bottom spacer */}
            <div className="h-16" />
          </div>
        </div>

        {/* ── Right: sticky preview ── */}
        <div
          className="hidden w-[420px] shrink-0 flex-col overflow-hidden border-l-2 p-5 lg:flex"
          style={{ borderColor: DARK, background: "#f8f6f0" }}
        >
          <div className="mb-3 flex w-full items-center gap-1">
            <div
              className="h-1.5 flex-1"
              style={{ background: RED }}
            />
            <div
              className="h-1.5 flex-1"
              style={{ background: BLUE }}
            />
            <div
              className="h-1.5 flex-1"
              style={{ background: YELLOW }}
            />
            <div
              className="h-1.5 flex-1"
              style={{ background: DARK }}
            />
            <button
              onClick={() => setFullscreenPreview(true)}
              className="ml-2 shrink-0 rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition hover:bg-black/5"
              style={{ borderColor: "#ddd", color: "#999" }}
              title="Fullscreen preview"
            >
              &#x26F6;
            </button>
          </div>
          <div
            className="min-h-0 flex-1"
            style={{
              boxShadow: `6px 6px 0px ${DARK}`,
              border: `2px solid ${DARK}`,
            }}
          >
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              {memoizedDoc}
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Row component ── */

function Row({
  enabled,
  onToggle,
  color,
  children,
}: {
  enabled: boolean;
  onToggle: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded py-1.5 pl-1 pr-2 text-left text-xs transition hover:bg-black/5"
      style={{ opacity: enabled ? 1 : 0.4 }}
    >
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full border-2 text-center text-[7px] font-bold leading-[10px] text-white"
        style={{
          borderColor: color,
          background: enabled ? color : "transparent",
        }}
      >
        {enabled ? "\u2713" : ""}
      </span>
      <span className="flex flex-1 flex-wrap items-center gap-1">
        {children}
      </span>
    </button>
  );
}
