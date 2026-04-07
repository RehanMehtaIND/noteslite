import type {
  Block,
  BlockDataByType,
  BlockType,
  BoardState,
  Card,
  Column,
  TodoItem,
} from "./types";

const FALLBACK_WORKSPACE_TITLE = "New Workspace";
let idCounter = 0;

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
