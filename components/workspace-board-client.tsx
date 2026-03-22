"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";

import { BoardSidebar } from "@/components/workspace-board/board-sidebar";
import { BoardCard } from "@/components/workspace-board/board-card";
import { WorkspaceHeader } from "@/components/workspace-board/workspace-header";
import type { BlockType, BoardState, PaletteItem } from "@/components/workspace-board/types";
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
  moveBlock,
  moveCard,
  renameColumn,
  toggleCardCollapsed,
  updateBlock,
  withUpdatedColumns,
} from "@/components/workspace-board/utils";

const PALETTE_MIME = "application/x-noteslite-palette";
const CARD_MIME = "application/x-noteslite-card";

type DragCardPayload = {
  cardId: string;
  fromColumnId: string;
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

function isBlockType(item: PaletteItem): item is BlockType {
  return item !== "column" && item !== "board";
}

export default function WorkspaceBoardClient({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  const [board, setBoard] = useState(() => createSeedBoard(workspaceId || "local-workspace"));
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("New Workspace");
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [columnTitleDraft, setColumnTitleDraft] = useState("");
  const [draggingPaletteItem, setDraggingPaletteItem] = useState<PaletteItem | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [activeDropKey, setActiveDropKey] = useState<string | null>(null);

  const updateBoard = useCallback((updater: (current: BoardState) => BoardState) => {
    setBoard((current) => updater(current));
  }, []);

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

  const addNewColumn = useCallback(() => {
    const newColumn = createColumn(`Column ${board.columns.length + 1}`);
    updateBoard((current) => ({ ...current, columns: [...current.columns, newColumn] }));
    setSelectedColumnId(newColumn.id);
    setSelectedCardId(null);
    setEditingColumnId(newColumn.id);
    setColumnTitleDraft(newColumn.title);
  }, [board.columns.length, updateBoard]);

  const addCardToColumn = useCallback(
    (columnId: string, initialBlockType: BlockType = "note") => {
      const targetColumn = board.columns.find((column) => column.id === columnId);
      insertCardAt(columnId, targetColumn?.cards.length ?? 0, initialBlockType);
    },
    [board.columns, insertCardAt],
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
    [addBlockFromSidebar, addCardToColumn, addNewColumn, board.columns, resolvedSelectedColumnId],
  );

  const onPaletteDragStart = useCallback((event: DragEvent<HTMLButtonElement>, item: PaletteItem) => {
    setDraggingPaletteItem(item);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(PALETTE_MIME, item);
  }, []);

  const onPaletteDragEnd = useCallback(() => {
    setDraggingPaletteItem(null);
    setActiveDropKey(null);
  }, []);

  const onCardDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, cardId: string, fromColumnId: string) => {
      setDraggingCardId(cardId);
      setDraggingPaletteItem(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(CARD_MIME, JSON.stringify({ cardId, fromColumnId } satisfies DragCardPayload));
    },
    [],
  );

  const onCardDragEnd = useCallback(() => {
    setDraggingCardId(null);
    setActiveDropKey(null);
  }, []);

  const allowDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = draggingPaletteItem ? "copy" : "move";
    },
    [draggingPaletteItem],
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

  const showDropGuides = draggingCardId !== null || draggingPaletteItem !== null;

  return (
    <div className="min-h-screen overflow-x-auto bg-[linear-gradient(180deg,#ebe6de_0%,#e3cdc0_100%)] p-4 text-[#3d4047]">
      <div className="mx-auto w-[min(1880px,100%)] rounded-[22px] border border-[rgba(255,255,255,0.85)] bg-[rgba(244,244,246,0.95)] p-3 [box-shadow:0_16px_28px_rgba(73,59,49,0.26)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(232px,248px)_1fr]">
          <BoardSidebar
            onBack={() => router.push("/dashboard")}
            onPaletteDragStart={onPaletteDragStart}
            onPaletteDragEnd={onPaletteDragEnd}
            onPaletteClick={onPaletteItemClick}
          />

          <section className="overflow-hidden rounded-[20px] border border-[rgba(0,0,0,0.16)] bg-[linear-gradient(180deg,#d3d6df_0%,#cdd0da_100%)] px-5 pb-4 pt-4">
            <WorkspaceHeader
              title={board.title}
              draftTitle={titleDraft}
              isEditingTitle={isEditingTitle}
              cardsCount={cardsCount}
              columnsCount={board.columns.length}
              isSyncing={false}
              onStartEditingTitle={startEditingWorkspaceTitle}
              onCancelEditingTitle={cancelEditingWorkspaceTitle}
              onDraftTitleChange={setTitleDraft}
              onCommitTitle={commitWorkspaceTitle}
            />

            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max items-start gap-3">
                {board.columns.map((column) => {
                  const isColumnSelected = resolvedSelectedColumnId === column.id;
                  const isEditingColumn = editingColumnId === column.id;

                  return (
                    <article
                      key={column.id}
                      tabIndex={0}
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
                      className={`min-h-[620px] w-[320px] rounded-[14px] border p-[10px] transition-colors focus-visible:outline-none ${
                        isColumnSelected
                          ? "border-[#4e5460] bg-[rgba(238,238,240,0.9)] ring-1 ring-[#6a7182]/25"
                          : "border-[rgba(0,0,0,0.2)] bg-[rgba(238,238,240,0.8)]"
                      }`}
                    >
                      <div
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          setEditingColumnId(column.id);
                          setColumnTitleDraft(column.title);
                        }}
                        className="mb-3 rounded-[10px] border border-[rgba(0,0,0,0.18)] bg-white/70 px-2 py-2 text-center text-[14px] font-semibold tracking-[0.08em] text-[#4a4d55]"
                      >
                        {isEditingColumn ? (
                          <input
                            autoFocus
                            value={columnTitleDraft}
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
                            className="h-8 w-full rounded-[8px] border border-[rgba(0,0,0,0.22)] bg-white/80 px-2 text-center text-[14px] font-semibold tracking-[0.08em] text-[#4a4d55] outline-none"
                          />
                        ) : (
                          column.title
                        )}
                      </div>

                      <div className="space-y-2">
                        <div
                          className={`h-2 rounded transition-colors ${
                            showDropGuides
                              ? activeDropKey === `${column.id}:0`
                                ? "bg-[#6a72ff]"
                                : "bg-[#7a80d4]/45"
                              : "bg-transparent hover:bg-[#7a80d4]/30"
                          }`}
                          onDragOver={(event) => {
                            allowDrop(event);
                            if (showDropGuides) {
                              setActiveDropKey(`${column.id}:0`);
                            }
                          }}
                          onDrop={(event) => onDropAtIndex(event, column.id, 0)}
                          aria-hidden="true"
                        />

                        {column.cards.length > 0 ? (
                          column.cards.map((card, index) => (
                            <div key={card.id} className="space-y-2">
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
                                onMoveBlock={(blockId, direction) =>
                                  updateBoard((current) => moveBlock(current, card.id, blockId, direction))
                                }
                              />

                              <div
                                className={`h-2 rounded transition-colors ${
                                  showDropGuides
                                    ? activeDropKey === `${column.id}:${index + 1}`
                                      ? "bg-[#6a72ff]"
                                      : "bg-[#7a80d4]/45"
                                    : "bg-transparent hover:bg-[#7a80d4]/30"
                                }`}
                                onDragOver={(event) => {
                                  allowDrop(event);
                                  if (showDropGuides) {
                                    setActiveDropKey(`${column.id}:${index + 1}`);
                                  }
                                }}
                                onDrop={(event) => onDropAtIndex(event, column.id, index + 1)}
                                aria-hidden="true"
                              />
                            </div>
                          ))
                        ) : (
                          <div
                            className="rounded-[10px] border border-dashed border-[rgba(0,0,0,0.22)] bg-white/50 px-3 py-5 text-center text-[12px] tracking-[0.07em] text-[#6d717b]"
                            onDragOver={(event) => {
                              allowDrop(event);
                              if (showDropGuides) {
                                setActiveDropKey(`${column.id}:0`);
                              }
                            }}
                            onDrop={(event) => onDropAtIndex(event, column.id, 0)}
                          >
                            Drop blocks or cards here
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          addCardToColumn(column.id, "note");
                        }}
                        className="mt-3 h-9 rounded-[10px] border border-[rgba(61,66,75,0.2)] bg-white px-3 text-[12px] font-medium tracking-[0.04em] text-[#4f5664] transition-colors hover:bg-[rgba(245,246,248,0.96)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f6a7a]/40"
                      >
                        + New Card
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
