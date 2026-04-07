export type BlockType =
  | "title"
  | "heading"
  | "note"
  | "todo"
  | "link"
  | "comment"
  | "upload"
  | "color"
  | "map"
  | "table"
  | "line";

export type PaletteItem = BlockType | "column" | "board";

export type TodoItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type TitleBlockData = { text: string };
export type HeadingBlockData = { text: string };
export type NoteBlockData = { text: string };
export type CommentBlockData = { text: string };
export type TodoBlockData = { items: TodoItem[] };
export type LinkBlockData = { label: string; url: string };
export type UploadBlockData = { fileName: string; fileSize: string; fileType: string };
export type ColorBlockData = { label: string; value: string };
export type MapBlockData = { location: string };
export type TableBlockData = { headers: string[]; rows: string[][] };
export type LineBlockData = Record<string, never>;

export type BlockDataByType = {
  title: TitleBlockData;
  heading: HeadingBlockData;
  note: NoteBlockData;
  todo: TodoBlockData;
  link: LinkBlockData;
  comment: CommentBlockData;
  upload: UploadBlockData;
  color: ColorBlockData;
  map: MapBlockData;
  table: TableBlockData;
  line: LineBlockData;
};

export type Block<TType extends BlockType = BlockType> = TType extends BlockType
  ? {
      id: string;
      type: TType;
      data: BlockDataByType[TType];
    }
  : never;

export type Card = {
  id: string;
  blocks: Block[];
  collapsed: boolean;
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};

export type BoardState = {
  id: string;
  title: string;
  columns: Column[];
};

export type CardLocation = {
  columnId: string;
  cardId: string;
};

export type CanvasViewMode = "board" | "canvas";
export type CanvasUiMode = "expanded" | "minimized";

export type CanvasCamera = {
  x: number;
  y: number;
};

export type CanvasItemType = "note" | "image" | "board-card" | "column-shell";

export type CanvasItemSource =
  | {
      kind: "card";
      id: string;
    }
  | {
      kind: "column";
      id: string;
    };

type CanvasItemBase = {
  id: string;
  type: CanvasItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  source?: CanvasItemSource;
};

export type CanvasNoteItem = CanvasItemBase & {
  type: "note";
  title: string;
  content: string;
  label: string;
};

export type CanvasImageItem = CanvasItemBase & {
  type: "image";
  title: string;
  imageUrl: string;
  caption: string;
  label: string;
};

export type CanvasBoardCardItem = CanvasItemBase & {
  type: "board-card";
  title: string;
  content: string;
  label: string;
};

export type CanvasColumnShellItem = CanvasItemBase & {
  type: "column-shell";
  title: string;
  content: string;
  label: string;
};

export type CanvasItem =
  | CanvasNoteItem
  | CanvasImageItem
  | CanvasBoardCardItem
  | CanvasColumnShellItem;

export type CanvasPoint = {
  x: number;
  y: number;
};

export type CanvasBounds = {
  width: number;
  height: number;
};
