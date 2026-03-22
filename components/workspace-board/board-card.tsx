"use client";

import { useState, type DragEvent } from "react";

import { AddBlockMenu } from "./add-block-menu";
import { BLOCK_LABELS } from "./constants";
import { BlockRenderer } from "./block-renderer";
import type { Block, BlockType, Card } from "./types";
import { cardPreview } from "./utils";

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
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
};

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
  onMoveBlock,
}: BoardCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardActionClass =
    "h-6 rounded-full border border-[rgba(61,66,75,0.2)] bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-[#595f6a] transition-colors hover:bg-[rgba(244,245,247,0.9)] whitespace-nowrap";
  const blockActionClass =
    "h-6 rounded-[6px] border border-[rgba(60,65,76,0.18)] bg-white px-1.5 py-0.5 text-[10px] text-[#59606e] whitespace-nowrap";

  return (
    <div
      role="group"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`rounded-[14px] border p-3 text-[#3f454f] [box-shadow:0_7px_16px_rgba(58,53,55,0.1)] transition-[border-color,box-shadow,transform] ${
        isSelected
          ? "border-[#526073] bg-[rgba(255,255,255,0.96)] ring-1 ring-[#556176]/30"
          : "border-[rgba(55,58,66,0.2)] bg-[rgba(255,255,255,0.9)] hover:border-[rgba(55,58,66,0.34)]"
      } ${isDragging ? "opacity-55" : "opacity-100"}`}
    >
      <div className="mb-2 flex flex-wrap items-start gap-2">
        <span className="rounded-full border border-[rgba(61,66,75,0.2)] bg-[rgba(244,245,247,0.88)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[#5b616e]">
          Card
        </span>

        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            draggable
            aria-label="Drag card"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={(event) => event.stopPropagation()}
            className={cardActionClass}
          >
            Drag
          </button>
          <button
            type="button"
            aria-label={card.collapsed ? "Expand card" : "Collapse card"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapsed();
            }}
            className={cardActionClass}
          >
            {card.collapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            aria-label="Duplicate card"
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
            className={cardActionClass}
          >
            Duplicate
          </button>
          <button
            type="button"
            aria-label="Delete card"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className={`${cardActionClass} border-[rgba(107,68,68,0.2)] text-[#8a5555] hover:bg-[#fff3f3]`}
          >
            Delete
          </button>
        </div>
      </div>

      {card.collapsed ? (
        <p className="rounded-[10px] border border-[rgba(56,61,72,0.14)] bg-[rgba(247,248,250,0.95)] px-3 py-2 text-[12px] tracking-[0.03em] text-[#596070]">
          {cardPreview(card)}
        </p>
      ) : (
        <div className="space-y-2.5">
          {card.blocks.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[rgba(0,0,0,0.22)] bg-white/50 px-3 py-4 text-center text-[12px] tracking-[0.07em] text-[#6d717b]">
              No blocks yet. Add one below.
            </div>
          ) : (
            card.blocks.map((block, index) => (
              <section
                key={block.id}
                className="rounded-[10px] border border-[rgba(56,61,72,0.14)] bg-[rgba(247,248,250,0.95)] p-2.5"
              >
                <div className="mb-2 flex flex-wrap items-start gap-1.5">
                  <p className="mr-auto text-[10px] font-semibold tracking-[0.08em] text-[#667082] uppercase">
                    {BLOCK_LABELS[block.type]}
                  </p>

                  <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onMoveBlock(block.id, "up");
                      }}
                      className={`${blockActionClass} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={index === card.blocks.length - 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        onMoveBlock(block.id, "down");
                      }}
                      className={`${blockActionClass} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      Down
                    </button>
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
                      className={`${blockActionClass} border-[rgba(126,73,73,0.2)] text-[#8a5555]`}
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
            ))
          )}
        </div>
      )}

      <div className="relative mt-3">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((current) => !current);
          }}
          className="h-9 rounded-[10px] border border-[rgba(61,66,75,0.2)] bg-white px-3 text-[12px] font-medium tracking-[0.04em] text-[#4f5664] transition-colors hover:bg-[rgba(245,246,248,0.96)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f6a7a]/40"
        >
          + Add block
        </button>

        <AddBlockMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onSelect={(type) => {
            onAddBlock(type);
            setIsMenuOpen(false);
          }}
        />
      </div>
    </div>
  );
}
