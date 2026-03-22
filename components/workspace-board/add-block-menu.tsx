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
      className="absolute bottom-14 left-0 z-30 w-[186px] space-y-1.5 rounded-[14px] border border-[rgba(46,50,59,0.18)] bg-[rgba(247,248,250,0.98)] p-2 [box-shadow:0_12px_28px_rgba(36,40,51,0.2)] backdrop-blur-[2px]"
    >
      {BLOCK_MENU_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          role="menuitem"
          onClick={() => onSelect(type)}
          className="flex h-9 w-full items-center rounded-[10px] border border-transparent px-2.5 text-left text-[12px] font-medium tracking-[0.04em] text-[#4d5462] transition-colors hover:border-[rgba(77,84,98,0.15)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b7588]/45"
        >
          {BLOCK_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
