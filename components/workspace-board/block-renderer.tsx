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
  "h-9 w-full rounded-[9px] border border-[rgba(48,51,58,0.18)] bg-white px-2.5 text-[13px] text-[#414752] outline-none focus-visible:ring-2 focus-visible:ring-[#5f6a7a]/40";
const TEXTAREA_CLASS =
  "w-full resize-none rounded-[9px] border border-[rgba(48,51,58,0.18)] bg-white px-2.5 py-2 text-[13px] leading-5 text-[#414752] outline-none focus-visible:ring-2 focus-visible:ring-[#5f6a7a]/40";

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
        className="w-full bg-transparent text-[22px] font-semibold leading-tight tracking-[0.02em] text-[#3f4450] outline-none"
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
        className="w-full bg-transparent text-[18px] font-semibold leading-tight tracking-[0.02em] text-[#444a56] outline-none"
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
        className={`${TEXTAREA_CLASS} min-h-[88px]`}
      />
    );
  }

  if (block.type === "todo") {
    const data = block.data as TodoBlockData;
    return (
      <div className="space-y-2">
        {data.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.checked}
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
              className="h-4 w-4 rounded border-[rgba(59,62,70,0.5)]"
            />
            <input
              value={item.text}
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
              placeholder="To-do item"
              className={`${INPUT_CLASS} ${
                item.checked ? "text-[#8c9098] line-through" : ""
              }`}
            />
          </div>
        ))}
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
          className="rounded-[8px] border border-[rgba(55,58,66,0.2)] bg-white px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] text-[#4c5260] transition-colors hover:bg-[rgba(246,247,249,0.95)]"
        >
          Add To-do Item
        </button>
      </div>
    );
  }

  if (block.type === "link") {
    const data = block.data as LinkBlockData;
    const url = data.url.trim();
    const validUrl = isValidHttpUrl(url);

    return (
      <div className="space-y-2">
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
          className={`${INPUT_CLASS} ${
            !validUrl ? "border-[#d49f9f] text-[#8f4d4d]" : ""
          }`}
        />

        {url && validUrl ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-[12px] tracking-[0.03em] text-[#355f8e] underline decoration-[#355f8e]/50 underline-offset-2"
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
        className={`${TEXTAREA_CLASS} min-h-[72px] bg-[rgba(251,252,253,0.95)] text-[12px]`}
      />
    );
  }

  if (block.type === "upload") {
    const data = block.data as UploadBlockData;
    return (
      <div className="space-y-2">
        <label className="inline-flex cursor-pointer items-center rounded-[9px] border border-[rgba(55,58,66,0.2)] bg-white px-3 py-1.5 text-[12px] font-medium tracking-[0.04em] text-[#505560] transition-colors hover:bg-[rgba(246,247,249,0.95)]">
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
          <div className="rounded-[9px] border border-[rgba(55,58,66,0.18)] bg-[rgba(250,250,251,0.95)] px-2.5 py-2 text-[12px] text-[#4a505b]">
            <p className="truncate font-medium">{data.fileName}</p>
            <p className="mt-1 text-[11px] text-[#646b78]">
              {data.fileType || "File"}{data.fileSize ? ` · ${data.fileSize}` : ""}
            </p>
          </div>
        ) : (
          <div className="rounded-[9px] border border-dashed border-[rgba(55,58,66,0.24)] bg-[rgba(250,250,251,0.7)] px-2.5 py-3 text-[12px] text-[#666b76]">
            Upload placeholder. Select a file to preview metadata.
          </div>
        )}
      </div>
    );
  }

  if (block.type === "color") {
    const data = block.data as ColorBlockData;
    const validHex = /^#[0-9A-Fa-f]{6}$/.test(data.value) ? data.value : "#6B7280";

    return (
      <div className="space-y-2">
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
            className="h-9 w-11 rounded-[9px] border border-[rgba(55,58,66,0.2)] bg-white p-1"
          />
          <input
            value={data.value}
            onChange={(event) => onChange({ ...block, data: { ...data, value: event.target.value } })}
            placeholder="#6B7280"
            className={INPUT_CLASS}
          />
        </div>
        <div
          className="h-10 w-full rounded-[9px] border border-[rgba(55,58,66,0.18)]"
          style={{ backgroundColor: validHex }}
        />
      </div>
    );
  }

  if (block.type === "map") {
    const data = block.data as MapBlockData;
    return (
      <div className="space-y-2">
        <input
          value={data.location}
          onChange={(event) => onChange({ ...block, data: { ...data, location: event.target.value } })}
          placeholder="Search location"
          className={INPUT_CLASS}
        />
        <div className="rounded-[9px] border border-[rgba(55,58,66,0.18)] bg-[linear-gradient(180deg,#f8f9fa_0%,#eef1f4_100%)] px-3 py-3 text-[12px] text-[#5a6070]">
          <p className="font-medium tracking-[0.03em]">Map preview</p>
          <p className="mt-1 text-[11px] text-[#687085]">
            {data.location.trim() || "Enter a location to preview the map block."}
          </p>
        </div>
      </div>
    );
  }

  if (block.type === "table") {
    const data = normalizeTable(block.data as TableBlockData);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
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
            className="rounded-[8px] border border-[rgba(55,58,66,0.2)] bg-white px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] text-[#4c5260] transition-colors hover:bg-[rgba(246,247,249,0.95)]"
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
            className="rounded-[8px] border border-[rgba(55,58,66,0.2)] bg-white px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] text-[#4c5260] transition-colors hover:bg-[rgba(246,247,249,0.95)]"
          >
            Add Column
          </button>
        </div>

        <div className="overflow-x-auto rounded-[9px] border border-[rgba(55,58,66,0.2)] bg-white">
          <table className="w-full min-w-[260px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(55,58,66,0.14)]">
                {data.headers.map((header, headerIndex) => (
                  <th
                    key={`header-${headerIndex}`}
                    className="border-r border-[rgba(55,58,66,0.12)] bg-[rgba(248,249,251,0.9)] p-0 text-left last:border-r-0"
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
                      className="h-9 w-full border-0 bg-transparent px-2 text-[11px] font-semibold tracking-[0.04em] text-[#48505d] outline-none"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b border-[rgba(55,58,66,0.12)] last:border-b-0">
                  {row.map((cell, columnIndex) => (
                    <td
                      key={`cell-${rowIndex}-${columnIndex}`}
                      className="border-r border-[rgba(55,58,66,0.12)] last:border-r-0"
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
                        className="h-9 w-full min-w-[100px] border-0 px-2 text-[12px] text-[#444a57] outline-none"
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

  return <div className="h-px w-full bg-[rgba(72,78,88,0.25)]" />;
}
