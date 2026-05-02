"use client";

import { useEffect, useRef } from "react";

type WorkspaceHeaderProps = {
  title: string;
  draftTitle: string;
  isEditingTitle: boolean;
  viewLabel: string;
  cardsCount: number;
  columnsCount: number;
  isSyncing: boolean;
  onStartEditingTitle: () => void;
  onCancelEditingTitle: () => void;
  onDraftTitleChange: (value: string) => void;
  onCommitTitle: () => void;
};

const metaChipClass =
  "inline-flex h-[var(--board-header-chip-height)] items-center gap-1.5 rounded-full border border-[color:var(--board-border)] bg-[var(--board-surface)] px-[var(--board-header-chip-px)] text-[9px] font-semibold uppercase leading-none tracking-[var(--board-header-chip-track)] text-[color:var(--board-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]";
const headerPillClass =
  "inline-flex h-[var(--board-header-chip-height)] items-center rounded-full border px-[var(--board-header-chip-px)] text-[9px] font-semibold uppercase leading-none tracking-[var(--board-header-chip-track)]";

export function WorkspaceHeader({
  title,
  draftTitle,
  isEditingTitle,
  viewLabel,
  cardsCount,
  columnsCount,
  isSyncing,
  onStartEditingTitle,
  onCancelEditingTitle,
  onDraftTitleChange,
  onCommitTitle,
}: WorkspaceHeaderProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isEditingTitle) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!editorRef.current) {
        return;
      }

      if (!editorRef.current.contains(event.target as Node)) {
        onCommitTitle();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isEditingTitle, onCommitTitle]);

  return (
    <header className="relative mb-3 shrink-0 rounded-[20px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.34)] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.56)] backdrop-blur-sm">
      <div className="flex min-h-[var(--board-header-row-min-height)] flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={`${headerPillClass} border-[color:var(--board-border)] bg-[var(--board-warm-soft)] text-[color:var(--board-warm)]`}
          >
            Workspace
          </span>
          <span
            className={`${headerPillClass} border-[color:var(--board-border)] bg-[rgba(255,255,255,0.56)] font-medium text-[color:var(--board-text-soft)]`}
          >
            {viewLabel}
          </span>
          <button
            type="button"
            onClick={onStartEditingTitle}
            aria-label={`Rename workspace ${title}`}
            className="inline-flex h-[var(--board-header-chip-height)] items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.72)] px-[var(--board-header-chip-px)] text-[9px] font-semibold uppercase leading-none tracking-[var(--board-header-chip-track)] text-[color:var(--board-accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
          >
            Rename
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <span className={metaChipClass}>{cardsCount} cards</span>
          <span className={metaChipClass}>{columnsCount} columns</span>
          <span
            className={`${metaChipClass} ${
              isSyncing
                ? "border-[color:var(--board-border-accent)] text-[color:var(--board-accent-strong)]"
                : ""
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                isSyncing ? "bg-[color:var(--board-accent)]" : "bg-[color:var(--board-warm)]"
              }`}
            />
            {isSyncing ? "Unsynced" : "Synced"}
          </span>
        </div>
      </div>

      {isEditingTitle ? (
        <div
          ref={editorRef}
          className="absolute left-3.5 top-[calc(100%+0.5rem)] z-20 w-[min(360px,calc(100%-1.75rem))] rounded-[18px] border border-[color:var(--board-border-strong)] bg-[rgba(250,250,252,0.98)] p-3 shadow-[0_18px_34px_rgba(47,43,40,0.16)] backdrop-blur-xl"
          onBlurCapture={(event) => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              onCommitTitle();
            }
          }}
        >
          <div className="flex items-start gap-2">
            <input
              autoFocus
              value={draftTitle}
              aria-label="Workspace title"
              onChange={(event) => onDraftTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCommitTitle();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelEditingTitle();
                }
              }}
              className="h-10 min-w-0 flex-1 rounded-[14px] border border-[color:var(--board-border-strong)] bg-[rgba(255,255,255,0.92)] px-3 text-[18px] tracking-[0.04em] text-[color:var(--board-text-strong)] outline-none [font-family:'Cinzel','Times_New_Roman',serif] transition-[border-color,box-shadow,background-color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
            />
            <button
              type="button"
              onClick={onCommitTitle}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.84)] px-3 text-[9px] font-semibold uppercase tracking-[var(--board-header-chip-track)] text-[color:var(--board-accent-strong)] transition-[border-color,background-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelEditingTitle}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.7)] px-3 text-[9px] font-semibold uppercase tracking-[var(--board-header-chip-track)] text-[color:var(--board-text-soft)] transition-[border-color,background-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
