"use client";

import type { DragEvent } from "react";

import { SIDEBAR_SECTIONS, type SidebarSection } from "./constants";
import type { PaletteItem } from "./types";

type BoardSidebarProps = {
  onBack: () => void;
  onPaletteDragStart: (event: DragEvent<HTMLButtonElement>, item: PaletteItem) => void;
  onPaletteDragEnd: () => void;
  onPaletteClick: (item: PaletteItem) => void;
  sections?: SidebarSection[];
};

const SIDEBAR_PANEL_HEIGHT = {
  height: "clamp(520px, calc(100vh - 2.5rem), 760px)",
};

export function BoardSidebar({
  onBack,
  onPaletteDragStart,
  onPaletteDragEnd,
  onPaletteClick,
  sections = SIDEBAR_SECTIONS,
}: BoardSidebarProps) {
  return (
    <aside
      className="flex min-w-[232px] max-w-[248px] flex-col rounded-[22px] border border-[rgba(49,50,58,0.2)] bg-[linear-gradient(180deg,#ead6cf_0%,#e4d3d5_100%)] p-3 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.4),0_10px_20px_rgba(75,63,62,0.14)]"
      style={SIDEBAR_PANEL_HEIGHT}
    >
      <button
        type="button"
        onClick={onBack}
        className="h-11 w-full rounded-[14px] border border-white/75 bg-[radial-gradient(circle_at_22%_20%,#fff_0%,#efefef_64%,#dfdfe1_100%)] px-3 text-left text-[14px] font-semibold tracking-[0.06em] text-[#b93030] [font-family:'Cinzel','Times_New_Roman',serif] transition-colors hover:bg-[radial-gradient(circle_at_22%_20%,#fff_0%,#f4f4f4_64%,#e6e6e8_100%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#687186]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#e5d5d1]"
      >
        Back
      </button>

      <div className="mt-3 flex-1 space-y-6 overflow-y-auto rounded-[16px] border border-white/65 bg-[rgba(255,255,255,0.35)] px-3 py-4 pb-24">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3" aria-label={`${section.title} tools`}>
            <h2 className="px-1 text-center text-[12px] font-semibold tracking-[0.16em] text-[#5a5e68]">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  onDragStart={(event) => onPaletteDragStart(event, item.id)}
                  onDragEnd={onPaletteDragEnd}
                  onClick={() => onPaletteClick(item.id)}
                  className="flex h-12 w-full items-center justify-center rounded-[14px] border border-[rgba(63,66,75,0.18)] bg-[rgba(250,250,251,0.92)] px-4 text-[13px] font-medium leading-none tracking-[0.04em] text-[#4f545f] whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-[background-color,border-color,transform,box-shadow] duration-150 hover:border-[rgba(63,66,75,0.3)] hover:bg-white active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#687186]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#efe2df]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
