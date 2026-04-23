"use client";

import React, { useState, useEffect } from 'react';
import './workspace.css';
import { CV_SEED, CV_CONNECTIONS, INITIAL_CARD_DATA } from './data';
import TopBar from './TopBar';
import BoardView from './BoardView';
import CanvasView from './CanvasView';
import CardEditor from './CardEditor';
import ColumnModal from './ColumnModal';

export type ViewMode = 'board' | 'canvas';
export type ScreenMode = 'ws' | 'editor';

export default function NotesliteWorkspace({ initialData }: { initialData?: any }) {
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

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  
  const [editorData, setEditorData] = useState<{colName: string, cardTitle: string} | null>(null);

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

  const handleAddColumn = (name: string, desc: string, color: string) => {
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
  };

  const handleAddCard = (colId?: string) => {
    const title = `New Card ${Math.floor(Math.random() * 1000)}`;
    setCardsData(prev => ({
      ...prev,
      [title]: {
        icon: '📄', coverA: '#7A9ABB', coverB: '#9ABACB', tags: [],
        blocks: [{ t: 'h1', v: title }, { t: 'p', v: '' }]
      }
    }));
    
    // Add to specific column or first column
    setColumns(prev => {
      const newColumns = [...prev];
      const targetIdx = colId ? newColumns.findIndex(c => c.id === colId) : 0;
      if (targetIdx !== -1) {
        newColumns[targetIdx] = { ...newColumns[targetIdx], cards: [...(newColumns[targetIdx].cards || []), title] };
      }
      return newColumns;
    });
    
    // Open editor
    const colName = colId ? columns.find(c => c.id === colId)?.title : columns[0]?.title;
    if (colName) {
      openCardEditor(colName, title);
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
            setCardData={(data) => setCardsData(prev => ({ ...prev, [editorData.cardTitle]: data }))}
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
