"use client";

import { useEffect, useRef } from "react";

import { BLOCK_LABELS, BLOCK_MENU_TYPES } from "./constants";
import type { BlockType } from "./types";

type AddBlockMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: BlockType) => void;
};

export function AddBlockMenu({ isOpen, onClose, onSelect }: AddBlockMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", onDocumentMouseDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("mousedown", onDocumentMouseDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Add block"
      className="absolute bottom-[calc(100%+0.5rem)] left-0 z-30 w-[198px] space-y-1 rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(248,247,244,0.98)] p-2 shadow-[0_16px_30px_rgba(36,40,51,0.18)] backdrop-blur-sm"
    >
      <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--board-text-soft)]">
        Add block
      </p>

      {BLOCK_MENU_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          role="menuitem"
          onClick={() => onSelect(type)}
          className="flex min-h-[var(--board-action-menu-item-height)] w-full items-center rounded-[11px] border border-transparent px-2.5 text-left text-[11px] font-medium leading-none tracking-[0.03em] text-[color:var(--board-text)] transition-[border-color,background-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
        >
          {BLOCK_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
