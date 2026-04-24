"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useWorkspaceSync } from '@/hooks/use-workspace-sync';
import './workspace.css';
import { CV_SEED, CV_CONNECTIONS, INITIAL_CARD_DATA } from './data';
import TopBar from './TopBar';
import BoardView from './BoardView';
import CanvasView from './CanvasView';
import CardEditor from './CardEditor';
import ColumnModal from './ColumnModal';

export type ViewMode = 'board' | 'canvas';
export type ScreenMode = 'ws' | 'editor';

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

  const clientId = useMemo(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

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
          x: Math.random() * 500, y: Math.random() * 500, w: 232, z: 1, color: 'brand'
        }));

        setColumns(newColumns);
        setCardsData(newCardsData);
      } catch (err) {
        console.error("Failed to load workspace:", err);
      }
    }
    loadWorkspace();
    return () => { cancelled = true; };
  }, [workspaceId]);

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
        if (col.id === card.columnId && !col.cards?.includes(card.id)) {
          return { ...col, cards: [...(col.cards || []), card.id] };
        }
        return col;
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
    }
  });

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isColModalOpen, setIsColModalOpen] = useState(false);

  const [editorData, setEditorData] = useState<{ colName: string, cardTitle: string } | null>(null);

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

  const closeEditor = () => {
    setActiveScreen('ws');
    setEditorData(null);
  };

  const handleAddColumn = async (name: string, desc: string, color: string) => {
    if (!workspaceId) {
      const newCol = {
        id: 'col-' + Math.random().toString(36).substr(2, 6),
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

  const handleAddCard = async (colId?: string) => {
    const targetColId = colId || columns[0]?.id;

    if (!targetColId) {
      triggerToast("Please add a column first to add cards.");
      return;
    }

    const title = `New Card ${Math.floor(Math.random() * 1000)}`;

    if (!workspaceId) {
      const newId = title;
      setCardsData(prev => ({
        ...prev,
        [newId]: {
          icon: '📄', coverA: '#7A9ABB', coverB: '#9ABACB', tags: [],
          blocks: [{ t: 'h1', v: title }, { t: 'p', v: '' }]
        }
      }));
      setColumns(prev => {
        const newColumns = [...prev];
        const targetIdx = targetColId ? newColumns.findIndex(c => c.id === targetColId) : 0;
        if (targetIdx !== -1) {
          newColumns[targetIdx] = { ...newColumns[targetIdx], cards: [...(newColumns[targetIdx].cards || []), newId] };
        }
        return newColumns;
      });
      const colName = targetColId ? columns.find(c => c.id === targetColId)?.title : columns[0]?.title;
      if (colName) openCardEditor(colName, newId);
      return;
    }

    try {
      const initialBlocks = [{ t: 'h1', v: title }, { t: 'p', v: '' }];
      const response = await fetch(`/api/workspaces/${workspaceId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-id": clientId },
        body: JSON.stringify({ title, columnId: targetColId, content: initialBlocks }),
      });

      if (!response.ok) throw new Error("Failed to create card");
      const { card } = await response.json();

      const newId = card.id;

      setCardsData(prev => ({
        ...prev,
        [newId]: {
          id: newId,
          icon: '📄', coverA: '#7A9ABB', coverB: '#9ABACB', tags: [],
          blocks: initialBlocks,
          title: title
        }
      }));
      setColumns(prev => {
        const newColumns = [...prev];
        const targetIdx = targetColId ? newColumns.findIndex(c => c.id === targetColId) : 0;
        if (targetIdx !== -1) {
          newColumns[targetIdx] = { ...newColumns[targetIdx], cards: [...(newColumns[targetIdx].cards || []), newId] };
        }
        return newColumns;
      });

      const colName = targetColId ? columns.find(c => c.id === targetColId)?.title : columns[0]?.title;
      if (colName) openCardEditor(colName, newId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCard = (cardTitle: string) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).filter((c: string) => c !== cardTitle)
    })));
    setCardsData(prev => {
      const next = { ...prev };
      delete next[cardTitle];
      return next;
    });
    closeEditor();
    triggerToast(`Card "${cardTitle}" deleted`);
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
  };

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
                // Debounce patching
                if ((window as any)._saveTimeout) clearTimeout((window as any)._saveTimeout);
                (window as any)._saveTimeout = setTimeout(() => {
                  fetch(`/api/workspaces/${workspaceId}/cards/${editorData.cardTitle}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
                    body: JSON.stringify({ content: data.blocks, title: data.title || data.blocks[0]?.v })
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

