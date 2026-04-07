"use client";

import { useEffect, useState, type DragEvent } from "react";

import { SIDEBAR_SECTIONS, type SidebarSection } from "./constants";
import type { PaletteItem } from "./types";

const sectionCountChipClass =
  "inline-flex h-[22px] min-w-[28px] shrink-0 items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.76)] px-2 text-[8px] font-medium uppercase leading-none tracking-[0.16em] text-[color:var(--board-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]";
const sectionToggleButtonClass =
  "inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.78)] text-[color:var(--board-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,background-color,box-shadow,color,transform] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-white hover:text-[color:var(--board-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const paletteTileClass =
  "group flex flex-col items-center gap-2 rounded-[18px] px-2 py-2 text-center transition-[transform] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:outline-none";
const paletteIconFrameClass =
  "flex h-[58px] w-[58px] items-center justify-center rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.82)] text-[color:var(--board-text-strong)] shadow-[0_10px_18px_rgba(72,63,58,0.08),inset_0_1px_0_rgba(255,255,255,0.76)] transition-[border-color,background-color,box-shadow,color,transform] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] group-hover:border-[color:var(--board-border-accent)] group-hover:bg-white group-hover:shadow-[0_14px_22px_rgba(72,63,58,0.12)] group-focus-visible:border-[color:var(--board-border-accent)] group-focus-visible:bg-white group-focus-visible:text-[color:var(--board-accent-strong)] group-focus-visible:ring-2 group-focus-visible:ring-[color:var(--board-focus-ring)]";

function SidebarIcon({ item }: { item: PaletteItem }) {
  switch (item) {
    case "column":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="block">
          <rect x="5" y="6" width="4" height="16" rx="1.5" fill="currentColor" opacity="0.92" />
          <rect x="12" y="6" width="4" height="16" rx="1.5" fill="currentColor" opacity="0.75" />
          <rect x="19" y="6" width="4" height="16" rx="1.5" fill="currentColor" opacity="0.58" />
        </svg>
      );
    case "line":
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="block">
          <path
            d="M7 23L23 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M17 7H23V13"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "title":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="block">
          <path d="M7 8H21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M14 8V21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "heading":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="block">
          <path d="M8 7V21" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M20 7V21" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M8 14H20" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case "note":
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="block">
          <path d="M7.5 9H22.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M7.5 15H22.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M7.5 21H19" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case "todo":
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="block">
          <path d="M8 10.5L10.8 13.2L15 9" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 11H23" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M8 18.5L10.8 21.2L15 17" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 19H23" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case "link":
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="block">
          <path
            d="M12.8 18.4L10.7 20.5C8.9 22.3 6 22.3 4.2 20.5C2.4 18.7 2.4 15.8 4.2 14L8.5 9.7C10.3 7.9 13.2 7.9 15 9.7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.2 11.6L19.3 9.5C21.1 7.7 24 7.7 25.8 9.5C27.6 11.3 27.6 14.2 25.8 16L21.5 20.3C19.7 22.1 16.8 22.1 15 20.3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M11.5 18.5L18.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "comment":
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="block">
          <path
            d="M7 9.5C7 8.1 8.1 7 9.5 7H20.5C21.9 7 23 8.1 23 9.5V17.5C23 18.9 21.9 20 20.5 20H13L9 23V20H9.5C8.1 20 7 18.9 7 17.5V9.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "upload":
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="block">
          <path d="M10 6.5H17L22 11.5V22.5H10V6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M17 6.5V11.5H22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M15 19.5V12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12.5 15L15 12.5L17.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "color":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="block">
          <circle cx="9" cy="10" r="4" fill="currentColor" opacity="0.92" />
          <circle cx="18.5" cy="9" r="3.5" fill="currentColor" opacity="0.68" />
          <circle cx="11" cy="18.5" r="3.5" fill="currentColor" opacity="0.68" />
          <circle cx="19" cy="18.5" r="4" fill="currentColor" opacity="0.46" />
        </svg>
      );
    case "map":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="block">
          <path
            d="M14 23C17.7 18.5 19.5 15.7 19.5 12.8C19.5 9.6 17 7 14 7C11 7 8.5 9.6 8.5 12.8C8.5 15.7 10.3 18.5 14 23Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="12.5" r="2.3" fill="currentColor" />
        </svg>
      );
    case "table":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="block">
          <rect x="6" y="7" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M6 12H22" stroke="currentColor" strokeWidth="2" />
          <path d="M6 16.5H22" stroke="currentColor" strokeWidth="2" />
          <path d="M11.5 7V21" stroke="currentColor" strokeWidth="2" />
          <path d="M16.5 7V21" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    default:
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="block">
          <rect x="7" y="7" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
}

type BoardSidebarProps = {
  onBack: () => void;
  onPaletteDragStart: (event: DragEvent<HTMLButtonElement>, item: PaletteItem) => void;
  onPaletteDragEnd: () => void;
  onPaletteClick: (item: PaletteItem) => void;
  draggingItem?: PaletteItem | null;
  sections?: SidebarSection[];
};

export function BoardSidebar({
  onBack,
  onPaletteDragStart,
  onPaletteDragEnd,
  onPaletteClick,
  draggingItem = null,
  sections = SIDEBAR_SECTIONS,
}: BoardSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.title, true])),
  );

  useEffect(() => {
    setOpenSections((current) => {
      const nextEntries = sections.map((section) => [section.title, current[section.title] ?? true] as const);
      const nextState = Object.fromEntries(nextEntries) as Record<string, boolean>;
      const sameLength = Object.keys(current).length === nextEntries.length;
      const hasChanges = nextEntries.some(([title, isOpen]) => current[title] !== isOpen);
      return sameLength && !hasChanges ? current : nextState;
    });
  }, [sections]);

  return (
    <aside className="h-full min-h-0 min-w-[164px] max-w-[176px] self-stretch">
      <div className="flex h-full flex-col rounded-[28px] border border-[color:var(--board-shell-border)] bg-[linear-gradient(180deg,rgba(240,237,233,0.92)_0%,rgba(228,230,235,0.95)_100%)] p-2.5 shadow-[var(--board-shadow-panel)]">
        <div className="rounded-[22px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.42)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[42px] w-full items-center justify-center rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.84)] px-3 text-center text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-[color:var(--board-warm)] shadow-[0_8px_16px_rgba(99,82,67,0.1)] transition-[border-color,box-shadow,background-color,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-white hover:text-[color:var(--board-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
          >
            Dashboard
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-[22px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.3)] p-2.5">
          <div className="workspace-board-panel-scroll h-full space-y-3 overflow-y-auto pb-2 pr-1 touch-pan-y">
            {sections.map((section) => (
              (() => {
                const isOpen = openSections[section.title] ?? true;
                const sectionId = `board-sidebar-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`;

                return (
                  <section
                    key={section.title}
                    aria-label={`${section.title} tools`}
                    className={`rounded-[18px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.48)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[padding,box-shadow,background-color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] ${
                      isOpen ? "p-2.5" : "px-2.5 py-2"
                    }`}
                  >
                    <div className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 ${isOpen ? "mb-2.5" : ""}`}>
                      <h2 className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--board-text-soft)]">
                        {section.title}
                      </h2>
                      <span className={sectionCountChipClass} aria-label={`${section.items.length} items`}>
                        {section.items.length}
                      </span>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={sectionId}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${section.title} section`}
                        onClick={() =>
                          setOpenSections((current) => ({
                            ...current,
                            [section.title]: !isOpen,
                          }))
                        }
                        className={sectionToggleButtonClass}
                      >
                        <span
                          aria-hidden="true"
                          className={`transition-transform duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] ${
                            isOpen ? "rotate-0" : "-rotate-90"
                          }`}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="block">
                            <path
                              d="M3 4.5L6 7.5L9 4.5"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>
                    </div>

                    {isOpen ? (
                      <div id={sectionId} className="grid grid-cols-1 gap-2.5">
                        {section.items.map((item) => {
                          const isDragging = draggingItem === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              draggable
                              onDragStart={(event) => onPaletteDragStart(event, item.id)}
                              onDragEnd={onPaletteDragEnd}
                              onClick={() => onPaletteClick(item.id)}
                              className={`${paletteTileClass} focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)] ${
                                isDragging
                                  ? "-translate-y-px"
                                  : ""
                              }`}
                            >
                              <span
                                className={`${paletteIconFrameClass} ${
                                  isDragging
                                    ? "border-[color:var(--board-border-accent)] bg-[var(--board-accent-soft)] shadow-[0_14px_22px_rgba(66,88,112,0.18)]"
                                    : ""
                                }`}
                              >
                                <SidebarIcon item={item.id} />
                              </span>
                              <span className="min-w-0 text-[11px] font-medium tracking-[0.02em] text-[color:var(--board-text-muted)]">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })()
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
