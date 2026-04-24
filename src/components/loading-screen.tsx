type LoadingScreenProps = {
  exiting?: boolean;
  workspaceName?: string | null;
  variant?: "workspace-open" | null;
};

export default function LoadingScreen({
  exiting = false,
  workspaceName,
  variant,
}: LoadingScreenProps) {
  const isWorkspaceOpen = variant === "workspace-open";
  const displayWorkspaceName = (workspaceName || "Workspace").trim();

  return (
    <div
      className={`noteslite-loader-root ${isWorkspaceOpen ? "workspace-open" : ""} ${exiting ? "is-exiting" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={isWorkspaceOpen ? `Opening ${displayWorkspaceName}` : "Preparing your workspace"}
    >
      <div className="noteslite-loader-pattern-dot" />
      <div className="noteslite-loader-vignette" />
      <div className="noteslite-loader-glow" />
      <div className="noteslite-loader-grain" />

      <span className="noteslite-loader-brand noteslite-loader-brand-tl">NotesLite</span>
      <span className="noteslite-loader-brand noteslite-loader-brand-br">v2.0</span>

      <div className="noteslite-loader-bg-layer" aria-hidden="true">
        <div className="noteslite-loader-left-col">
          <div className="noteslite-loader-card" style={{ top: "6%", left: "16px", "--r": "-2deg", "--rm": "-1.2deg", "--dy": "-11px", "--spd": "8s", "--d": "0.3s", "--w": "196px" } as React.CSSProperties}>
            <span className="noteslite-loader-tag" style={{ color: "#B5614A" }}>Meeting Notes</span>
            <div className="noteslite-loader-item">Q2 review at 3pm</div>
            <div className="noteslite-loader-item">Prepare slides</div>
            <div className="noteslite-loader-item">Follow up</div>
          </div>

          <div className="noteslite-loader-card" style={{ top: "31%", left: "20px", "--r": "1.5deg", "--rm": "0.8deg", "--dy": "-14px", "--spd": "10s", "--d": "0.7s", "--w": "188px" } as React.CSSProperties}>
            <span className="noteslite-loader-tag" style={{ color: "#4A6FA5" }}>Ideas</span>
            <div className="noteslite-loader-item">Tag grouping</div>
            <div className="noteslite-loader-item">Keyboard shortcuts</div>
            <div className="noteslite-loader-item">Export options</div>
          </div>

          <div className="noteslite-loader-card" style={{ top: "57%", left: "14px", "--r": "-1.4deg", "--rm": "-0.6deg", "--dy": "-9px", "--spd": "9s", "--d": "1.2s", "--w": "192px" } as React.CSSProperties}>
            <span className="noteslite-loader-tag" style={{ color: "#6B5A9A" }}>Research</span>
            <div className="noteslite-loader-item">Read paper on LLMs</div>
            <div className="noteslite-loader-item">Note key findings</div>
            <div className="noteslite-loader-item">Compare methods</div>
          </div>

          <div className="noteslite-loader-card" style={{ top: "80%", left: "18px", "--r": "1.8deg", "--rm": "1.1deg", "--dy": "-12px", "--spd": "7s", "--d": "0.5s", "--w": "182px", "--op": "0.58" } as React.CSSProperties}>
            <span className="noteslite-loader-tag" style={{ color: "#4A7C59" }}>Subjects</span>
            <div className="noteslite-loader-item">Math revision</div>
            <div className="noteslite-loader-item">History notes</div>
            <div className="noteslite-loader-item">Chemistry</div>
          </div>
        </div>

        <div className="noteslite-loader-right-col">
          <div className="noteslite-loader-card" style={{ top: "5%", right: "14px", "--r": "2.2deg", "--rm": "1.5deg", "--dy": "-10px", "--spd": "9s", "--d": "0.9s", "--w": "194px" } as React.CSSProperties}>
            <span className="noteslite-loader-tag" style={{ color: "#B5614A" }}>Draft</span>
            <div className="noteslite-loader-item">Keep interface calm</div>
            <div className="noteslite-loader-item">Reduce noise</div>
            <div className="noteslite-loader-item">Focus on writing</div>
          </div>

          <div className="noteslite-loader-card" style={{ top: "30%", right: "16px", "--r": "-1.8deg", "--rm": "-1.0deg", "--dy": "-13px", "--spd": "11s", "--d": "0.4s", "--w": "200px" } as React.CSSProperties}>
            <span className="noteslite-loader-tag" style={{ color: "#9A6B2A" }}>Expenses</span>
            <div className="noteslite-loader-item">Rent paid</div>
            <div className="noteslite-loader-item">Groceries pending</div>
            <div className="noteslite-loader-item">Set monthly budget</div>
          </div>

          <div className="noteslite-loader-card" style={{ top: "57%", right: "12px", "--r": "1.2deg", "--rm": "0.4deg", "--dy": "-11px", "--spd": "8s", "--d": "1.4s", "--w": "186px" } as React.CSSProperties}>
            <span className="noteslite-loader-tag" style={{ color: "#4A6FA5" }}>College</span>
            <div className="noteslite-loader-item">Submit lab report</div>
            <div className="noteslite-loader-item">Review lecture 5</div>
            <div className="noteslite-loader-item">Project sync Thu</div>
          </div>

          <div className="noteslite-loader-card" style={{ top: "80%", right: "15px", "--r": "-2.5deg", "--rm": "-1.8deg", "--dy": "-8px", "--spd": "10s", "--d": "0.6s", "--w": "178px", "--op": "0.58" } as React.CSSProperties}>
            <span className="noteslite-loader-tag" style={{ color: "#6B5A9A" }}>Game Dev</span>
            <div className="noteslite-loader-item">Fix player jump</div>
            <div className="noteslite-loader-item">Polish transitions</div>
            <div className="noteslite-loader-item">Balance XP curve</div>
          </div>
        </div>
      </div>

      <div className="noteslite-loader-fade-mask" aria-hidden="true" />

      <div className="noteslite-loader-scene">
        <div className="noteslite-loader-rule noteslite-loader-rule-top" />
        {isWorkspaceOpen ? (
          <div className="noteslite-loader-headline noteslite-loader-headline-workspace">
            <div className="noteslite-loader-row noteslite-loader-row-workspace">
              <span>{displayWorkspaceName}</span>
            </div>
          </div>
        ) : (
          <div className="noteslite-loader-headline">
            <div className="noteslite-loader-row">
              <span>Preparing</span>
            </div>
            <div className="noteslite-loader-row">
              <span>Your</span>
            </div>
            <div className="noteslite-loader-row">
              <span>Workspace</span>
            </div>
          </div>
        )}
        <div className="noteslite-loader-rule noteslite-loader-rule-bottom" />

        <div className="noteslite-loader-status">
          <span className="noteslite-loader-status-text">{isWorkspaceOpen ? "Teleporting" : "Loading"}</span>
          <span className="noteslite-loader-pip" />
          <span className="noteslite-loader-pip" />
          <span className="noteslite-loader-pip" />
        </div>
      </div>
    </div>
  );
}
