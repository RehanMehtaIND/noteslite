"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type QuickNote = {
  id: string;
  title: string;
  description: string;
  color: string;
  pinned: boolean;
  createdAt: string;
};

type QuickNotesViewProps = {
  notes: QuickNote[];
  onCreateNote: (note: Partial<QuickNote>) => void;
  onUpdateNote: (id: string, updates: Partial<QuickNote>) => void;
  onDeleteNote: (id: string) => void;
  onToast: (msg: string) => void;
};

const DEFAULT_COLORS = [
  { id: "red", hex: "#E24B4A", label: "Red" },
  { id: "orange", hex: "#C07850", label: "Orange" },
  { id: "yellow", hex: "#B8963C", label: "Yellow" },
  { id: "green", hex: "#5A8A6A", label: "Green" },
  { id: "blue", hex: "#5A7A9A", label: "Blue" },
  { id: "purple", hex: "#7A6AA0", label: "Purple" },
  { id: "pink", hex: "#A06878", label: "Pink" },
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function truncateWords(text: string, max: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return text;
  return words.slice(0, max).join(" ");
}

export default function QuickNotesView({ notes, onCreateNote, onUpdateNote, onDeleteNote, onToast }: QuickNotesViewProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<{ id: string; hex: string; label: string }[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customHex, setCustomHex] = useState("#6BA3BE");

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState(DEFAULT_COLORS[0].hex);

  const [viewNote, setViewNote] = useState<QuickNote | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const titleRef = useRef<HTMLInputElement>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const allColors = useMemo(() => [...DEFAULT_COLORS, ...customColors], [customColors]);

  const filtered = useMemo(() => {
    let list = [...notes];
    if (activeFilter) list = list.filter((n) => n.color === activeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q));
    }
    list.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
    return list;
  }, [notes, activeFilter, search]);

  useEffect(() => {
    if (createOpen || editId) {
      const t = setTimeout(() => titleRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [createOpen, editId]);

  function openMenu(noteId: string) {
    const btn = menuBtnRefs.current[noteId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 170 });
    }
    setMenuOpenId(noteId);
  }

  function closeMenu() {
    setMenuOpenId(null);
  }

  const handleCreate = useCallback(() => {
    const t = formTitle.trim();
    if (!t) { onToast("Title is required"); return; }
    onCreateNote({
      title: truncateWords(t, 30),
      description: truncateWords(formDesc, 200),
      color: formColor,
      pinned: false,
    });
    setCreateOpen(false);
    setFormTitle("");
    setFormDesc("");
    setFormColor(DEFAULT_COLORS[0].hex);
    onToast("Creating note...");
  }, [formTitle, formDesc, formColor, onCreateNote, onToast]);

  const handleEdit = useCallback(() => {
    if (!editId) return;
    const t = formTitle.trim();
    if (!t) { onToast("Title is required"); return; }
    onUpdateNote(editId, {
      title: truncateWords(t, 30),
      description: truncateWords(formDesc, 200),
      color: formColor,
    });
    setEditId(null);
    setFormTitle("");
    setFormDesc("");
    onToast("Updating note...");
  }, [editId, formTitle, formDesc, formColor, onUpdateNote, onToast]);

  const handleDelete = useCallback((id: string) => {
    onDeleteNote(id);
    setMenuOpenId(null);
    onToast("Deleting note...");
  }, [onDeleteNote, onToast]);

  const handleTogglePin = useCallback((id: string, currentPin: boolean) => {
    onUpdateNote(id, { pinned: !currentPin });
    setMenuOpenId(null);
  }, [onUpdateNote]);

  const handleChangeColor = useCallback((id: string, color: string) => {
    onUpdateNote(id, { color });
    setMenuOpenId(null);
    onToast("Color updating...");
  }, [onUpdateNote, onToast]);

  const startEdit = useCallback((note: QuickNote) => {
    setEditId(note.id);
    setFormTitle(note.title);
    setFormDesc(note.description);
    setFormColor(note.color);
    setMenuOpenId(null);
  }, []);

  const addCustomColor = useCallback(() => {
    if (!customHex.match(/^#[0-9a-fA-F]{6}$/)) { onToast("Invalid hex color"); return; }
    if (allColors.some((c) => c.hex.toLowerCase() === customHex.toLowerCase())) { onToast("Color already exists"); return; }
    setCustomColors((prev) => [...prev, { id: `custom-${Date.now()}`, hex: customHex, label: customHex }]);
    setShowAddCustom(false);
    onToast("Custom color added");
  }, [customHex, allColors, onToast]);

  return (
    <>
      <style>{`
        .qnv-header { display:flex; align-items:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
        .qnv-title { font-family:"Syne",sans-serif; font-weight:700; font-size:13px; color:var(--text,#2c2018); letter-spacing:.08em; text-transform:uppercase; flex-shrink:0; }
        .qnv-search { flex:1; min-width:160px; max-width:320px; height:34px; border-radius:20px; background:var(--bg2); border:1px solid var(--border2); padding:0 14px; font-family:"DM Sans",sans-serif; font-size:12px; color:var(--text); outline:none; }
        .qnv-search::placeholder { color:var(--text3,#a09080); }
        .qnv-search:focus { border-color:var(--frame); box-shadow:0 0 0 2px var(--shadow); }
        .qnv-add-btn { width:34px; height:34px; border-radius:10px; border:none; background:var(--text,#2c2018); color:var(--surface2,#fdfaf5); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
        .qnv-add-btn:hover { background:#3d3025; transform:translateY(-1px); }
        .qnv-filters { display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
        .qnv-fbtn { width:22px; height:22px; border-radius:50%; border:2.5px solid transparent; cursor:pointer; transition:all .15s; flex-shrink:0; }
        .qnv-fbtn.active { border-color:var(--text,#2c2018); transform:scale(1.18); box-shadow:0 0 0 2px rgba(44,38,28,.12); }
        .qnv-fbtn:hover { transform:scale(1.12); }
        .qnv-fall { padding:4px 12px; border-radius:14px; border:1px solid var(--border2); background:var(--surface); font-family:"Syne",sans-serif; font-size:10px; font-weight:700; letter-spacing:.06em; color:var(--text3); cursor:pointer; text-transform:uppercase; transition:all .15s; }
        .qnv-fall.active { background:var(--text,#2c2018); color:var(--surface2,#fdfaf5); border-color:var(--text,#2c2018); }
        .qnv-add-color-btn { width:22px; height:22px; border-radius:50%; border:2px dashed var(--border2,rgba(44,38,28,.12)); background:none; cursor:pointer; font-size:14px; color:var(--text3,#a09080); display:flex; align-items:center; justify-content:center; transition:all .15s; }
        .qnv-add-color-btn:hover { border-color:var(--frame,#6ba3be); color:var(--frame,#6ba3be); }
        .qnv-custom-row { display:flex; gap:6px; align-items:center; }
        .qnv-custom-input { width:80px; height:28px; border-radius:8px; border:1px solid var(--border2); padding:0 8px; font-size:11px; font-family:"DM Sans",sans-serif; }
        .qnv-custom-ok { height:28px; padding:0 10px; border-radius:8px; border:none; background:var(--text); color:var(--surface2); font-size:10px; font-weight:700; cursor:pointer; font-family:"Syne",sans-serif; }
        .qnv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; }
        .qnv-card { background:var(--surface2); border:1px solid var(--border2); border-radius:14px; padding:0; position:relative; cursor:pointer; transition:all .25s cubic-bezier(.4,0,.2,1); display:flex; flex-direction:row; overflow:hidden; min-height:110px; }
        .qnv-card:hover { transform:translateY(-2px); box-shadow:0 12px 36px rgba(44,38,28,.10); border-color:rgba(44,38,28,.16); }
        .qnv-card-accent { width:4px; flex-shrink:0; border-radius:14px 0 0 14px; }
        .qnv-card-body { flex:1; padding:14px 16px; display:flex; flex-direction:column; gap:4px; min-width:0; }
        .qnv-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
        .qnv-card-title-wrap { display:flex; align-items:center; gap:7px; min-width:0; flex:1; }
        .qnv-card-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .qnv-card-title { font-family:"Syne",sans-serif; font-weight:700; font-size:13px; letter-spacing:.02em; color:var(--text,#2c2018); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .qnv-card-menu-btn { width:24px; height:24px; border-radius:6px; border:none; background:transparent; cursor:pointer; font-size:14px; color:var(--text3,#a09080); display:flex; align-items:center; justify-content:center; opacity:0; transition:all .15s; flex-shrink:0; }
        .qnv-card:hover .qnv-card-menu-btn { opacity:1; }
        .qnv-card-menu-btn:hover { background:var(--bg2,#e3ddd4); color:var(--text2,#6b6155); }
        .qnv-card-desc { font-size:12px; color:var(--text2,#6b6155); line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-top:2px; }
        .qnv-card-footer { display:flex; align-items:center; gap:8px; margin-top:auto; padding-top:8px; }
        .qnv-card-pin-badge { display:inline-flex; align-items:center; gap:3px; padding:2px 7px; border-radius:6px; font-size:9px; font-weight:600; letter-spacing:.04em; font-family:"Syne",sans-serif; text-transform:uppercase; }
        .qnv-card-time { font-size:10px; color:var(--text3,#a09080); margin-left:auto; font-variant-numeric:tabular-nums; }
        .qnv-menu { position:fixed; width:170px; background:var(--surface2,#fdfaf5); border:1px solid var(--border2); border-radius:12px; box-shadow:var(--shadow-lg); z-index:10001; overflow:hidden; animation:qnvFade .15s; }
        .qnv-menu-backdrop { position:fixed; inset:0; z-index:10000; }
        .qnv-menu-item { width:100%; border:none; background:none; padding:9px 14px; font-size:12px; font-weight:500; color:var(--text2); cursor:pointer; text-align:left; display:flex; align-items:center; gap:8px; transition:background .12s; }
        .qnv-menu-item:hover { background:var(--bg2,#e3ddd4); }
        .qnv-menu-item.danger { color:#c0392b; }
        .qnv-menu-colors { display:flex; gap:4px; padding:8px 14px; flex-wrap:wrap; border-top:1px solid var(--border); }
        .qnv-menu-cdot { width:18px; height:18px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all .12s; }
        .qnv-menu-cdot:hover { transform:scale(1.15); }
        .qnv-menu-cdot.sel { border-color:var(--text); }
        .qnv-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); backdrop-filter:blur(6px); z-index:10000; display:flex; align-items:center; justify-content:center; animation:qnvFade .2s; padding:20px; }
        .qnv-popup { background:var(--surface2,#fdfaf5); border:1px solid var(--border2); border-radius:24px; padding:28px 30px; width:min(520px,100%); max-height:80vh; overflow-y:auto; box-shadow:var(--shadow-lg); position:relative; overflow:hidden; }
        .qnv-popup-accent { position:absolute; top:0; left:0; right:0; height:4px; }
        .qnv-popup-close { position:absolute; top:14px; right:14px; width:30px; height:30px; border-radius:8px; border:1px solid var(--border2); background:var(--surface); cursor:pointer; font-size:16px; color:var(--text2); display:flex; align-items:center; justify-content:center; }
        .qnv-popup-title { font-family:"Playfair Display",serif; font-size:22px; font-weight:700; color:var(--text); margin-bottom:6px; margin-top:8px; }
        .qnv-popup-desc { font-size:14px; color:var(--text2); line-height:1.7; white-space:pre-wrap; margin-top:12px; }
        .qnv-popup-meta { font-size:11px; color:var(--text3); margin-top:16px; display:flex; gap:12px; align-items:center; }
        .qnv-form { background:var(--surface2,#fdfaf5); border:1px solid var(--border2); border-radius:24px; padding:28px 30px; width:min(480px,100%); box-shadow:var(--shadow-lg); }
        .qnv-form-title { font-family:"Playfair Display",serif; font-size:20px; font-weight:700; color:var(--text); margin-bottom:4px; }
        .qnv-form-sub { font-size:12px; color:var(--text3); margin-bottom:18px; }
        .qnv-form-label { font-size:9.5px; font-weight:700; letter-spacing:.14em; color:var(--text2); margin-bottom:5px; font-family:"Syne",sans-serif; text-transform:uppercase; }
        .qnv-form-input { width:100%; height:40px; border-radius:50px; background:var(--bg2); border:1.5px solid var(--border2); padding:0 16px; font-family:"DM Sans",sans-serif; font-size:13px; color:var(--text); outline:none; margin-bottom:12px; }
        .qnv-form-input:focus { border-color:var(--frame); }
        .qnv-form-textarea { width:100%; min-height:100px; border-radius:16px; background:var(--bg2); border:1.5px solid var(--border2); padding:12px 16px; font-family:"DM Sans",sans-serif; font-size:13px; color:var(--text); outline:none; resize:vertical; margin-bottom:12px; line-height:1.6; }
        .qnv-form-textarea:focus { border-color:var(--frame); }
        .qnv-form-hint { font-size:10px; color:var(--text3); margin-top:-8px; margin-bottom:10px; }
        .qnv-form-colors { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
        .qnv-form-cdot { width:26px; height:26px; border-radius:50%; cursor:pointer; border:2.5px solid transparent; transition:all .15s; }
        .qnv-form-cdot.sel { border-color:var(--text); transform:scale(1.14); }
        .qnv-form-actions { display:flex; gap:10px; justify-content:flex-end; }
        .qnv-btn-cancel { padding:9px 20px; border-radius:50px; border:1px solid var(--border2); background:none; font-family:"Syne",sans-serif; font-size:11px; font-weight:700; color:var(--text2); cursor:pointer; letter-spacing:.06em; }
        .qnv-btn-ok { padding:9px 22px; border-radius:50px; border:none; background:var(--text); color:var(--surface2); font-family:"Syne",sans-serif; font-size:11px; font-weight:700; letter-spacing:.08em; cursor:pointer; }
        .qnv-btn-ok:disabled { opacity:.5; cursor:not-allowed; }
        .qnv-empty { text-align:center; padding:48px 20px; color:var(--text3); }
        .qnv-empty-icon { font-size:36px; margin-bottom:10px; opacity:.4; }
        .qnv-empty-txt { font-size:13px; }
        @keyframes qnvFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @media(max-width:600px) {
          .qnv-grid { grid-template-columns:1fr; }
          .qnv-header { gap:8px; }
          .qnv-search { min-width:0; max-width:none; }
        }
      `}</style>

      <div className="qnv-header">
        <div className="qnv-title">Quick Notes</div>
        <input className="qnv-search" type="search" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="qnv-add-btn" title="Add Quick Note" onClick={() => { setCreateOpen(true); setEditId(null); setFormTitle(""); setFormDesc(""); setFormColor(DEFAULT_COLORS[0].hex); }}>+</button>
      </div>

      <div className="qnv-filters">
        <button className={`qnv-fall ${!activeFilter ? "active" : ""}`} onClick={() => setActiveFilter(null)}>All</button>
        {allColors.map((c) => (
          <button key={c.id} className={`qnv-fbtn ${activeFilter === c.hex ? "active" : ""}`} style={{ background: c.hex }} title={c.label} onClick={() => setActiveFilter(activeFilter === c.hex ? null : c.hex)} />
        ))}
        {showAddCustom ? (
          <div className="qnv-custom-row">
            <input className="qnv-custom-input" type="text" value={customHex} onChange={(e) => setCustomHex(e.target.value)} placeholder="#AABBCC" maxLength={7} />
            <button className="qnv-custom-ok" onClick={addCustomColor}>Add</button>
            <button className="qnv-btn-cancel" style={{ padding: "4px 10px", fontSize: "10px" }} onClick={() => setShowAddCustom(false)}>✕</button>
          </div>
        ) : (
          <button className="qnv-add-color-btn" title="Add custom color" onClick={() => setShowAddCustom(true)}>+</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="qnv-empty">
          <div className="qnv-empty-icon">📝</div>
          <div className="qnv-empty-txt">{notes.length === 0 ? "No quick notes yet. Click + to create one!" : "No notes match your search or filter."}</div>
        </div>
      ) : (
        <div className="qnv-grid">
          {filtered.map((note) => (
            <div key={note.id} className="qnv-card" onClick={() => setViewNote(note)}>
              <div className="qnv-card-accent" style={{ background: note.color }} />
              <div className="qnv-card-body">
                <div className="qnv-card-header">
                  <div className="qnv-card-title-wrap">
                    <div className="qnv-card-dot" style={{ background: note.color }} />
                    <div className="qnv-card-title">{note.title}</div>
                  </div>
                  <button
                    ref={(el) => { menuBtnRefs.current[note.id] = el; }}
                    className="qnv-card-menu-btn"
                    onClick={(e) => { e.stopPropagation(); if (menuOpenId === note.id) closeMenu(); else openMenu(note.id); }}
                    title="Options"
                  >
                    ⋯
                  </button>
                </div>
                {note.description && <div className="qnv-card-desc">{note.description}</div>}
                <div className="qnv-card-footer">
                  {note.pinned && (
                    <span className="qnv-card-pin-badge" style={{ background: `${note.color}18`, color: note.color }}>📌 Pinned</span>
                  )}
                  <div className="qnv-card-time">{new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {menuOpenId && mounted && (() => {
        const note = notes.find((n) => n.id === menuOpenId);
        if (!note) return null;
        return createPortal(
          <>
            <div className="qnv-menu-backdrop" onClick={closeMenu} />
            <div className="qnv-menu" style={{ top: menuPos.top, left: menuPos.left }}>
              <button className="qnv-menu-item" onClick={() => handleTogglePin(note.id, note.pinned)}>{note.pinned ? "📌 Unpin" : "📌 Pin"}</button>
              <button className="qnv-menu-item" onClick={() => startEdit(note)}>✏️ Edit</button>
              <button className="qnv-menu-item danger" onClick={() => handleDelete(note.id)}>🗑️ Delete</button>
              <div className="qnv-menu-colors">
                {allColors.map((c) => (
                  <div key={c.id} className={`qnv-menu-cdot ${note.color === c.hex ? "sel" : ""}`} style={{ background: c.hex }} onClick={() => handleChangeColor(note.id, c.hex)} title={c.label} />
                ))}
              </div>
            </div>
          </>,
          document.body
        );
      })()}

      {mounted && viewNote && createPortal(
        <div className="qnv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setViewNote(null); }}>
          <div className="qnv-popup">
            <div className="qnv-popup-accent" style={{ background: viewNote.color }} />
            <button className="qnv-popup-close" onClick={() => setViewNote(null)}>✕</button>
            <div className="qnv-popup-title">{viewNote.title}</div>
            <div className="qnv-popup-desc">{viewNote.description || "No description."}</div>
            <div className="qnv-popup-meta">
              <span>{viewNote.pinned ? "📌 Pinned" : ""}</span>
              <span>{new Date(viewNote.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && (createOpen || editId) && createPortal(
        <div className="qnv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) { setCreateOpen(false); setEditId(null); } }}>
          <div className="qnv-form">
            <div className="qnv-form-title">{editId ? "Edit Note" : "New Quick Note"}</div>
            <div className="qnv-form-sub">{editId ? "Update your note details." : "Capture a thought quickly."}</div>
            <div className="qnv-form-label">Title</div>
            <input ref={titleRef} className="qnv-form-input" type="text" placeholder="Note title..." value={formTitle} onChange={(e) => setFormTitle(truncateWords(e.target.value, 30))} onKeyDown={(e) => { if (e.key === "Enter") editId ? handleEdit() : handleCreate(); if (e.key === "Escape") { setCreateOpen(false); setEditId(null); } }} />
            <div className="qnv-form-hint">{wordCount(formTitle)}/30 words</div>
            <div className="qnv-form-label">Description</div>
            <textarea className="qnv-form-textarea" placeholder="Write something..." value={formDesc} onChange={(e) => setFormDesc(truncateWords(e.target.value, 200))} />
            <div className="qnv-form-hint">{wordCount(formDesc)}/200 words</div>
            <div className="qnv-form-label">Color</div>
            <div className="qnv-form-colors">
              {allColors.map((c) => (
                <button key={c.id} className={`qnv-form-cdot ${formColor === c.hex ? "sel" : ""}`} style={{ background: c.hex }} onClick={() => setFormColor(c.hex)} title={c.label} />
              ))}
            </div>
            <div className="qnv-form-actions">
              <button className="qnv-btn-cancel" onClick={() => { setCreateOpen(false); setEditId(null); }}>Cancel</button>
              <button className="qnv-btn-ok" disabled={!formTitle.trim()} onClick={editId ? handleEdit : handleCreate}>{editId ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
