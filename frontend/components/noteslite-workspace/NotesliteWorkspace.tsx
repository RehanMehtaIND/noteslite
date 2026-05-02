"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useWorkspaceSync } from '@/frontend/hooks/use-workspace-sync';
import './workspace.css';
import { CV_SEED, CV_CONNECTIONS, INITIAL_CARD_DATA } from './data';
import TopBar from './TopBar';
import BoardView from './BoardView';
import CanvasView from './CanvasView';
import CardEditor from './CardEditor';
import ColumnModal from './ColumnModal';

export type ViewMode = 'board' | 'canvas';
export type ScreenMode = 'ws' | 'editor';

function getColumnColor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("not started")) return "#E57373";
  if (lower.includes("ongoing")) return "#FFB74D";
  if (lower.includes("completed") || lower.includes("done")) return "#81C784";

  if (lower.includes("income")) return "#4DB6AC";
  if (lower.includes("needs")) return "#64B5F6";
  if (lower.includes("wants")) return "#BA68C8";

  if (lower.includes("ideas")) return "#FF8A65";
  if (lower.includes("drafts")) return "#90A4AE";
  if (lower.includes("published")) return "#7986CB";

  return "#C07850";
}

function makeTempId() {
  const rand = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `tmp_${rand}`;
}

function makeClientId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `client-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function NotesliteWorkspace({ initialData, workspaceId }: { initialData?: any; workspaceId?: string }) {
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [activeScreen, setActiveScreen] = useState<ScreenMode>('ws');

  const [columns, setColumns] = useState<any[]>(() => {
    if (initialData?.columns) return initialData.columns;
    return CV_SEED.filter(s => s.type === 'column').map(s => ({ ...s }));
  });
  const [canvasItems, setCanvasItems] = useState<any[]>(() => {
    if (initialData?.canvasItems) return initialData.canvasItems;
    return CV_SEED.map(s => ({ ...s }));
  });

  const [cardsData, setCardsData] = useState<Record<string, any>>(() => {
    if (initialData?.cardsData) return initialData.cardsData;
    return INITIAL_CARD_DATA;
  });

  const [wsInfo, setWsInfo] = useState<{ name: string; description: string }>(() => {
    if (initialData?.workspace) {
      return {
        name: initialData.workspace.name || "My Workspace",
        description: "Personal workspace for organization and ideas"
      };
    }
    return {
      name: "Loading...",
      description: "Please wait while we load your workspace."
    };
  });

  const clientId = useMemo(() => makeClientId(), []);

  // Maps tempId → pending edit payload to flush once the real ID arrives
  const pendingEditsRef = useRef<Map<string, { content: any[]; title?: string }>>(new Map());
  // Tracks the card ID currently open in the editor (always up-to-date, safe in timeouts)
  const currentEditorCardIdRef = useRef<string>('');
  // Set of tempIds whose create request is still in-flight
  const pendingTempIdsRef = useRef<Set<string>>(new Set());

  // ─── Workspace load ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    async function loadWorkspace() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}`);
        if (!res.ok) return;

        const { workspace } = await res.json();
        if (cancelled || !workspace) return;

        setWsInfo({
          name: workspace.name || "Untitled Workspace",
          description: workspace.theme?.includes("template:")
            ? `Template based workspace — ${workspace.name}`
            : "Personal workspace for organization and ideas"
        });

        const cardsByColumn = new Map<string, any[]>();
        const newCardsData: Record<string, any> = {};

        for (const card of workspace.cards || []) {
          const colId = card.columnId || "__unassigned__";
          if (!cardsByColumn.has(colId)) cardsByColumn.set(colId, []);
          cardsByColumn.get(colId)!.push(card.id);

          newCardsData[card.id] = {
            id: card.id,
            icon: '📄', coverA: '#7A9ABB', coverB: '#9ABACB', tags: [],
            blocks: Array.isArray(card.content) ? card.content : [{ t: 'h1', v: card.title || 'New Card' }, { t: 'p', v: '' }],
            title: card.title
          };
        }

        const newColumns = (workspace.columns || []).map((col: any) => ({
          id: col.id,
          type: 'column',
          title: col.name || "Untitled",
          cards: cardsByColumn.get(col.id) || [],
          x: Math.random() * 500,
          y: Math.random() * 500,
          w: 232,
          z: 1,
          color: getColumnColor(col.name || "")
        }));

        setColumns(newColumns);
        setCardsData(newCardsData);
        setCanvasItems(prev => {
          const nonCols = prev.filter(i => i.type !== 'column');
          const mergedCols = newColumns.map((nc: any) => {
            const existing = prev.find(p => p.id === nc.id && p.type === 'column');
            if (existing) {
              return { ...existing, ...nc, x: existing.x, y: existing.y, w: existing.w, h: existing.h, z: existing.z };
            }
            return nc;
          });
          return [...nonCols, ...mergedCols];
        });
      } catch (err) {
        console.error("Failed to load workspace:", err);
      }
    }
    loadWorkspace();
    return () => { cancelled = true; };
  }, [workspaceId]);

  // Keep the ref in sync with the editor's current card ID
  const [editorData, setEditorData] = useState<{ colName: string, cardTitle: string } | null>(null);

  useEffect(() => {
    currentEditorCardIdRef.current = editorData?.cardTitle ?? '';
  }, [editorData?.cardTitle]);

  // ─── SSE sync ────────────────────────────────────────────────────────────────

  useWorkspaceSync(workspaceId || "", clientId, {
    onCardCreated: (card: any) => {
      setCardsData(prev => {
        if (prev[card.id]) return prev;
        return {
          ...prev,
          [card.id]: {
            id: card.id,
            icon: '📄', coverA: '#7A9ABB', coverB: '#9ABACB', tags: [],
            blocks: Array.isArray(card.content) ? card.content : [{ t: 'h1', v: card.title || 'New Card' }, { t: 'p', v: '' }],
            title: card.title
          }
        };
      });
      setColumns(prev => prev.map(col => {
        if (col.id !== card.columnId) return col;
        if (col.cards?.includes(card.id)) return col; // real ID already present

        // A temp card we created is sitting in this column — resolveCardId will swap it.
        // Adding the real ID here would create a duplicate, so skip.
        const hasPendingTemp = (col.cards || []).some(
          (c: string) => pendingTempIdsRef.current.has(c)
        );
        if (hasPendingTemp) return col;

        return { ...col, cards: [...(col.cards || []), card.id] };
      }));
      setCanvasItems(prev => prev.map(i => {
        if (i.id !== card.columnId || i.type !== 'column') return i;
        if (i.cards?.includes(card.id)) return i;
        const hasPendingTemp = (i.cards || []).some((c: string) => pendingTempIdsRef.current.has(c));
        if (hasPendingTemp) return i;
        return { ...i, cards: [...(i.cards || []), card.id] };
      }));
    },
    onCardUpdated: (card: any) => {
      setCardsData(prev => ({
        ...prev,
        [card.id]: {
          ...prev[card.id],
          blocks: Array.isArray(card.content) ? card.content : prev[card.id]?.blocks,
          title: card.title || prev[card.id]?.title
        }
      }));
    },
    onColumnCreated: (column: any) => {
      setColumns(prev => {
        if (prev.some(c => c.id === column.id)) return prev;
        return [...prev, {
          id: column.id, type: 'column', title: column.name, cards: [],
          x: 50, y: 50, w: 232, z: 1, color: 'brand'
        }];
      });
      setCanvasItems(prev => {
        if (prev.some(c => c.id === column.id)) return prev;
        return [...prev, {
          id: column.id, type: 'column', title: column.name, cards: [],
          x: 50, y: 50, w: 232, z: 1, color: 'brand'
        }];
      });
    }
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isColModalOpen, setIsColModalOpen] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const switchView = (v: ViewMode) => {
    setActiveView(v);
    if (v === 'canvas') {
      triggerToast('⇄ Canvas synced with Board');
    }
  };

  const openCardEditor = (colName: string, cardTitle: string) => {
    setEditorData({ colName, cardTitle });
    setActiveScreen('editor');
  };

  // ─── Temp-ID resolution ───────────────────────────────────────────────────────
  // Called once the server responds with the real UUID. Atomically swaps the
  // temporary client-side ID for the real one everywhere in state, then flushes
  // any edits the user made while the request was in-flight.

  const resolveCardId = useCallback((tempId: string, realId: string) => {
    pendingTempIdsRef.current.delete(tempId);
    setCardsData(prev => {
      if (!prev[tempId]) return prev;
      const { [tempId]: cardData, ...rest } = prev;
      return { ...rest, [realId]: { ...cardData, id: realId } };
    });
    setColumns(prev => prev.map(col => {
      const mapped = (col.cards || []).map((c: string) => c === tempId ? realId : c);
      const seen = new Set<string>();
      return { ...col, cards: mapped.filter((c: string) => !seen.has(c) && (seen.add(c), true)) };
    }));
    setCanvasItems(prev => prev.map(item => {
      const mapped = (item.cards || []).map((c: string) => c === tempId ? realId : c);
      const seen = new Set<string>();
      return { ...item, cards: mapped.filter((c: string) => !seen.has(c) && (seen.add(c), true)) };
    }));
    setEditorData(prev => {
      if (prev?.cardTitle === tempId) return { ...prev, cardTitle: realId };
      return prev;
    });
    if (currentEditorCardIdRef.current === tempId) {
      currentEditorCardIdRef.current = realId;
    }

    // Flush any edits queued while the create request was in-flight
    const pending = pendingEditsRef.current.get(tempId);
    if (pending && workspaceId) {
      pendingEditsRef.current.delete(tempId);
      fetch(`/api/workspaces/${workspaceId}/cards/${realId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
        body: JSON.stringify(pending)
      }).catch(console.error);
    }
  }, [workspaceId, clientId]);

  // ─── Save helper (used on close) ─────────────────────────────────────────────

  const flushSave = useCallback((cardId: string, data: any) => {
    if (!workspaceId || !cardId || cardId.startsWith('tmp_')) return;
    const firstTextBlock = data?.blocks?.find((b: any) => ['p', 'h1', 'h2', 'h3'].includes(b.t) && b.v)?.v;
    fetch(`/api/workspaces/${workspaceId}/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
      body: JSON.stringify({ content: data?.blocks, title: data?.title || firstTextBlock })
    }).catch(console.error);
  }, [workspaceId, clientId]);

  // ─── Editor close: cancel debounce and save immediately ─────────────────────

  const closeEditor = () => {
    if ((window as any)._saveTimeout) {
      clearTimeout((window as any)._saveTimeout);
      (window as any)._saveTimeout = null;
    }
    const cardId = currentEditorCardIdRef.current;
    if (cardId) {
      flushSave(cardId, cardsData[cardId]);
    }
    setActiveScreen('ws');
    setEditorData(null);
    currentEditorCardIdRef.current = '';
  };

  // ─── Column CRUD ─────────────────────────────────────────────────────────────

  const handleAddColumn = async (name: string, desc: string, color: string) => {
    if (!workspaceId) {
      const newCol = {
        id: 'col-' + Math.random().toString(36).slice(2, 8),
        type: 'column',
        x: 50, y: 50, w: 232,
        color, title: name, desc, cards: [], z: 99
      };
      setColumns(prev => [...prev, newCol]);
      setCanvasItems(prev => [...prev, newCol]);
      setIsColModalOpen(false);
      triggerToast(`✓ Column "${name}" created`);
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-id": clientId },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to create column");
      const { column } = await response.json();

      const newCol = {
        id: column.id, type: 'column', x: 50, y: 50, w: 232, color, title: column.name, desc, cards: [], z: 99
      };
      setColumns(prev => [...prev, newCol]);
      setCanvasItems(prev => [...prev, newCol]);
      setIsColModalOpen(false);
      triggerToast(`✓ Column "${name}" created`);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Card CRUD ───────────────────────────────────────────────────────────────

  const handleAddCard = async (colId?: string) => {
    const targetColId = colId || columns[0]?.id;

    if (!targetColId) {
      triggerToast("Please add a column first to add cards.");
      return;
    }

    const title = 'Untitled';
    const initialBlocks = [{ t: 'h1', v: title }, { t: 'p', v: '' }];

    // ── Local-only mode (no workspace) ────────────────────────────────────────
    if (!workspaceId) {
      const newId = `local-${Date.now()}`;
      setCardsData(prev => ({
        ...prev,
        [newId]: {
          icon: '📄', coverA: '#7A9ABB', coverB: '#9ABACB', tags: [],
          blocks: initialBlocks
        }
      }));
      setColumns(prev => {
        const cols = [...prev];
        const idx = cols.findIndex(c => c.id === targetColId);
        if (idx !== -1) cols[idx] = { ...cols[idx], cards: [...(cols[idx].cards || []), newId] };
        return cols;
      });
      const colName = columns.find(c => c.id === targetColId)?.title || columns[0]?.title;
      setCanvasItems(prev => prev.map(i => i.id === targetColId ? { ...i, cards: [...(i.cards || []), newId] } : i));
      if (colName) openCardEditor(colName, newId);
      return;
    }

    // ── Workspace mode: open editor immediately with a temp ID ────────────────
    const tempId = makeTempId();
    pendingTempIdsRef.current.add(tempId);
    const colName = columns.find(c => c.id === targetColId)?.title || '';

    setCardsData(prev => ({
      ...prev,
      [tempId]: {
        id: tempId,
        icon: '📄', coverA: '#7A9ABB', coverB: '#9ABACB', tags: [],
        blocks: initialBlocks,
        title
      }
    }));
    setColumns(prev => {
      const cols = [...prev];
      const idx = cols.findIndex(c => c.id === targetColId);
      if (idx !== -1) cols[idx] = { ...cols[idx], cards: [...(cols[idx].cards || []), tempId] };
      return cols;
    });
    setCanvasItems(prev => prev.map(i => i.id === targetColId ? { ...i, cards: [...(i.cards || []), tempId] } : i));
    if (colName) openCardEditor(colName, tempId);

    // Fire the create request in the background; swap IDs on success
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-id": clientId },
        body: JSON.stringify({ title, columnId: targetColId, content: initialBlocks }),
      });

      if (!response.ok) throw new Error("Failed to create card");
      const { card } = await response.json();
      resolveCardId(tempId, card.id);
    } catch (err) {
      console.error(err);
      pendingTempIdsRef.current.delete(tempId);
      // Roll back the optimistic card
      setCardsData(prev => { const { [tempId]: _, ...rest } = prev; return rest; });
      setColumns(prev => prev.map(col => ({
        ...col,
        cards: (col.cards || []).filter((c: string) => c !== tempId)
      })));
      setCanvasItems(prev => prev.map(i => ({
        ...i,
        cards: (i.cards || []).filter((c: string) => c !== tempId)
      })));
      triggerToast("Failed to create card");
    }
  };

  const handleDeleteCard = (cardId: string) => {
    // Cancel any pending debounced save and prevent flushSave in closeEditor
    if ((window as any)._saveTimeout) {
      clearTimeout((window as any)._saveTimeout);
      (window as any)._saveTimeout = null;
    }
    currentEditorCardIdRef.current = '';

    // Clean up temp-ID tracking if still in-flight
    if (cardId.startsWith('tmp_')) {
      pendingTempIdsRef.current.delete(cardId);
      pendingEditsRef.current.delete(cardId);
    }

    // Optimistic removal from all state
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).filter((c: string) => c !== cardId)
    })));
    setCanvasItems(prev => prev.map(item => ({
      ...item,
      cards: (item.cards || []).filter((c: string) => c !== cardId)
    })));
    setCardsData(prev => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });

    closeEditor();
    triggerToast('Card deleted');

    // Temp cards haven't been persisted yet — no API call needed
    if (!workspaceId || cardId.startsWith('tmp_')) return;

    fetch(`/api/workspaces/${workspaceId}/cards/${cardId}`, {
      method: 'DELETE',
      headers: { 'x-client-id': clientId },
    }).catch(err => console.error('Failed to delete card:', err));
  };

  const handleDeleteColumn = (colId: string) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return;

    setColumns(prev => prev.filter(c => c.id !== colId));
    setCanvasItems(prev => prev.filter(i => i.id !== colId));
    triggerToast(`Column "${col.title}" deleted`);
  };

  const handleMoveCard = (cardTitle: string, sourceColId: string, targetColId: string, targetIndex?: number) => {
    setColumns(prev => {
      const sourceColIndex = prev.findIndex(c => c.id === sourceColId);
      const targetColIndex = prev.findIndex(c => c.id === targetColId);
      if (sourceColIndex === -1 || targetColIndex === -1) return prev;

      const newColumns = [...prev];
      const sourceCol = { ...newColumns[sourceColIndex] };
      const targetCol = { ...newColumns[targetColIndex] };

      if (sourceColId === targetColId) {
        const cards = [...sourceCol.cards];
        const oldIndex = cards.indexOf(cardTitle);
        if (oldIndex === -1) return prev;

        cards.splice(oldIndex, 1);
        const insertIndex = targetIndex !== undefined ? targetIndex : cards.length;
        cards.splice(insertIndex, 0, cardTitle);

        sourceCol.cards = cards;
        newColumns[sourceColIndex] = sourceCol;
        return newColumns;
      }

      sourceCol.cards = sourceCol.cards.filter((c: string) => c !== cardTitle);

      const newTargetCards = [...(targetCol.cards || [])];
      if (targetIndex !== undefined) {
        newTargetCards.splice(targetIndex, 0, cardTitle);
      } else {
        newTargetCards.push(cardTitle);
      }
      targetCol.cards = newTargetCards;

      newColumns[sourceColIndex] = sourceCol;
      newColumns[targetColIndex] = targetCol;

      return newColumns;
    });
    setCanvasItems(prev => {
      const sourceCol = prev.find(c => c.id === sourceColId);
      const targetCol = prev.find(c => c.id === targetColId);
      if (!sourceCol || !targetCol) return prev;

      return prev.map(i => {
        if (i.id === sourceColId) {
          const newCards = (i.cards || []).filter((c: string) => c !== cardTitle);
          if (sourceColId === targetColId) {
            const insertIndex = targetIndex !== undefined ? targetIndex : newCards.length;
            newCards.splice(insertIndex, 0, cardTitle);
          }
          return { ...i, cards: newCards };
        }
        if (i.id === targetColId && sourceColId !== targetColId) {
          const newCards = [...(i.cards || [])];
          if (targetIndex !== undefined) {
            newCards.splice(targetIndex, 0, cardTitle);
          } else {
            newCards.push(cardTitle);
          }
          return { ...i, cards: newCards };
        }
        return i;
      });
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="noteslite-workspace-container">
      {/* SCREEN 1 — WORKSPACE */}
      <div className={`noteslite-screen ${activeScreen === 'ws' ? 'active' : ''}`} id="noteslite-screen-ws">
        <TopBar
          activeView={activeView}
          switchView={switchView}
          triggerToast={triggerToast}
          openColModal={() => setIsColModalOpen(true)}
          openCardEditor={() => handleAddCard()}
          workspaceName={wsInfo.name}
          workspaceDesc={wsInfo.description}
        />

        <div style={{ flex: 1, display: activeView === 'board' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
          <BoardView
            columns={columns}
            cardsData={cardsData}
            openCardEditor={openCardEditor}
            openColModal={() => setIsColModalOpen(true)}
            triggerToast={triggerToast}
            handleMoveCard={handleMoveCard}
            handleAddCard={handleAddCard}
            handleDeleteCard={handleDeleteCard}
            handleDeleteColumn={handleDeleteColumn}
          />
        </div>

        <div style={{ flex: 1, display: activeView === 'canvas' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
          {activeView === 'canvas' && (
            <CanvasView
              items={canvasItems}
              setItems={setCanvasItems}
              connections={CV_CONNECTIONS}
              triggerToast={triggerToast}
              openCardEditor={openCardEditor}
              columns={columns}
              onDeleteItem={(id) => {
                const item = canvasItems.find(i => i.id === id);
                if (item?.type === 'column') {
                  handleDeleteColumn(id);
                } else {
                  setCanvasItems(prev => prev.filter(i => i.id !== id));
                  triggerToast('Item removed');
                }
              }}
              cardsData={cardsData}
              handleAddCard={handleAddCard}
            />
          )}
        </div>
      </div>

      {/* SCREEN 2 — CARD DEEP EDITOR */}
      <div className={`noteslite-screen ${activeScreen === 'editor' ? 'active' : ''}`} id="noteslite-screen-editor">
        {activeScreen === 'editor' && editorData && (
          <CardEditor
            colName={editorData.colName}
            cardTitle={editorData.cardTitle}
            cardData={cardsData[editorData.cardTitle]}
            setCardData={(data) => {
              setCardsData(prev => ({ ...prev, [editorData.cardTitle]: data }));

              if (workspaceId) {
                const cardId = editorData.cardTitle;

                // Card not yet persisted — queue edit to flush once real ID arrives
                if (cardId.startsWith('tmp_')) {
                  const firstTextBlock = data.blocks?.find((b: any) => ['p', 'h1', 'h2', 'h3'].includes(b.t) && b.v)?.v;
                  pendingEditsRef.current.set(cardId, { content: data.blocks, title: data.title || firstTextBlock });
                  return;
                }

                // Debounce save for real cards
                if ((window as any)._saveTimeout) clearTimeout((window as any)._saveTimeout);
                (window as any)._saveTimeout = setTimeout(() => {
                  const latestCardId = currentEditorCardIdRef.current;
                  if (!latestCardId || latestCardId.startsWith('tmp_')) return;
                  const firstTextBlock = data.blocks?.find((b: any) => ['p', 'h1', 'h2', 'h3'].includes(b.t) && b.v)?.v;
                  fetch(`/api/workspaces/${workspaceId}/cards/${latestCardId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
                    body: JSON.stringify({ content: data.blocks, title: data.title || firstTextBlock })
                  }).catch(console.error);
                }, 500);
              }
            }}
            closeEditor={closeEditor}
            triggerToast={triggerToast}
            handleDeleteCard={handleDeleteCard}
          />
        )}
      </div>

      {/* Column Modal */}
      {isColModalOpen && (
        <ColumnModal
          onClose={() => setIsColModalOpen(false)}
          onCreate={handleAddColumn}
        />
      )}

      {/* Toast */}
      <div className={`noteslite-toast ${showToast ? 'show' : ''}`} id="noteslite-toastEl">
        {toastMessage}
      </div>
    </div>
  );
}
