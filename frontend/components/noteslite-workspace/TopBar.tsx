import React from 'react';
import { useRouter } from 'next/navigation';
import { startTeleportLoading } from '@/backend/lib/loading-screen';
import EmojiIcon from '@/frontend/components/emoji-icon';
import { ViewMode } from './NotesliteWorkspace';

interface TopBarProps {
  activeView: ViewMode;
  switchView: (v: ViewMode) => void;
  triggerToast: (msg: string) => void;
  openColModal: () => void;
  openCardEditor: () => void;
  workspaceName?: string;
  workspaceDesc?: string;
}

export default function TopBar({
  activeView,
  switchView,
  triggerToast,
  openColModal,
  openCardEditor,
  workspaceName = "My Workspace",
  workspaceDesc = "Personal workspace for organization and ideas"
}: TopBarProps) {
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
        <EmojiIcon className="noteslite-ws-icon-btn" emoji="📚" label="Workspace" />
        <span className="noteslite-ws-name">{workspaceName}</span>
        <span className="noteslite-ws-desc">{workspaceDesc}</span>
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

      <button className="noteslite-tbtn" onClick={() => triggerToast('Search coming soon')} title="Search">
        <EmojiIcon emoji="🔍" label="Search" />
      </button>
      <button className="noteslite-tbtn" onClick={openColModal}>+ Column</button>
      <button className="noteslite-tbtn primary" onClick={openCardEditor}>+ Card</button>
    </div>
  );
}
