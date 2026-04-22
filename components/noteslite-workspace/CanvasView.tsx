import React, { useRef, useEffect, useState } from 'react';

interface CanvasViewProps {
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  connections: string[][];
  triggerToast: (msg: string) => void;
  openCardEditor: (colName: string, cardTitle: string) => void;
  columns: any[];
}

export default function CanvasView({ items, setItems, connections, triggerToast, openCardEditor, columns }: CanvasViewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const ZOOM_MIN = 0.12;
  const ZOOM_MAX = 4;
  const GRID = 24;

  const dragRef = useRef<{ id: string, ox: number, oy: number } | null>(null);
  const panRef = useRef<{ sx: number, sy: number, cx: number, cy: number } | null>(null);
  const pinchRef = useRef<{ d0: number, z0: number } | null>(null);

  const updateViewport = (newCam: { x: number, y: number }, newZoom: number) => {
    if (viewportRef.current) {
      viewportRef.current.style.transform = `scale(${newZoom}) translate(${newCam.x}px,${newCam.y}px)`;
    }
    if (frameRef.current) {
      const g = GRID * newZoom;
      const ox = ((newCam.x * newZoom) % g + g) % g;
      const oy = ((newCam.y * newZoom) % g + g) % g;
      frameRef.current.style.backgroundSize = `${g}px ${g}px`;
      frameRef.current.style.backgroundPosition = `${ox}px ${oy}px`;
    }
  };

  useEffect(() => {
    updateViewport(cam, zoom);
  }, [cam, zoom]);

  const handleDeltaZoom = (d: number) => {
    setZoom(prev => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + d)));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const d = e.ctrlKey ? -e.deltaY * 0.01 : (e.deltaY > 0 ? -0.12 : 0.12);
    handleDeltaZoom(d);
  };

  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.noteslite-cv-item') || (e.target as HTMLElement).closest('.noteslite-cv-zoomhud')) return;
    setSelectedId(null);
    panRef.current = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    setIsGrabbing(true);

    const onMove = (evt: PointerEvent) => {
      if (!panRef.current) return;
      const dx = (evt.clientX - panRef.current.sx) / zoom;
      const dy = (evt.clientY - panRef.current.sy) / zoom;
      setCam({
        x: panRef.current.cx + dx,
        y: panRef.current.cy + dy
      });
    };
    const onUp = () => {
      panRef.current = null;
      setIsGrabbing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    const wx = (e.clientX - r.left) / zoom - cam.x;
    const wy = (e.clientY - r.top) / zoom - cam.y;
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    dragRef.current = { id, ox: wx - item.x, oy: wy - item.y };
    setSelectedId(id);
    setIsGrabbing(true);

    const onMove = (evt: PointerEvent) => {
      if (!dragRef.current || !frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      const newWx = (evt.clientX - rect.left) / zoom - cam.x;
      const newWy = (evt.clientY - rect.top) / zoom - cam.y;
      
      const activeDrag = dragRef.current;
      
      setItems(prev => prev.map(i => {
        if (i.id === activeDrag.id) {
          return { ...i, x: newWx - activeDrag.ox, y: newWy - activeDrag.oy };
        }
        return i;
      }));
    };
    const onUp = () => {
      dragRef.current = null;
      setIsGrabbing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const renderInner = (item: any) => {
    const isSelected = selectedId === item.id;
    const bar = (
      <div className="noteslite-cv-item-bar" style={{ opacity: isSelected ? 1 : 0, pointerEvents: isSelected ? 'all' : 'none' }}>
        <button className="noteslite-cv-ibar-btn" title="Duplicate" onClick={() => {
          const newId = 'item-' + Math.random().toString(36).substr(2, 6);
          setItems(prev => [...prev, { ...item, id: newId, x: item.x + 24, y: item.y + 24, z: Math.max(...prev.map(i => i.z)) + 1 }]);
          setSelectedId(newId);
          triggerToast('Item duplicated');
        }}>⧉</button>
        <div className="noteslite-cv-ibar-sep" />
        <button className="noteslite-cv-ibar-btn del" title="Delete" onClick={() => {
          setItems(prev => prev.filter(i => i.id !== item.id));
          if (selectedId === item.id) setSelectedId(null);
          triggerToast('Item deleted');
        }}>×</button>
      </div>
    );

    const grip = (
      <div className="noteslite-cv-grip" title="Drag to move" onPointerDown={(e) => startDrag(e, item.id)}>⠿</div>
    );

    if (item.type === 'column') {
      return (
        <>
          {bar}{grip}
          <div className="noteslite-cv-col-strip" style={{ background: item.color }} />
          <div className="noteslite-cv-col-header">
            <div className="noteslite-cv-col-top">
              <div className="noteslite-cv-col-dot" style={{ background: item.color }} />
              <div className="noteslite-cv-col-name">{item.title}</div>
              <div className="noteslite-cv-col-count">{(item.cards || []).length}</div>
            </div>
            <div className="noteslite-cv-col-desc">{item.desc || ''}</div>
          </div>
          <div className="noteslite-cv-col-cards">
            {(item.cards || []).map((c: string, idx: number) => (
              <div key={idx} className="noteslite-cv-card-pill" onClick={() => openCardEditor(item.title, c)}>
                {c}
              </div>
            ))}
          </div>
        </>
      );
    }
    if (item.type === 'heading') {
      return (
        <>
          {bar}{grip}
          <div className="noteslite-cv-note-header" style={{ borderBottom: '3px solid var(--rose)', paddingBottom: '10px' }}>
            <input 
              className="noteslite-cv-note-title-in" 
              defaultValue={item.title || 'Heading'} 
              placeholder="Heading text"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700 }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={{ padding: '8px 12px 12px', fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Sans', sans-serif" }}>
            {item.subtitle || 'Subtitle or description'}
          </div>
        </>
      );
    }
    return (
      <>
        {bar}{grip}
        <div className="noteslite-cv-note-header">
          <input 
            className="noteslite-cv-note-title-in" 
            defaultValue={item.title || 'Note'} 
            placeholder="Title"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          />
        </div>
        <textarea 
          className="noteslite-cv-note-body-in" 
          defaultValue={item.content || ''} 
          placeholder="Write something…"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        />
      </>
    );
  };

  const addItem = (type: string) => {
    if (!frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    const cx = r.width / 2 / zoom - cam.x;
    const cy = r.height / 2 / zoom - cam.y;
    const w = type === 'column' ? 232 : 240;
    const id = 'item-' + Math.random().toString(36).substr(2, 6);
    const newItem = {
      id, type, x: cx - w / 2, y: cy - 80, w,
      z: items.length > 0 ? Math.max(...items.map(i => i.z)) + 1 : 1,
      title: type === 'column' ? 'New Column' : type === 'heading' ? 'New Heading' : 'New Note',
      desc: type === 'column' ? 'Column description' : '',
      content: '', subtitle: 'Subtitle', color: '#A09080', cards: []
    };
    setItems(prev => [...prev, newItem]);
    setSelectedId(id);
    triggerToast(`+ ${type} added`);
  };

  const fitView = () => {
    if (items.length === 0 || !frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    const pad = 48;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(item => {
      const h = item.type === 'column' ? Math.max(56 + (item.cards?.length || 0) * 33, 100) : item.type === 'heading' ? 88 : 160;
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.w);
      maxY = Math.max(maxY, item.y + h);
    });
    const bw = maxX - minX, bh = maxY - minY;
    const newZoom = Math.max(ZOOM_MIN, Math.min((r.width - pad * 2) / bw, (r.height - pad * 2) / bh, ZOOM_MAX));
    setZoom(newZoom);
    setCam({
      x: (r.width / newZoom - bw) / 2 - minX,
      y: (r.height / newZoom - bh) / 2 - minY
    });
  };

  const syncFromBoard = () => {
    setItems(columns.map(c => ({ ...c })));
    triggerToast('✓ Canvas synced from Board');
  };

  return (
    <div id="noteslite-canvas-view" className="active-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="noteslite-cv-statusbar">
        <div className="noteslite-cv-stat-chip accent">
          <div className="noteslite-cv-stat-dot" style={{ background: 'var(--accent)' }} />
          Canvas
        </div>
        <div className="noteslite-cv-stat-chip">
          <div className="noteslite-cv-stat-dot" style={{ background: 'var(--text3)' }} />
          <span>{items.length}</span> items
        </div>
        {selectedId && (
          <div className="noteslite-cv-stat-chip" style={{ display: 'inline-flex' }}>
            <div className="noteslite-cv-stat-dot" style={{ background: items.find(i => i.id === selectedId)?.color || 'var(--text3)' }} />
            <span>{items.find(i => i.id === selectedId)?.title || 'Item'}</span>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="noteslite-cv-stat-chip" style={{ fontSize: '10px', color: 'var(--text3)' }}>
            Scroll to zoom · Drag to pan · Grip to move
          </div>
        </div>
      </div>

      <div className="noteslite-cv-body">
        <div className="noteslite-cv-sidebar">
          <div className="noteslite-cv-sidebar-label">Add to canvas</div>
          <button className="noteslite-cv-add-btn" onClick={() => addItem('column')}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--accent)' }} />Column node
          </button>
          <button className="noteslite-cv-add-btn" onClick={() => addItem('note')}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--blue)' }} />Note
          </button>
          <button className="noteslite-cv-add-btn" onClick={() => addItem('heading')}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--rose)' }} />Heading
          </button>
          <div className="noteslite-cv-sidebar-sep" />
          <div className="noteslite-cv-sidebar-label" style={{ paddingTop: 0 }}>View</div>
          <button className="noteslite-cv-add-btn" onClick={fitView}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--text3)' }} />Fit all items
          </button>
          <button className="noteslite-cv-add-btn" onClick={() => { setCam({ x: 0, y: 0 }); setZoom(1); }}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--text3)' }} />Reset view
          </button>
          <div className="noteslite-cv-sidebar-sep" />
          <div className="noteslite-cv-sidebar-label" style={{ paddingTop: 0 }}>Sync</div>
          <button className="noteslite-cv-add-btn" onClick={syncFromBoard}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--green)' }} />Sync from board
          </button>
        </div>

        <div 
          className={`noteslite-cv-frame ${isGrabbing ? 'noteslite-cv-grabbing' : ''}`} 
          ref={frameRef}
          onPointerDown={startPan}
          onWheel={handleWheel}
        >
          <div className="noteslite-cv-viewport" ref={viewportRef}>
            <svg className="noteslite-cv-svg">
              <defs>
                <marker id="noteslite-cvarr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="rgba(44,38,28,0.22)" />
                </marker>
              </defs>
              {connections.map(([fromId, toId], idx) => {
                const from = items.find(i => i.id === fromId);
                const to = items.find(i => i.id === toId);
                if (!from || !to) return null;
                const fh = from.type === 'column' ? Math.max(56 + (from.cards?.length || 0) * 33, 100) : 160;
                const th = to.type === 'column' ? Math.max(56 + (to.cards?.length || 0) * 33, 100) : 160;
                const x1 = from.x + from.w;
                const y1 = from.y + fh / 2;
                const x2 = to.x;
                const y2 = to.y + th / 2;
                const dx = Math.abs(x2 - x1) * 0.5;
                return (
                  <path 
                    key={idx} 
                    d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`}
                    fill="none" stroke="rgba(44,38,28,0.15)" strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#noteslite-cvarr)"
                  />
                );
              })}
            </svg>
            
            {items.map(item => (
              <div 
                key={item.id} 
                className={`noteslite-cv-item ${selectedId === item.id ? 'noteslite-cv-selected' : ''}`}
                style={{ left: item.x, top: item.y, width: item.w, zIndex: item.z }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(item.id);
                  setItems(prev => prev.map(i => i.id === item.id ? { ...i, z: Math.max(...prev.map(p => p.z)) + 1 } : i));
                }}
              >
                {renderInner(item)}
              </div>
            ))}
          </div>

          <div className="noteslite-cv-zoomhud">
            <button className="noteslite-cv-zhbtn" title="Zoom out" onClick={() => handleDeltaZoom(-0.15)}>
              <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor"><rect width="10" height="2" rx="1" /></svg>
            </button>
            <div className="noteslite-cv-zhpct" onClick={() => { setCam({ x: 0, y: 0 }); setZoom(1); }} title="Reset view">
              {Math.round(zoom * 100)}%
            </div>
            <button className="noteslite-cv-zhbtn" title="Zoom in" onClick={() => handleDeltaZoom(0.15)}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="0" y="4" width="10" height="2" rx="1" /><rect x="4" y="0" width="2" height="10" rx="1" /></svg>
            </button>
            <button className="noteslite-cv-zhbtn" title="Fit view" onClick={fitView} style={{ borderLeft: '1px solid var(--border)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" />
              </svg>
            </button>
          </div>

          {items.length === 0 && (
            <div className="noteslite-cv-empty-state show">
              <div className="noteslite-cv-empty-icon">◈</div>
              <div className="noteslite-cv-empty-title">Canvas is empty</div>
              <div className="noteslite-cv-empty-sub">Add items from the sidebar or sync from your board</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
