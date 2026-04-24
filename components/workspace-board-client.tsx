"use client";

import { useMemo, useState, useEffect, useCallback, useRef, type CSSProperties, type DragEvent } from "react";
import { useRouter } from "next/navigation";

import LoadingScreen from "@/components/loading-screen";
import { BoardCard } from "@/components/workspace-board/board-card";
import { BoardSidebar } from "@/components/workspace-board/board-sidebar";
import { useLoadingScreen } from "@/hooks/use-loading-screen";
import { startTeleportLoading } from "@/lib/loading-screen";
import { useWorkspaceSync } from "@/hooks/use-workspace-sync";
import { BLOCK_LABELS } from "@/components/workspace-board/constants";
import type {
  BlockType,
  BoardState,
  CanvasViewMode,
  PaletteItem,
} from "@/components/workspace-board/types";
import { type ProfileSettings } from "@/components/profile-modal";
import {
  addBlockToCard,
  clamp,
  countCards,
  createBlock,
  createCard,
  createColumn,
  createSeedBoard,
  deleteBlock,
  deleteCard,
  duplicateBlock,
  duplicateCard,
  moveCard,
  moveColumn,
  reorderBlockInCard,
  renameColumn,
  toggleCardCollapsed,
  updateBlock,
  withUpdatedColumns,
} from "@/components/workspace-board/utils";
import { WorkspaceHeader } from "@/components/workspace-board/workspace-header";

const PALETTE_MIME = "application/x-noteslite-palette";
const CARD_MIME = "application/x-noteslite-card";
const COLUMN_MIME = "application/x-noteslite-column";
const BOARD_COLUMN_WIDTH = 332;
const BOARD_COLUMN_MIN_HEIGHT = 580;
const BOARD_LANE_GAP = 10;

type DragCardPayload = {
  cardId: string;
  fromColumnId: string;
};

type DragColumnPayload = {
  columnId: string;
};

type DropGuideProps = {
  isVisible: boolean;
  isActive: boolean;
  label: string;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
};

type ColumnDropZoneProps = {
  isVisible: boolean;
  isActive: boolean;
  label: string;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
};

function parseCardPayload(raw: string): DragCardPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DragCardPayload>;
    if (!parsed.cardId || !parsed.fromColumnId) {
      return null;
    }

    return { cardId: parsed.cardId, fromColumnId: parsed.fromColumnId };
  } catch {
    return null;
  }
}

function parseColumnPayload(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<DragColumnPayload>;
    if (!parsed.columnId) {
      return null;
    }

    return { columnId: parsed.columnId };
  } catch {
    return null;
  }
}

function isBlockType(item: PaletteItem): item is BlockType {
  return item !== "column" && item !== "board";
}

function describeDropAction(item: PaletteItem | null) {
  if (!item) {
    return "Move card here";
  }

  if (item === "column") {
    return "Add new column";
  }

  if (item === "board") {
    return "Add card here";
  }

  return `Add ${BLOCK_LABELS[item].toLowerCase()} here`;
}

function DropGuide({ isVisible, isActive, label, onDragOver, onDrop }: DropGuideProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-hidden="true"
      className={`flex h-5 items-center justify-center rounded-full border border-dashed px-2 transition-[border-color,background-color,box-shadow,opacity,transform] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] ${
        isVisible
          ? isActive
            ? "border-[color:var(--board-drag-guide-active)] bg-[var(--board-accent-soft)] shadow-[0_0_0_1px_var(--board-accent-glow)]"
            : "border-[color:var(--board-drag-guide-passive)] bg-[color:var(--board-panel-bg)]"
          : "border-transparent bg-transparent hover:border-[color:var(--board-drag-guide-passive)] hover:bg-[color:var(--board-panel-bg)]"
      } ${isActive ? "scale-100 opacity-100" : "opacity-100"}`}
    >
      <span
        className={`text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--board-accent-strong)] transition-opacity duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ColumnDropZone({ isVisible, isActive, label, onDragOver, onDrop }: ColumnDropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-hidden="true"
      className="flex w-6 shrink-0 self-stretch items-stretch justify-center overflow-hidden"
    >
      <div
        className={`flex w-full min-w-[14px] items-center justify-center rounded-full border border-dashed transition-[border-color,background-color,box-shadow,opacity] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] ${
          isVisible
            ? isActive
            ? "border-[color:var(--board-drag-guide-active)] bg-[var(--board-accent-soft)] shadow-[0_0_0_1px_var(--board-accent-glow)]"
            : "border-[color:var(--board-drag-guide-passive)] bg-[color:var(--board-panel-bg)]"
            : "opacity-0"
        }`}
      >
        <span className={`sr-only ${isActive ? "not-sr-only" : ""}`}>{label}</span>
      </div>
    </div>
  );
}

export default function WorkspaceBoardClient({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const clientId = useMemo(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const [board, setBoard] = useState(() => createSeedBoard(workspaceId || "local-workspace"));
  const [isLoading, setIsLoading] = useState(true);
  const {
    isVisible: isLoaderVisible,
    isExiting: isLoaderExiting,
    workspaceName: loaderWorkspaceName,
    variant: loaderVariant,
  } = useLoadingScreen(isLoading);
  const [viewMode, setViewMode] = useState<CanvasViewMode>("board");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("New Workspace");
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [columnTitleDraft, setColumnTitleDraft] = useState("");
  const [draggingPaletteItem, setDraggingPaletteItem] = useState<PaletteItem | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [activeDropKey, setActiveDropKey] = useState<string | null>(null);
  const [activeColumnDropIndex, setActiveColumnDropIndex] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileSettings | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setProfile(data);
        if (typeof document !== "undefined" && data?.theme) {
          document.body.classList.remove("theme-standard", "theme-dark", "theme-space");
          document.body.classList.add(`theme-${data.theme}`);
        }
      })
      .catch(console.error);
  }, []);

  const updateBoard = useCallback((updater: (current: BoardState) => BoardState) => {
    setBoard((current) => updater(current));
  }, []);

  useWorkspaceSync(workspaceId, clientId, {
    onCardCreated: (card: any) => {
      updateBoard((current) => {
        // Find the target column
        const columnId = card.columnId;
        if (!columnId) return current;

        // Check if card already exists
        let exists = false;
        current.columns.forEach(col => {
          if (col.cards.some(c => c.id === card.id)) exists = true;
        });
        if (exists) return current;

        const uiCard = {
          id: card.id,
          blocks: card.content || [],
          collapsed: false,
        };

        return {
          ...current,
          columns: current.columns.map((column) => {
            if (column.id === columnId) {
              return { ...column, cards: [...column.cards, uiCard] };
            }
            return column;
          }),
        };
      });
    },
    onCardUpdated: (card: any) => {
      updateBoard((current) => {
        return {
          ...current,
          columns: current.columns.map((column) => ({
            ...column,
            cards: column.cards.map((c) => {
              if (c.id === card.id) {
                return {
                  ...c,
                  blocks: card.content || c.blocks,
                  // Merge other properties if necessary
                };
              }
              return c;
            }),
          })),
        };
      });
    },
    onCardDeleted: ({ id }) => {
      updateBoard((current) => ({
        ...current,
        columns: current.columns.map((column) => ({
          ...column,
          cards: column.cards.filter((c) => c.id !== id),
        })),
      }));
    },
    onCardMoved: (card: any) => {
      updateBoard((current) => {
        const sourceColIdx = current.columns.findIndex(col => col.cards.some(c => c.id === card.id));
        if (sourceColIdx === -1) return current;

        const targetColIdx = current.columns.findIndex(col => col.id === card.columnId);
        if (targetColIdx === -1) return current;

        const sourceCol = current.columns[sourceColIdx];
        const cardToMove = sourceCol.cards.find(c => c.id === card.id);
        if (!cardToMove) return current;

        const nextColumns = current.columns.map(col => ({ ...col, cards: [...col.cards] }));

        // Remove from source
        nextColumns[sourceColIdx].cards = nextColumns[sourceColIdx].cards.filter(c => c.id !== card.id);

        // Insert into target
        const insertIndex = card.positionY !== undefined ? card.positionY : nextColumns[targetColIdx].cards.length;
        nextColumns[targetColIdx].cards.splice(insertIndex, 0, cardToMove);

        return { ...current, columns: nextColumns };
      });
    },
    onColumnCreated: (column: any) => {
      updateBoard((current) => {
        if (current.columns.some(c => c.id === column.id)) return current;
        return {
          ...current,
          columns: [...current.columns, { id: column.id, title: column.name || column.title || "Untitled", cards: [] }],
        };
      });
    },
    onColumnUpdated: (column: any) => {
      updateBoard((current) => ({
        ...current,
        columns: current.columns.map(c => 
          c.id === column.id ? { ...c, title: column.name || column.title || c.title } : c
        ),
      }));
    },
    onColumnDeleted: ({ id }) => {
      updateBoard((current) => ({
        ...current,
        columns: current.columns.filter(c => c.id !== id),
      }));
    },
    onColumnsReordered: ({ columns }) => {
      updateBoard((current) => {
        // Create a map of current columns for fast lookup
        const colMap = new Map(current.columns.map(c => [c.id, c]));
        // Build new columns array based on the ordered IDs returned from the server
        const newColumns = columns.map((col: any) => colMap.get(col.id) || { id: col.id, title: col.name || col.title || "Untitled", cards: [] });
        return { ...current, columns: newColumns };
      });
    },
  });

  // ── Fetch initial workspace data from the server ──
  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}`);
        if (!res.ok) return;

        const { workspace } = await res.json();
        if (cancelled || !workspace) return;

        // Group cards by columnId for efficient mapping
        const cardsByColumn = new Map<string, any[]>();
        for (const card of workspace.cards || []) {
          const colId = card.columnId || "__unassigned__";
          if (!cardsByColumn.has(colId)) cardsByColumn.set(colId, []);
          cardsByColumn.get(colId)!.push(card);
        }

        // Build BoardState columns from the Prisma data
        const columns = (workspace.columns || []).map((col: any) => ({
          id: col.id,
          title: col.name || "Untitled",
          cards: (cardsByColumn.get(col.id) || []).map((card: any) => ({
            id: card.id,
            blocks: Array.isArray(card.content) ? card.content : [],
            collapsed: false,
          })),
        }));

        // If there are cards without a column, add an "Unassigned" column
        const unassigned = cardsByColumn.get("__unassigned__") || [];
        if (unassigned.length > 0) {
          columns.push({
            id: "__unassigned__",
            title: "Unassigned",
            cards: unassigned.map((card: any) => ({
              id: card.id,
              blocks: Array.isArray(card.content) ? card.content : [],
              collapsed: false,
            })),
          });
        }

        // Ensure there's at least one column
        if (columns.length === 0) {
          columns.push({ id: crypto.randomUUID(), title: "Unassigned", cards: [] });
        }

        setBoard({
          id: workspace.id,
          title: workspace.name || "Untitled Workspace",
          columns,
        });
        setTitleDraft(workspace.name || "Untitled Workspace");
      } catch (err) {
        console.error("Failed to load workspace:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadWorkspace();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const resolvedSelectedColumnId = useMemo(() => {
    if (selectedColumnId && board.columns.some((column) => column.id === selectedColumnId)) {
      return selectedColumnId;
    }

    return board.columns[0]?.id ?? null;
  }, [board.columns, selectedColumnId]);

  const cardColumnMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const column of board.columns) {
      for (const card of column.cards) {
        map.set(card.id, column.id);
      }
    }
    return map;
  }, [board.columns]);

  const cardsCount = useMemo(() => countCards(board), [board]);

  // ── Auto-save cards on block changes ──
  const previousCardsRef = useRef<Map<string, any[]>>(new Map());

  useEffect(() => {
    if (isLoading) return;

    const timeoutId = setTimeout(() => {
      const currentCards = new Map<string, any[]>();
      const changedCards: { id: string; blocks: any[] }[] = [];

      for (const column of board.columns) {
        for (const card of column.cards) {
          currentCards.set(card.id, card.blocks);

          const prevBlocks = previousCardsRef.current.get(card.id);
          // If prevBlocks exists and differs, we have an update
          if (prevBlocks && JSON.stringify(prevBlocks) !== JSON.stringify(card.blocks)) {
            changedCards.push({ id: card.id, blocks: card.blocks });
          }
        }
      }

      // Update the ref to match current state
      previousCardsRef.current = currentCards;

      // Dispatch PATCH for each changed card
      for (const changed of changedCards) {
        fetch(`/api/workspaces/${workspaceId}/cards/${changed.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": clientId,
          },
          body: JSON.stringify({ content: changed.blocks }),
        }).catch(console.error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [board.columns, workspaceId, clientId, isLoading]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  const insertCardAt = useCallback(
    (columnId: string, insertIndex: number, initialBlockType: BlockType = "note") => {
      const newCard = createCard([createBlock(initialBlockType)]);

      updateBoard((current) =>
        withUpdatedColumns(current, (columns) =>
          columns.map((column) => {
            if (column.id !== columnId) {
              return column;
            }

            const nextCards = [...column.cards];
            const boundedIndex = clamp(insertIndex, 0, nextCards.length);
            nextCards.splice(boundedIndex, 0, newCard);
            return { ...column, cards: nextCards };
          }),
        ),
      );

      setSelectedColumnId(columnId);
      setSelectedCardId(newCard.id);
    },
    [updateBoard],
  );

  const addNewColumn = useCallback(async () => {
    const title = `Column ${board.columns.length + 1}`;
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/columns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify({ name: title }),
      });

      if (!response.ok) {
        throw new Error("Failed to create column");
      }

      const { column } = await response.json();

      setSelectedColumnId(column.id);
      setSelectedCardId(null);
      setEditingColumnId(column.id);
      setColumnTitleDraft(column.name || title);
    } catch (error) {
      console.error(error);
    }
  }, [board.columns.length, workspaceId, clientId]);

  const addCardToColumn = useCallback(
    async (columnId: string, initialBlockType: BlockType = "note") => {
      try {
        const title = "New Card";
        const content = [createBlock(initialBlockType)];

        const response = await fetch(`/api/workspaces/${workspaceId}/cards`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": clientId,
          },
          body: JSON.stringify({
            title,
            columnId,
            content,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create card");
        }

        const { card } = await response.json();

        setSelectedColumnId(columnId);
        setSelectedCardId(card.id);
      } catch (error) {
        console.error(error);
      }
    },
    [workspaceId, clientId],
  );

  const addBlockFromSidebar = useCallback(
    (blockType: BlockType) => {
      if (selectedCardId && cardColumnMap.has(selectedCardId)) {
        updateBoard((current) => addBlockToCard(current, selectedCardId, blockType));
        return;
      }

      const targetColumnId = resolvedSelectedColumnId ?? board.columns[0]?.id;
      if (!targetColumnId) {
        return;
      }

      addCardToColumn(targetColumnId, blockType);
    },
    [
      addCardToColumn,
      board.columns,
      cardColumnMap,
      resolvedSelectedColumnId,
      selectedCardId,
      updateBoard,
    ],
  );

  const onPaletteItemClick = useCallback(
    (item: PaletteItem) => {
      if (item === "column") {
        addNewColumn();
        return;
      }

      const targetColumnId = resolvedSelectedColumnId ?? board.columns[0]?.id;
      if (!targetColumnId) {
        return;
      }

      if (item === "board") {
        addCardToColumn(targetColumnId, "note");
        return;
      }

      if (isBlockType(item)) {
        addBlockFromSidebar(item);
      }
    },
    [
      addBlockFromSidebar,
      addCardToColumn,
      addNewColumn,
      board.columns,
      resolvedSelectedColumnId,
    ],
  );

  const onPaletteDragStart = useCallback((event: DragEvent<HTMLButtonElement>, item: PaletteItem) => {
    setDraggingPaletteItem(item);
    setDraggingCardId(null);
    setDraggingColumnId(null);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(PALETTE_MIME, item);
  }, []);

  const onPaletteDragEnd = useCallback(() => {
    setDraggingPaletteItem(null);
    setActiveDropKey(null);
    setActiveColumnDropIndex(null);
  }, []);

  const onCardDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, cardId: string, fromColumnId: string) => {
      setDraggingCardId(cardId);
      setDraggingPaletteItem(null);
      setDraggingColumnId(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(CARD_MIME, JSON.stringify({ cardId, fromColumnId } satisfies DragCardPayload));
    },
    [],
  );

  const onCardDragEnd = useCallback(() => {
    setDraggingCardId(null);
    setActiveDropKey(null);
    setActiveColumnDropIndex(null);
  }, []);

  const onColumnDragStart = useCallback((event: DragEvent<HTMLButtonElement>, columnId: string) => {
    setDraggingColumnId(columnId);
    setDraggingCardId(null);
    setDraggingPaletteItem(null);
    setActiveDropKey(null);
    setSelectedColumnId(columnId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(COLUMN_MIME, JSON.stringify({ columnId } satisfies DragColumnPayload));
  }, []);

  const onColumnDragEnd = useCallback(() => {
    setDraggingColumnId(null);
    setActiveColumnDropIndex(null);
  }, []);

  const allowDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (draggingColumnId) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = draggingPaletteItem ? "copy" : "move";
    },
    [draggingColumnId, draggingPaletteItem],
  );

  const allowColumnDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!draggingColumnId) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [draggingColumnId],
  );

  const onDropAtIndex = useCallback(
    (event: DragEvent<HTMLElement>, columnId: string, insertIndex: number) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveDropKey(null);

      const paletteItemRaw = event.dataTransfer.getData(PALETTE_MIME) as PaletteItem;
      if (paletteItemRaw) {
        if (paletteItemRaw === "column") {
          addNewColumn();
        } else if (paletteItemRaw === "board") {
          insertCardAt(columnId, insertIndex, "note");
        } else if (isBlockType(paletteItemRaw)) {
          insertCardAt(columnId, insertIndex, paletteItemRaw);
        }

        setDraggingPaletteItem(null);
        return;
      }

      const cardPayloadRaw = event.dataTransfer.getData(CARD_MIME);
      const cardPayload = parseCardPayload(cardPayloadRaw);
      if (!cardPayload) {
        return;
      }

      updateBoard((current) => moveCard(current, cardPayload.cardId, columnId, insertIndex));
      setSelectedColumnId(columnId);
      setSelectedCardId(cardPayload.cardId);
      setDraggingCardId(null);
    },
    [addNewColumn, insertCardAt, updateBoard],
  );

  const onColumnDropAtIndex = useCallback(
    (event: DragEvent<HTMLElement>, targetIndex: number) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveColumnDropIndex(null);

      const columnPayload = parseColumnPayload(event.dataTransfer.getData(COLUMN_MIME));
      if (!columnPayload) {
        return;
      }

      updateBoard((current) => moveColumn(current, columnPayload.columnId, targetIndex));
      setSelectedColumnId(columnPayload.columnId);
      setDraggingColumnId(null);
    },
    [updateBoard],
  );

  const startEditingWorkspaceTitle = useCallback(() => {
    setTitleDraft(board.title || "New Workspace");
    setIsEditingTitle(true);
  }, [board.title]);

  const cancelEditingWorkspaceTitle = useCallback(() => {
    setTitleDraft(board.title || "New Workspace");
    setIsEditingTitle(false);
  }, [board.title]);

  const commitWorkspaceTitle = useCallback(() => {
    const nextTitle = titleDraft.trim() || "New Workspace";
    updateBoard((current) => ({ ...current, title: nextTitle }));
    setTitleDraft(nextTitle);
    setIsEditingTitle(false);
  }, [titleDraft, updateBoard]);

  const commitColumnRename = useCallback(
    (columnId: string) => {
      const nextTitle = columnTitleDraft.trim() || "Untitled";
      updateBoard((current) => renameColumn(current, columnId, nextTitle));
      setEditingColumnId(null);
      setColumnTitleDraft("");
    },
    [columnTitleDraft, updateBoard],
  );

  const showCardDropGuides = draggingCardId !== null || draggingPaletteItem !== null;
  const showColumnDropGuides = draggingColumnId !== null;
  const activeDropLabel = describeDropAction(draggingPaletteItem);
  const boardStageStyle = useMemo(
    () =>
      ({
        "--board-column-width": `${BOARD_COLUMN_WIDTH}px`,
        "--board-column-min-height": `${BOARD_COLUMN_MIN_HEIGHT}px`,
        "--board-lane-gap": `${BOARD_LANE_GAP}px`,
      }) as CSSProperties & Record<string, string | number>,
    [],
  );

  if (isLoaderVisible) {
    return (
      <LoadingScreen
        exiting={isLoaderExiting}
        workspaceName={loaderWorkspaceName}
        variant={loaderVariant}
      />
    );
  }

  return (
    <div className="workspace-board-viewport fixed inset-0 overflow-hidden transition-colors duration-500">
      {profile?.dashboardBackground && (
        <div 
          className="workspace-board-bg-img"
          style={{ backgroundImage: `url(${profile.dashboardBackground})` }}
        />
      )}
      <div
        className="workspace-board-stage absolute inset-[var(--board-fit-padding)]"
        style={boardStageStyle}
      >
        <div className="relative h-full w-full">
          <div className="relative h-full overflow-hidden rounded-[30px] border border-[color:var(--board-shell-border)] bg-[var(--board-shell-bg)] p-4 shadow-[var(--board-shadow-shell)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,var(--board-panel-bg),transparent_58%)]" />
            <div className="pointer-events-none absolute -right-20 top-10 h-48 w-48 rounded-full bg-[color:var(--board-shell-bg)] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-10 h-52 w-52 rounded-full bg-[color:var(--board-shell-bg)] blur-3xl" />

            <div className="relative grid h-full min-h-0 grid-cols-[176px_minmax(0,1fr)] items-stretch gap-5">
              <BoardSidebar
                onBack={() => {
                  startTeleportLoading({ workspaceName: "Dashboard" });
                  router.push("/dashboard");
                }}
                onPaletteDragStart={onPaletteDragStart}
                onPaletteDragEnd={onPaletteDragEnd}
                onPaletteClick={onPaletteItemClick}
                draggingItem={draggingPaletteItem}
              />

              <section className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[28px] border border-[color:var(--board-border)] bg-[var(--board-panel-bg)] px-4 pb-4 pt-4 shadow-[var(--board-shadow-panel)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,var(--board-panel-bg),transparent_72%)]" />

                <div className="relative flex min-h-0 flex-1 flex-col">
                  <WorkspaceHeader
                    title={board.title}
                    draftTitle={titleDraft}
                    isEditingTitle={isEditingTitle}
                    viewLabel="Board view"
                    cardsCount={cardsCount}
                    columnsCount={board.columns.length}
                    isSyncing={false}
                    onStartEditingTitle={startEditingWorkspaceTitle}
                    onCancelEditingTitle={cancelEditingWorkspaceTitle}
                    onDraftTitleChange={setTitleDraft}
                    onCommitTitle={commitWorkspaceTitle}
                  />

                  <div className="mt-2.5 min-h-0 min-w-0 flex-1 overflow-hidden">
                      <div className="workspace-board-scroll h-full min-h-0 min-w-0 overflow-x-auto overflow-y-hidden pb-2 pl-1 pr-1 touch-pan-x">
                        <div className="flex h-full min-h-full w-max min-w-full items-stretch gap-[var(--board-lane-gap)] pb-1">
                          {board.columns.map((column, columnIndex) => {
                        const isColumnSelected = resolvedSelectedColumnId === column.id;
                        const isEditingColumn = editingColumnId === column.id;
                        const isColumnCardDropTarget =
                          showCardDropGuides && activeDropKey?.startsWith(`${column.id}:`);
                        const isColumnDragging = draggingColumnId === column.id;

                        return (
                          <div key={column.id} className="flex h-full min-h-0 shrink-0 flex-none items-stretch gap-[var(--board-lane-gap)]">
                            <ColumnDropZone
                              isVisible={showColumnDropGuides}
                              isActive={activeColumnDropIndex === columnIndex}
                              label="Move column here"
                              onDragOver={(event) => {
                                allowColumnDrop(event);
                                if (showColumnDropGuides) {
                                  setActiveColumnDropIndex(columnIndex);
                                }
                              }}
                              onDrop={(event) => onColumnDropAtIndex(event, columnIndex)}
                            />

                            <article
                              tabIndex={0}
                              aria-label={`${column.title} column`}
                              onClick={() => {
                                setSelectedColumnId(column.id);
                                setSelectedCardId(null);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedColumnId(column.id);
                                  setSelectedCardId(null);
                                }
                              }}
                              className={`relative flex h-full min-h-0 max-h-full w-[var(--board-column-width)] shrink-0 flex-none flex-col overflow-hidden rounded-[24px] border p-3 pt-[calc(var(--board-column-handle-size)+0.95rem)] transition-[border-color,background-color,box-shadow,transform,opacity] duration-[var(--board-motion-base)] ease-[var(--board-ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)] ${
                                isColumnCardDropTarget
                                  ? "border-[color:var(--board-border-accent)] bg-[color:var(--board-shell-bg)] shadow-[var(--shadow-card)]"
                                  : isColumnSelected
                                    ? "border-[color:var(--board-border-accent)] bg-[color:var(--board-shell-bg)] shadow-[var(--shadow-card)]"
                                    : "border-[color:var(--board-border)] bg-[color:var(--board-shell-bg)] hover:border-[color:var(--board-border-strong)]"
                              } ${isColumnDragging ? "opacity-60" : "opacity-100"}`}
                            >
                              <button
                                type="button"
                                draggable
                                aria-label="Drag column to reorder"
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                                onDragStart={(event) => onColumnDragStart(event, column.id)}
                                onDragEnd={onColumnDragEnd}
                                className={`absolute left-1/2 top-3 z-10 flex h-[var(--board-column-handle-size)] w-[var(--board-column-handle-size)] -translate-x-1/2 items-center justify-center gap-[var(--board-handle-dot-gap)] rounded-full border border-[color:var(--board-border)] bg-[color:var(--board-handle-surface)] text-[color:var(--board-handle-icon)] shadow-[var(--shadow)] transition-[border-color,background-color,box-shadow,transform,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:-translate-x-1/2 hover:-translate-y-px hover:border-[color:var(--board-border-strong)] hover:bg-[color:var(--board-handle-surface-pressed)] hover:shadow-[var(--shadow-lg)] active:-translate-x-1/2 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)] ${
                                  isColumnDragging
                                    ? "border-[color:var(--board-border-accent)] bg-[color:var(--board-handle-surface-pressed)] shadow-[var(--shadow-lg)]"
                                    : ""
                                }`}
                              >
                                <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                                <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                                <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
                              </button>

                              <div className="mb-4 rounded-[20px] border border-[color:var(--board-border)] bg-[color:var(--board-panel-bg)] p-3.5 shadow-[inset_0_1px_0_var(--board-panel-bg)]">
                                <div
                                  onDoubleClick={(event) => {
                                    event.stopPropagation();
                                    setEditingColumnId(column.id);
                                    setColumnTitleDraft(column.title);
                                  }}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex h-[var(--board-status-pill-height)] items-center rounded-full border border-[color:var(--board-border)] bg-[color:var(--board-panel-bg)] px-[var(--board-status-pill-px)] text-[9px] font-semibold uppercase leading-none tracking-[var(--board-status-pill-track)] text-[color:var(--board-text-soft)]">
                                      Column
                                    </span>
                                    <span className="inline-flex h-[var(--board-status-pill-height)] items-center rounded-full border border-[color:var(--board-border)] bg-[var(--board-warm-soft)] px-[var(--board-status-pill-px)] text-[9px] font-medium uppercase leading-none tracking-[var(--board-status-pill-track)] text-[color:var(--board-warm)]">
                                      {column.cards.length} {column.cards.length === 1 ? "card" : "cards"}
                                    </span>
                                    {isColumnSelected ? (
                                      <span className="inline-flex h-[var(--board-status-pill-height)] items-center rounded-full border border-[color:var(--board-border-accent)] bg-[var(--board-accent-soft)] px-[var(--board-status-pill-px)] text-[9px] font-semibold uppercase leading-none tracking-[var(--board-status-pill-track)] text-[color:var(--board-accent-strong)]">
                                        Selected
                                      </span>
                                    ) : null}
                                    {isColumnCardDropTarget ? (
                                      <span className="inline-flex h-[var(--board-status-pill-height)] items-center rounded-full border border-[color:var(--board-border-accent)] bg-[var(--board-accent-soft)] px-[var(--board-status-pill-px)] text-[9px] font-semibold uppercase leading-none tracking-[var(--board-status-pill-track)] text-[color:var(--board-accent-strong)]">
                                        Drop target
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-3">
                                    {isEditingColumn ? (
                                      <input
                                        autoFocus
                                        value={columnTitleDraft}
                                        aria-label="Column title"
                                        onChange={(event) => setColumnTitleDraft(event.target.value)}
                                        onBlur={() => commitColumnRename(column.id)}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            commitColumnRename(column.id);
                                          }

                                          if (event.key === "Escape") {
                                            event.preventDefault();
                                            setEditingColumnId(null);
                                            setColumnTitleDraft("");
                                          }
                                        }}
                                        className="h-11 w-full rounded-[14px] border border-[color:var(--board-border-strong)] bg-[color:var(--board-panel-bg)] px-3 text-[19px] font-semibold tracking-[0.03em] text-[color:var(--board-text-strong)] outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
                                      />
                                    ) : (
                                      <h2 className="text-[20px] leading-tight tracking-[0.03em] text-[color:var(--board-text-strong)] [font-family:'Cormorant_Garamond','Times_New_Roman',serif]">
                                        {column.title}
                                      </h2>
                                    )}
                                  </div>
                                </div>

                                <p className="mt-3 text-[12px] leading-5 text-[color:var(--board-text-soft)]">
                                  {showColumnDropGuides
                                    ? "Use the top handle to drag this column left or right."
                                    : isColumnSelected
                                      ? "Selected for quick add actions from the sidebar."
                                      : column.cards.length === 0
                                        ? "Ready for the first card."
                                        : "Click or press Enter to target this column."}
                                </p>
                              </div>

                              <div className="flex min-h-0 flex-1 flex-col">
                                <div className="workspace-board-panel-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 touch-pan-y">
                                  <DropGuide
                                    isVisible={showCardDropGuides}
                                    isActive={activeDropKey === `${column.id}:0`}
                                    label={activeDropLabel}
                                    onDragOver={(event) => {
                                      allowDrop(event);
                                      if (showCardDropGuides) {
                                        setActiveDropKey(`${column.id}:0`);
                                      }
                                    }}
                                    onDrop={(event) => onDropAtIndex(event, column.id, 0)}
                                  />

                                  {column.cards.length > 0 ? (
                                    column.cards.map((card, index) => (
                                      <div key={card.id} className="space-y-3">
                                        <BoardCard
                                          card={card}
                                          isSelected={selectedCardId === card.id}
                                          isDragging={draggingCardId === card.id}
                                          onSelect={() => {
                                            setSelectedColumnId(column.id);
                                            setSelectedCardId(card.id);
                                          }}
                                          onDragStart={(event) => onCardDragStart(event, card.id, column.id)}
                                          onDragEnd={onCardDragEnd}
                                          onDelete={() => {
                                            updateBoard((current) => deleteCard(current, card.id));
                                            setSelectedCardId((current) => (current === card.id ? null : current));
                                          }}
                                          onDuplicate={() => updateBoard((current) => duplicateCard(current, card.id))}
                                          onToggleCollapsed={() =>
                                            updateBoard((current) => toggleCardCollapsed(current, card.id))
                                          }
                                          onAddBlock={(type) =>
                                            updateBoard((current) => addBlockToCard(current, card.id, type))
                                          }
                                          onUpdateBlock={(blockId, updater) =>
                                            updateBoard((current) => updateBlock(current, card.id, blockId, updater))
                                          }
                                          onDeleteBlock={(blockId) =>
                                            updateBoard((current) => deleteBlock(current, card.id, blockId))
                                          }
                                          onDuplicateBlock={(blockId) =>
                                            updateBoard((current) => duplicateBlock(current, card.id, blockId))
                                          }
                                          onReorderBlock={(blockId, targetIndex) => {
                                            updateBoard((current) =>
                                              reorderBlockInCard(current, card.id, blockId, targetIndex),
                                            );
                                            setSelectedColumnId(column.id);
                                            setSelectedCardId(card.id);
                                          }}
                                        />

                                        <DropGuide
                                          isVisible={showCardDropGuides}
                                          isActive={activeDropKey === `${column.id}:${index + 1}`}
                                          label={activeDropLabel}
                                          onDragOver={(event) => {
                                            allowDrop(event);
                                            if (showCardDropGuides) {
                                              setActiveDropKey(`${column.id}:${index + 1}`);
                                            }
                                          }}
                                          onDrop={(event) => onDropAtIndex(event, column.id, index + 1)}
                                        />
                                      </div>
                                    ))
                                  ) : (
                                    <div
                                      onDragOver={(event) => {
                                        allowDrop(event);
                                        if (showCardDropGuides) {
                                          setActiveDropKey(`${column.id}:0`);
                                        }
                                      }}
                                      onDrop={(event) => onDropAtIndex(event, column.id, 0)}
                                      className={`rounded-[20px] border border-dashed px-4 py-7 text-center transition-[border-color,background-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] ${
                                        isColumnCardDropTarget
                                          ? "border-[color:var(--board-border-accent)] bg-[var(--board-accent-soft)] shadow-[0_0_0_1px_var(--board-accent-glow)]"
                                          : "border-[color:var(--board-border-strong)] bg-[color:var(--board-panel-bg)]"
                                      }`}
                                    >
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--board-text-soft)]">
                                        Empty column
                                      </p>
                                      <p className="mt-2 text-[13px] leading-6 text-[color:var(--board-text-muted)]">
                                        {showCardDropGuides
                                          ? "Drop a card or block here to start this column."
                                          : "Start with a note card or drag content here from the palette."}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    addCardToColumn(column.id, "note");
                                  }}
                                  className="mt-4 flex min-h-[var(--board-action-chip-height-roomy)] w-full items-center justify-between rounded-[18px] border border-dashed border-[color:var(--board-border-strong)] bg-[color:var(--board-panel-bg)] px-3.5 text-left transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-accent)] hover:bg-[color:var(--board-panel-bg)] hover:shadow-[var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
                                >
                                  <span className="text-[10px] font-semibold uppercase leading-none tracking-[var(--board-action-chip-track)] text-[color:var(--board-accent-strong)]">
                                    + New card
                                  </span>
                                  <span className="inline-flex h-[var(--board-status-pill-height)] items-center rounded-full border border-[color:var(--board-border)] bg-[color:var(--board-panel-bg)] px-[var(--board-status-pill-px)] text-[9px] font-medium uppercase leading-none tracking-[var(--board-status-pill-track)] text-[color:var(--board-text-soft)]">
                                    Starts with note
                                  </span>
                                </button>
                              </div>
                            </article>
                          </div>
                        );
                          })}

                          <ColumnDropZone
                            isVisible={showColumnDropGuides}
                            isActive={activeColumnDropIndex === board.columns.length}
                            label="Move column to the end"
                            onDragOver={(event) => {
                              allowColumnDrop(event);
                              if (showColumnDropGuides) {
                                setActiveColumnDropIndex(board.columns.length);
                              }
                            }}
                            onDrop={(event) => onColumnDropAtIndex(event, board.columns.length)}
                          />
                        </div>
                      </div>
                    </div>
                </div>

              </section>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label={viewMode === "board" ? "Switch to canvas view" : "Switch to board view"}
        onClick={() => setViewMode((current) => (current === "board" ? "canvas" : "board"))}
        className="fixed bottom-5 right-5 z-20 inline-flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full border border-[color:var(--board-border-accent)] bg-[color:var(--board-panel-bg)] text-[color:var(--board-accent-strong)] shadow-[var(--shadow-lg)] transition-[transform,box-shadow,border-color,background-color,color] duration-[var(--board-motion-base)] ease-[var(--board-ease-standard)] hover:-translate-y-0.5 hover:bg-[color:var(--board-panel-bg)] hover:shadow-[var(--shadow-lg)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
      >
        <span
          aria-hidden="true"
          className={`mb-1 grid ${viewMode === "board" ? "grid-cols-2 gap-[3px]" : "grid-cols-3 gap-[2.5px]"}`}
        >
          {viewMode === "board" ? (
            <>
              <span className="h-[7px] w-[7px] rounded-[2px] bg-current" />
              <span className="h-[7px] w-[7px] rounded-[2px] bg-current opacity-70" />
              <span className="h-[7px] w-[7px] rounded-[2px] bg-current opacity-85" />
              <span className="h-[7px] w-[7px] rounded-[2px] bg-current opacity-55" />
            </>
          ) : (
            <>
              <span className="h-[4px] w-[4px] rounded-full bg-current" />
              <span className="h-[4px] w-[4px] rounded-full bg-current opacity-60" />
              <span className="h-[4px] w-[4px] rounded-full bg-current opacity-85" />
              <span className="h-[4px] w-[4px] rounded-full bg-current opacity-75" />
              <span className="h-[4px] w-[4px] rounded-full bg-current opacity-95" />
              <span className="h-[4px] w-[4px] rounded-full bg-current opacity-70" />
            </>
          )}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em]">
          {viewMode === "board" ? "Canvas" : "Board"}
        </span>
        <span className="mt-0.5 text-[8px] uppercase tracking-[0.16em] text-[color:var(--board-text-soft)]">
          View
        </span>
      </button>
    </div>
  );
}
