"use client";

import { useEffect, useMemo, useState } from "react";

type FloatingNote = {
  id: string;
  title: string;
  lines: string[];
  left: string;
  duration: string;
  delay: string;
  rotation: string;
};

const NOTE_CONTENTS = [
  { title: "Meeting Notes", lines: ["Q2 review at 3pm", "Prepare slides", "Follow up"] },
  { title: "Ideas", lines: ["Tag grouping", "Keyboard shortcuts", "Export options"] },
  { title: "To-Do", lines: ["Ship auth UI", "Refine spacing", "Review mobile"] },
  { title: "Reading", lines: ["Deep Work", "Atomic Habits", "Pragmatic Programmer"] },
  { title: "Weekly", lines: ["Plan sprint", "Write docs", "Inbox zero"] },
  { title: "Draft", lines: ["Keep interface calm", "Reduce noise", "Focus on writing"] },
  { title: "Expenses", lines: ["Rent paid", "Groceries pending", "Set monthly budget"] },
  { title: "College", lines: ["Submit lab report", "Review lecture 5", "Project sync Thu"] },
  { title: "Subjects", lines: ["Math revision", "History notes", "Chemistry assignment"] },
  { title: "Game Dev", lines: ["Fix player jump", "Polish UI transitions", "Balance XP curve"] },
  { title: "Level Design", lines: ["Blockout cave map", "Add checkpoint", "Tune spawn timing"] },
  { title: "Bug Triage", lines: ["Collision glitch", "Input lag on web", "Audio loop issue"] },
];

function buildNotes(): FloatingNote[] {
  return Array.from({ length: 12 }).map((_, index) => {
    const note = NOTE_CONTENTS[index % NOTE_CONTENTS.length];
    return {
      id: `${note.title}-${index}`,
      title: note.title,
      lines: note.lines,
      left: `${8 + (index * 11) % 84}%`,
      duration: `${18 + (index % 5) * 3}s`,
      delay: `${(index % 4) * 1.1}s`,
      rotation: `${(index % 2 === 0 ? 1 : -1) * (2 + (index % 4))}deg`,
    };
  });
}

export default function LoginAtmosphere({ showFloatingNotes = true }: { showFloatingNotes?: boolean }) {
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const notes = useMemo(buildNotes, []);

  useEffect(() => {
    const canvas = document.getElementById("auth-bg-canvas") as HTMLCanvasElement | null;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "rgba(44,40,32,0.04)";
      context.lineWidth = 1;

      for (let y = 0; y < canvas.height; y += 28) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
      }

      context.strokeStyle = "rgba(193,123,90,0.1)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(60, 0);
      context.lineTo(60, canvas.height);
      context.stroke();
    };

    draw();
    window.addEventListener("resize", draw);

    return () => {
      window.removeEventListener("resize", draw);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      setCursor({ x: event.clientX, y: event.clientY, visible: true });
    };

    const onMouseLeave = () => {
      setCursor((current) => ({ ...current, visible: false }));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas id="auth-bg-canvas" className="auth-bg-canvas" aria-hidden="true" />

      <div className="auth-cursor-dot" style={{ left: cursor.x, top: cursor.y, opacity: cursor.visible ? 1 : 0 }} />

      {showFloatingNotes ? (
        <div className="auth-floating-notes" aria-hidden="true">
          {notes.map((note) => (
            <article
              key={note.id}
              className="auth-floating-note"
              style={{
                left: note.left,
                animationDuration: note.duration,
                animationDelay: note.delay,
                transform: `rotate(${note.rotation})`,
              }}
            >
              <p className="auth-floating-note-title">{note.title}</p>
              {note.lines.map((line) => (
                <p key={`${note.id}-${line}`} className="auth-floating-note-line">
                  {line}
                </p>
              ))}
            </article>
          ))}
        </div>
      ) : null}

      <div className="auth-avatar-badge" aria-hidden="true">
        N
      </div>
    </>
  );
}
