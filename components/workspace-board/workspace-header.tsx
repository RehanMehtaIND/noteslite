"use client";

type WorkspaceHeaderProps = {
  title: string;
  draftTitle: string;
  isEditingTitle: boolean;
  cardsCount: number;
  columnsCount: number;
  isSyncing: boolean;
  onStartEditingTitle: () => void;
  onCancelEditingTitle: () => void;
  onDraftTitleChange: (value: string) => void;
  onCommitTitle: () => void;
};

export function WorkspaceHeader({
  title,
  draftTitle,
  isEditingTitle,
  cardsCount,
  columnsCount,
  isSyncing,
  onStartEditingTitle,
  onCancelEditingTitle,
  onDraftTitleChange,
  onCommitTitle,
}: WorkspaceHeaderProps) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {isEditingTitle ? (
        <input
          autoFocus
          value={draftTitle}
          aria-label="Workspace title"
          onChange={(event) => onDraftTitleChange(event.target.value)}
          onBlur={onCommitTitle}
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
          className="h-11 min-w-[240px] rounded-[10px] border border-[rgba(0,0,0,0.22)] bg-white/70 px-3 text-[26px] tracking-[0.06em] text-[#42464f] outline-none [font-family:'Cinzel','Times_New_Roman',serif] focus-visible:ring-2 focus-visible:ring-[#5f6978]/45"
        />
      ) : (
        <h1
          onDoubleClick={onStartEditingTitle}
          className="cursor-text text-[28px] tracking-[0.07em] text-[#42464f] [font-family:'Cinzel','Times_New_Roman',serif]"
        >
          {title}
        </h1>
      )}

      <div className="flex items-center gap-3">
        <p className="text-[12px] tracking-[0.08em] text-[#5d6069]">
          {cardsCount} cards · {columnsCount} columns
        </p>
        <span className="text-[11px] tracking-[0.08em] text-[#5d6069]">
          {isSyncing ? "Syncing..." : "Synced"}
        </span>
      </div>
    </header>
  );
}
