"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";

type BackgroundMode = "image" | "color" | "gradient";

type DashboardCard = {
  id: string;
  title: string;
  image: string | null;
  backgroundMode: BackgroundMode;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
};

type BoardUpdate = Partial<
  Pick<
    DashboardCard,
    "title" | "image" | "backgroundMode" | "backgroundColor" | "gradientFrom" | "gradientTo"
  >
>;

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 980;
const VIEWPORT_PADDING = 16;

function getDashboardScale() {
  if (typeof window === "undefined") {
    return 1;
  }

  const widthRatio = Math.max(window.innerWidth - VIEWPORT_PADDING, 1) / BASE_WIDTH;
  const heightRatio = Math.max(window.innerHeight - VIEWPORT_PADDING, 1) / BASE_HEIGHT;

  return Math.min(widthRatio, heightRatio, 1);
}

function getCardBackgroundStyle(card: DashboardCard): CSSProperties {
  if (card.backgroundMode === "image" && card.image) {
    return { backgroundImage: `url(${card.image})` };
  }

  if (card.backgroundMode === "gradient") {
    return {
      backgroundImage: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})`,
    };
  }

  return { backgroundColor: card.backgroundColor };
}

function getHeadingSizeClass(title: string) {
  if (title.length >= 13) return "text-[30px] tracking-[0.35px]";
  if (title.length >= 10) return "text-[34px] tracking-[0.4px]";
  if (title.length >= 8) return "text-[40px] tracking-[0.5px]";
  return "text-[48px] tracking-[0.6px]";
}

export default function DashboardClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [scale, setScale] = useState(getDashboardScale);
  const [boardCards, setBoardCards] = useState<DashboardCard[]>([]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [imageInput, setImageInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const editingCard = useMemo(
    () => boardCards.find((card) => card.id === editingCardId) ?? null,
    [boardCards, editingCardId],
  );

  const loadBoards = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/boards", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/auth");
        router.refresh();
        return;
      }

      if (!response.ok) {
        setError("Failed to load boards.");
        return;
      }

      const payload = (await response.json()) as { boards: DashboardCard[] };
      setBoardCards(payload.boards);
    } catch {
      setError("Could not load your boards.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const persistCard = useCallback(
    async (boardId: string, updates: BoardUpdate) => {
      setIsSaving(true);

      try {
        const response = await fetch(`/api/boards/${boardId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(payload?.error ?? "Failed to save board changes.");
          await loadBoards();
          return;
        }

        const payload = (await response.json()) as { board: DashboardCard };
        setBoardCards((previous) =>
          previous.map((card) => (card.id === boardId ? payload.board : card)),
        );
      } catch {
        setError("Failed to save board changes.");
      } finally {
        setIsSaving(false);
      }
    },
    [loadBoards],
  );

  const updateCardLocally = useCallback((boardId: string, updates: BoardUpdate) => {
    setBoardCards((previous) =>
      previous.map((card) => (card.id === boardId ? { ...card, ...updates } : card)),
    );
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setScale(getDashboardScale());
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    setImageInput(editingCard?.image ?? "");
  }, [editingCard?.image, editingCardId]);

  const modeLabel: Record<BackgroundMode, string> = {
    image: "Image",
    color: "Color",
    gradient: "Gradient",
  };

  const applyImage = async () => {
    if (!editingCard) {
      return;
    }

    const nextImage = imageInput.trim();

    if (!nextImage) {
      return;
    }

    updateCardLocally(editingCard.id, { image: nextImage, backgroundMode: "image" });
    await persistCard(editingCard.id, { image: nextImage, backgroundMode: "image" });
  };

  const removeImage = async () => {
    if (!editingCard) {
      return;
    }

    updateCardLocally(editingCard.id, {
      image: null,
      backgroundMode: "color",
    });
    setImageInput("");

    await persistCard(editingCard.id, {
      image: null,
      backgroundMode: "color",
    });
  };

  const deleteCard = async () => {
    if (!editingCard) {
      return;
    }

    const boardId = editingCard.id;

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Failed to delete board.");
        return;
      }

      setBoardCards((previous) => previous.filter((card) => card.id !== boardId));
      setEditingCardId(null);
    } catch {
      setError("Failed to delete board.");
    }
  };

  const createBoard = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "NEW BOARD" }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Failed to create board.");
        return;
      }

      const payload = (await response.json()) as { board: DashboardCard };
      setBoardCards((previous) => [...previous, payload.board]);
      setEditingCardId(payload.board.id);
    } catch {
      setError("Failed to create board.");
    } finally {
      setIsCreating(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/auth");
      router.refresh();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[linear-gradient(180deg,#ebe6de_0%,#e3cdc0_100%)] text-[#666a72]">
        <p className="text-xl tracking-[0.14em] uppercase [font-family:'Cinzel','Times_New_Roman',serif]">
          Loading Noteslite
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[linear-gradient(180deg,#ebe6de_0%,#e3cdc0_100%)] text-[#64666b]">
      <style>{`
        @keyframes pageFadeIn {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(var(--scale)) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(var(--scale)) translateY(0);
          }
        }

        @keyframes cardRiseIn {
          0% {
            opacity: 0;
            transform: translateY(22px) scale(0.97);
          }
          50% {
            opacity: 0.5;
            transform: translateY(10px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fadeUp {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes avatarDrift {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes menuPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.72;
          }
        }

        @keyframes ribbonTone {
          0%,
          100% {
            filter: saturate(1) brightness(1);
          }
          50% {
            filter: saturate(1.08) brightness(1.02);
          }
        }

        @keyframes dotPulse {
          0%,
          100% {
            opacity: 0.95;
          }
          50% {
            opacity: 0.78;
          }
        }

        @keyframes panelIn {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div
        className="absolute left-1/2 top-1/2 h-[980px] w-[1600px] origin-center [animation:pageFadeIn_650ms_ease-out_both] motion-reduce:animate-none"
        style={
          {
            transform: `translate(-50%, -50%) scale(${scale})`,
            "--scale": scale,
          } as CSSProperties
        }
      >
        <div className="grid h-full w-full grid-cols-[156px_1fr]">
          <aside className="relative bg-[rgba(255,255,255,0)] [animation:fadeUp_720ms_ease-out_80ms_both] motion-reduce:animate-none">
            <div
              className="absolute left-1/2 top-[60px] z-20 grid w-[96px] -translate-x-1/2 gap-[13px] scale-[0.72]"
              aria-hidden="true"
            >
              <span
                className="h-[11px] rounded-full bg-[#7f7b7d] [animation:menuPulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-[11px] rounded-full bg-[#7f7b7d] [animation:menuPulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: "180ms" }}
              />
              <span
                className="h-[11px] rounded-full bg-[#7f7b7d] [animation:menuPulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: "360ms" }}
              />
            </div>

            <div
              className="absolute left-1/2 top-[140px] z-20 grid w-[96px] -translate-x-1/2 gap-[13px] scale-[0.72]"
              aria-hidden="true"
            >
              <span className="h-[95px] rounded-full border-x-5 border-y-5 border-t-3 border-[rgba(255,255,255,0.78)] bg-[#7f7b7d] [animation:dotPulse_3.2s_ease-in-out_infinite] motion-reduce:animate-none" />
            </div>

            <div
              className="absolute left-1/2 top-[220px] z-20 grid w-[96px] -translate-x-1/2 gap-[13px] scale-[0.72]"
              aria-hidden="true"
            >
              <span
                className="h-[95px] rounded-full border-x-5 border-y-5 border-t-3 border-[rgba(255,255,255,0.78)] bg-[#7f7b7d] [animation:dotPulse_3.2s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: "220ms" }}
              />
            </div>

            <div
              className="absolute left-1/2 top-[300px] z-20 grid w-[96px] -translate-x-1/2 gap-[13px] scale-[0.72]"
              aria-hidden="true"
            >
              <span
                className="h-[95px] rounded-full border-x-5 border-y-5 border-t-3 border-[rgba(255,255,255,0.78)] bg-[#7f7b7d] [animation:dotPulse_3.2s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: "440ms" }}
              />
            </div>

            <div
              className="absolute left-1/2 top-[20px] z-10 h-[450px] w-[104px] -translate-x-1/2 [animation:ribbonTone_4.8s_ease-in-out_infinite] motion-reduce:animate-none"
              aria-hidden="true"
            >
              <div className="absolute inset-0 border-x-3 border-t-2 border-[rgba(255,255,255,0.78)] bg-[linear-gradient(180deg,#e2dddf_0%,#e8b6c0_100%)] [clip-path:polygon(0_0,100%_0,100%_86%,10%_100%,0_100%)]" />
            </div>
          </aside>

          <div className="flex h-full flex-col pb-[34px] pl-6 pr-[36px] pt-[30px]">
            <header className="flex h-[112px] items-center justify-end gap-7 [animation:fadeUp_720ms_ease-out_130ms_both] motion-reduce:animate-none">
              <div className="flex flex-col items-end gap-2">
                <h1 className="m-0 text-[84px] leading-none font-medium tracking-[2px] text-[#63666d] transition-[transform,letter-spacing] duration-500 hover:-translate-y-0.5 hover:tracking-[3px] [font-family:'Cinzel','Times_New_Roman',serif]">
                  NOTESLITE
                </h1>
                <div className="flex items-center gap-3 text-[13px] uppercase tracking-[0.16em] text-[#696d75]">
                  <span>{userName}</span>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full border border-[#bfc2ca] px-4 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#5c6068] transition-colors hover:bg-[#e9ebf0]"
                  >
                    Log Out
                  </button>
                </div>
              </div>
              <div
                className="relative h-[74px] w-[74px] rounded-full bg-[radial-gradient(circle_at_30%_25%,#f2f2f2_0%,#dbdbdb_76%)] [box-shadow:0_12px_24px_rgba(87,78,69,0.24)] [animation:avatarDrift_4.6s_ease-in-out_infinite] before:absolute before:top-[14px] before:left-1/2 before:h-5 before:w-5 before:-translate-x-1/2 before:rounded-full before:bg-[#8f8f90] before:content-[''] after:absolute after:bottom-[14px] after:left-1/2 after:h-5 after:w-[38px] after:-translate-x-1/2 after:rounded-[20px_20px_12px_12px] after:bg-[#8f8f90] after:content-[''] motion-reduce:animate-none"
                aria-hidden="true"
              />
            </header>

            <section className="mt-[12px] flex-1 rounded-[34px] bg-[rgba(236,236,238,0.96)] px-[74px] pb-[54px] pt-[56px] [box-shadow:0_22px_30px_rgba(90,72,58,0.33)] [animation:fadeUp_760ms_ease-out_180ms_both] motion-reduce:animate-none">
              {error ? (
                <div className="mb-5 rounded-lg border border-[#dca9a9] bg-[#f6d8d8] px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-[#8d4444]">
                  {error}
                </div>
              ) : null}

              <div className="mb-5 flex items-center justify-between">
                <p className="text-[13px] uppercase tracking-[0.12em] text-[#666a72]">
                  {isSaving ? "Saving changes..." : "All changes synced"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-x-[62px] gap-y-[66px]">
                {boardCards.map((card, index) => (
                  <article
                    key={card.id}
                    className="group relative h-[262px] overflow-hidden rounded-[24px] border-2 border-[rgba(255,255,255,0.8)] bg-[#cfd2d9] bg-cover bg-center [box-shadow:0_16px_22px_rgba(47,43,40,0.42)] [animation:cardRiseIn_680ms_cubic-bezier(0.2,1,0.3,1)_both] transform-gpu will-change-transform transition-[transform,box-shadow,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.01] hover:[box-shadow:0_20px_26px_rgba(47,43,40,0.38)] after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0.18)_100%)] motion-reduce:animate-none"
                    style={{
                      ...getCardBackgroundStyle(card),
                      animationDelay: `${index * 90 + 80}ms`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setEditingCardId(card.id)}
                      className="absolute right-[8px] top-[8px] z-[5] grid h-8 w-8 place-items-center rounded-full border border-[rgba(255,255,255,0.62)] bg-[rgba(238,241,246,0.72)] text-[13px] leading-none tracking-[-1px] text-[rgba(88,91,99,0.95)] transition-colors duration-300 hover:bg-[rgba(255,255,255,0.9)]"
                      aria-label={`Edit ${card.title} board`}
                    >
                      ...
                    </button>

                    <div className="absolute inset-[30px] z-[1] overflow-hidden rounded-[28px] border-[3px] border-[rgba(255,255,255,0.62)] bg-[rgba(238,241,246,0.68)] px-[8px] transition-colors duration-500 group-hover:bg-[rgba(244,247,252,0.72)]">
                      <h2
                        className={`mt-[10px] w-full text-center leading-none font-medium whitespace-nowrap uppercase text-[rgba(88,91,99,0.88)] transition-transform duration-500 group-hover:-translate-y-0.5 [font-family:'Cinzel','Times_New_Roman',serif] ${getHeadingSizeClass(
                          card.title,
                        )}`}
                      >
                        {card.title}
                      </h2>
                    </div>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={createBoard}
                  disabled={isCreating}
                  className="group grid h-[262px] place-items-center rounded-[24px] bg-[#ececee] text-[120px] leading-none text-[#6f7279] [box-shadow:0_16px_22px_rgba(47,43,40,0.28)] [animation:cardRiseIn_680ms_cubic-bezier(0.2,1,0.3,1)_both] transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:scale-[1.01] hover:[box-shadow:0_22px_30px_rgba(47,43,40,0.34)] [font-family:'Cormorant_Garamond','Times_New_Roman',serif] motion-reduce:animate-none disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ animationDelay: `${boardCards.length * 90 + 80}ms` }}
                  aria-label="Add note collection"
                >
                  <span className="transition-transform duration-500 group-hover:rotate-90">
                    {isCreating ? "..." : "+"}
                  </span>
                </button>
              </div>
            </section>
          </div>
        </div>

        {editingCard ? (
          <div
            className="absolute inset-0 z-50 bg-[rgba(22,22,24,0)] backdrop-blur-[1.5px]"
            onClick={() => setEditingCardId(null)}
          >
            <div
              className="absolute right-[74px] top-[126px] w-[300px] rounded-[22px] border border-[rgba(218,219,224,0.95)] bg-[rgba(246,247,250,0.97)] p-5 [box-shadow:0_18px_30px_rgba(42,42,47,0.28)] [animation:panelIn_260ms_ease-out_both]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="m-0 text-[22px] leading-none tracking-[0.5px] text-[#5f6269] [font-family:'Cinzel','Times_New_Roman',serif]">
                  Edit Board
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCardId(null)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(219,221,228,0.72)] text-[20px] leading-none text-[#5f6269] transition-colors duration-200 hover:bg-[rgba(199,202,212,0.9)]"
                  aria-label="Close editor"
                >
                  x
                </button>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#7a7e87]">
                    Change Heading
                  </span>
                  <input
                    value={editingCard.title}
                    onChange={(event) =>
                      updateCardLocally(editingCard.id, {
                        title: event.target.value.toUpperCase(),
                      })
                    }
                    onBlur={() =>
                      void persistCard(editingCard.id, {
                        title: editingCard.title,
                      })
                    }
                    className="h-10 rounded-[10px] border border-[#d3d5dd] bg-white/80 px-3 text-[18px] text-[#5f6269] outline-none transition-colors focus:border-[#8f93a0]"
                  />
                </label>

                <div className="grid gap-2">
                  <span className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#7a7e87]">
                    Background Style
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(modeLabel) as BackgroundMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          updateCardLocally(editingCard.id, { backgroundMode: mode });
                          void persistCard(editingCard.id, { backgroundMode: mode });
                        }}
                        className={`h-9 rounded-[10px] border text-[13px] font-medium transition-colors ${
                          editingCard.backgroundMode === mode
                            ? "border-[#767b86] bg-[#767b86] text-white"
                            : "border-[#d0d3dc] bg-white/80 text-[#666a72] hover:bg-[#eef0f5]"
                        }`}
                      >
                        {modeLabel[mode]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <span className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#7a7e87]">
                    Background Image
                  </span>
                  <input
                    value={imageInput}
                    onChange={(event) => setImageInput(event.target.value)}
                    placeholder="Paste image URL..."
                    className="h-10 rounded-[10px] border border-[#d3d5dd] bg-white/80 px-3 text-[14px] text-[#5f6269] outline-none transition-colors focus:border-[#8f93a0]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void applyImage();
                      }}
                      className="h-9 rounded-[10px] bg-[#7a7e89] text-[13px] font-medium text-white transition-colors hover:bg-[#646974]"
                    >
                      Apply Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void removeImage();
                      }}
                      className="h-9 rounded-[10px] border border-[#d0d3dc] bg-white/80 text-[13px] font-medium text-[#666a72] transition-colors hover:bg-[#eef0f5]"
                    >
                      Remove Image
                    </button>
                  </div>
                </div>

                {editingCard.backgroundMode === "color" ? (
                  <label className="grid gap-1">
                    <span className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#7a7e87]">
                      Change Background Color
                    </span>
                    <input
                      type="color"
                      value={editingCard.backgroundColor}
                      onChange={(event) => {
                        const nextColor = event.target.value;
                        updateCardLocally(editingCard.id, {
                          backgroundColor: nextColor,
                        });
                        void persistCard(editingCard.id, {
                          backgroundColor: nextColor,
                        });
                      }}
                      className="h-10 w-full cursor-pointer rounded-[10px] border border-[#d3d5dd] bg-white p-1"
                    />
                  </label>
                ) : null}

                {editingCard.backgroundMode === "gradient" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1">
                      <span className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#7a7e87]">
                        Gradient Start
                      </span>
                      <input
                        type="color"
                        value={editingCard.gradientFrom}
                        onChange={(event) => {
                          const nextColor = event.target.value;
                          updateCardLocally(editingCard.id, {
                            gradientFrom: nextColor,
                          });
                          void persistCard(editingCard.id, {
                            gradientFrom: nextColor,
                          });
                        }}
                        className="h-10 w-full cursor-pointer rounded-[10px] border border-[#d3d5dd] bg-white p-1"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#7a7e87]">
                        Gradient End
                      </span>
                      <input
                        type="color"
                        value={editingCard.gradientTo}
                        onChange={(event) => {
                          const nextColor = event.target.value;
                          updateCardLocally(editingCard.id, {
                            gradientTo: nextColor,
                          });
                          void persistCard(editingCard.id, {
                            gradientTo: nextColor,
                          });
                        }}
                        className="h-10 w-full cursor-pointer rounded-[10px] border border-[#d3d5dd] bg-white p-1"
                      />
                    </label>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    void deleteCard();
                  }}
                  className="mt-1 h-10 rounded-[10px] bg-[#d96464] text-[13px] font-semibold uppercase tracking-[0.6px] text-white transition-colors hover:bg-[#c94d4d]"
                >
                  Delete Board
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
