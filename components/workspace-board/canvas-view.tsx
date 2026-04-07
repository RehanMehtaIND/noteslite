"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";

import type {
  CanvasCamera,
  CanvasItem,
  CanvasPoint,
  CanvasUiMode,
  PaletteItem,
} from "./types";
import {
  bringCanvasItemToFront,
  getCanvasGridOffset,
  getCanvasResetCamera,
  getCanvasViewportCenter,
  panCanvasCamera,
  screenToWorldPoint,
  updateCanvasItem,
  updateCanvasItemPosition,
  worldToScreenPoint,
} from "./utils";

const PALETTE_MIME = "application/x-noteslite-palette";
const CANVAS_GRID_SIZE = 28;

type CanvasViewProps = {
  items: CanvasItem[];
  camera: CanvasCamera;
  uiMode: CanvasUiMode;
  selectedItemId: string | null;
  draggingPaletteItem: PaletteItem | null;
  onSelectItem: (itemId: string | null) => void;
  onItemsChange: (updater: (items: CanvasItem[]) => CanvasItem[]) => void;
  onCreateItem: (item: PaletteItem, point?: CanvasPoint) => void;
  onDeleteItem: (itemId: string) => void;
  onCanvasPointChange: (point: CanvasPoint) => void;
  onCameraChange: Dispatch<SetStateAction<CanvasCamera>>;
  onCanvasUiModeChange: Dispatch<SetStateAction<CanvasUiMode>>;
};

type PointerItemDragState = {
  itemId: string;
  offsetX: number;
  offsetY: number;
};

type PointerPanState = {
  startClientX: number;
  startClientY: number;
  startCamera: CanvasCamera;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || target.isContentEditable;
}

function isValidImageUrl(value: string) {
  if (!value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function CanvasItemGrip({
  label,
  onPointerDown,
  isDragging,
}: {
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  isDragging: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
      className={`inline-flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.9)] text-[color:var(--board-handle-icon)] shadow-[0_10px_18px_rgba(47,43,40,0.1),inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,background-color,box-shadow,transform,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-[color:var(--board-handle-surface-pressed)] hover:text-[color:var(--board-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)] ${
        isDragging
          ? "border-[color:var(--board-border-accent)] bg-[color:var(--board-handle-surface-pressed)] shadow-[0_16px_26px_rgba(47,43,40,0.16)]"
          : ""
      }`}
    >
      <span className="grid grid-cols-2 gap-[var(--board-handle-dot-gap)]">
        <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
        <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
        <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
        <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
        <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
        <span className="h-[var(--board-handle-dot-size)] w-[var(--board-handle-dot-size)] rounded-full bg-current" />
      </span>
    </button>
  );
}

export function CanvasView({
  items,
  camera,
  uiMode,
  selectedItemId,
  draggingPaletteItem,
  onSelectItem,
  onItemsChange,
  onCreateItem,
  onDeleteItem,
  onCanvasPointChange,
  onCameraChange,
  onCanvasUiModeChange,
}: CanvasViewProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef(camera);
  const itemDragStateRef = useRef<PointerItemDragState | null>(null);
  const panStateRef = useRef<PointerPanState | null>(null);
  const itemsRef = useRef(items);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isPaletteDropActive, setIsPaletteDropActive] = useState(false);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const updateFrame = () => {
      setFrameSize({
        width: frame.clientWidth,
        height: frame.clientHeight,
      });
    };

    updateFrame();

    const observer = new ResizeObserver(updateFrame);
    observer.observe(frame);
    window.addEventListener("resize", updateFrame);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFrame);
    };
  }, []);

  useEffect(() => {
    if (frameSize.width <= 0 || frameSize.height <= 0 || draggingItemId || isPanning) {
      return;
    }

    onCanvasPointChange(getCanvasViewportCenter(camera, frameSize));
  }, [camera, draggingItemId, frameSize, isPanning, onCanvasPointChange]);

  const getFramePointFromClient = useCallback((clientX: number, clientY: number) => {
    const frame = frameRef.current;
    if (!frame) {
      return null;
    }

    const rect = frame.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    } satisfies CanvasPoint;
  }, []);

  const getWorldPointFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const framePoint = getFramePointFromClient(clientX, clientY);
      if (!framePoint) {
        return null;
      }

      return screenToWorldPoint(framePoint, cameraRef.current);
    },
    [getFramePointFromClient],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const itemDragState = itemDragStateRef.current;
      if (itemDragState) {
        const nextPoint = getWorldPointFromClient(event.clientX, event.clientY);
        if (!nextPoint) {
          return;
        }

        event.preventDefault();
        onCanvasPointChange(nextPoint);
        onItemsChange((currentItems) =>
          updateCanvasItemPosition(currentItems, itemDragState.itemId, {
            x: nextPoint.x - itemDragState.offsetX,
            y: nextPoint.y - itemDragState.offsetY,
          }),
        );
        return;
      }

      const panState = panStateRef.current;
      if (!panState) {
        return;
      }

      event.preventDefault();
      const delta = {
        x: event.clientX - panState.startClientX,
        y: event.clientY - panState.startClientY,
      };
      onCameraChange(panCanvasCamera(panState.startCamera, delta));
    },
    [getWorldPointFromClient, onCameraChange, onCanvasPointChange, onItemsChange],
  );

  const stopPointerInteraction = useCallback(() => {
    itemDragStateRef.current = null;
    panStateRef.current = null;
    setDraggingItemId(null);
    setIsPanning(false);
    setIsPaletteDropActive(false);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopPointerInteraction);
    window.removeEventListener("pointercancel", stopPointerInteraction);
  }, [handlePointerMove]);

  useEffect(() => stopPointerInteraction, [stopPointerInteraction]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (itemDragStateRef.current || panStateRef.current)) {
        event.preventDefault();
        stopPointerInteraction();
        return;
      }

      if (!selectedItemId || (event.key !== "Delete" && event.key !== "Backspace")) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      onDeleteItem(selectedItemId);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDeleteItem, selectedItemId, stopPointerInteraction]);

  const startPointerTracking = useCallback(() => {
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopPointerInteraction);
    window.addEventListener("pointercancel", stopPointerInteraction);
  }, [handlePointerMove, stopPointerInteraction]);

  const startDraggingItem = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, itemId: string) => {
      if (event.button !== 0) {
        return;
      }

      const targetItem = itemsRef.current.find((item) => item.id === itemId);
      const pointerPoint = getWorldPointFromClient(event.clientX, event.clientY);
      if (!targetItem || !pointerPoint) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      itemDragStateRef.current = {
        itemId,
        offsetX: pointerPoint.x - targetItem.x,
        offsetY: pointerPoint.y - targetItem.y,
      };

      onCanvasPointChange(pointerPoint);
      onSelectItem(itemId);
      onItemsChange((currentItems) => bringCanvasItemToFront(currentItems, itemId));
      setDraggingItemId(itemId);
      setIsPanning(false);
      startPointerTracking();
    },
    [getWorldPointFromClient, onCanvasPointChange, onItemsChange, onSelectItem, startPointerTracking],
  );

  const startPanningCanvas = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || event.target !== event.currentTarget || draggingPaletteItem) {
        return;
      }

      event.preventDefault();
      onSelectItem(null);
      panStateRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        startCamera: camera,
      };
      setDraggingItemId(null);
      setIsPanning(true);
      startPointerTracking();
    },
    [camera, draggingPaletteItem, onSelectItem, startPointerTracking],
  );

  const rememberCanvasPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const point = getWorldPointFromClient(event.clientX, event.clientY);
      if (point) {
        onCanvasPointChange(point);
      }
    },
    [getWorldPointFromClient, onCanvasPointChange],
  );

  const onCanvasDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (!draggingPaletteItem) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsPaletteDropActive(true);
      rememberCanvasPoint(event);
    },
    [draggingPaletteItem, rememberCanvasPoint],
  );

  const onCanvasDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsPaletteDropActive(false);
      const paletteItem = event.dataTransfer.getData(PALETTE_MIME) as PaletteItem;
      if (!paletteItem) {
        return;
      }

      const point = getWorldPointFromClient(event.clientX, event.clientY) ?? undefined;
      onCreateItem(paletteItem, point);
    },
    [getWorldPointFromClient, onCreateItem],
  );

  const handleResetView = useCallback(() => {
    const nextCamera = getCanvasResetCamera(itemsRef.current, frameSize);
    onCameraChange(nextCamera);
    onCanvasPointChange(getCanvasViewportCenter(nextCamera, frameSize));
  }, [frameSize, onCameraChange, onCanvasPointChange]);

  const gridOffset = useMemo(() => getCanvasGridOffset(camera, CANVAS_GRID_SIZE), [camera]);

  const renderCanvasItemBody = useCallback(
    (item: CanvasItem) => {
      switch (item.type) {
        case "note":
          return (
            <div className="grid h-full gap-3">
              <input
                value={item.title}
                onChange={(event) =>
                  onItemsChange((currentItems) =>
                    updateCanvasItem(currentItems, item.id, (current) =>
                      current.type === "note" ? { ...current, title: event.target.value } : current,
                    ),
                  )
                }
                className="h-10 rounded-[14px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.84)] px-3 text-[16px] tracking-[0.02em] text-[color:var(--board-text-strong)] outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
              />
              <textarea
                value={item.content}
                onChange={(event) =>
                  onItemsChange((currentItems) =>
                    updateCanvasItem(currentItems, item.id, (current) =>
                      current.type === "note" ? { ...current, content: event.target.value } : current,
                    ),
                  )
                }
                className="min-h-[110px] flex-1 resize-none rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.74)] px-3 py-3 text-[14px] leading-6 text-[color:var(--board-text)] outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
              />
            </div>
          );
        case "image":
          return (
            <div className="grid h-full gap-3">
              <div className="relative overflow-hidden rounded-[18px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.78)]">
                {isValidImageUrl(item.imageUrl) ? (
                  <div
                    className="h-[132px] w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${item.imageUrl}")` }}
                    aria-label={item.title}
                  />
                ) : (
                  <div className="grid h-[132px] place-items-center bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(225,229,235,0.88)_100%)] text-center text-[12px] uppercase tracking-[0.18em] text-[color:var(--board-text-soft)]">
                    Image preview
                  </div>
                )}
              </div>
              <input
                value={item.imageUrl}
                onChange={(event) =>
                  onItemsChange((currentItems) =>
                    updateCanvasItem(currentItems, item.id, (current) =>
                      current.type === "image" ? { ...current, imageUrl: event.target.value } : current,
                    ),
                  )
                }
                placeholder="https://images.example.com/panel.jpg"
                className="h-10 rounded-[14px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.84)] px-3 text-[13px] text-[color:var(--board-text)] outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
              />
            </div>
          );
        case "board-card":
          return (
            <div className="grid h-full gap-3">
              {item.source ? (
                <div className="rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.74)] px-3 py-3">
                  <p className="text-[18px] leading-tight text-[color:var(--board-text-strong)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[color:var(--board-text-muted)]">
                    {item.content}
                  </p>
                </div>
              ) : (
                <>
                  <input
                    value={item.title}
                    onChange={(event) =>
                      onItemsChange((currentItems) =>
                        updateCanvasItem(currentItems, item.id, (current) =>
                          current.type === "board-card" ? { ...current, title: event.target.value } : current,
                        ),
                      )
                    }
                    className="h-10 rounded-[14px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.84)] px-3 text-[16px] tracking-[0.02em] text-[color:var(--board-text-strong)] outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
                  />
                  <textarea
                    value={item.content}
                    onChange={(event) =>
                      onItemsChange((currentItems) =>
                        updateCanvasItem(currentItems, item.id, (current) =>
                          current.type === "board-card" ? { ...current, content: event.target.value } : current,
                        ),
                      )
                    }
                    className="min-h-[98px] flex-1 resize-none rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.74)] px-3 py-3 text-[14px] leading-6 text-[color:var(--board-text)] outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
                  />
                </>
              )}
            </div>
          );
        case "column-shell":
          return (
            <div className="grid h-full gap-3">
              {item.source ? (
                <div className="rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.74)] px-3 py-3">
                  <p className="text-[20px] tracking-[0.03em] text-[color:var(--board-text-strong)] [font-family:'Cormorant_Garamond','Times_New_Roman',serif]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[color:var(--board-text-muted)]">
                    {item.content}
                  </p>
                </div>
              ) : (
                <>
                  <input
                    value={item.title}
                    onChange={(event) =>
                      onItemsChange((currentItems) =>
                        updateCanvasItem(currentItems, item.id, (current) =>
                          current.type === "column-shell" ? { ...current, title: event.target.value } : current,
                        ),
                      )
                    }
                    className="h-10 rounded-[14px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.84)] px-3 text-[16px] tracking-[0.02em] text-[color:var(--board-text-strong)] outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
                  />
                  <textarea
                    value={item.content}
                    onChange={(event) =>
                      onItemsChange((currentItems) =>
                        updateCanvasItem(currentItems, item.id, (current) =>
                          current.type === "column-shell" ? { ...current, content: event.target.value } : current,
                        ),
                      )
                    }
                    className="min-h-[110px] flex-1 resize-none rounded-[16px] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.74)] px-3 py-3 text-[14px] leading-6 text-[color:var(--board-text)] outline-none transition-[border-color,box-shadow] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
                  />
                </>
              )}
            </div>
          );
        default:
          return null;
      }
    },
    [onItemsChange],
  );

  return (
    <div className="mt-2.5 flex min-h-0 min-w-0 flex-1">
      <div
        ref={frameRef}
        onPointerDown={startPanningCanvas}
        onDragOver={onCanvasDragOver}
        onDragLeave={() => setIsPaletteDropActive(false)}
        onDrop={onCanvasDrop}
        className={`relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[28px] border bg-[rgba(255,255,255,0.22)] shadow-[inset_0_1px_0_rgba(255,255,255,0.56)] touch-none ${
          isPaletteDropActive
            ? "border-[color:var(--board-border-accent)] shadow-[0_0_0_1px_var(--board-accent-glow),inset_0_1px_0_rgba(255,255,255,0.56)]"
            : "border-[color:var(--board-border)]"
        } ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, rgba(255,255,255,0.72), transparent 32%), linear-gradient(90deg, rgba(118,123,134,0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(118,123,134,0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(247,247,249,0.94) 0%, rgba(237,239,244,0.92) 100%)",
          backgroundSize: `auto, ${CANVAS_GRID_SIZE}px ${CANVAS_GRID_SIZE}px, ${CANVAS_GRID_SIZE}px ${CANVAS_GRID_SIZE}px, auto`,
          backgroundPosition: `0 0, ${gridOffset.x}px ${gridOffset.y}px, ${gridOffset.x}px ${gridOffset.y}px, 0 0`,
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.88),transparent_62%)]" />

        <div className="absolute right-3 top-3 z-20 flex items-start gap-2">
          <div className="flex items-center gap-1.5 rounded-[var(--board-canvas-control-radius)] border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.78)] px-1.5 py-1.5 shadow-[0_12px_24px_rgba(47,43,40,0.1),inset_0_1px_0_rgba(255,255,255,0.72)]">
            <button
              type="button"
              aria-label="Reset view"
              title="Reset view"
              onClick={handleResetView}
              className="inline-flex h-[var(--board-canvas-control-height)] items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.82)] px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--board-accent-strong)] transition-[border-color,background-color,box-shadow,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
            >
              {uiMode === "expanded" ? (
                "Reset view"
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M2.2 6.8A4.8 4.8 0 111 10.2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M1 6.2V10.2H5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            <button
              type="button"
              aria-label={uiMode === "expanded" ? "Minimize canvas" : "Maximize canvas"}
              title={uiMode === "expanded" ? "Minimize canvas" : "Maximize canvas"}
              onClick={() =>
                onCanvasUiModeChange((current) => (current === "expanded" ? "minimized" : "expanded"))
              }
              className="inline-flex h-[var(--board-canvas-control-height)] w-[var(--board-canvas-control-height)] items-center justify-center rounded-full border border-[color:var(--board-border)] bg-[rgba(255,255,255,0.82)] text-[color:var(--board-text-soft)] transition-[border-color,background-color,box-shadow,color,transform] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:border-[color:var(--board-border-strong)] hover:bg-white hover:text-[color:var(--board-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
            >
              {uiMode === "expanded" ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M3 6H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M3 6H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 3V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {items.length === 0 && uiMode === "expanded" ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
            <div className="max-w-[480px] rounded-[26px] border border-dashed border-[color:var(--board-border-strong)] bg-[rgba(255,255,255,0.54)] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--board-text-soft)]">
                Freeform workspace
              </p>
              <p className="mt-3 text-[15px] leading-7 text-[color:var(--board-text-muted)]">
                Use the sidebar to add a note, image, board card, or column shell. Drag empty space to pan through the world.
              </p>
            </div>
          </div>
        ) : null}

        {items.map((item) => {
          const isSelected = selectedItemId === item.id;
          const isDragging = draggingItemId === item.id;
          const screenPoint = worldToScreenPoint(item, camera);

          return (
            <article
              key={item.id}
              tabIndex={0}
              onFocus={() => onSelectItem(item.id)}
              onClick={(event) => {
                event.stopPropagation();
                onSelectItem(item.id);
                onItemsChange((currentItems) => bringCanvasItemToFront(currentItems, item.id));
              }}
              className={`absolute overflow-hidden rounded-[24px] border bg-[rgba(246,247,250,0.96)] shadow-[var(--board-shadow-card)] transition-[box-shadow,transform,border-color,opacity] duration-[var(--board-motion-base)] ease-[var(--board-ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)] ${
                isSelected
                  ? "border-[color:var(--board-border-accent)] shadow-[0_26px_42px_rgba(47,43,40,0.16)]"
                  : "border-[color:var(--board-border)] hover:border-[color:var(--board-border-strong)] hover:shadow-[0_18px_30px_rgba(47,43,40,0.14)]"
              } ${isDragging ? "scale-[1.01] opacity-95" : "opacity-100"}`}
              style={{
                width: `${item.width}px`,
                height: `${item.height}px`,
                transform: `translate3d(${screenPoint.x}px, ${screenPoint.y}px, 0)`,
                zIndex: item.zIndex,
              }}
            >
              <div className="flex h-full flex-col">
                <div
                  className={`flex items-center gap-3 border-b border-[color:var(--board-border)] px-4 py-3 ${
                    item.type === "image"
                      ? "bg-[linear-gradient(90deg,rgba(120,154,177,0.18)_0%,rgba(255,255,255,0.68)_100%)]"
                      : item.type === "board-card"
                        ? "bg-[linear-gradient(90deg,rgba(127,123,125,0.14)_0%,rgba(255,255,255,0.68)_100%)]"
                        : item.type === "column-shell"
                          ? "bg-[linear-gradient(90deg,rgba(134,100,73,0.14)_0%,rgba(255,255,255,0.68)_100%)]"
                          : "bg-[linear-gradient(90deg,rgba(118,123,134,0.12)_0%,rgba(255,255,255,0.68)_100%)]"
                  }`}
                >
                  <div className="mr-auto min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--board-text-soft)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-[color:var(--board-text-muted)]">
                      {item.source
                        ? "Linked from board mode"
                        : item.type === "board-card" || item.type === "column-shell"
                          ? "Canvas shell"
                          : "Editable in canvas"}
                    </p>
                  </div>

                  {isSelected ? (
                    <button
                      type="button"
                      aria-label="Delete canvas item"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="inline-flex h-[30px] items-center justify-center rounded-full border border-[color:var(--board-danger)] bg-[var(--board-danger-soft)] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--board-danger)] transition-[background-color,border-color,color] duration-[var(--board-motion-fast)] ease-[var(--board-ease-standard)] hover:bg-[rgba(255,242,242,0.94)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--board-focus-ring)]"
                    >
                      Remove
                    </button>
                  ) : null}

                  <CanvasItemGrip
                    label={`Drag ${item.label}`}
                    isDragging={isDragging}
                    onPointerDown={(event) => startDraggingItem(event, item.id)}
                  />
                </div>

                <div className="flex-1 px-4 py-4">
                  {renderCanvasItemBody(item)}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
