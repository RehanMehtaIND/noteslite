"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const TEMPLATE_PREVIEWS = [
  { name: "To-Do", accent: "#C07850", cards: ["Ship auth UI", "Review mobile", "Done"] },
  { name: "Expenses", accent: "#5A8A6A", cards: ["Salary credit", "Electricity bill", "Budget"] },
  { name: "Notes", accent: "#5A7A9A", cards: ["Ideas", "Drafts", "Published"] },
];

const TOOL_ITEMS = ["Quick Notes", "Canvas", "Board", "Templates", "Themes", "Devices"] as const;
type ToolItem = (typeof TOOL_ITEMS)[number];

const THEME_SWATCHES = [
  { color: "#C07850", soft: "#eee3da", name: "Clay" },
  { color: "#5A8A6A", soft: "#e4ebe2", name: "Sage" },
  { color: "#5A7A9A", soft: "#e5ebf0", name: "Slate" },
  { color: "#A06878", soft: "#eee3e7", name: "Mauve" },
  { color: "#B8963C", soft: "#f0ead9", name: "Amber" },
  { color: "#7A6AA0", soft: "#e9e4f0", name: "Plum" },
] as const;

type ThemeSwatch = (typeof THEME_SWATCHES)[number];
const DEFAULT_THEME: ThemeSwatch = THEME_SWATCHES[2];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && Boolean(session?.user?.email);
  const [activeView, setActiveView] = useState<ToolItem>("Quick Notes");
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(44,40,32,0.04)";
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(193,123,90,0.1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60, 0);
      ctx.lineTo(60, canvas.height);
      ctx.stroke();
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY, visible: true });
    const onLeave = () => setCursor((c) => ({ ...c, visible: false }));
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <main className="noteslite-landing min-h-screen overflow-x-hidden bg-[#ebe4da] text-[#101713]">
      <div
        className="lp-cursor"
        style={{ left: cursor.x, top: cursor.y, opacity: cursor.visible ? 1 : 0 }}
      />
      <section className="relative min-h-screen px-5 pb-24 pt-5 sm:px-8 lg:px-10">
        <div className="lp-bg" aria-hidden="true" />
        <canvas ref={canvasRef} className="lp-lines-canvas" aria-hidden="true" />
        <div className="lp-wind" aria-hidden="true">
          <span className="lp-wl lp-wl-1" />
          <span className="lp-wl lp-wl-2" />
          <span className="lp-wl lp-wl-3" />
          <span className="lp-wl lp-wl-4" />
        </div>

        <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ECA7AD]"
          >
            <span className="block whitespace-nowrap">
              <span className="block [font-family:'Playfair_Display','Times_New_Roman',serif] text-[24px] font-bold italic leading-[1.05] tracking-[0.01em] text-[#2c251f] sm:text-[28px]">
                Notes<span className="not-italic text-[#ECA7AD]">Lite</span>
              </span>
              <span className="block font-['Syne',sans-serif] text-[9px] font-semibold uppercase tracking-[0.24em] text-[#a49386] sm:text-[10px]">
                Visual Workspace
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Primary navigation">
            {isSignedIn ? (
              <>
                <Link href="/dashboard" className="lp-nav-btn lp-nav-outline">
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="lp-nav-btn lp-nav-solid"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/auth/sign-in" className="lp-nav-btn lp-nav-solid">
                Log in
              </Link>
            )}
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col items-center pt-16 text-center sm:pt-24">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#c17b5a]">
            Notes &middot; Workspaces &middot; Templates
          </p>

          <h1 className="mt-5 max-w-[720px] [font-family:'Playfair_Display','Times_New_Roman',serif] text-[48px] font-normal leading-[1.04] tracking-[-0.01em] text-[#101713] sm:text-[68px] lg:text-[84px]">
            Capture thoughts.<br />Build workspaces.
          </h1>

          <p className="mt-6 max-w-[460px] text-[15px] leading-[1.65] text-[#6a6560]">
            NotesLite helps you capture quick notes, organize them into visual boards, start from templates, and keep your workspace synced across devices.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isSignedIn ? (
              <Link href="/dashboard" className="lp-cta-primary">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/sign-in" className="lp-cta-secondary">
                  Log in
                </Link>
                <Link href="/auth/sign-in" className="lp-cta-primary">
                  Create account
                </Link>
              </>
            )}
          </div>

          <div className="mt-12 overflow-x-auto pb-1">
            <div className="lp-tab-bar" role="tablist" aria-label="Preview sections">
              {TOOL_ITEMS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  role="tab"
                  aria-selected={activeView === tool}
                  className={`lp-tab${activeView === tool ? " is-active" : ""}`}
                  onClick={() => setActiveView(tool)}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          <div className="lp-window mt-5 w-full max-w-[880px] text-left">
            <div className="lp-window-bar">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e57373]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#f6c14e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#72ba7e]" />
              </div>
              <div className="mx-3 flex h-[22px] flex-1 max-w-[260px] items-center rounded-[5px] border border-[#e4ddd4] bg-[#f5f2ed] px-3">
                <span className="text-[11px] text-[#9a948d] truncate">noteslite.app/dashboard</span>
              </div>
              <div className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a09a93]">
                {activeView}
              </div>
            </div>
            <LandingPreview view={activeView} />
          </div>
        </div>
      </section>

      <style>{`
        .lp-cursor {
          position: fixed;
          z-index: 9999;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #c17b5a;
          pointer-events: none;
          transform: translate(-50%, -50%);
          transition: opacity 120ms ease;
        }

        .lp-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 12%, rgba(255,255,255,0.28), transparent 36%),
            linear-gradient(180deg, #f2ede6 0%, #e8e0d6 100%);
          animation: lp-breathe 12s ease-in-out infinite;
        }

        .lp-lines-canvas {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }

        @keyframes lp-breathe {
          0%, 100% { filter: saturate(0.90) brightness(1.0); }
          50% { filter: saturate(1.08) brightness(1.015); }
        }

        .lp-wind {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
          pointer-events: none;
        }

        .lp-wl {
          position: absolute;
          top: -30%;
          width: 1px;
          height: 58%;
          background: linear-gradient(180deg,
            transparent 0%,
            rgba(193,123,90,0.13) 28%,
            rgba(193,123,90,0.17) 58%,
            transparent 100%
          );
          opacity: 0;
          animation: lp-wind 14s ease-in-out infinite;
        }

        .lp-wl-1 { left: 17%; animation-delay: 0s; height: 52%; }
        .lp-wl-2 { left: 37%; animation-delay: -5.2s; height: 64%; }
        .lp-wl-3 { left: 61%; animation-delay: -9.4s; height: 48%; }
        .lp-wl-4 { left: 80%; animation-delay: -3.1s; height: 58%; }

        @keyframes lp-wind {
          0%   { opacity: 0; transform: translateY(-4%) skewX(-0.5deg); }
          18%  { opacity: 1; }
          72%  { opacity: 0.35; }
          100% { opacity: 0; transform: translateY(200%) skewX(-0.5deg); }
        }

        .lp-nav-btn {
          display: inline-flex;
          height: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          padding: 0 15px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.01em;
          transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
        }

        .lp-nav-solid {
          background: #101713;
          color: #fbfaf6;
          box-shadow: 0 2px 8px rgba(16,23,19,0.18);
        }

        .lp-nav-solid:hover {
          background: #1c2c24;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(16,23,19,0.22);
        }

        .lp-nav-outline {
          border: 1px solid #d0c9c1;
          background: rgba(255,255,255,0.65);
          color: #101713;
        }

        .lp-nav-outline:hover {
          background: rgba(255,255,255,0.9);
          border-color: #b8b0a6;
          transform: translateY(-1px);
        }

        .lp-cta-primary {
          display: inline-flex;
          height: 46px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          padding: 0 28px;
          background: #101713;
          color: #fbfaf6;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 16px rgba(16,23,19,0.22);
          transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease;
        }

        .lp-cta-primary:hover {
          background: #1c2c24;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(16,23,19,0.26);
        }

        .lp-cta-secondary {
          display: inline-flex;
          height: 46px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          padding: 0 28px;
          border: 1px solid #cac3bb;
          background: rgba(255,255,255,0.7);
          color: #101713;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.01em;
          transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
        }

        .lp-cta-secondary:hover {
          background: rgba(255,255,255,0.95);
          border-color: #b5ada3;
          transform: translateY(-1px);
        }

        .lp-tab-bar {
          display: inline-flex;
          border: 1px solid #dad4cc;
          border-radius: 10px;
          background: rgba(255,255,255,0.52);
          padding: 3px;
          gap: 2px;
          box-shadow: 0 2px 8px rgba(35,31,26,0.06);
          backdrop-filter: blur(8px);
        }

        .lp-tab {
          display: inline-flex;
          height: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          padding: 0 15px;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: #6a6560;
          white-space: nowrap;
          transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;
        }

        .lp-tab:hover:not(.is-active) {
          background: rgba(255,255,255,0.82);
          color: #101713;
        }

        .lp-tab:focus-visible {
          outline: 2px solid #c17b5a;
          outline-offset: 1px;
        }

        .lp-tab.is-active {
          background: #101713;
          color: #fbfaf6;
          box-shadow: 0 2px 8px rgba(16,23,19,0.2);
        }

        .lp-window {
          position: relative;
          z-index: 2;
          overflow: hidden;
          border: 1px solid #dbd5cc;
          border-radius: 10px;
          background: rgba(255,255,252,0.94);
          box-shadow:
            0 1px 2px rgba(35,31,26,0.05),
            0 8px 24px rgba(35,31,26,0.09),
            0 32px 80px rgba(35,31,26,0.11);
          backdrop-filter: blur(12px);
        }

        .lp-window-bar {
          display: flex;
          height: 40px;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #ece7df;
          background: rgba(250,249,244,0.96);
          padding: 0 12px;
        }

        .lp-preview-body {
          min-height: 320px;
          animation: lp-preview-in 200ms ease-out both;
        }

        @keyframes lp-preview-in {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lp-chip {
          display: inline-flex;
          align-items: center;
          border-radius: 5px;
          border: 1px solid #ede7e0;
          background: #fff;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: #6a6560;
        }

        .lp-theme-swatch {
          height: 44px;
          border: 2px solid transparent;
          border-radius: 7px;
          box-shadow: inset 0 -10px 18px rgba(0,0,0,0.11);
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
        }

        .lp-theme-swatch:hover,
        .lp-theme-swatch:focus-visible {
          transform: translateY(-1px);
          border-color: rgba(16,23,19,0.42);
          box-shadow: inset 0 -10px 18px rgba(0,0,0,0.11), 0 8px 18px rgba(35,31,26,0.1);
          outline: none;
        }

        .lp-theme-swatch.is-active {
          border-color: #101713;
          box-shadow: inset 0 -10px 18px rgba(0,0,0,0.11), 0 0 0 3px rgba(16,23,19,0.08);
        }

        .lp-theme-surface {
          position: relative;
          overflow: hidden;
          transition: background-color 700ms ease;
        }

        .lp-theme-fade {
          position: absolute;
          inset: 58% 0 0;
          opacity: 0.82;
          transition: background-color 700ms ease;
        }

        .lp-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 500;
          color: #8a8480;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .lp-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #72ba7e;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .lp-wl { display: none; }
          .lp-tab { padding: 0 11px; font-size: 12px; }
        }
      `}</style>
    </main>
  );
}

function LandingPreview({ view }: { view: ToolItem }) {
  if (view === "Quick Notes") {
    return (
      <div className="lp-preview-body grid gap-3 p-4 lg:grid-cols-[0.68fr_1.32fr]">
        <aside className="flex flex-col gap-3">
          <div className="rounded-[8px] border border-[#ece7df] bg-[#fbfaf6] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#c17b5a]">Pinned</p>
              <span className="lp-status">
                <span className="lp-dot" />
                3 pinned
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {["Review lecture 5", "Pay electricity bill", "Fix player jump"].map((note) => (
                <div
                  key={note}
                  className="rounded-[6px] bg-white px-3 py-2.5 text-[12.5px] text-[#504d48] shadow-[0_1px_6px_rgba(35,31,26,0.07)] border border-[#f2ede6]"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] border border-[#ece7df] bg-[#fbfaf6] p-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#a09a93]">Recent</p>
            <div className="mt-2 space-y-1">
              {["Game dev ideas", "Weekly plan", "Draft email"].map((note) => (
                <div key={note} className="px-1 py-1.5 text-[12px] text-[#6a6560]">
                  {note}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-[8px] border border-[#ece7df] bg-[#fbfaf6] p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#c17b5a]">Quick capture</p>
          <h2 className="mt-1 text-[15px] font-semibold leading-snug text-[#17130f]">
            Write the thought before it gets away.
          </h2>
          <div className="mt-4 rounded-[8px] bg-white p-4 shadow-[0_2px_12px_rgba(35,31,26,0.08)] border border-[#f0ebe4]">
            <div className="h-2.5 w-2/3 rounded-full bg-[#e6ddd3]" />
            <div className="mt-3 space-y-2">
              <div className="h-2 w-full rounded-full bg-[#f0ebe4]" />
              <div className="h-2 w-5/6 rounded-full bg-[#f0ebe4]" />
              <div className="h-2 w-4/6 rounded-full bg-[#f4f0ea]" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Pin", "Color", "Due Thu", "Move to board"].map((item) => (
                <span key={item} className="lp-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="lp-status">
              <span className="lp-dot" />
              Synced now
            </span>
            <span className="text-[11px] text-[#b0a9a0]">12 notes total</span>
          </div>
        </section>
      </div>
    );
  }

  if (view === "Canvas") {
    // All positions live in SVG space — cards and arrows share the same coordinate system.
    const CW = 148, CH = 46; // card width, height
    const nodes = [
      { label: "Project brief",   cx: 130, cy: 120, color: "#C07850" },
      { label: "Research notes",  cx: 320, cy:  58, color: "#5A7A9A" },
      { label: "Next steps",      cx: 500, cy: 150, color: "#5A8A6A" },
      { label: "Open questions",  cx: 215, cy: 215, color: "#A06878" },
      { label: "Feedback",        cx: 690, cy:  74, color: "#B8963C" },
    ];
    // Arrow paths — each endpoint sits exactly on a card edge
    // PB right (204,120) → RN left (246,58)
    // RN right (394,58)  → NS left (426,150)
    // NS right (574,150) → FB left (616,74)
    // OQ right (289,215) → NS left-lower (426,168)
    const arrows = [
      { d: "M 204,120 C 224,120 224,58 246,58",    stroke: "#ccc5bb", marker: "url(#cv-arr-a)" },
      { d: "M 394,58  C 410,58  410,150 426,150",  stroke: "#ccc5bb", marker: "url(#cv-arr-a)" },
      { d: "M 574,150 C 594,150 594,74  616,74",   stroke: "#ccc5bb", marker: "url(#cv-arr-a)" },
      { d: "M 289,215 C 375,215 375,168 426,168",  stroke: "#e0bc9a", marker: "url(#cv-arr-b)" },
    ];
    return (
      <div className="lp-preview-body p-4">
        <section className="overflow-hidden rounded-[8px] border border-[#ece7df] bg-[#f8f5f0]">
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#c17b5a]">Canvas</p>
              <h2 className="mt-0.5 text-[15px] font-semibold text-[#17130f]">Map scattered ideas into a shape.</h2>
            </div>
            <span className="lp-status">5 nodes</span>
          </div>
          <svg viewBox="0 0 800 252" style={{ width: "100%", height: 252, display: "block" }} aria-hidden="true">
            <defs>
              <marker id="cv-arr-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#b0a89e" />
              </marker>
              <marker id="cv-arr-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#c4956a" />
              </marker>
              <filter id="cv-shadow" x="-20%" y="-30%" width="140%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="rgba(35,31,26,0.10)" />
              </filter>
            </defs>

            {arrows.map((a, i) => (
              <path
                key={i}
                d={a.d}
                fill="none"
                stroke={a.stroke}
                strokeWidth={1.5}
                strokeDasharray="6 7"
                markerEnd={a.marker}
              />
            ))}

            {nodes.map(({ label, cx, cy, color }) => (
              <g key={label} filter="url(#cv-shadow)">
                <rect
                  x={cx - CW / 2} y={cy - CH / 2}
                  width={CW} height={CH}
                  rx={8} fill="white" stroke="#ede7e0" strokeWidth={1}
                />
                <rect
                  x={cx - CW / 2 + 14} y={cy - CH / 2 + 11}
                  width={36} height={3}
                  rx={1.5} fill={color}
                />
                <text
                  x={cx - CW / 2 + 14} y={cy + 8}
                  fontSize={12.5} fontWeight={600} fill="#17130f"
                  fontFamily="DM Sans, Manrope, Segoe UI, sans-serif"
                >
                  {label}
                </text>
              </g>
            ))}
          </svg>
        </section>
      </div>
    );
  }

  if (view === "Board") {
    return (
      <div className="lp-preview-body p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#c17b5a]">Board</p>
          <span className="lp-status">3 columns · 9 cards</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["Not started", ["Database schema", "Mobile spacing", "Budget setup"], "#C07850"],
              ["In progress", ["Auth polish", "Lecture summary", "Level design"], "#5A7A9A"],
              ["Completed", ["Repo setup", "Theme picker", "Quick note sync"], "#5A8A6A"],
            ] as [string, string[], string][]
          ).map(([column, cards, color]) => (
            <section key={column} className="rounded-[8px] border border-[#ece7df] bg-[#fbfaf6] p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: color }} />
                <h2 className="text-[12.5px] font-semibold text-[#17130f]">{column}</h2>
                <span className="ml-auto text-[11px] text-[#a09a93]">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((card) => (
                  <div
                    key={card}
                    className="rounded-[6px] border border-[#f0ebe4] bg-white px-3 py-2.5 text-[12px] text-[#504d48] shadow-[0_1px_6px_rgba(35,31,26,0.06)]"
                  >
                    {card}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (view === "Templates") {
    return (
      <div className="lp-preview-body p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#c17b5a]">Templates</p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-[#17130f]">Start with structure already in place.</h2>
          </div>
          <span className="lp-status">8 templates</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {TEMPLATE_PREVIEWS.map((template) => (
            <article
              key={template.name}
              className="rounded-[8px] border border-[#ece7df] bg-white p-3 shadow-[0_2px_10px_rgba(35,31,26,0.07)]"
            >
              <div className="h-[3px] rounded-full" style={{ background: template.accent }} />
              <h3 className="mt-3 text-[13px] font-semibold text-[#17130f]">{template.name}</h3>
              <div className="mt-2.5 space-y-1.5">
                {template.cards.map((card) => (
                  <div
                    key={card}
                    className="rounded-[5px] border border-[#f0ebe4] bg-[#fbf7f1] px-2.5 py-1.5 text-[11px] text-[#68635d]"
                  >
                    {card}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (view === "Themes") {
    return <ThemesPreview />;
  }

  return (
    <div className="lp-preview-body p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#c17b5a]">Devices</p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-[#17130f]">Active sessions and sync status.</h2>
        </div>
        <span className="lp-status">
          <span className="lp-dot" />
          Synced now
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {(
          [
            { device: "MacBook Pro", status: "Active now", since: "Current session", color: "#5A8A6A", bars: [16, 24, 32, 22, 28] },
            { device: "iPhone", status: "Synced", since: "2 min ago", color: "#5A7A9A", bars: [22, 18, 28, 24, 16] },
            { device: "iPad", status: "Idle", since: "1 hr ago", color: "#a5a09a", bars: [12, 16, 10, 18, 14] },
          ]
        ).map(({ device, status, since, color, bars }) => (
          <article
            key={device}
            className="rounded-[8px] border border-[#ece7df] bg-white p-4 shadow-[0_2px_10px_rgba(35,31,26,0.07)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-[#17130f]">{device}</h3>
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold flex-shrink-0" style={{ color }}>
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color }} />
                {status}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#9a948d]">{since}</p>
            <div className="mt-4 flex items-end gap-1">
              {bars.map((height, i) => (
                <span
                  key={`${device}-${i}`}
                  className="w-2 flex-shrink-0 rounded-full"
                  style={{ height, background: color, opacity: 0.68 }}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ThemesPreview() {
  const [activeTheme, setActiveTheme] = useState<ThemeSwatch>(DEFAULT_THEME);

  useEffect(() => {
    if (activeTheme.name === DEFAULT_THEME.name) {
      return;
    }

    const resetTimer = window.setTimeout(() => {
      setActiveTheme(DEFAULT_THEME);
    }, 5000);

    return () => window.clearTimeout(resetTimer);
  }, [activeTheme]);

  return (
    <div className="lp-preview-body grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[8px] border border-[#ece7df] bg-[#fbfaf6] p-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#c17b5a]">Themes</p>
        <h2 className="mt-0.5 text-[15px] font-semibold text-[#17130f]">Make the dashboard feel like yours.</h2>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {THEME_SWATCHES.map((theme) => (
            <div key={theme.name} className="flex flex-col gap-1">
              <button
                type="button"
                aria-pressed={activeTheme.name === theme.name}
                aria-label={`Preview ${theme.name} theme`}
                className={`lp-theme-swatch ${activeTheme.name === theme.name ? "is-active" : ""}`}
                style={{ backgroundColor: theme.color }}
                onClick={() => setActiveTheme(theme)}
              />
              <span className="text-center text-[10px] font-medium text-[#8a8480]">{theme.name}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-[#8a8480]">
          Just a preview. It fades back to Slate after 5 seconds.
        </p>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-[#ece7df]">
        <div
          className="lp-theme-surface h-full p-4"
          style={{ backgroundColor: activeTheme.color }}
        >
          <div className="relative z-[1] rounded-[8px] bg-white/82 p-4 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2.5 w-24 rounded-full transition-colors duration-700" style={{ backgroundColor: activeTheme.color }} />
              <div className="ml-auto text-[10px] font-semibold transition-colors duration-700" style={{ color: activeTheme.color }}>
                {activeTheme.name} theme
              </div>
            </div>
            <div className="space-y-2">
              {["Meeting Notes", "Project brief", "Ideas backlog"].map((item) => (
                <div
                  key={item}
                  className="flex h-10 items-center rounded-[6px] border border-[#f0ebe4] bg-white px-3 shadow-[0_1px_6px_rgba(35,31,26,0.07)]"
                >
                  <span className="mr-2 h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors duration-700" style={{ backgroundColor: activeTheme.color }} />
                  <span className="text-[12px] text-[#404040]">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-theme-fade" style={{ backgroundColor: activeTheme.soft }} />
        </div>
      </section>
    </div>
  );
}
