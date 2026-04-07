"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";

import { AddBlockMenu } from "./add-block-menu";
import { BLOCK_LABELS } from "./constants";
import { BlockRenderer } from "./block-renderer";
import type { Block, BlockType, Card } from "./types";
import { cardPreview } from "./utils";

const BLOCK_MIME = "application/x-noteslite-block";

type BoardCardProps = {
  card: Card;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleCollapsed: () => void;
  onAddBlock: (type: BlockType) => void;
  onUpdateBlock: (blockId: string, updater: (current: Block) => Block) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onReorderBlock: (blockId: string, targetIndex: number) => void;
};

type DragBlockPayload = {
  cardId: string;
  blockId: string;
};

type BlockDropGuideProps = {
  isActive: boolean;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
};

const blockActionClass =
  "inline-flex h-[var(--board-action-chip-height)] items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.82)] px-[var(--board-action-chip-px)] text-[10px] font-semibold uppercase leading-none tracking-[var(--board-action-chip-track)] text-[color:var(--board-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] whitespace-nowrap hover:border-[color:var(--board-border-strong)] hover:bg-[rgba(255,255,255,0.97)] hover:text-[color:var(--board-text-strong)] active:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const compactIconButtonClass =
  "inline-flex h-[var(--board-action-icon-size)] w-[var(--board-action-icon-size)] items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.9)] text-[color:var(--board-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-[rgba(255,255,255,0.98)] hover:text-[color:var(--board-text-strong)] active:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const blockHandleClass =
  "inline-flex h-[var(--board-block-handle-size)] w-[var(--board-block-handle-size)] items-center justify-center gap-[var(--board-handle-dot-gap)] rounded-full border border-[color:var(--board-border)] bg-[color:var(--board-handle-surface)] text-[color:var(--board-handle-icon)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-[color:var(--board-handle-surface-pressed)] hover:text-[color:var(--board-text-strong)] active:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const actionMenuItemClass =
  "flex min-h-[var(--board-action-menu-item-height)] w-full items-center rounded-[11px] border border-transparent px-2.5 text-left text-[11px] font-medium leading-none tracking-[0.02em] text-[color:var(--board-text)] transition-[border-color,background-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const statusPillClass =
  "inline-flex h-[var(--board-status-pill-height)] items-center rounded-full border px-[var(--board-status-pill-px)] text-[9px] font-semibold uppercase leading-none tracking-[var(--board-status-pill-track)]";

function parseBlockPayload(raw: string): DragBlockPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DragBlockPayload>;
    if (!parsed.cardId || !parsed.blockId) {
      return null;
    }

    return { cardId: parsed.cardId, blockId: parsed.blockId };
  } catch {
    return null;
  }
}

function BlockDropGuide({ isActive, onDragOver, onDrop }: BlockDropGuideProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-hidden="true"
      className="flex h-4 items-center px-1"
    >
      <div
        className={`h-[3px] w-full rounded-full border border-dashed transition-[border-color,background-color,box-shadow,transform] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] ${
          isActive
            ? "border-[color:var(--board-drag-guide-active)] bg-[color:var(--board-drag-guide-active)] shadow-[0_0_0_1px_var(--board-accent-glow)]"
            : "border-[color:var(--board-drag-guide-passive)] bg-[rgba(255,255,255,0.36)]"
        }`}
      />
    </div>
  );
}

export function BoardCard({
  card,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnd,
  onDelete,
  onDuplicate,
  onToggleCollapsed,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onReorderBlock,
}: BoardCardProps) {
  const [isAddBlockMenuOpen, setIsAddBlockMenuOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [activeBlockDropIndex, setActiveBlockDropIndex] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActionMenuOpen) {
      return;
    }

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setIsActionMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onDocumentMouseDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("mousedown", onDocumentMouseDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isActionMenuOpen]);

  const showBlockDropGuides = draggingBlockId !== null;

  const onBlockDragStart = (event: DragEvent<HTMLButtonElement>, blockId: string) => {
    event.stopPropagation();
    setDraggingBlockId(blockId);
    setActiveBlockDropIndex(null);
    setIsAddBlockMenuOpen(false);
    setIsActionMenuOpen(false);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(BLOCK_MIME, JSON.stringify({ cardId: card.id, blockId } satisfies DragBlockPayload));
  };

  const onBlockDragEnd = () => {
    setDraggingBlockId(null);
    setActiveBlockDropIndex(null);
  };

  const allowBlockDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    if (!draggingBlockId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setActiveBlockDropIndex(targetIndex);
  };

  const onBlockDropAtIndex = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveBlockDropIndex(null);

    const payload = parseBlockPayload(event.dataTransfer.getData(BLOCK_MIME));
    if (!payload || payload.cardId !== card.id) {
      return;
    }

    onReorderBlock(payload.blockId, targetIndex);
    setDraggingBlockId(null);
  };

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`Card ${card.collapsed ? "collapsed" : "expanded"}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`rounded-[20px] border px-3.5 py-3.5 text-[color:var(--board-text)] shadow-[var(--board-shadow-card)] transition-[border-color,background-color,box-shadow,transform,opacity] duration-[var(--board-motion-base)] ease-[var(--board-ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)] ${
        isSelected
          ? "border-[color:var(--board-border-accent)] bg-[var(--board-surface)] shadow-[var(--board-shadow-lift)]"
          : "border-[color:var(--board-border)] bg-[rgba(255,255,255,0.88)] hover:-translate-y-0.5 hover:border-[color:var(--board-border-strong)] hover:shadow-[var(--board-shadow-lift)]"
      } ${isDragging ? "scale-[0.985] opacity-55" : "opacity-100"}`}
    >
      <div className="mb-3 flex flex-wrap items-start gap-3 border-b border-[color:var(--board-border)] pb-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`${statusPillClass} border-[color:var(--board-border)] bg-[var(--board-warm-soft)] text-[color:var(--board-warm)]`}
            >
              Card
            </span>
            {isSelected ? (
              <span
                className={`${statusPillClass} border-[color:var(--board-border-accent)] bg-[var(--board-accent-soft)] text-[color:var(--board-accent-strong)]`}
              >
                Selected
              </span>
            ) : null}
            {card.collapsed ? (
              <span
                className={`${statusPillClass} border-[color:var(--board-border)] bg-[rgba(255,255,255,0.66)] font-medium text-[color:var(--board-text-soft)]`}
              >
                Preview
              </span>
            ) : null}
          </div>

          <p className="text-[12px] leading-5 text-[color:var(--board-text-soft)]">
            {card.collapsed
              ? "Collapsed for quick scanning."
              : `${card.blocks.length} ${card.blocks.length === 1 ? "block" : "blocks"} ready to edit.`}
          </p>
        </div>

        <div
          ref={actionMenuRef}
          className="relative ml-auto flex max-w-full flex-wrap items-center justify-end gap-1"
        >
          <button
            type="button"
            draggable
            aria-label="Drag card"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            className={compactIconButtonClass}
          >
            <span className="grid grid-cols-2 gap-[2.5px]">
              <span className="h-[3px] w-[3px] rounded-full bg-current" />
              <span className="h-[3px] w-[3px] rounded-full bg-current" />
              <span className="h-[3px] w-[3px] rounded-full bg-current" />
              <span className="h-[3px] w-[3px] rounded-full bg-current" />
            </span>
          </button>
          <button
            type="button"
            aria-label="Card options"
            aria-haspopup="menu"
            aria-expanded={isActionMenuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setIsActionMenuOpen((current) => !current);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            className={compactIconButtonClass}
          >
            <span className="flex flex-col gap-[2.5px]">
              <span className="h-[1.5px] w-[11px] rounded-full bg-current" />
              <span className="h-[1.5px] w-[11px] rounded-full bg-current" />
              <span className="h-[1.5px] w-[11px] rounded-full bg-current" />
            </span>
          </button>

          {isActionMenuOpen ? (
            <div
              role="menu"
              aria-label="Card actions"
              onClick={(event) => event.stopPropagation()}
              className="absolute right-0 top-[calc(100%+0.4rem)] z-20 w-[168px] space-y-1 rounded-[15px] border border-[color:var(--board-border)] bg-[rgba(246,247,250,0.98)] p-1.5 shadow-[0_16px_30px_rgba(42,42,47,0.18)] backdrop-blur-sm"
            >
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleCollapsed();
                  setIsActionMenuOpen(false);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className={actionMenuItemClass}
              >
                {card.collapsed ? "Expand" : "Collapse"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicate();
                  setIsActionMenuOpen(false);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className={actionMenuItemClass}
              >
                Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                  setIsActionMenuOpen(false);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className={`${actionMenuItemClass} text-[color:var(--board-danger)] hover:border-[color:var(--board-danger)] hover:bg-[rgba(255,242,242,0.92)] hover:text-[color:var(--board-danger)]`}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {card.collapsed ? (
        <div className="rounded-[16px] border border-[color:var(--board-border)] bg-[var(--board-surface-strong)] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--board-text-soft)]">
            Preview
          </p>
          <p className="mt-2 overflow-hidden text-[13px] leading-6 text-[color:var(--board-text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
            {cardPreview(card)}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {card.blocks.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[color:var(--board-border-strong)] bg-[rgba(255,255,255,0.6)] px-4 py-5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--board-text-soft)]">
                No blocks yet
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[color:var(--board-text-muted)]">
                Start composing this card with a title, note, checklist, or another block.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {showBlockDropGuides ? (
                <BlockDropGuide
                  isActive={activeBlockDropIndex === 0}
                  onDragOver={(event) => allowBlockDrop(event, 0)}
                  onDrop={(event) => onBlockDropAtIndex(event, 0)}
                />
              ) : null}

              {card.blocks.map((block, index) => (
                <div key={block.id} className="space-y-3">
                  {block.type === "line" ? (
                    <div className="px-0.5 py-2" aria-label="Divider block">
                      <BlockRenderer
                        block={block}
                        onChange={(nextBlock) =>
                          onUpdateBlock(block.id, () => nextBlock)
                        }
                      />
                    </div>
                  ) : (
                    <section
                      className={`rounded-[18px] border border-[color:var(--board-border)] bg-[var(--board-surface-strong)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[opacity,box-shadow,transform,border-color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] ${
                        draggingBlockId === block.id
                          ? "scale-[0.99] border-[color:var(--board-border-accent)] opacity-60 shadow-[0_18px_28px_rgba(47,43,40,0.14)]"
                          : ""
                      }`}
                    >
                      <div className="mb-3 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <div className="mr-auto min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--board-text-soft)]">
                              {BLOCK_LABELS[block.type]}
                            </p>
                            <p className="mt-1 text-[12px] leading-5 text-[color:var(--board-text-muted)]">
                              Block {index + 1}
                            </p>
                          </div>

                          <button
                            type="button"
                            draggable
                            aria-label="Drag block"
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            onDragStart={(event) => onBlockDragStart(event, block.id)}
                            onDragEnd={onBlockDragEnd}
                            className={`${blockHandleClass} self-start`}
                          >
                            <span className="grid grid-cols-2 gap-[var(--board-handle-dot-gap)]">
                              <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                              <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                              <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                              <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                              <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                              <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                            </span>
                          </button>
                        </div>

                        <div className="flex max-w-full flex-wrap items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDuplicateBlock(block.id);
                            }}
                            className={blockActionClass}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteBlock(block.id);
                            }}
                            className={`${blockActionClass} border-[color:var(--board-danger)] bg-[var(--board-danger-soft)] text-[color:var(--board-danger)] hover:border-[color:var(--board-danger)] hover:bg-[rgba(255,242,242,0.98)] hover:text-[color:var(--board-danger)]`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <BlockRenderer
                        block={block}
                        onChange={(nextBlock) =>
                          onUpdateBlock(block.id, () => nextBlock)
                        }
                      />
                    </section>
                  )}

                  {showBlockDropGuides ? (
                    <BlockDropGuide
                      isActive={activeBlockDropIndex === index + 1}
                      onDragOver={(event) => allowBlockDrop(event, index + 1)}
                      onDrop={(event) => onBlockDropAtIndex(event, index + 1)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative mt-4 flex flex-wrap items-center">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isAddBlockMenuOpen}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setIsAddBlockMenuOpen((current) => !current);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className="inline-flex min-h-[var(--board-action-chip-height-roomy)] items-center justify-center rounded-full border border-dashed border-[color:var(--board-border-strong)] bg-[rgba(255,255,255,0.82)] px-[var(--board-action-chip-px-wide)] text-[10px] font-semibold uppercase leading-none tracking-[var(--board-action-chip-track)] text-[color:var(--board-accent-strong)] transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-accent)] hover:bg-white hover:shadow-[0_10px_20px_rgba(76,84,101,0.1)] active:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
        >
          + Add block
        </button>

        <AddBlockMenu
          isOpen={isAddBlockMenuOpen}
          onClose={() => setIsAddBlockMenuOpen(false)}
          onSelect={(type) => {
            onAddBlock(type);
            setIsAddBlockMenuOpen(false);
          }}
        />
      </div>
    </div>
  );
}
