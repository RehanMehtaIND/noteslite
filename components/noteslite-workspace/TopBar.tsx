import React from 'react';
import { useRouter } from 'next/navigation';
import { startTeleportLoading } from '@/lib/loading-screen';
import { ViewMode } from './NotesliteWorkspace';

interface TopBarProps {
  activeView: ViewMode;
  switchView: (v: ViewMode) => void;
  triggerToast: (msg: string) => void;
  openColModal: () => void;
  openCardEditor: () => void;
}

export default function TopBar({ activeView, switchView, triggerToast, openColModal, openCardEditor }: TopBarProps) {
  const router = useRouter();
  const handleBack = () => {
    startTeleportLoading({ workspaceName: 'Dashboard' });
    router.push('/dashboard');
  };

  return (
    <div className="noteslite-topbar">
      <button className="noteslite-back-btn" onClick={handleBack}>
        ← Dashboard
      </button>

      <div className="noteslite-ws-title-area">
        <span className="noteslite-ws-icon-btn" title="Change icon">📚</span>
        <span className="noteslite-ws-name">DSA Notes</span>
        <span className="noteslite-ws-desc">
          Data Structures & Algorithms study workspace — revision, practice problems, and concept maps
        </span>
      </div>

      <div className="noteslite-view-toggle">
        <button 
          className={`noteslite-vtbtn ${activeView === 'board' ? 'on' : ''}`} 
          onClick={() => switchView('board')}
        >
          ⊞ Board
        </button>
        <button 
          className={`noteslite-vtbtn ${activeView === 'canvas' ? 'on' : ''}`} 
          onClick={() => switchView('canvas')}
        >
          ◈ Canvas
        </button>
      </div>

      <button className="noteslite-tbtn" onClick={() => triggerToast('Search coming soon')}>🔍</button>
      <button className="noteslite-tbtn" onClick={openColModal}>+ Column</button>
      <button className="noteslite-tbtn primary" onClick={openCardEditor}>+ Card</button>
    </div>
  );
}
