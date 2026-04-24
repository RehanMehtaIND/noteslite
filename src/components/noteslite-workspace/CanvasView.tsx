import React, { useRef, useEffect, useState } from 'react';

interface CanvasViewProps {
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  connections: string[][];
  triggerToast: (msg: string) => void;
  openCardEditor: (colName: string, cardTitle: string) => void;
  columns: any[];
  onDeleteItem: (id: string) => void;
}

export default function CanvasView({ items, setItems, connections, triggerToast, openCardEditor, columns, onDeleteItem }: CanvasViewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const ZOOM_MIN = 0.12;
  const ZOOM_MAX = 4;
  const GRID = 24;

  const dragRef = useRef<{ id: string, ox: number, oy: number, handle?: string, ox2?: number, oy2?: number, initialW?: number, initialH?: number, initialX?: number, initialY?: number } | null>(null);
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

  const startDrag = (e: React.PointerEvent, id: string, handle: string = 'mid') => {
    e.preventDefault();
    e.stopPropagation();
    if (!frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    const wx = (e.clientX - r.left) / zoom - cam.x;
    const wy = (e.clientY - r.top) / zoom - cam.y;
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (item.type === 'arrow') {
      dragRef.current = {
        id, ox: wx - item.x, oy: wy - item.y, handle,
        ox2: wx - (item.x2 || item.x + 100),
        oy2: wy - (item.y2 || item.y)
      };
    } else {
      dragRef.current = {
        id, ox: wx - item.x, oy: wy - item.y, handle,
        initialW: item.w || 232,
        initialH: item.h || (item.type === 'column' ? Math.max(56 + (item.cards?.length || 0) * 33, 100) : 160),
        initialX: item.x,
        initialY: item.y
      };
    }

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
          if (i.type === 'arrow') {
            if (activeDrag.handle === 'start') {
              return { ...i, x: newWx - activeDrag.ox, y: newWy - activeDrag.oy, fromId: null };
            } else if (activeDrag.handle === 'end') {
              return { ...i, x2: newWx - activeDrag.ox2!, y2: newWy - activeDrag.oy2!, toId: null };
            } else {
              const dx = (newWx - activeDrag.ox) - i.x;
              const dy = (newWy - activeDrag.oy) - i.y;
              return { ...i, x: i.x + dx, y: i.y + dy, x2: (i.x2 || i.x + 100) + dx, y2: (i.y2 || i.y) + dy };
            }
          }

          if (activeDrag.handle === 'br') {
            const anchorX = activeDrag.initialX!;
            const anchorY = activeDrag.initialY!;
            const initialW = activeDrag.initialW!;
            const initialH = activeDrag.initialH!;

            // The point that was at the bottom-right corner at the start of the drag
            const currentX2 = (newWx - activeDrag.ox) + initialW;
            const currentY2 = (newWy - activeDrag.oy) + initialH;

            const nx = Math.min(anchorX, currentX2);
            const ny = Math.min(anchorY, currentY2);
            const nw = Math.max(40, Math.abs(currentX2 - anchorX));
            const nh = Math.max(40, Math.abs(currentY2 - anchorY));

            if (isNaN(nx) || isNaN(ny) || isNaN(nw) || isNaN(nh)) return i;
            return { ...i, x: nx, y: ny, w: nw, h: nh };
          }

          return { ...i, x: newWx - activeDrag.ox, y: newWy - activeDrag.oy };
        }
        return i;
      }));
    };
    const onUp = (evt: PointerEvent) => {
      const activeDrag = dragRef.current;
      if (activeDrag && activeDrag.handle !== 'mid') {
        // Snapping logic
        const rect = frameRef.current!.getBoundingClientRect();
        const dropX = (evt.clientX - rect.left) / zoom - cam.x;
        const dropY = (evt.clientY - rect.top) / zoom - cam.y;

        const overItem = items.find(i => {
          if (i.id === activeDrag.id) return false;
          const h = i.type === 'column' ? Math.max(56 + (i.cards?.length || 0) * 33, 100) : i.type === 'heading' ? 88 : 160;
          return dropX >= i.x && dropX <= i.x + i.w && dropY >= i.y && dropY <= i.y + h;
        });

        if (overItem) {
          setItems(prev => prev.map(i => {
            if (i.id === activeDrag.id) {
              return activeDrag.handle === 'start'
                ? { ...i, fromId: overItem.id }
                : { ...i, toId: overItem.id };
            }
            return i;
          }));
          triggerToast(`Arrow connected to ${overItem.title}`);
        }
      }

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
    const toolbar = (
      <div className="noteslite-cv-item-bar" style={{ opacity: isSelected ? 1 : 0, pointerEvents: isSelected ? 'all' : 'none' }}>
        <button className="noteslite-cv-ibar-btn" title="Duplicate" onClick={() => {
          const newId = 'item-' + Math.random().toString(36).substr(2, 6);
          setItems(prev => [...prev, { ...item, id: newId, x: item.x + 24, y: item.y + 24, z: Math.max(...prev.map(i => i.z)) + 1 }]);
          setSelectedId(newId);
          triggerToast('Item duplicated');
        }}>⧉</button>
        <div className="noteslite-cv-ibar-sep" />
        <button className="noteslite-cv-ibar-btn del" title="Delete" onClick={() => {
          onDeleteItem(item.id);
          if (selectedId === item.id) setSelectedId(null);
        }}>×</button>
      </div>
    );

    const accentBar = (
      <div className="noteslite-cv-accent-bar" style={{ backgroundColor: item.color || 'var(--accent)' }} />
    );

    const resizer = isSelected && (
      <div className="noteslite-cv-resizer-stripes br" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, item.id, 'br'); }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4"><path d="M12 0L0 12M12 4L4 12M12 8L8 12" /></svg>
      </div>
    );

    if (item.type === 'column') {
      return (
        <>
          {accentBar}
          {isSelected && (
            <div className="noteslite-cv-resizer-stripes br" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, item.id, 'br'); }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4">
                <path d="M12 0L0 12M12 4L4 12M12 8L8 12" />
              </svg>
            </div>
          )}
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
          {toolbar}
        </>
      );
    }
    if (item.type === 'heading') {
      return (<>
        <div className="noteslite-cv-text-drag-dot" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, item.id, 'mid'); }} />
        {resizer}
        <input className="noteslite-cv-heading-text" defaultValue={item.title || 'Heading'} placeholder="Heading" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, title: e.target.value } : i))} />
        {toolbar}
      </>);
    }
    if (item.type === 'subheading') {
      return (<>
        <div className="noteslite-cv-text-drag-dot" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, item.id, 'mid'); }} />
        {resizer}
        <input className="noteslite-cv-subheading-text" defaultValue={item.title || 'Sub-heading'} placeholder="Sub-heading" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, title: e.target.value } : i))} />
        {toolbar}
      </>);
    }
    if (item.type === 'comment') {
      return (
        <div className={"noteslite-cv-comment " + (item.expanded ? "expanded" : "")}>
          <div className="noteslite-cv-comment-icon" style={{ background: item.color || 'var(--blue)' }} onClick={(e) => { e.stopPropagation(); setItems(prev => prev.map(i => i.id === item.id ? { ...i, expanded: !i.expanded } : i)); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </div>
          {item.expanded && (
            <div className="noteslite-cv-comment-body">
              <textarea className="noteslite-cv-comment-textarea" defaultValue={item.content || ''} placeholder="Add a comment..." onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, content: e.target.value } : i))} />
            </div>
          )}
          {toolbar}
        </div>
      );
    }
    if (item.type === 'arrow') {
      const fromItem = item.fromId ? items.find(i => i.id === item.fromId) : null;
      const toItem = item.toId ? items.find(i => i.id === item.toId) : null;

      const getRect = (i: any) => ({ x: i.x, y: i.y, w: i.w || 232, h: i.h || (i.type === 'column' ? Math.max(56 + (i.cards?.length || 0) * 33, 100) : 160) });
      const snap = (rect: any, target: { x: number, y: number }) => {
        const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
        const dx = target.x - cx, dy = target.y - cy;
        if (Math.abs(dx) / rect.w > Math.abs(dy) / rect.h) {
          return { x: dx > 0 ? rect.x + rect.w : rect.x, y: Math.max(rect.y, Math.min(target.y, rect.y + rect.h)) };
        }
        return { x: Math.max(rect.x, Math.min(target.x, rect.x + rect.w)), y: dy > 0 ? rect.y + rect.h : rect.y };
      };
      const r1 = fromItem ? getRect(fromItem) : null;
      const r2 = toItem ? getRect(toItem) : null;

      const c1 = r1 ? { x: r1.x + r1.w / 2, y: r1.y + r1.h / 2 } : { x: item.x, y: item.y };
      const c2 = r2 ? { x: r2.x + r2.w / 2, y: r2.y + r2.h / 2 } : { x: item.x2 ?? item.x + 100, y: item.y2 ?? item.y };

      const p1 = r1 ? snap(r1, c2) : c1;
      const p2 = r2 ? snap(r2, c1) : c2;

      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const isSelected = selectedId === item.id;

      return (
        <div className="noteslite-cv-arrow-container" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {toolbar}
          <svg style={{ position: 'absolute', inset: 0, width: '4000px', height: '4000px', overflow: 'visible', pointerEvents: 'none', transform: 'translate(-2000px, -2000px)' }}>
            <g transform="translate(2000, 2000)">
              <path
                d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                fill="none"
                stroke="var(--text2)"
                strokeWidth="12"
                strokeLinecap="round"
                style={{ cursor: 'pointer', opacity: 0, pointerEvents: 'all' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(item.id);
                  startDrag(e, item.id, 'mid');
                }}
              />
              <path
                d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                fill="none"
                stroke="var(--text2)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                markerEnd="url(#noteslite-cvarr)"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))', pointerEvents: 'none' }}
              />
            </g>
          </svg>

          {isSelected && (
            <>
              <div
                className="noteslite-cv-arrow-handle"
                style={{ left: p1.x, top: p1.y, pointerEvents: 'all' }}
                onPointerDown={(e) => startDrag(e, item.id, 'start')}
                title="Drag to connect"
              />
              <div
                className="noteslite-cv-arrow-handle mid"
                style={{ left: mx, top: my, pointerEvents: 'all' }}
                onPointerDown={(e) => startDrag(e, item.id, 'mid')}
                title="Drag whole arrow"
              />
              <div
                className="noteslite-cv-arrow-handle"
                style={{ left: p2.x, top: p2.y, pointerEvents: 'all' }}
                onPointerDown={(e) => startDrag(e, item.id, 'end')}
                title="Drag to connect"
              />
            </>
          )}
        </div>
      );
    }
    return (
      <>
        {accentBar}
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
        {toolbar}
      </>
    );
  };

  const addItem = (type: string) => {
    if (!frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    const cx = r.width / 2 / zoom - cam.x;
    const cy = r.height / 2 / zoom - cam.y;
    const id = 'item-' + Math.random().toString(36).substr(2, 6);

    const defaults: Record<string, any> = {
      column:     { w: 232, h: 200, title: 'New Column', desc: 'Column description', color: '#A09080', cards: [] },
      heading:    { w: 280, h: 40, title: 'Heading', color: 'var(--rose)' },
      subheading: { w: 240, h: 32, title: 'Sub-heading', color: 'var(--text3)' },
      arrow:      { w: 0, h: 0, title: 'Arrow', color: 'var(--text3)' },
      comment:    { w: 36, h: 36, title: '', content: 'Add a comment...', color: 'var(--blue)' },
      note:       { w: 240, h: 160, title: 'New Note', color: '#A09080' },
    };
    const d = defaults[type] || defaults.note;

    const newItem = {
      id, type,
      x: cx - (d.w / 2), y: cy - (d.h / 2),
      x2: type === 'arrow' ? cx + 60 : undefined,
      y2: type === 'arrow' ? cy - 40 : undefined,
      w: d.w, h: d.h,
      fromId: null, toId: null,
      z: items.length > 0 ? Math.max(...items.map(i => i.z)) + 1 : 1,
      title: d.title, desc: d.desc || '', content: d.content || '',
      subtitle: d.subtitle || '', color: d.color, cards: d.cards || [],
      expanded: false,
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
      maxX = Math.max(maxX, item.x + (item.w || 200));
      maxY = Math.max(maxY, item.y + (item.h || h));
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
            Scroll to zoom · Drag to pan · Click to move
          </div>
        </div>
      </div>

      <div className="noteslite-cv-body">
        <div className="noteslite-cv-sidebar">
          <div className="noteslite-cv-sidebar-label">Basics</div>
          <button className="noteslite-cv-add-btn" onClick={() => addItem('column')}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--accent)' }} />Column
          </button>
          <button className="noteslite-cv-add-btn" onClick={() => addItem('heading')}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--rose)' }} />Heading
          </button>
          <button className="noteslite-cv-add-btn" onClick={() => addItem('subheading')}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--text2)' }} />Sub-heading
          </button>
          <div className="noteslite-cv-sidebar-sep" />
          <div className="noteslite-cv-sidebar-label" style={{ paddingTop: 0 }}>Specials</div>
          <button className="noteslite-cv-add-btn" onClick={() => addItem('arrow')}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--text2)' }} />Arrow
          </button>
          <button className="noteslite-cv-add-btn" onClick={() => addItem('comment')}>
            <div className="noteslite-cv-add-dot" style={{ background: 'var(--blue)' }} />Comment
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
                  <path d="M0,0 L0,6 L8,3 z" fill="var(--border2, rgba(44,38,28,0.22))" />
                </marker>
              </defs>
              {connections.map(([fromId, toId], idx) => {
                const from = items.find(i => i.id === fromId);
                const to = items.find(i => i.id === toId);
                if (!from || !to) return null;
                const fh = from.type === 'column' ? Math.max(56 + (from.cards?.length || 0) * 33, 100) : 160;
                const th = to.type === 'column' ? Math.max(56 + (to.cards?.length || 0) * 33, 100) : 160;
                const x1 = from.x + (from.w || 232);
                const y1 = from.y + fh / 2;
                const x2 = to.x;
                const y2 = to.y + th / 2;
                const dx = Math.abs(x2 - x1) * 0.5;
                return (
                  <path
                    key={idx}
                    d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`}
                    fill="none" stroke="var(--border2, rgba(44,38,28,0.15))" strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#noteslite-cvarr)"
                  />
                );
              })}
            </svg>

            {items.map(item => {
              const isArrow = item.type === 'arrow';
              const isText = item.type === 'heading' || item.type === 'subheading';
              const isComment = item.type === 'comment';
              return (
                <div
                  key={item.id}
                  className={`noteslite-cv-item ${selectedId === item.id ? 'noteslite-cv-selected' : ''} type-${item.type}`}
                  style={{
                    left: isArrow ? 0 : item.x,
                    top: isArrow ? 0 : item.y,
                    width: isArrow ? 0 : isComment ? 'auto' : item.w,
                    height: isArrow ? 0 : isComment ? 'auto' : (isText ? 'auto' : (item.h || 'auto')),
                    zIndex: item.z
                  }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest('.noteslite-cv-resizer-stripes')) return;
                    if ((e.target as HTMLElement).closest('.noteslite-cv-item-toolbar')) return;
                    e.stopPropagation();
                    setSelectedId(item.id);
                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, z: Math.max(...prev.map(p => p.z)) + 1 } : i));
                    startDrag(e, item.id, 'mid');
                  }}
                >
                  {renderInner(item)}
                </div>
              );
            })}
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
