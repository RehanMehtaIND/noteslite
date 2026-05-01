"use client";

import { useState, type CSSProperties } from "react";

export const EMOJI_ASSET_NAMES: Record<string, string> = {
  "📄": "document",
  "👋": "wave",
  "📚": "books",
  "🔍": "search",
  "📕": "pdf",
  "📊": "spreadsheet",
  "📈": "presentation",
  "📝": "note",
  "🗜": "archive",
  "📎": "attachment",
  "💾": "save",
  "🗑": "trash",
  "🗑️": "trash",
  "☑": "checkbox",
  "💡": "callout",
  "⌨": "keyboard",
  "🖼": "image",
  "🖼️": "image",
  "▶": "video",
  "🔗": "link",
  "🎨": "palette",
  "🌐": "globe",
  "➕": "zoom-in",
  "➖": "zoom-out",
  "❌": "close",
  "👤": "profile",
  "⚙": "settings",
  "⚙️": "settings",
  "🚪": "sign-out",
  "⬜": "tablet",
  "💻": "desktop",
  "📱": "phone",
  "🔔": "notification",
  "📌": "pin",
  "✏": "edit",
  "✏️": "edit",
  "✎": "edit-pen",
  "✓": "check",
  "✅": "success",
  "₹": "currency-rupee",
};

type EmojiIconProps = {
  emoji: string;
  label: string;
  assetName?: string;
  className?: string;
  style?: CSSProperties;
};

export function getEmojiAssetName(emoji: string) {
  return EMOJI_ASSET_NAMES[emoji];
}

export default function EmojiIcon({ emoji, label, assetName, className, style }: EmojiIconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = assetName ?? getEmojiAssetName(emoji);

  return (
    <span
      className={className}
      role="img"
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        verticalAlign: "-0.12em",
        ...style,
      }}
    >
      {name && !imageFailed ? (
        <img
          src={`/assets/emoji/${name}.png`}
          alt=""
          aria-hidden="true"
          onError={() => setImageFailed(true)}
          style={{
            width: "1em",
            height: "1em",
            display: "block",
            objectFit: "contain",
          }}
        />
      ) : (
        emoji
      )}
    </span>
  );
}
