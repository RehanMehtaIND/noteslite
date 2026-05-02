import type { BlockType, PaletteItem } from "./types";

export type SidebarSection = {
  title: string;
  items: Array<{ id: PaletteItem; label: string }>;
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  title: "Title",
  heading: "Heading",
  note: "Note",
  todo: "To-do",
  link: "Link",
  comment: "Comment",
  upload: "Upload",
  color: "Color",
  map: "Map",
  table: "Table",
  line: "Line",
};

export const BLOCK_MENU_TYPES: BlockType[] = [
  "title",
  "heading",
  "note",
  "todo",
  "link",
  "comment",
  "upload",
  "color",
  "map",
  "table",
  "line",
];

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "Structure",
    items: [
      { id: "column", label: "Column" },
      { id: "line", label: "Line" },
    ],
  },
  {
    title: "Blocks",
    items: [
      { id: "title", label: "Title" },
      { id: "heading", label: "Heading" },
      { id: "note", label: "Note" },
      { id: "todo", label: "To-do" },
      { id: "link", label: "Link" },
      { id: "comment", label: "Comment" },
      { id: "upload", label: "Upload" },
      { id: "color", label: "Color" },
      { id: "map", label: "Map" },
      { id: "table", label: "Table" },
    ],
  },
];
