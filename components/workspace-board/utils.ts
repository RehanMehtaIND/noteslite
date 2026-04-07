import { BLOCK_LABELS } from "./constants";
import type {
  Block,
  BlockDataByType,
  BlockType,
  BoardState,
  Card,
  CanvasCamera,
  CanvasBounds,
  CanvasItem,
  CanvasItemSource,
  CanvasItemType,
  CanvasPoint,
  Column,
  PaletteItem,
  TodoItem,
} from "./types";

const FALLBACK_WORKSPACE_TITLE = "New Workspace";
let idCounter = 0;

const CANVAS_ITEM_DIMENSIONS: Record<CanvasItemType, { width: number; height: number }> = {
  note: { width: 320, height: 232 },
  image: { width: 336, height: 296 },
  "board-card": { width: 320, height: 224 },
  "column-shell": { width: 300, height: 244 },
};

export const DEFAULT_CANVAS_BOUNDS: CanvasBounds = {
  width: 1820,
  height: 1180,
};

export const DEFAULT_CANVAS_CAMERA: CanvasCamera = {
  x: -168,
  y: -104,
};

function nextCounter() {
  idCounter += 1;
  return idCounter;
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${nextCounter()}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getViewportFitScale(
  viewport: { width: number; height: number },
  content: { width: number; height: number },
  padding = 16,
  minScale = 0.36,
) {
  if (viewport.width <= 0 || viewport.height <= 0 || content.width <= 0 || content.height <= 0) {
    return 1;
  }

  const widthRatio = Math.max(viewport.width - padding * 2, 1) / content.width;
  const heightRatio = Math.max(viewport.height - padding * 2, 1) / content.height;
  return clamp(Math.min(widthRatio, heightRatio, 1), minScale, 1);
}

export function worldToScreenPoint(point: CanvasPoint, camera: CanvasCamera): CanvasPoint {
  return {
    x: point.x - camera.x,
    y: point.y - camera.y,
  };
}

export function screenToWorldPoint(point: CanvasPoint, camera: CanvasCamera): CanvasPoint {
  return {
    x: point.x + camera.x,
    y: point.y + camera.y,
  };
}

export function panCanvasCamera(camera: CanvasCamera, delta: CanvasPoint): CanvasCamera {
  return {
    x: Math.round(camera.x - delta.x),
    y: Math.round(camera.y - delta.y),
  };
}

export function getCanvasViewportCenter(camera: CanvasCamera, viewport: { width: number; height: number }) {
  return {
    x: Math.round(camera.x + viewport.width / 2),
    y: Math.round(camera.y + viewport.height / 2),
  };
}

export function getCanvasGridOffset(camera: CanvasCamera, cellSize: number) {
  const normalise = (value: number) => {
    const remainder = value % cellSize;
    return remainder > 0 ? remainder - cellSize : remainder;
  };

  return {
    x: normalise(-camera.x),
    y: normalise(-camera.y),
  };
}

function toCanvasType(item: PaletteItem): CanvasItemType {
  if (item === "column") {
    return "column-shell";
  }

  if (item === "board") {
    return "board-card";
  }

  if (item === "upload") {
    return "image";
  }

  return "note";
}

function canvasDimensions(type: CanvasItemType) {
  return CANVAS_ITEM_DIMENSIONS[type];
}

export function getCanvasSourceKey(source?: CanvasItemSource) {
  return source ? `${source.kind}:${source.id}` : null;
}

export function nextCanvasZIndex(items: CanvasItem[]) {
  return items.reduce((highest, item) => Math.max(highest, item.zIndex), 0) + 1;
}

export function clampCanvasPosition(
  point: CanvasPoint,
  size: { width: number; height: number },
  bounds: CanvasBounds,
) {
  return {
    x: clamp(point.x, 0, Math.max(bounds.width - size.width, 0)),
    y: clamp(point.y, 0, Math.max(bounds.height - size.height, 0)),
  };
}

export function bringCanvasItemToFront(items: CanvasItem[], itemId: string) {
  const nextZIndex = nextCanvasZIndex(items);
  return items.map((item) => (item.id === itemId ? { ...item, zIndex: nextZIndex } : item));
}

export function updateCanvasItemPosition(
  items: CanvasItem[],
  itemId: string,
  point: CanvasPoint,
) {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    return {
      ...item,
      x: Math.round(point.x),
      y: Math.round(point.y),
    };
  });
}

export function updateCanvasItem(
  items: CanvasItem[],
  itemId: string,
  updater: (item: CanvasItem) => CanvasItem,
) {
  return items.map((item) => (item.id === itemId ? updater(item) : item));
}

function baseCanvasPointForColumn(columnIndex: number): CanvasPoint {
  return {
    x: 80 + columnIndex * 340,
    y: 92,
  };
}

function baseCanvasPointForCard(columnIndex: number, cardIndex: number): CanvasPoint {
  return {
    x: 112 + columnIndex * 340,
    y: 260 + cardIndex * 234,
  };
}

function createSourceCanvasItem(
  source: CanvasItemSource,
  data: {
    type: CanvasItemType;
    title: string;
    content: string;
    label: string;
  },
  point: CanvasPoint,
  zIndex: number,
): CanvasItem {
  const dimensions = canvasDimensions(data.type);
  const nextPoint = {
    x: Math.round(point.x),
    y: Math.round(point.y),
  };

  if (data.type === "image") {
    return {
      id: createId("canvas-image"),
      type: "image",
      title: data.title,
      caption: data.content,
      imageUrl: "",
      label: data.label,
      zIndex,
      source,
      ...dimensions,
      ...nextPoint,
    };
  }

  if (data.type === "column-shell") {
    return {
      id: createId("canvas-column"),
      type: "column-shell",
      title: data.title,
      content: data.content,
      label: data.label,
      zIndex,
      source,
      ...dimensions,
      ...nextPoint,
    };
  }

  if (data.type === "board-card") {
    return {
      id: createId("canvas-board-card"),
      type: "board-card",
      title: data.title,
      content: data.content,
      label: data.label,
      zIndex,
      source,
      ...dimensions,
      ...nextPoint,
    };
  }

  return {
    id: createId("canvas-note"),
    type: "note",
    title: data.title,
    content: data.content,
    label: data.label,
    zIndex,
    source,
    ...dimensions,
    ...nextPoint,
  };
}

export function createCanvasItemFromPalette(
  item: PaletteItem,
  point: CanvasPoint,
  items: CanvasItem[],
) {
  const type = toCanvasType(item);
  const dimensions = canvasDimensions(type);
  const nextPoint = {
    x: Math.round(point.x),
    y: Math.round(point.y),
  };

  if (type === "image") {
    return {
      id: createId("canvas-image"),
      type: "image",
      title: "Image card",
      caption: "Paste an image URL to preview media on the canvas.",
      imageUrl: "",
      label: "Image card",
      zIndex: nextCanvasZIndex(items),
      ...dimensions,
      ...nextPoint,
    } satisfies CanvasItem;
  }

  if (type === "column-shell") {
    return {
      id: createId("canvas-column"),
      type: "column-shell",
      title: "Column shell",
      content: "Use this to stage a loose column concept outside the board lanes.",
      label: "Column",
      zIndex: nextCanvasZIndex(items),
      ...dimensions,
      ...nextPoint,
    } satisfies CanvasItem;
  }

  if (type === "board-card") {
    return {
      id: createId("canvas-board-card"),
      type: "board-card",
      title: "Board card shell",
      content: "A freeform card for planning structure before it becomes part of the board.",
      label: "Board card",
      zIndex: nextCanvasZIndex(items),
      ...dimensions,
      ...nextPoint,
    } satisfies CanvasItem;
  }

  return {
    id: createId("canvas-note"),
    type: "note",
    title: BLOCK_LABELS[item as BlockType],
    content: `Draft ${BLOCK_LABELS[item as BlockType].toLowerCase()} content in a freeform note card.`,
    label: BLOCK_LABELS[item as BlockType],
    zIndex: nextCanvasZIndex(items),
    ...dimensions,
    ...nextPoint,
  } satisfies CanvasItem;
}

export function syncCanvasItemsWithBoard(
  board: BoardState,
  items: CanvasItem[],
  dismissedSourceKeys: string[] = [],
) {
  const dismissed = new Set(dismissedSourceKeys);
  const currentBySourceKey = new Map<string, CanvasItem>();

  for (const item of items) {
    const sourceKey = getCanvasSourceKey(item.source);
    if (sourceKey) {
      currentBySourceKey.set(sourceKey, item);
    }
  }

  const activeSourceKeys = new Set<string>();
  const syncedSourceItems = new Map<string, CanvasItem>();
  let nextZ = nextCanvasZIndex(items);

  board.columns.forEach((column, columnIndex) => {
    const columnSource: CanvasItemSource = { kind: "column", id: column.id };
    const columnSourceKey = getCanvasSourceKey(columnSource);
    if (columnSourceKey) {
      activeSourceKeys.add(columnSourceKey);
    }

    if (!columnSourceKey || dismissed.has(columnSourceKey)) {
      return;
    }

    const existingColumnShell = currentBySourceKey.get(columnSourceKey);
    const columnShellContent = `${column.cards.length} ${
      column.cards.length === 1 ? "card" : "cards"
    } linked from board mode.`;
    const nextColumnShellBase = createSourceCanvasItem(
      columnSource,
      {
        type: "column-shell",
        title: column.title,
        content: columnShellContent,
        label: "Column shell",
      },
      baseCanvasPointForColumn(columnIndex),
      existingColumnShell?.zIndex ?? nextZ++,
    );

    syncedSourceItems.set(
      columnSourceKey,
      existingColumnShell
          ? {
              ...existingColumnShell,
              type: "column-shell",
              title: column.title,
              content: columnShellContent,
              label: "Column shell",
            }
          : nextColumnShellBase,
    );

    column.cards.forEach((card, cardIndex) => {
      const cardSource: CanvasItemSource = { kind: "card", id: card.id };
      const cardSourceKey = getCanvasSourceKey(cardSource);
      if (cardSourceKey) {
        activeSourceKeys.add(cardSourceKey);
      }

      if (!cardSourceKey || dismissed.has(cardSourceKey)) {
        return;
      }

      const existingCardShell = currentBySourceKey.get(cardSourceKey);
      const cardShellTitle = cardPreview(card) || "Board card";
      const cardShellContent = `${column.title} column · ${card.blocks.length} ${
        card.blocks.length === 1 ? "block" : "blocks"
      }${card.collapsed ? " · collapsed" : ""}`;
      const nextCardShellBase = createSourceCanvasItem(
        cardSource,
        {
          type: "board-card",
          title: cardShellTitle,
          content: cardShellContent,
          label: "Board card",
        },
        baseCanvasPointForCard(columnIndex, cardIndex),
        existingCardShell?.zIndex ?? nextZ++,
      );

      syncedSourceItems.set(
        cardSourceKey,
        existingCardShell
          ? {
              ...existingCardShell,
              type: "board-card",
              title: cardShellTitle,
              content: cardShellContent,
              label: "Board card",
            }
          : nextCardShellBase,
      );
    });
  });

  const nextItems = items
    .filter((item) => {
      const sourceKey = getCanvasSourceKey(item.source);
      if (!sourceKey) {
        return true;
      }

      return activeSourceKeys.has(sourceKey) && !dismissed.has(sourceKey);
    })
    .map((item) => {
      const sourceKey = getCanvasSourceKey(item.source);
      return sourceKey ? syncedSourceItems.get(sourceKey) ?? item : item;
    });

  syncedSourceItems.forEach((item, sourceKey) => {
    if (!currentBySourceKey.has(sourceKey)) {
      nextItems.push(item);
    }
  });

  return nextItems;
}

export function getCanvasResetCamera(
  items: CanvasItem[],
  viewport: { width: number; height: number },
  preferred: CanvasCamera = DEFAULT_CANVAS_CAMERA,
): CanvasCamera {
  if (viewport.width <= 0 || viewport.height <= 0 || items.length === 0) {
    return preferred;
  }

  const sortedItems = [...items].sort((left, right) => {
    if (left.source && !right.source) {
      return -1;
    }

    if (!left.source && right.source) {
      return 1;
    }

    if (left.y !== right.y) {
      return left.y - right.y;
    }

    if (left.x !== right.x) {
      return left.x - right.x;
    }

    return left.id.localeCompare(right.id);
  });

  const anchorItem = sortedItems[0];
  const anchorScreenPosition = worldToScreenPoint(anchorItem, preferred);
  const visibilityPadding = 72;
  const isAnchorVisible =
    anchorScreenPosition.x + anchorItem.width > visibilityPadding &&
    anchorScreenPosition.y + anchorItem.height > visibilityPadding &&
    anchorScreenPosition.x < viewport.width - visibilityPadding &&
    anchorScreenPosition.y < viewport.height - visibilityPadding;

  if (isAnchorVisible) {
    return preferred;
  }

  return {
    x: Math.round(anchorItem.x - (viewport.width - anchorItem.width) / 2),
    y: Math.round(anchorItem.y - (viewport.height - anchorItem.height) / 2),
  };
}

function formatFileSize(bytes: number) {
  if (bytes <= 0 || Number.isNaN(bytes)) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toUploadMetadata(file: File | null) {
  if (!file) {
    return { fileName: "", fileSize: "", fileType: "" };
  }

  return {
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    fileType: file.type || "File",
  };
}

function createTodoItem(text = ""): TodoItem {
  return {
    id: createId("todo"),
    text,
    checked: false,
  };
}

function createDefaultBlockData<TType extends BlockType>(type: TType): BlockDataByType[TType] {
  switch (type) {
    case "title":
      return { text: "" } as BlockDataByType[TType];
    case "heading":
      return { text: "" } as BlockDataByType[TType];
    case "note":
      return { text: "" } as BlockDataByType[TType];
    case "todo":
      return { items: [createTodoItem()] } as BlockDataByType[TType];
    case "link":
      return { label: "", url: "" } as BlockDataByType[TType];
    case "comment":
      return { text: "" } as BlockDataByType[TType];
    case "upload":
      return { fileName: "", fileSize: "", fileType: "" } as BlockDataByType[TType];
    case "color":
      return { label: "", value: "#6B7280" } as BlockDataByType[TType];
    case "map":
      return { location: "" } as BlockDataByType[TType];
    case "table":
      return {
        headers: ["Column 1", "Column 2"],
        rows: [
          ["", ""],
          ["", ""],
        ],
      } as BlockDataByType[TType];
    case "line":
      return {} as BlockDataByType[TType];
    default:
      return { text: "" } as BlockDataByType[TType];
  }
}

export function createBlock(type: BlockType): Block {
  return {
    id: createId("block"),
    type,
    data: createDefaultBlockData(type),
  } as Block;
}

export function copyBlock(block: Block): Block {
  switch (block.type) {
    case "todo":
      return {
        id: createId("block"),
        type: "todo",
        data: {
          items: block.data.items.map((item) => ({
            id: createId("todo"),
            text: item.text,
            checked: item.checked,
          })),
        },
      };
    case "table":
      return {
        id: createId("block"),
        type: "table",
        data: {
          headers: [...block.data.headers],
          rows: block.data.rows.map((row) => [...row]),
        },
      };
    default:
      return {
        ...block,
        id: createId("block"),
        data: { ...block.data },
      } as Block;
  }
}

export function createCard(blocks: Block[] = [createBlock("note")]): Card {
  return {
    id: createId("card"),
    blocks,
    collapsed: false,
  };
}

export function copyCard(card: Card): Card {
  return {
    id: createId("card"),
    collapsed: card.collapsed,
    blocks: card.blocks.map(copyBlock),
  };
}

export function createColumn(title: string, cards: Card[] = []): Column {
  return {
    id: createId("column"),
    title,
    cards,
  };
}

export function createSeedBoard(workspaceId: string): BoardState {
  const unassigned = createColumn("Unassigned", []);

  return {
    id: workspaceId,
    title: FALLBACK_WORKSPACE_TITLE,
    columns: [unassigned],
  };
}

export function countCards(board: BoardState) {
  return board.columns.reduce((total, column) => total + column.cards.length, 0);
}

export function withUpdatedColumns(board: BoardState, updater: (columns: Column[]) => Column[]) {
  return {
    ...board,
    columns: updater(board.columns),
  };
}

export function findCardLocation(board: BoardState, cardId: string) {
  for (let columnIndex = 0; columnIndex < board.columns.length; columnIndex += 1) {
    const cardIndex = board.columns[columnIndex].cards.findIndex((card) => card.id === cardId);
    if (cardIndex >= 0) {
      return { columnIndex, cardIndex };
    }
  }

  return null;
}

export function addColumn(board: BoardState, title: string) {
  return withUpdatedColumns(board, (columns) => [...columns, createColumn(title || "New Column")]);
}

export function renameColumn(board: BoardState, columnId: string, title: string) {
  return withUpdatedColumns(board, (columns) =>
    columns.map((column) => (column.id === columnId ? { ...column, title: title || "Untitled" } : column)),
  );
}

export function moveColumn(board: BoardState, columnId: string, targetIndex: number) {
  const sourceIndex = board.columns.findIndex((column) => column.id === columnId);
  if (sourceIndex < 0) {
    return board;
  }

  const nextColumns = [...board.columns];
  const [movingColumn] = nextColumns.splice(sourceIndex, 1);
  if (!movingColumn) {
    return board;
  }

  let insertionIndex = clamp(targetIndex, 0, nextColumns.length);
  if (sourceIndex < targetIndex) {
    insertionIndex -= 1;
  }

  if (insertionIndex === sourceIndex) {
    return board;
  }

  nextColumns.splice(insertionIndex, 0, movingColumn);
  return { ...board, columns: nextColumns };
}

export function addCard(board: BoardState, columnId: string, blockType: BlockType = "note") {
  return withUpdatedColumns(board, (columns) =>
    columns.map((column) =>
      column.id === columnId ? { ...column, cards: [...column.cards, createCard([createBlock(blockType)])] } : column,
    ),
  );
}

export function deleteCard(board: BoardState, cardId: string) {
  return withUpdatedColumns(board, (columns) =>
    columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => card.id !== cardId),
    })),
  );
}

export function duplicateCard(board: BoardState, cardId: string) {
  return withUpdatedColumns(board, (columns) =>
    columns.map((column) => {
      const index = column.cards.findIndex((card) => card.id === cardId);
      if (index < 0) return column;

      const duplicate = copyCard(column.cards[index]);
      const nextCards = [...column.cards];
      nextCards.splice(index + 1, 0, duplicate);
      return { ...column, cards: nextCards };
    }),
  );
}

export function toggleCardCollapsed(board: BoardState, cardId: string) {
  return withUpdatedColumns(board, (columns) =>
    columns.map((column) => ({
      ...column,
      cards: column.cards.map((card) =>
        card.id === cardId ? { ...card, collapsed: !card.collapsed } : card,
      ),
    })),
  );
}

export function moveCard(board: BoardState, cardId: string, targetColumnId: string, targetIndex: number) {
  const source = findCardLocation(board, cardId);
  const targetColumnIndex = board.columns.findIndex((column) => column.id === targetColumnId);

  if (!source || targetColumnIndex < 0) {
    return board;
  }

  const nextColumns = board.columns.map((column) => ({ ...column, cards: [...column.cards] }));
  const [movingCard] = nextColumns[source.columnIndex].cards.splice(source.cardIndex, 1);
  if (!movingCard) {
    return board;
  }

  let insertionIndex = clamp(targetIndex, 0, nextColumns[targetColumnIndex].cards.length);
  if (source.columnIndex === targetColumnIndex && source.cardIndex < insertionIndex) {
    insertionIndex -= 1;
  }

  nextColumns[targetColumnIndex].cards.splice(insertionIndex, 0, movingCard);
  return { ...board, columns: nextColumns };
}

export function updateCard(board: BoardState, cardId: string, updater: (card: Card) => Card) {
  return withUpdatedColumns(board, (columns) =>
    columns.map((column) => ({
      ...column,
      cards: column.cards.map((card) => (card.id === cardId ? updater(card) : card)),
    })),
  );
}

export function addBlockToCard(
  board: BoardState,
  cardId: string,
  blockType: BlockType,
  insertAtIndex?: number,
) {
  return updateCard(board, cardId, (card) => {
    const nextBlock = createBlock(blockType);
    const nextBlocks = [...card.blocks];

    if (typeof insertAtIndex !== "number") {
      nextBlocks.push(nextBlock);
    } else {
      const boundedIndex = clamp(insertAtIndex, 0, nextBlocks.length);
      nextBlocks.splice(boundedIndex, 0, nextBlock);
    }

    return {
      ...card,
      blocks: nextBlocks,
    };
  });
}

export function updateBlock(
  board: BoardState,
  cardId: string,
  blockId: string,
  updater: (block: Block) => Block,
) {
  return updateCard(board, cardId, (card) => ({
    ...card,
    blocks: card.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
  }));
}

export function deleteBlock(board: BoardState, cardId: string, blockId: string) {
  return updateCard(board, cardId, (card) => ({
    ...card,
    blocks: card.blocks.filter((block) => block.id !== blockId),
  }));
}

export function duplicateBlock(board: BoardState, cardId: string, blockId: string) {
  return updateCard(board, cardId, (card) => {
    const index = card.blocks.findIndex((block) => block.id === blockId);
    if (index < 0) return card;

    const duplicate = copyBlock(card.blocks[index]);
    const nextBlocks = [...card.blocks];
    nextBlocks.splice(index + 1, 0, duplicate);
    return { ...card, blocks: nextBlocks };
  });
}

export function reorderBlockInCard(board: BoardState, cardId: string, blockId: string, targetIndex: number) {
  return updateCard(board, cardId, (card) => {
    const sourceIndex = card.blocks.findIndex((block) => block.id === blockId);
    if (sourceIndex < 0) {
      return card;
    }

    const nextBlocks = [...card.blocks];
    const [movingBlock] = nextBlocks.splice(sourceIndex, 1);
    if (!movingBlock) {
      return card;
    }

    let insertionIndex = clamp(targetIndex, 0, nextBlocks.length);
    if (sourceIndex < targetIndex) {
      insertionIndex -= 1;
    }

    if (insertionIndex === sourceIndex) {
      return card;
    }

    nextBlocks.splice(insertionIndex, 0, movingBlock);
    return { ...card, blocks: nextBlocks };
  });
}

export function moveBlock(board: BoardState, cardId: string, blockId: string, direction: "up" | "down") {
  const column = board.columns.find((currentColumn) =>
    currentColumn.cards.some((card) => card.id === cardId),
  );
  const card = column?.cards.find((currentCard) => currentCard.id === cardId);
  const index = card?.blocks.findIndex((block) => block.id === blockId) ?? -1;
  if (!card || index < 0) {
    return board;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= card.blocks.length) {
    return board;
  }

  return reorderBlockInCard(board, cardId, blockId, targetIndex);
}

export function cardPreview(card: Card) {
  const firstBlock = card.blocks[0];
  if (!firstBlock) {
    return "Empty card";
  }

  switch (firstBlock.type) {
    case "title":
    case "heading":
    case "note":
    case "comment":
      return firstBlock.data.text || "Empty text block";
    case "todo":
      return firstBlock.data.items[0]?.text || "To-do block";
    case "link":
      return firstBlock.data.label || firstBlock.data.url || "Link block";
    case "upload":
      return firstBlock.data.fileName || "Upload block";
    case "color":
      return firstBlock.data.label || firstBlock.data.value || "Color block";
    case "map":
      return firstBlock.data.location || "Map block";
    case "table":
      return "Table block";
    case "line":
      return "Divider";
    default:
      return "Block";
  }
}
