import React, { useState, useRef, useEffect } from 'react';
import EmojiIcon, { getEmojiAssetName } from '@/components/emoji-icon';
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
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const editorBodyRef = useRef<HTMLDivElement>(null);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
  };

  const isEmptyEditorSpace = (target: HTMLElement): boolean => {
    // Returns true when the click is on editor "whitespace" — not on any
    // existing block, the card title, cover area, meta, or emoji.
    if (!editorBodyRef.current?.contains(target)) return false;
    if (target.closest('.noteslite-block-row')) return false;
    if (target.closest('.noteslite-card-title-input')) return false;
    if (target.closest('.noteslite-card-cover-area')) return false;
    if (target.closest('.noteslite-card-meta')) return false;
    if (target.closest('.noteslite-cover-emoji')) return false;
    if (target.closest('.noteslite-slash-menu')) return false;
    return true;
  };

  const handleEditorBodyDoubleClick = (e: React.MouseEvent) => {
    if (!isEmptyEditorSpace(e.target as HTMLElement)) return;
    const lastBlock = data.blocks[data.blocks.length - 1];
    if (!lastBlock || lastBlock.v !== '' || lastBlock.t !== 'p') {
      insertBlock('p', data.blocks.length);
    } else {
      setFocusIndex(data.blocks.length - 1);
    }
  };

  const handleEditorBodyClick = (e: React.MouseEvent) => {
    if (!isEmptyEditorSpace(e.target as HTMLElement)) return;
    if (data.blocks.length > 0) {
      setFocusIndex(data.blocks.length - 1);
    }
  };

  const insertBlock = (type: string, index: number = data.blocks.length) => {
    const newBlocks = [...data.blocks];
    newBlocks.splice(index, 0, { t: type, v: '', done: false });
    setCardData({ ...data, blocks: newBlocks });
    setFocusIndex(index);
    setSlashMenu(null);
    triggerToast(`Block added: ${type}`);
  };

  const handleFileUpload = (index: number, accept: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Show loading state if desired, but we'll just read it
        if (file.size > 10 * 1024 * 1024) {
          triggerToast('Warning: Large files might take a moment to process.');
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            updateBlockValue(index, event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleDocumentUpload = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.zip,.json,.rtf,.odt,.ods,.odp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,text/markdown';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) {
        triggerToast('Warning: Large files might take a moment to process.');
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateBlockValue(index, JSON.stringify({
            name: file.name,
            type: file.type || '',
            size: file.size,
            url: event.target.result as string,
          }));
          triggerToast(`Attached: ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const getDocIcon = (nameOrType: string): string => {
    const s = (nameOrType || '').toLowerCase();
    if (s.includes('pdf')) return '📕';
    if (s.includes('sheet') || s.endsWith('.xls') || s.endsWith('.xlsx') || s.endsWith('.csv') || s.includes('excel')) return '📊';
    if (s.includes('presentation') || s.endsWith('.ppt') || s.endsWith('.pptx') || s.includes('powerpoint')) return '📈';
    if (s.includes('word') || s.endsWith('.doc') || s.endsWith('.docx') || s.endsWith('.rtf') || s.endsWith('.odt')) return '📝';
    if (s.endsWith('.txt') || s.endsWith('.md') || s.startsWith('text/')) return '📄';
    if (s.endsWith('.zip') || s.includes('zip') || s.includes('compressed')) return '🗜';
    return '📎';
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow default behavior for textareas (new line)
        // If it's an input, it won't do anything by default, which is fine.
      } else {
        e.preventDefault();
        insertBlock('p', index + 1);
      }
    }
    if (e.key === 'Backspace' && data.blocks[index].v === '' && data.blocks.length > 1) {
      e.preventDefault();
      const newBlocks = [...data.blocks];
      newBlocks.splice(index, 1);

      // After removing an empty line, jump the cursor back to the nearest
      // previous line with text (preferred), else the nearest editable block,
      // else the first block.
      const editableTypes = ['p', 'h1', 'h2', 'h3', 'todo', 'bullet', 'numbered', 'quote', 'callout', 'code'];
      const start = Math.min(index - 1, newBlocks.length - 1);
      let focusAt = -1;
      for (let i = start; i >= 0; i--) {
        if (editableTypes.includes(newBlocks[i].t) && newBlocks[i].v) { focusAt = i; break; }
      }
      if (focusAt === -1) {
        for (let i = start; i >= 0; i--) {
          if (editableTypes.includes(newBlocks[i].t)) { focusAt = i; break; }
        }
      }
      if (focusAt === -1) focusAt = 0;

      setCardData({ ...data, blocks: newBlocks });
      setFocusIndex(focusAt);
      triggerToast('Block removed');
    }
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

  const updateBlockProps = (index: number, props: any) => {
    const newBlocks = [...data.blocks];
    newBlocks[index] = { ...newBlocks[index], ...props };
    setCardData({ ...data, blocks: newBlocks });
  };

  // Resize every textarea after every render: fixes initial load (multi-line Shift+Enter content)
  // AND reorder moves (drag-and-drop swaps value props but leaves old style.height on DOM nodes).
  useEffect(() => {
    const area = editorBodyRef.current?.querySelector('.noteslite-blocks-area');
    if (!area) return;
    area.querySelectorAll('textarea').forEach((ta) => {
      const textarea = ta as HTMLTextAreaElement;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
  }); // intentionally no deps — must run after every render

  useEffect(() => {
    if (focusIndex !== null && editorBodyRef.current) {
      // Scope the query to the blocks area so we don't accidentally pick up
      // the card-title textarea (which would shift every index by 1).
      const blocksArea = editorBodyRef.current.querySelector('.noteslite-blocks-area');
      if (blocksArea) {
        // Find the block-row at focusIndex, then its first editable element.
        const rows = blocksArea.querySelectorAll(':scope > .noteslite-block-row');
        const row = rows[focusIndex] as HTMLElement | undefined;
        if (row) {
          const target = row.querySelector('textarea, input[type="text"]:not([readonly]), input:not([type])') as HTMLElement | null;
          if (target) {
            target.focus();
            if (target instanceof HTMLTextAreaElement) {
              target.setSelectionRange(target.value.length, target.value.length);
            } else if (target instanceof HTMLInputElement) {
              const len = target.value.length;
              try { target.setSelectionRange(len, len); } catch {}
            }
          }
        }
      }
      setFocusIndex(null);
    }
  }, [focusIndex, data.blocks.length]);

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
          <span className="cur" id="noteslite-bcCard">{data.title || (data.blocks && data.blocks[0]?.v) || "Untitled"}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="noteslite-tbtn" onClick={() => triggerToast('Card saved ✓')}>
            <EmojiIcon emoji="💾" label="Save" /> Save
          </button>
          <button className="noteslite-tbtn" onClick={() => handleDeleteCard(cardTitle)} style={{ color: '#A04040' }}>
            <EmojiIcon emoji="🗑" label="Delete" /> Delete
          </button>
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
        <button className="noteslite-fbtn" onClick={() => insertBlock('todo')}><EmojiIcon emoji="☑" label="To-do" /> To-do</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('bullet')}>• List</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('numbered')}>1. List</button>
        <div className="noteslite-fsep" />
        <button className="noteslite-fbtn" onClick={() => insertBlock('quote')}>" Quote</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('callout')}><EmojiIcon emoji="💡" label="Callout" /> Callout</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('code')}><EmojiIcon emoji="⌨" label="Code" /> Code</button>
        <div className="noteslite-fsep" />
        <button className="noteslite-fbtn" onClick={() => insertBlock('image')}><EmojiIcon emoji="🖼" label="Image" /> Image</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('video')}><EmojiIcon emoji="▶" label="Video" /> Video</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('table')}>⊞ Table</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('link')}><EmojiIcon emoji="🔗" label="Link" /> Link</button>
        <button className="noteslite-fbtn" onClick={() => insertBlock('document')}><EmojiIcon emoji="📎" label="File" /> File</button>
        <div className="noteslite-fsep" />
        <button className="noteslite-fbtn" onClick={() => insertBlock('divider')}>— Divider</button>
      </div>

      <div 
        className="noteslite-editor-body" 
        id="noteslite-editorBody" 
        ref={editorBodyRef} 
        onClick={handleEditorBodyClick} 
        onDoubleClick={handleEditorBodyDoubleClick}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            if (file.size > 15 * 1024 * 1024) {
              triggerToast('Warning: Large files might take a moment to process.');
            }
            const reader = new FileReader();
            reader.onload = (event) => {
              if (!event.target?.result) return;
              const newBlocks = [...data.blocks];
              if (isImage || isVideo) {
                const type = isVideo ? 'video' : 'image';
                newBlocks.push({ t: type, v: event.target.result as string, done: false });
                setCardData({ ...data, blocks: newBlocks });
                triggerToast(`Imported ${type}`);
              } else {
                newBlocks.push({
                  t: 'document',
                  v: JSON.stringify({
                    name: file.name,
                    type: file.type || '',
                    size: file.size,
                    url: event.target.result as string,
                  }),
                  done: false,
                });
                setCardData({ ...data, blocks: newBlocks });
                triggerToast(`Attached: ${file.name}`);
              }
            };
            reader.readAsDataURL(file);
          }
        }}
      >
        <div className="noteslite-card-cover-area" style={{ '--cover-a': data.coverA, '--cover-b': data.coverB } as React.CSSProperties}>
          <button className="noteslite-cover-change-btn" onClick={() => triggerToast('Cover picker coming soon')}>
            <EmojiIcon emoji="🎨" label="Cover" /> Change cover
          </button>
        </div>
        <div className="noteslite-editor-doc" id="noteslite-editorDoc">
          <EmojiIcon className="noteslite-cover-emoji" emoji={data.icon} label="Card icon" />
          <textarea className="noteslite-card-title-input" rows={1} defaultValue={data.title || data.blocks?.find((b: any) => ['p', 'h1', 'h2', 'h3'].includes(b.t) && b.v)?.v || "Untitled"} placeholder="Untitled" onInput={handleTextareaInput} onChange={e => setCardData({ ...data, title: e.target.value })} />
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
              else if (b.t === 'h1') inner = <textarea className="noteslite-b-h1" rows={1} value={b.v} placeholder="Heading 1" onInput={handleTextareaInput} onKeyDown={(e) => handleKeyDown(e, index)} onChange={e => updateBlockValue(index, e.target.value)} />;
              else if (b.t === 'h2') inner = <textarea className="noteslite-b-h2" rows={1} value={b.v} placeholder="Heading 2" onInput={handleTextareaInput} onKeyDown={(e) => handleKeyDown(e, index)} onChange={e => updateBlockValue(index, e.target.value)} />;
              else if (b.t === 'h3') inner = <textarea className="noteslite-b-h3" rows={1} value={b.v} placeholder="HEADING 3" onInput={handleTextareaInput} onKeyDown={(e) => handleKeyDown(e, index)} onChange={e => updateBlockValue(index, e.target.value)} />;
              else if (b.t === 'todo') inner = (
                <div className="noteslite-b-todo">
                  <div className={`noteslite-b-todo-check ${b.done ? 'done' : ''}`} onClick={() => toggleTodo(index)}>{b.done ? '✓' : ''}</div>
                  <textarea className={`noteslite-b-todo-text ${b.done ? 'done' : ''}`} rows={1} value={b.v} placeholder="To-do item…" onInput={handleTextareaInput} onKeyDown={(e) => handleKeyDown(e, index)} onChange={e => updateBlockValue(index, e.target.value)} />
                </div>
              );
              else if (b.t === 'bullet') inner = (
                <div className="noteslite-b-bullet">
                  <div className="noteslite-b-bullet-dot" />
                  <textarea className="noteslite-b-bullet-text" rows={1} value={b.v} placeholder="List item…" onInput={handleTextareaInput} onKeyDown={(e) => handleKeyDown(e, index)} onChange={e => updateBlockValue(index, e.target.value)} />
                </div>
              );
              else if (b.t === 'numbered') {
                numberedCounter++;
                inner = (
                  <div className="noteslite-b-numbered">
                    <div className="noteslite-b-num">{numberedCounter}.</div>
                    <textarea className="noteslite-b-num-text" rows={1} value={b.v} placeholder="Numbered item…" onInput={handleTextareaInput} onKeyDown={(e) => handleKeyDown(e, index)} onChange={e => updateBlockValue(index, e.target.value)} />
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
                  <EmojiIcon className="noteslite-b-callout-emoji" emoji="💡" label="Callout" />
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
                <div className="noteslite-b-image" onClick={() => {
                  if (!b.v) {
                    handleFileUpload(index, 'image/*');
                  }
                }}>
                  {b.v ? (
                    <div 
                      style={{
                        width: b.w || '100%', 
                        maxWidth: '100%', 
                        minWidth: '100px', 
                        resize: 'horizontal', 
                        overflow: 'hidden', 
                        position: 'relative',
                        paddingBottom: '2px',
                        cursor: 'pointer'
                      }}
                      onMouseUp={(e) => {
                        const newWidth = e.currentTarget.style.width;
                        if (newWidth && newWidth !== b.w) {
                          updateBlockProps(index, { w: newWidth });
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImage(b.v);
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                      }}
                    >
                      <img 
                        src={b.v} 
                        alt="Image" 
                        draggable={false}
                        style={{width: '100%', borderRadius: '8px', display: 'block'}} 
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleFileUpload(index, 'image/*'); }} style={{position: 'absolute', top: 8, right: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer', color: 'var(--text)'}}>Change Image</button>
                    </div>
                  ) : <>
                    <EmojiIcon emoji="🖼" label="Image" style={{ fontSize: '28px' }} />
                    <div className="noteslite-b-image-placeholder">Click to upload image</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Supports JPG, PNG, GIF, WebP</div>
                  </>}
                </div>
              );
              else if (b.t === 'video') inner = (
                <div className="noteslite-b-video" onClick={() => {
                  if (!b.v) {
                    handleFileUpload(index, 'video/*');
                  }
                }}>
                  {b.v ? (
                    <div style={{width: '100%', position: 'relative'}}>
                      {b.v.startsWith('data:video') ? (
                        <video width="100%" controls style={{borderRadius: '8px', display: 'block'}} src={b.v}></video>
                      ) : (
                        <iframe width="100%" height="315" src={b.v} frameBorder="0" allowFullScreen style={{borderRadius: '8px', display: 'block'}}></iframe>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleFileUpload(index, 'video/*'); }} style={{position: 'absolute', top: 8, right: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer', color: 'var(--text)'}}>Change Video</button>
                    </div>
                  ) : <>
                    <EmojiIcon className="noteslite-b-video-play" emoji="▶" label="Play" />
                    <div className="noteslite-b-video-label">Click to upload video</div>
                  </>}
                </div>
              );
              else if (b.t === 'table') {
                const tableData = b.v ? JSON.parse(b.v) : {
                  headers: ['Column 1', 'Column 2', 'Column 3'],
                  rows: [['Value 1', 'Value 2', 'Value 3']]
                };
                
                inner = (
                  <div className="noteslite-b-table-container" style={{margin: '8px 0'}}>
                    <table className="noteslite-b-table" style={{margin: 0}}>
                      <thead>
                        <tr>
                          {tableData.headers.map((h: string, hi: number) => (
                            <th key={hi}>
                              <input value={h} onChange={e => {
                                const newHeaders = [...tableData.headers];
                                newHeaders[hi] = e.target.value;
                                updateBlockValue(index, JSON.stringify({ ...tableData, headers: newHeaders }));
                              }} style={{background: 'none', border: 'none', color: 'inherit', font: 'inherit', outline: 'none', width: '100%'}} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row: string[], ri: number) => (
                          <tr key={ri}>
                            {row.map((cell: string, ci: number) => (
                              <td key={ci}>
                                <input value={cell} onChange={e => {
                                  const newRows = [...tableData.rows];
                                  newRows[ri] = [...newRows[ri]];
                                  newRows[ri][ci] = e.target.value;
                                  updateBlockValue(index, JSON.stringify({ ...tableData, rows: newRows }));
                                }} style={{background: 'none', border: 'none', color: 'inherit', font: 'inherit', outline: 'none', width: '100%'}} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{display: 'flex', gap: '8px', marginTop: '6px'}}>
                      <button className="noteslite-fbtn" style={{height: 24, padding: '0 8px'}} onClick={() => {
                        const newHeaders = [...tableData.headers, `Col ${tableData.headers.length + 1}`];
                        const newRows = tableData.rows.map((r: string[]) => [...r, '']);
                        updateBlockValue(index, JSON.stringify({ headers: newHeaders, rows: newRows }));
                      }}>+ Column</button>
                      <button className="noteslite-fbtn" style={{height: 24, padding: '0 8px'}} onClick={() => {
                        const newRows = [...tableData.rows, Array(tableData.headers.length).fill('')];
                        updateBlockValue(index, JSON.stringify({ ...tableData, rows: newRows }));
                      }}>+ Row</button>
                    </div>
                  </div>
                );
              }
              else if (b.t === 'link') {
                const linkData = b.v ? JSON.parse(b.v) : { url: '', title: '' };
                inner = (
                  <div className="noteslite-b-link-preview" onClick={() => {
                    if (!b.v) {
                      const url = prompt("Enter URL:");
                      if (url) {
                        const title = prompt("Enter title (optional):") || url;
                        updateBlockValue(index, JSON.stringify({ url, title }));
                      }
                    } else {
                       window.open(linkData.url, '_blank');
                    }
                  }}>
                    <EmojiIcon className="noteslite-b-link-thumb" emoji="🌐" label="Link" />
                    <div className="noteslite-b-link-info">
                      <div className="noteslite-b-link-title">{linkData.title || 'Click to add link'}</div>
                      <div className="noteslite-b-link-url">{linkData.url || ''}</div>
                    </div>
                    {b.v && (
                      <button onClick={(e) => { e.stopPropagation(); const url = prompt("Edit URL:", linkData.url); if (url !== null) { const title = prompt("Edit title:", linkData.title) || url; updateBlockValue(index, JSON.stringify({ url, title })); } }} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '0 12px', color: 'var(--text3)'}}>
                        <EmojiIcon emoji="✎" label="Edit link" />
                      </button>
                    )}
                  </div>
                );
              }
              else if (b.t === 'document') {
                let docData: { name: string; type: string; size: number; url: string } | null = null;
                if (b.v) {
                  try { docData = JSON.parse(b.v); } catch { docData = null; }
                }
                const icon = getDocIcon(docData?.name || docData?.type || '');
                inner = (
                  <div
                    className="noteslite-b-document"
                    onClick={() => { if (!docData) handleDocumentUpload(index); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      margin: '4px 0',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      cursor: docData ? 'default' : 'pointer',
                      minHeight: '54px',
                    }}
                  >
                    {docData ? (
                      <>
                        <EmojiIcon emoji={icon} label="Document type" style={{ fontSize: '28px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docData.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                            {(docData.type || 'file').split('/').pop()}{docData.size ? ` · ${formatBytes(docData.size)}` : ''}
                          </div>
                        </div>
                        <a
                          href={docData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: '4px 10px',
                            fontSize: 11,
                            color: 'var(--text)',
                            textDecoration: 'none',
                            cursor: 'pointer',
                          }}
                          title="Open in new tab"
                        >Open</a>
                        <a
                          href={docData.url}
                          download={docData.name}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: '4px 10px',
                            fontSize: 11,
                            color: 'var(--text)',
                            textDecoration: 'none',
                            cursor: 'pointer',
                          }}
                          title="Download"
                        >↓</a>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDocumentUpload(index); }}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: '4px 10px',
                            fontSize: 11,
                            color: 'var(--text3)',
                            cursor: 'pointer',
                          }}
                          title="Replace file"
                        >Replace</button>
                      </>
                    ) : (
                      <>
                        <EmojiIcon emoji="📎" label="File" style={{ fontSize: '28px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Click to upload a document</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP…</div>
                        </div>
                      </>
                    )}
                  </div>
                );
              }
              else inner = <textarea className="noteslite-b-p" rows={1} onInput={handleTextareaInput} value={b.v} onChange={e => updateBlockValue(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index)} />;

              return (
                <div 
                  key={index} 
                  className={`noteslite-block-row ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index && draggedIndex !== index ? 'drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverIndex(index);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverIndex(null);
                    
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      const isImage = file.type.startsWith('image/');
                      const isVideo = file.type.startsWith('video/');
                      if (file.size > 15 * 1024 * 1024) {
                        triggerToast('Warning: Large files might take a moment to process.');
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (!event.target?.result) return;
                        const newBlocks = [...data.blocks];
                        if (isImage || isVideo) {
                          const type = isVideo ? 'video' : 'image';
                          newBlocks.splice(index, 0, { t: type, v: event.target.result as string, done: false });
                          setCardData({ ...data, blocks: newBlocks });
                          triggerToast(`Imported ${type}`);
                        } else {
                          newBlocks.splice(index, 0, {
                            t: 'document',
                            v: JSON.stringify({
                              name: file.name,
                              type: file.type || '',
                              size: file.size,
                              url: event.target.result as string,
                            }),
                            done: false,
                          });
                          setCardData({ ...data, blocks: newBlocks });
                          triggerToast(`Attached: ${file.name}`);
                        }
                      };
                      reader.readAsDataURL(file);
                      return;
                    }

                    if (draggedIndex === null || draggedIndex === index) return;
                    const newBlocks = [...data.blocks];
                    const draggedBlock = newBlocks[draggedIndex];
                    newBlocks.splice(draggedIndex, 1);
                    newBlocks.splice(index, 0, draggedBlock);
                    setCardData({ ...data, blocks: newBlocks });
                    setDraggedIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                >
                  <div 
                    className="noteslite-block-handle" 
                    title="Drag to reorder"
                    draggable={true}
                    onDragStart={(e) => {
                      setDraggedIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      const row = e.currentTarget.closest('.noteslite-block-row');
                      if (row) {
                        e.dataTransfer.setDragImage(row, 0, 0);
                      }
                    }}
                  >⠿</div>
                  <div className="noteslite-block-add-btn" onClick={() => {
                    if (editorBodyRef.current) {
                      const rect = editorBodyRef.current.getBoundingClientRect();
                      setSlashMenu({ x: rect.left + 80, y: window.innerHeight / 2 });
                    }
                  }} title="Add block below">+</div>
                  <div className="noteslite-block-content">{inner}</div>
                  <div className="noteslite-block-delete-btn" onClick={() => {
                    const newBlocks = [...data.blocks];
                    newBlocks.splice(index, 1);
                    setCardData({ ...data, blocks: newBlocks });
                    triggerToast('Block deleted');
                  }} title="Delete block">×</div>
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
          <div className="noteslite-slash-menu" style={{ display: 'flex', flexDirection: 'column', maxHeight: '320px', left: Math.min(slashMenu.x, window.innerWidth - 260), top: Math.min(slashMenu.y, window.innerHeight - 360) }}>
            <div className="noteslite-slash-header">Add block</div>
            <div className="noteslite-slash-menu-items" style={{ overflowY: 'auto', flex: 1 }}>
              {[
                { id: 'h1', icon: 'H1', label: 'Heading 1', desc: 'Large section title' },
                { id: 'h2', icon: 'H2', label: 'Heading 2', desc: 'Sub-section title' },
                { id: 'h3', icon: 'H3', label: 'Heading 3', desc: 'Small section title' },
                { id: 'p', icon: '¶', label: 'Text', desc: 'Plain text block' },
                { id: 'todo', icon: '☑', label: 'To-do', desc: 'Trackable checklist item' },
                { id: 'bullet', icon: '•', label: 'Bullet List', desc: 'Unordered list item' },
                { id: 'numbered', icon: '1.', label: 'Numbered List', desc: 'Ordered list item' },
                { id: 'quote', icon: '"', label: 'Quote', desc: 'Capture a quote' },
                { id: 'callout', icon: '💡', label: 'Callout', desc: 'Highlighted info box' },
                { id: 'code', icon: '⌨', label: 'Code Block', desc: 'Syntax-highlighted code' },
                { id: 'image', icon: '🖼', label: 'Image', desc: 'Embed an image' },
                { id: 'video', icon: '▶', label: 'Video', desc: 'Embed a video' },
                { id: 'table', icon: '⊞', label: 'Table', desc: 'Structured data rows' },
                { id: 'link', icon: '🔗', label: 'Link', desc: 'Bookmark a website' },
                { id: 'document', icon: '📎', label: 'File / Document', desc: 'Upload a PDF, Excel, Word, etc.' },
                { id: 'divider', icon: '—', label: 'Divider', desc: 'Horizontal separator' }
              ].map(item => (
                <div key={item.id} className="noteslite-slash-item" onClick={() => insertBlock(item.id)}>
                  <div className="noteslite-slash-item-icon">
                    {getEmojiAssetName(item.icon) ? (
                      <EmojiIcon emoji={item.icon} label={item.label} />
                    ) : (
                      item.icon
                    )}
                  </div>
                  <div>
                    <div className="noteslite-slash-item-label">{item.label}</div>
                    <div className="noteslite-slash-item-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
          }}
          onClick={() => setLightboxImage(null)}
          onMouseMove={(e) => {
            if (isPanning && zoom > 1) {
              setPan({ x: (e.clientX - startPan.x) / zoom, y: (e.clientY - startPan.y) / zoom });
            }
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: '12px', zIndex: 100000 }} onClick={e => e.stopPropagation()}>
             <button onClick={() => setZoom(z => z + 0.25)} className="noteslite-tbtn" style={{background: '#222', color: '#fff', border: '1px solid #444'}}><EmojiIcon emoji="➕" label="Zoom in" /> Zoom In</button>
             <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="noteslite-tbtn" style={{background: '#222', color: '#fff', border: '1px solid #444'}}><EmojiIcon emoji="➖" label="Zoom out" /> Zoom Out</button>
             <button onClick={() => setLightboxImage(null)} className="noteslite-tbtn" style={{background: '#222', color: '#fff', border: '1px solid #444'}}><EmojiIcon emoji="❌" label="Close" /> Close</button>
          </div>
          <div 
            style={{ 
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, 
              transition: isPanning ? 'none' : 'transform 0.2s ease-out',
              cursor: isPanning ? 'grabbing' : (zoom > 1 ? 'grab' : 'zoom-in'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseDown={(e) => {
              if (zoom > 1) {
                e.preventDefault();
                setIsPanning(true);
                setStartPan({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom });
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Only trigger default zoom if we are not panning or already zoomed
              if (zoom === 1) {
                setZoom(2);
              }
            }}
          >
            <img 
              src={lightboxImage} 
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
              alt="Expanded view" 
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
