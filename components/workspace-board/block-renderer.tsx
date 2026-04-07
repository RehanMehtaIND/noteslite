"use client";

import { type FormEvent } from "react";

import type {
  Block,
  ColorBlockData,
  CommentBlockData,
  HeadingBlockData,
  LinkBlockData,
  MapBlockData,
  NoteBlockData,
  TableBlockData,
  TitleBlockData,
  TodoBlockData,
  UploadBlockData,
} from "./types";
import { createId, toUploadMetadata } from "./utils";

type BlockRendererProps = {
  block: Block;
  onChange: (next: Block) => void;
};

const INPUT_CLASS =
  "h-10 w-full rounded-[12px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.88)] px-3 text-[13px] text-[color:var(--board-text-strong)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] placeholder:text-[color:var(--board-text-soft)] focus-visible:border-[color:var(--board-border-accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const TEXTAREA_CLASS =
  "w-full resize-none rounded-[12px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.88)] px-3 py-2.5 text-[13px] leading-6 text-[color:var(--board-text-strong)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] placeholder:text-[color:var(--board-text-soft)] focus-visible:border-[color:var(--board-border-accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const ACTION_BUTTON_CLASS =
  "inline-flex h-[var(--board-action-chip-height)] items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.9)] px-[var(--board-action-chip-px)] text-[10px] font-semibold uppercase leading-none tracking-[var(--board-action-chip-track)] text-[color:var(--board-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-[rgba(255,255,255,0.98)] hover:text-[color:var(--board-text-strong)] active:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const TODO_ROW_CLASS =
  "flex items-center gap-3 rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.72)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] transition-[border-color,background-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-within:border-[color:var(--board-border-accent)] focus-within:bg-white focus-within:shadow-[0_10px_18px_rgba(76,84,101,0.08)]";
const TODO_INPUT_CLASS =
  "min-h-[42px] w-full border-0 bg-transparent px-0 text-[15px] leading-6 text-[color:var(--board-text-strong)] outline-none transition-colors duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] placeholder:text-[color:var(--board-text-soft)]";
const TODO_CHECKBOX_CLASS =
  "mt-0 h-[22px] w-[22px] shrink-0 rounded-[7px] border-[color:var(--board-border-strong)] bg-white/90 text-[color:var(--board-accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] accent-[var(--board-accent-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";
const TODO_ADD_BUTTON_CLASS =
  "inline-flex min-h-[var(--board-action-chip-height-roomy)] items-center justify-center self-start rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.92)] px-[var(--board-action-chip-px-wide)] text-[10px] font-semibold uppercase leading-none tracking-[var(--board-action-chip-track)] text-[color:var(--board-accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-accent)] hover:bg-white hover:text-[color:var(--board-text-strong)] hover:shadow-[0_10px_18px_rgba(76,84,101,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]";

function autoResize(event: FormEvent<HTMLTextAreaElement>) {
  const element = event.currentTarget;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function normalizeTable(data: TableBlockData): TableBlockData {
  const headers = data.headers.length > 0 ? [...data.headers] : ["Column 1", "Column 2"];
  const rows = data.rows.length > 0 ? data.rows.map((row) => [...row]) : [["", ""], ["", ""]];
  const columnCount = headers.length;

  const normalizedRows = rows.map((row) => {
    const nextRow = [...row];
    while (nextRow.length < columnCount) {
      nextRow.push("");
    }

    if (nextRow.length > columnCount) {
      return nextRow.slice(0, columnCount);
    }

    return nextRow;
  });

  return {
    headers,
    rows: normalizedRows,
  };
}

function isValidHttpUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  return /^https?:\/\/.+/i.test(value.trim());
}

export function BlockRenderer({ block, onChange }: BlockRendererProps) {
  if (block.type === "title") {
    const data = block.data as TitleBlockData;
    return (
      <input
        value={data.text}
        onChange={(event) => onChange({ ...block, data: { ...data, text: event.target.value } })}
        placeholder="Untitled"
        className="w-full rounded-[12px] bg-transparent px-1 py-1 text-[22px] font-semibold leading-tight tracking-[0.02em] text-[color:var(--board-text-strong)] outline-none transition-[background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] placeholder:text-[color:var(--board-text-soft)] focus-visible:bg-[rgba(255,255,255,0.72)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
      />
    );
  }

  if (block.type === "heading") {
    const data = block.data as HeadingBlockData;
    return (
      <input
        value={data.text}
        onChange={(event) => onChange({ ...block, data: { ...data, text: event.target.value } })}
        placeholder="Heading"
        className="w-full rounded-[12px] bg-transparent px-1 py-1 text-[18px] font-semibold leading-tight tracking-[0.02em] text-[color:var(--board-text)] outline-none transition-[background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] placeholder:text-[color:var(--board-text-soft)] focus-visible:bg-[rgba(255,255,255,0.72)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
      />
    );
  }

  if (block.type === "note") {
    const data = block.data as NoteBlockData;
    return (
      <textarea
        rows={4}
        value={data.text}
        onInput={autoResize}
        onChange={(event) => onChange({ ...block, data: { ...data, text: event.target.value } })}
        placeholder="Write note..."
        className={`${TEXTAREA_CLASS} min-h-[104px]`}
      />
    );
  }

  if (block.type === "todo") {
    const data = block.data as TodoBlockData;
    const completedCount = data.items.filter((item) => item.checked).length;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-[var(--board-status-pill-height)] items-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.66)] px-[var(--board-status-pill-px)] text-[9px] font-semibold uppercase leading-none tracking-[var(--board-status-pill-track)] text-[color:var(--board-text-soft)]">
            Checklist
          </span>
          <span className="inline-flex h-[var(--board-status-pill-height)] items-center rounded-full border border-[color:var(--board-border)] bg-[var(--board-warm-soft)] px-[var(--board-status-pill-px)] text-[9px] font-medium uppercase leading-none tracking-[var(--board-status-pill-track)] text-[color:var(--board-warm)]">
            {completedCount}/{data.items.length} done
          </span>
        </div>

        <div className="space-y-2.5 rounded-[18px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.4)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          {data.items.map((item, index) => (
            <label key={item.id} className={TODO_ROW_CLASS}>
              <input
                type="checkbox"
                checked={item.checked}
                aria-label={`Toggle to-do item ${index + 1}`}
                onChange={(event) =>
                  onChange({
                    ...block,
                    data: {
                      ...data,
                      items: data.items.map((todoItem) =>
                        todoItem.id === item.id ? { ...todoItem, checked: event.target.checked } : todoItem,
                      ),
                    },
                  })
                }
                className={TODO_CHECKBOX_CLASS}
              />
              <span className="min-w-0 flex-1">
                <input
                  value={item.text}
                  aria-label={`To-do item ${index + 1}`}
                  onChange={(event) =>
                    onChange({
                      ...block,
                      data: {
                        ...data,
                        items: data.items.map((todoItem) =>
                          todoItem.id === item.id ? { ...todoItem, text: event.target.value } : todoItem,
                        ),
                      },
                    })
                  }
                  placeholder={`To-do item ${index + 1}`}
                  className={`${TODO_INPUT_CLASS} ${item.checked ? "text-[color:var(--board-text-soft)] line-through" : ""}`}
                />
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            onChange({
              ...block,
              data: {
                ...data,
                items: [...data.items, { id: createId("todo"), text: "", checked: false }],
              },
            })
          }
          className={TODO_ADD_BUTTON_CLASS}
        >
          + Add item
        </button>
      </div>
    );
  }

  if (block.type === "link") {
    const data = block.data as LinkBlockData;
    const url = data.url.trim();
    const validUrl = isValidHttpUrl(url);

    return (
      <div className="space-y-2.5">
        <input
          value={data.label}
          onChange={(event) => onChange({ ...block, data: { ...data, label: event.target.value } })}
          placeholder="Link label"
          className={INPUT_CLASS}
        />
        <input
          value={data.url}
          onChange={(event) => onChange({ ...block, data: { ...data, url: event.target.value } })}
          placeholder="https://..."
          className={`${INPUT_CLASS} ${!validUrl ? "border-[color:var(--board-danger)] text-[color:var(--board-danger)]" : ""}`}
        />

        {url && validUrl ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-[12px] font-medium tracking-[0.03em] text-[color:var(--board-accent-strong)] underline decoration-[color:var(--board-accent)] underline-offset-2"
          >
            Open link
          </a>
        ) : null}
      </div>
    );
  }

  if (block.type === "comment") {
    const data = block.data as CommentBlockData;
    return (
      <textarea
        rows={3}
        value={data.text}
        onInput={autoResize}
        onChange={(event) => onChange({ ...block, data: { ...data, text: event.target.value } })}
        placeholder="Leave a comment..."
        className={`${TEXTAREA_CLASS} min-h-[84px] bg-[rgba(251,252,253,0.95)] text-[12px]`}
      />
    );
  }

  if (block.type === "upload") {
    const data = block.data as UploadBlockData;
    return (
      <div className="space-y-2.5">
        <label className={`${ACTION_BUTTON_CLASS} cursor-pointer`}>
          Choose File
          <input
            type="file"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              onChange({ ...block, data: { ...toUploadMetadata(file) } });
            }}
          />
        </label>

        {data.fileName ? (
          <div className="rounded-[12px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.82)] px-3 py-3 text-[12px] text-[color:var(--board-text)]">
            <p className="truncate font-medium">{data.fileName}</p>
            <p className="mt-1 text-[11px] text-[color:var(--board-text-soft)]">
              {data.fileType || "File"}
              {data.fileSize ? ` · ${data.fileSize}` : ""}
            </p>
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-[color:var(--board-border-strong)] bg-[rgba(255,255,255,0.64)] px-3 py-4 text-[12px] leading-6 text-[color:var(--board-text-muted)]">
            Select a file to preview the item name and metadata.
          </div>
        )}
      </div>
    );
  }

  if (block.type === "color") {
    const data = block.data as ColorBlockData;
    const validHex = /^#[0-9A-Fa-f]{6}$/.test(data.value) ? data.value : "#6B7280";

    return (
      <div className="space-y-2.5">
        <input
          value={data.label}
          onChange={(event) => onChange({ ...block, data: { ...data, label: event.target.value } })}
          placeholder="Color label"
          className={INPUT_CLASS}
        />
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={validHex}
            onChange={(event) => onChange({ ...block, data: { ...data, value: event.target.value } })}
            className="h-10 w-12 rounded-[12px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.92)] p-1 outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
          />
          <input
            value={data.value}
            onChange={(event) => onChange({ ...block, data: { ...data, value: event.target.value } })}
            placeholder="#6B7280"
            className={INPUT_CLASS}
          />
        </div>
        <div
          className="h-12 w-full rounded-[12px] border border-[color:var(--board-border)]"
          style={{ backgroundColor: validHex }}
        />
      </div>
    );
  }

  if (block.type === "map") {
    const data = block.data as MapBlockData;
    return (
      <div className="space-y-2.5">
        <input
          value={data.location}
          onChange={(event) => onChange({ ...block, data: { ...data, location: event.target.value } })}
          placeholder="Search location"
          className={INPUT_CLASS}
        />
        <div className="rounded-[12px] border border-[color:var(--board-border)] bg-[linear-gradient(180deg,rgba(248,249,250,0.98)_0%,rgba(238,241,244,0.96)_100%)] px-3 py-3 text-[12px] text-[color:var(--board-text)]">
          <p className="font-semibold tracking-[0.03em] text-[color:var(--board-text-strong)]">Map preview</p>
          <p className="mt-1 text-[11px] leading-5 text-[color:var(--board-text-soft)]">
            {data.location.trim() || "Enter a location to preview the map block."}
          </p>
        </div>
      </div>
    );
  }

  if (block.type === "table") {
    const data = normalizeTable(block.data as TableBlockData);
    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                data: {
                  headers: [...data.headers],
                  rows: [...data.rows, Array(data.headers.length).fill("")],
                },
              })
            }
            className={ACTION_BUTTON_CLASS}
          >
            Add Row
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                data: {
                  headers: [...data.headers, `Column ${data.headers.length + 1}`],
                  rows: data.rows.map((row) => [...row, ""]),
                },
              })
            }
            className={ACTION_BUTTON_CLASS}
          >
            Add Column
          </button>
        </div>

        <div className="overflow-x-auto rounded-[12px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.92)]">
          <table className="w-full min-w-[280px] border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--board-border)]">
                {data.headers.map((header, headerIndex) => (
                  <th
                    key={`header-${headerIndex}`}
                    className="border-r border-[color:var(--board-border)] bg-[rgba(248,249,251,0.9)] p-0 text-left last:border-r-0"
                  >
                    <input
                      value={header}
                      onChange={(event) =>
                        onChange({
                          ...block,
                          data: {
                            headers: data.headers.map((item, index) =>
                              index === headerIndex ? event.target.value : item,
                            ),
                            rows: data.rows.map((row) => [...row]),
                          },
                        })
                      }
                      className="h-10 w-full border-0 bg-transparent px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--board-text-muted)] outline-none transition-[background-color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:bg-white"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b border-[color:var(--board-border)] last:border-b-0">
                  {row.map((cell, columnIndex) => (
                    <td
                      key={`cell-${rowIndex}-${columnIndex}`}
                      className="border-r border-[color:var(--board-border)] last:border-r-0"
                    >
                      <input
                        value={cell}
                        onChange={(event) =>
                          onChange({
                            ...block,
                            data: {
                              headers: [...data.headers],
                              rows: data.rows.map((tableRow, nextRowIndex) =>
                                nextRowIndex === rowIndex
                                  ? tableRow.map((tableCell, nextCellIndex) =>
                                      nextCellIndex === columnIndex ? event.target.value : tableCell,
                                    )
                                  : [...tableRow],
                              ),
                            },
                          })
                        }
                        placeholder="Cell"
                        className="h-10 w-full min-w-[110px] border-0 bg-transparent px-3 text-[12px] text-[color:var(--board-text)] outline-none transition-[background-color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] placeholder:text-[color:var(--board-text-soft)] focus-visible:bg-white"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <div className="h-px w-full bg-[color:var(--board-border-strong)]" />;
}
