import React, { useRef } from 'react';
import { INITIAL_CARD_DATA } from './data';

interface BoardViewProps {
  columns: any[];
  cardsData: Record<string, any>;
  openCardEditor: (colName: string, cardTitle: string) => void;
  openColModal: () => void;
  triggerToast: (msg: string) => void;
  handleMoveCard: (cardTitle: string, sourceColId: string, targetColId: string, targetIndex?: number) => void;
  handleAddCard: (colId: string) => void;
  handleDeleteCard: (cardTitle: string) => void;
}

export default function BoardView({ columns, cardsData, openCardEditor, openColModal, triggerToast, handleMoveCard, handleAddCard, handleDeleteCard }: BoardViewProps) {
  
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
  };

  return (
    <div className="noteslite-board-area" id="noteslite-boardArea">
      {columns.map((col, idx) => (
        <div key={col.id || idx} className="noteslite-col-wrap" style={{ '--col-color': col.color } as React.CSSProperties}>
          <div className="noteslite-col-header">
            <div className="noteslite-col-top">
              <div className="noteslite-col-dot" style={{ background: col.color }} />
              <input 
                className="noteslite-col-name-input" 
                defaultValue={col.title} 
                onFocus={(e) => e.target.removeAttribute('readonly')}
                onBlur={(e) => e.target.setAttribute('readonly', '')}
                readOnly
              />
              <div className="noteslite-col-count">{col.cards ? col.cards.length : 0}</div>
            </div>
            <div className="noteslite-col-desc-wrap">
              <textarea 
                className="noteslite-col-desc" 
                placeholder="Add a column description…" 
                rows={1} 
                onInput={handleTextareaInput}
                defaultValue={col.desc}
              />
              <div className="noteslite-col-desc-hint">click to edit description</div>
            </div>
          </div>
          <div className="noteslite-col-strip" style={{ background: col.color }} />
          <div 
            className="noteslite-col-cards"
            onDragOver={(e) => {
              e.preventDefault(); // Allow drop
            }}
            onDrop={(e) => {
              e.preventDefault();
              const cardTitle = e.dataTransfer.getData('text/plain');
              const sourceColId = e.dataTransfer.getData('application/noteslite-col');
              if (cardTitle && sourceColId) {
                handleMoveCard(cardTitle, sourceColId, col.id);
              }
            }}
          >
            {col.cards && col.cards.map((card: string, cardIdx: number) => {
              const cardMeta = cardsData[card] || { tags: [], blocks: [] };
              const previewBlock = cardMeta.blocks?.find((b: any) => b.t === 'p')?.v || '';
              const blocksCount = cardMeta.blocks?.length || 0;
              const hasCover = cardMeta.coverA && cardMeta.coverB;
              
              return (
                <div 
                  key={cardIdx} 
                  className="noteslite-bcard" 
                  style={{ '--col-color': col.color, ...(col.title === 'Done' ? { opacity: 0.7 } : {}) } as React.CSSProperties} 
                  onDoubleClick={() => openCardEditor(col.title, card)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', card);
                    e.dataTransfer.setData('application/noteslite-col', col.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const cardTitle = e.dataTransfer.getData('text/plain');
                    const sourceColId = e.dataTransfer.getData('application/noteslite-col');
                    if (cardTitle && sourceColId) {
                      handleMoveCard(cardTitle, sourceColId, col.id, cardIdx);
                    }
                  }}
                >
                  {hasCover && cardIdx === 0 && (
                    <div className="noteslite-bcard-cover-placeholder" />
                  )}
                  <button 
                    style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '14px', borderRadius: '4px', zIndex: 10 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCard(card);
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = '#A04040'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text3)'; }}
                    title="Delete card"
                  >
                    ×
                  </button>
                  <div className="noteslite-bcard-title" style={col.title === 'Done' ? { textDecoration: 'line-through', color: 'var(--text3)', paddingRight: '20px' } : { paddingRight: '20px' }}>
                    {card}
                  </div>
                  <div className="noteslite-bcard-preview">{previewBlock}</div>
                  <div className="noteslite-bcard-footer">
                    {cardMeta.tags.map((tag: any, i: number) => (
                      <div key={i} className="noteslite-bcard-tag" style={{ background: `${tag.c}20`, color: tag.c }}>
                        {tag.l}
                      </div>
                    ))}
                    {col.title === 'Done' && (
                       <div className="noteslite-bcard-tag" style={{ background: 'rgba(90,122,154,.12)', color: '#5A7A9A' }}>
                         ✓ Mastered
                       </div>
                    )}
                    <div className="noteslite-bcard-blocks">{blocksCount} blocks</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="noteslite-col-add" onClick={() => handleAddCard(col.id)}>
            + Add card
          </div>
        </div>
      ))}

      {/* Add column */}
      <div className="noteslite-col-add-wrap" onClick={openColModal}>
        <div className="noteslite-add-col-icon">+</div>
        <div className="noteslite-add-col-text">Add Column</div>
      </div>
    </div>
  );
}
