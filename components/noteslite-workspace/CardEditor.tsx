import React, { useState, useRef, useEffect } from 'react';
import { INITIAL_CARD_DATA } from './data';

interface CardEditorProps {
  colName: string;
  cardTitle: string;
  cardData: any;
  setCardData: (data: any) => void;
  closeEditor: () => void;
  triggerToast: (msg: string) => void;
  handleDeleteCard: (cardTitle: string) => void;
}

export default function CardEditor({ colName, cardTitle, cardData, setCardData, closeEditor, triggerToast, handleDeleteCard }: CardEditorProps) {
  const data = cardData || { icon: '📄', coverA: '#7A9ABB', coverB: '#9ABACB', tags: [], blocks: [] };
  
  const [slashMenu, setSlashMenu] = useState<{ x: number, y: number } | null>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
  };

  const insertBlock = (type: string, index: number = data.blocks.length) => {
    const newBlocks = [...data.blocks];
    newBlocks.splice(index, 0, { t: type, v: '', done: false });
    setCardData({ ...data, blocks: newBlocks });
    setSlashMenu(null);
    triggerToast(`Block added: ${type}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === '/' && (e.target as HTMLElement).tagName === 'TEXTAREA') {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setSlashMenu({ x: rect.left, y: rect.bottom + 4 });
    }
    if (e.key === 'Escape') setSlashMenu(null);
  };

  const toggleTodo = (index: number) => {
    const newBlocks = [...data.blocks];
    newBlocks[index].done = !newBlocks[index].done;
    setCardData({ ...data, blocks: newBlocks });
    triggerToast(newBlocks[index].done ? '✓ Task done' : 'Task reopened');
  };

  const updateBlockValue = (index: number, val: string) => {
    const newBlocks = [...data.blocks];
    newBlocks[index].v = val;
    setCardData({ ...data, blocks: newBlocks });
  };

  let numberedCounter = 0;

  return (
    <>
      <div className="noteslite-editor-topbar">
        <button className="noteslite-back-btn" onClick={closeEditor}>← Back</button>
        <div className="noteslite-editor-breadcrumb">
          <span>DSA Notes</span>
          <span className="sep">›</span>
          <span id="noteslite-bcCol">{colName}</span>
          <span className="sep">›</span>
          <span className="cur" id="noteslite-bcCard">{cardTitle}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="noteslite-tbtn" onClick={() => triggerToast('Card saved ✓')}>💾 Save</button>
          <button className="noteslite-tbtn" onClick={() => handleDeleteCard(cardTitle)} style={{ color: '#A04040' }}>🗑 Delete</button>
          <button className="noteslite-tbtn" onClick={() => {
            if (editorBodyRef.current) {
              const rect = editorBodyRef.current.getBoundingClientRect();
              setSlashMenu({ x: rect.left + 80, y: window.innerHeight / 2 });
            }
          }}>＋ Block</button>
        </div>
      </div>

      <div className="noteslite-fmt-bar">
        <button className="noteslite-fbtn" onClick={() => triggerToast('Text formatted')}><b>B</b></button>
        <button className="noteslite-fbtn" onClick={() => triggerToast('Text formatted')}><i>I</i></button>
        <button className="noteslite-fbtn" onClick={() => triggerToast('Text formatted')}><u>U</u></button>
        <button className="noteslite-fbtn" onClick={() => triggerToast('Text formatted')}><s>S</s></button>
        <div className="noteslite-fsep" />
        <button className="noteslite-fbtn" onClick={() => insertBlock('h1')}>H1</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('h2')}>H2</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('h3')}>H3</button>
        <div className="noteslite-fsep" />
        <button className="noteslite-fbtn" onClick={() => insertBlock('todo')}>☑ To-do</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('bullet')}>• List</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('numbered')}>1. List</button>
        <div className="noteslite-fsep" />
        <button className="noteslite-fbtn" onClick={() => insertBlock('quote')}>" Quote</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('callout')}>💡 Callout</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('code')}>⌨ Code</button>
        <div className="noteslite-fsep" />
        <button className="noteslite-fbtn" onClick={() => insertBlock('image')}>🖼 Image</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('video')}>▶ Video</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('table')}>⊞ Table</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('link')}>🔗 Link</button>
        <div className="noteslite-fsep" />
        <button className="noteslite-fbtn" onClick={() => insertBlock('divider')}>— Divider</button>
      </div>

      <div className="noteslite-editor-body" id="noteslite-editorBody" ref={editorBodyRef}>
        <div className="noteslite-editor-doc" id="noteslite-editorDoc">
          <div className="noteslite-card-cover-area" style={{ '--cover-a': data.coverA, '--cover-b': data.coverB } as React.CSSProperties}>
            <div className="noteslite-cover-emoji">{data.icon}</div>
            <button className="noteslite-cover-change-btn" onClick={() => triggerToast('Cover picker coming soon')}>🎨 Change cover</button>
          </div>
          <input className="noteslite-card-title-input" defaultValue={cardTitle} placeholder="Untitled" />
          <div className="noteslite-card-meta">
            {data.tags.map((t: any, i: number) => (
              <div key={i} className="noteslite-card-tag-chip" style={{ background: `${t.c}20`, color: t.c }}>{t.l}</div>
            ))}
            <span>Last edited just now</span>
            <span>·</span>
            <span>{data.blocks.length} blocks</span>
          </div>
          <div className="noteslite-card-divider" />
          
          <div className="noteslite-blocks-area">
            {data.blocks.map((b: any, index: number) => {
              let inner;
              if (b.t === 'p') inner = <textarea className="noteslite-b-p" rows={1} placeholder="Type something, or / for blocks…" onInput={handleTextareaInput} onKeyDown={(e) => handleKeyDown(e, index)} value={b.v} onChange={e => updateBlockValue(index, e.target.value)} />;
              else if (b.t === 'h1') inner = <input className="noteslite-b-h1" value={b.v} placeholder="Heading 1" onChange={e => updateBlockValue(index, e.target.value)} />;
              else if (b.t === 'h2') inner = <input className="noteslite-b-h2" value={b.v} placeholder="Heading 2" onChange={e => updateBlockValue(index, e.target.value)} />;
              else if (b.t === 'h3') inner = <input className="noteslite-b-h3" value={b.v} placeholder="HEADING 3" onChange={e => updateBlockValue(index, e.target.value)} />;
              else if (b.t === 'todo') inner = (
                <div className="noteslite-b-todo">
                  <div className={`noteslite-b-todo-check ${b.done ? 'done' : ''}`} onClick={() => toggleTodo(index)}>{b.done ? '✓' : ''}</div>
                  <input className={`noteslite-b-todo-text ${b.done ? 'done' : ''}`} value={b.v} placeholder="To-do item…" onChange={e => updateBlockValue(index, e.target.value)} />
                </div>
              );
              else if (b.t === 'bullet') inner = (
                <div className="noteslite-b-bullet">
                  <div className="noteslite-b-bullet-dot" />
                  <input className="noteslite-b-bullet-text" value={b.v} placeholder="List item…" onChange={e => updateBlockValue(index, e.target.value)} />
                </div>
              );
              else if (b.t === 'numbered') {
                numberedCounter++;
                inner = (
                  <div className="noteslite-b-numbered">
                    <div className="noteslite-b-num">{numberedCounter}.</div>
                    <input className="noteslite-b-num-text" value={b.v} placeholder="Numbered item…" onChange={e => updateBlockValue(index, e.target.value)} />
                  </div>
                );
              }
              else if (b.t === 'divider') inner = <hr className="noteslite-b-divider" />;
              else if (b.t === 'quote') inner = (
                <div className="noteslite-b-quote">
                  <textarea className="noteslite-b-p" rows={1} style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '15px' }} onInput={handleTextareaInput} value={b.v} onChange={e => updateBlockValue(index, e.target.value)} />
                </div>
              );
              else if (b.t === 'callout') inner = (
                <div className="noteslite-b-callout">
                  <div className="noteslite-b-callout-emoji">💡</div>
                  <textarea className="noteslite-b-callout-text" rows={2} onInput={handleTextareaInput} value={b.v} onChange={e => updateBlockValue(index, e.target.value)} />
                </div>
              );
              else if (b.t === 'code') inner = (
                <div className="noteslite-b-code">
                  <div className="noteslite-b-code-lang">python</div>
                  <textarea className="noteslite-b-code textarea" rows={4} style={{ fontFamily: "'Courier New', monospace", fontSize: '13px', color: '#E8D5B5', background: 'none', border: 'none', outline: 'none', resize: 'none', width: '100%' }} onInput={handleTextareaInput} value={b.v || '// Write code here…'} onChange={e => updateBlockValue(index, e.target.value)} />
                </div>
              );
              else if (b.t === 'image') inner = (
                <div className="noteslite-b-image" onClick={() => triggerToast('Image upload: coming in full build')}>
                  <div style={{ fontSize: '28px' }}>🖼</div>
                  <div className="noteslite-b-image-placeholder">Click to add image</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Supports JPG, PNG, GIF, WebP</div>
                </div>
              );
              else if (b.t === 'video') inner = (
                <div className="noteslite-b-video" onClick={() => triggerToast('Video embed: paste a YouTube/Vimeo URL')}>
                  <div className="noteslite-b-video-play">▶</div>
                  <div className="noteslite-b-video-label">Click to embed video</div>
                </div>
              );
              else if (b.t === 'table') inner = (
                <table className="noteslite-b-table">
                  <thead><tr><th>Algorithm</th><th>Time</th><th>Space</th><th>Notes</th></tr></thead>
                  <tbody>
                    <tr><td>BFS</td><td>O(V+E)</td><td>O(V)</td><td>Uses queue</td></tr>
                    <tr><td>DFS</td><td>O(V+E)</td><td>O(V)</td><td>Uses stack/recursion</td></tr>
                    <tr><td>Dijkstra's</td><td>O(E log V)</td><td>O(V)</td><td>No negative edges</td></tr>
                  </tbody>
                </table>
              );
              else if (b.t === 'link') inner = (
                <div className="noteslite-b-link-preview" onClick={() => triggerToast('Opening link…')}>
                  <div className="noteslite-b-link-thumb">🌐</div>
                  <div className="noteslite-b-link-info">
                    <div className="noteslite-b-link-title">CP-Algorithms — Graph Traversal</div>
                    <div className="noteslite-b-link-url">https://cp-algorithms.com/graph/depth-first-search.html</div>
                  </div>
                </div>
              );
              else inner = <textarea className="noteslite-b-p" rows={1} onInput={handleTextareaInput} value={b.v} onChange={e => updateBlockValue(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index)} />;

              return (
                <div key={index} className="noteslite-block-row">
                  <div className="noteslite-block-handle" title="Drag to reorder">⠿</div>
                  <div className="noteslite-block-add-btn" onClick={() => {
                    if (editorBodyRef.current) {
                      const rect = editorBodyRef.current.getBoundingClientRect();
                      setSlashMenu({ x: rect.left + 80, y: window.innerHeight / 2 });
                    }
                  }} title="Add block below">+</div>
                  <div className="noteslite-block-content">{inner}</div>
                </div>
              );
            })}
          </div>
          <div style={{ height: '80px' }} />
        </div>
      </div>

      {/* Slash Menu */}
      {slashMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setSlashMenu(null)} />
          <div className="noteslite-slash-menu" style={{ display: 'block', left: Math.min(slashMenu.x, window.innerWidth - 260), top: Math.min(slashMenu.y, window.innerHeight - 360) }}>
            <div className="noteslite-slash-header">Add block</div>
            {[
              { id: 'h1', icon: 'H1', label: 'Heading 1', desc: 'Large section title' },
              { id: 'h2', icon: 'H2', label: 'Heading 2', desc: 'Sub-section title' },
              { id: 'todo', icon: '☑', label: 'To-do', desc: 'Trackable checklist item' },
              { id: 'bullet', icon: '•', label: 'Bullet List', desc: 'Unordered list item' },
              { id: 'numbered', icon: '1.', label: 'Numbered List', desc: 'Ordered list item' },
              { id: 'callout', icon: '💡', label: 'Callout', desc: 'Highlighted info box' },
              { id: 'code', icon: '⌨', label: 'Code Block', desc: 'Syntax-highlighted code' },
              { id: 'image', icon: '🖼', label: 'Image', desc: 'Upload or paste image' },
              { id: 'table', icon: '⊞', label: 'Table', desc: 'Structured data rows' },
              { id: 'divider', icon: '—', label: 'Divider', desc: 'Horizontal separator' }
            ].map(item => (
              <div key={item.id} className="noteslite-slash-item" onClick={() => insertBlock(item.id)}>
                <div className="noteslite-slash-item-icon">{item.icon}</div>
                <div>
                  <div className="noteslite-slash-item-label">{item.label}</div>
                  <div className="noteslite-slash-item-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
