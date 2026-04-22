import React, { useState } from 'react';

interface ColumnModalProps {
  onClose: () => void;
  onCreate: (name: string, desc: string, color: string) => void;
}

export default function ColumnModal({ onClose, onCreate }: ColumnModalProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#C07850');

  const swatches = [
    '#C07850', '#B8963C', '#5A8A6A', '#5A7A9A', '#A06878', '#7A6AA0'
  ];

  return (
    <div className="noteslite-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="noteslite-modal">
        <div className="noteslite-modal-title">New Column</div>
        <div className="noteslite-modal-sub">Columns represent stages, categories, or phases in your workspace.</div>
        
        <div className="noteslite-modal-label">Column Name</div>
        <input 
          className="noteslite-modal-input" 
          placeholder="e.g. On Hold, Testing, Published…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        
        <div className="noteslite-modal-label">Description</div>
        <textarea 
          className="noteslite-modal-textarea" 
          placeholder="What kind of cards belong here? Who should move cards to this column?"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        
        <div className="noteslite-modal-label">Accent Colour</div>
        <div className="noteslite-color-row">
          {swatches.map(swatch => (
            <div 
              key={swatch}
              className={`noteslite-cswatch ${color === swatch ? 'sel' : ''}`} 
              style={{ background: swatch }}
              onClick={() => setColor(swatch)}
            />
          ))}
        </div>
        
        <div className="noteslite-modal-actions">
          <button className="noteslite-btn-c" onClick={onClose}>Cancel</button>
          <button className="noteslite-btn-ok" onClick={() => onCreate(name, desc, color)}>Create Column</button>
        </div>
      </div>
    </div>
  );
}
