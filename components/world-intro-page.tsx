"use client";

import React from "react";
import { ArrowLeft, Sparkles, Film, Compass, User, Clock, Play, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/components/creator-workspace.css";
import { characterHook } from "@/lib/character-card";

export type WorldIntroCharacter = {
  id: string;
  name: string;
  identity: string;
  cardHook?: string;
  publicIntroduction?: string;
  publicBackground?: string;
  playable?: boolean;
  isDefault?: boolean;
  image?: string;
};

export type WorldIntroSavedRun = {
  id: string;
  roleName: string;
  roleId: string;
  turn: number;
  location: string;
  savedAt: number;
  status: "playing" | "ending";
};

export type WorldIntroData = {
  id: string;
  title: string;
  genre?: string;
  premise: string;
  storyHook?: string;
  openingScene?: { location?: string; scene?: string };
  cover?: string;
  fixedRoleId?: string;
  characters: WorldIntroCharacter[];
  existingRun?: WorldIntroSavedRun | null;
};

export function WorldIntroPage({
  data,
  onBack,
  onResumeRun,
  onStartWorld,
}: {
  data: WorldIntroData;
  onBack: () => void;
  onResumeRun: (runId: string) => void;
  onStartWorld: (roleId: string) => void;
}) {
  const displayTitle = data.title.trim() || "未命名世界";
  const displayPremise = data.premise.trim() || "尚在构思的世界前提。";
  const displayGenre = data.genre?.trim() || "互动故事";

  const [confirmRestartRoleId, setConfirmRestartRoleId] = React.useState<string | null>(null);

  const playableRoles = data.characters.filter((c) => c.playable !== false);
  const npcRoles = data.characters.filter((c) => c.playable === false);
  const isSingleRole = playableRoles.length === 1;

  function handleRoleClick(roleId: string) {
    if (data.existingRun) {
      setConfirmRestartRoleId(roleId);
    } else {
      onStartWorld(roleId);
    }
  }

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="flow-page world-intro-page" style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 20px 64px" }}>
      {/* 顶部简洁导航 */}
      <header className="flow-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button
          className="flow-control back-link"
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            background: "none",
            border: "none",
            color: "var(--color-text-secondary, #4b5563)",
            fontSize: 14,
            padding: "6px 0",
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          <span>返回首页</span>
        </button>
        <span style={{ fontSize: 13, color: "var(--color-text-muted, #9ca3af)" }}>
          世界介绍 · 《{displayTitle}》
        </span>
      </header>

      {/* 电影质感封面 Hero */}
      <div className="showcase-hero" style={{ borderRadius: 16, marginBottom: 24, overflow: "hidden" }}>
        {data.cover ? (
          <img src={data.cover} alt={`${displayTitle} 封面海报`} className="showcase-hero-img" />
        ) : (
          <div className="showcase-hero-placeholder">
            <Compass size={48} className="showcase-compass-icon" />
          </div>
        )}
        <div className="showcase-hero-overlay" />
        <div className="showcase-hero-info">
          <div className="showcase-badges" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="showcase-badge genre-badge">
              <Film size={12} />
              {displayGenre}
            </span>
          </div>
          <h1 id="world-intro-title" className="showcase-title" style={{ fontSize: "clamp(22px, 3.5vw, 32px)", margin: "10px 0 8px" }}>
            {displayTitle}
          </h1>
          <p className="showcase-premise" style={{ maxWidth: 760, fontSize: 14, lineHeight: 1.6, margin: 0, opacity: 0.95 }}>
            {displayPremise}
          </p>
        </div>
      </div>

      {/* 历史存档恢复卡片（如有） */}
      {data.existingRun && (
        <section
          className="world-intro-saved-card"
          aria-label="已有探索存档"
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 260, flex: 1 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 15, color: "var(--color-text, #111827)" }}>发现上次探索记录</strong>
                {data.existingRun.savedAt ? (
                  <small style={{ color: "var(--color-text-muted, #6b7280)", fontSize: 12 }}>
                    上次保存于 {formatDate(data.existingRun.savedAt)}
                  </small>
                ) : null}
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--color-text-secondary, #374151)", lineHeight: 1.5 }}>
                扮演角色：<strong>{data.existingRun.roleName}</strong> · 第 {data.existingRun.turn} 轮 · 地点：{data.existingRun.location}
              </p>
              <small style={{ display: "block", marginTop: 4, color: "var(--color-text-muted, #6b7280)", fontSize: 12 }}>
                点击“继续上次探索”恢复已有进度；若从下方选择角色将开启全新历程。
              </small>
            </div>
          </div>
          <Button
            className="primary-action"
            size="sm"
            onClick={() => onResumeRun(data.existingRun!.id)}
            style={{
              background: "#059669",
              color: "#ffffff",
              fontWeight: 600,
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Play size={14} />
            <span>继续上次探索</span>
          </Button>
        </section>
      )}

      {/* 公开开场背景与处境 */}
      {(data.storyHook || data.openingScene?.scene) && (
        <section
          className="world-intro-situation"
          style={{
            background: "var(--color-surface, #ffffff)",
            border: "1px solid var(--color-border-soft, #e5e7eb)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={16} style={{ color: "#059669" }} />
            <strong style={{ fontSize: 14, color: "var(--color-text, #111827)" }}>开场处境与故事焦点</strong>
          </div>
          {data.storyHook && data.storyHook !== data.premise && (
            <blockquote
              style={{
                margin: "0 0 10px 0",
                paddingLeft: 12,
                borderLeft: "3px solid #059669",
                color: "var(--color-text, #111827)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              “{data.storyHook}”
            </blockquote>
          )}
          {data.openingScene?.scene && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary, #4b5563)", lineHeight: 1.6 }}>
              {data.openingScene.location ? (
                <span style={{ color: "var(--color-text, #111827)", fontWeight: 600 }}>【{data.openingScene.location}】</span>
              ) : null}
              {data.openingScene.scene}
            </p>
          )}
        </section>
      )}

      {/* 单角色作品专属简化选角引导 */}
      {isSingleRole && playableRoles[0] && (
        <section
          className="world-intro-single-role-spotlight"
          style={{
            background: "var(--color-surface, #ffffff)",
            border: "1px solid var(--color-border-soft, #e5e7eb)",
            borderRadius: 14,
            padding: "22px 24px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                overflow: "hidden",
                flexShrink: 0,
                background: "var(--color-border, #f3f4f6)",
              }}
            >
              {playableRoles[0].image ? (
                <img src={playableRoles[0].image} alt={playableRoles[0].name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, color: "#4b5563" }}>
                  {playableRoles[0].name[0] || "人"}
                </div>
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>你将扮演：</span>
                <strong style={{ fontSize: 17, color: "var(--color-text, #111827)" }}>{playableRoles[0].name}</strong>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary, #4b5563)", background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: 4 }}>
                  {playableRoles[0].identity}
                </span>
              </div>
              {(() => {
                const singleHook =
                  characterHook(playableRoles[0].cardHook) ||
                  playableRoles[0].publicIntroduction?.trim() ||
                  playableRoles[0].publicBackground?.trim() ||
                  "";
                return singleHook ? (
                  <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "var(--color-text-secondary, #4b5563)", lineHeight: 1.5 }}>
                    {singleHook}
                  </p>
                ) : null;
              })()}
            </div>
          </div>
          <Button
            size="lg"
            className="primary-action"
            onClick={() => handleRoleClick(playableRoles[0].id)}
            style={{
              background: "#059669",
              color: "#ffffff",
              fontWeight: 600,
              padding: "11px 28px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Play size={16} style={{ marginRight: 6 }} />
            <span>{data.existingRun ? `以 ${playableRoles[0].name} 重新开始` : `以 ${playableRoles[0].name} 开始体验`}</span>
          </Button>
        </section>
      )}

      {/* 多角色作品：选择你的视角 */}
      {!isSingleRole && playableRoles.length > 0 && (
        <section className="world-intro-roles-section" aria-labelledby="playable-roles-title" style={{ marginBottom: 32 }}>
          <div className="showcase-section-header" style={{ marginBottom: 14 }}>
            <div className="showcase-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} style={{ color: "#059669" }} />
              <h2 id="playable-roles-title" style={{ fontSize: 17, margin: 0, color: "var(--color-text, #111827)" }}>
                选择你的视角
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>
              选择一个角色代入故事，开启独立第一人称视角探索。
            </p>
          </div>

          <div className="showcase-roles-grid">
            {playableRoles.map((role) => {
              const roleName = role.name.trim() || "神秘角色";
              const roleIdentity = role.identity?.trim() || "世界人物";
              const roleHook =
                characterHook(role.cardHook) ||
                role.publicIntroduction?.trim() ||
                role.publicBackground?.trim() ||
                "";

              return (
                <article
                  key={role.id}
                  className="showcase-role-card"
                  data-playable="true"
                  style={{
                    background: "var(--color-surface, #ffffff)",
                    border: "1px solid var(--color-border-soft, #e5e7eb)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div className="showcase-role-header" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                      <div
                        className="showcase-role-avatar"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          overflow: "hidden",
                          flexShrink: 0,
                          background: "var(--color-border, #f3f4f6)",
                        }}
                      >
                        {role.image ? (
                          <img src={role.image} alt={roleName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#4b5563" }}>
                            {roleName[0] || "人"}
                          </div>
                        )}
                      </div>
                      <div className="showcase-role-meta">
                        <strong className="showcase-role-name" style={{ fontSize: 15, color: "var(--color-text, #111827)", display: "block" }}>
                          {roleName}
                        </strong>
                        <span className="showcase-role-identity" style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7280)" }}>
                          {roleIdentity}
                        </span>
                      </div>
                    </div>

                    {roleHook ? (
                      <p className="showcase-role-hook" title={roleHook} style={{ fontSize: 13, color: "var(--color-text-secondary, #4b5563)", lineHeight: 1.5, margin: "0 0 14px 0" }}>
                        {roleHook}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    size="sm"
                    className="showcase-play-btn"
                    onClick={() => handleRoleClick(role.id)}
                    title={`以 ${roleName} 的身份进入世界`}
                    style={{
                      background: "#059669",
                      color: "#ffffff",
                      width: "100%",
                      fontWeight: 500,
                      borderRadius: 6,
                    }}
                  >
                    <Play size={12} style={{ marginRight: 6 }} />
                    <span>{data.existingRun ? `以 ${roleName} 重新开始` : `以 ${roleName} 身份开始`}</span>
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 你会遇见的人物（NPC，非扮演视角） */}
      {npcRoles.length > 0 && (
        <section className="world-intro-npc-section" aria-labelledby="npc-roles-title" style={{ marginTop: 24 }}>
          <div className="showcase-section-header" style={{ marginBottom: 14 }}>
            <div className="showcase-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <User size={18} style={{ color: "var(--color-text-muted, #6b7280)" }} />
              <h2 id="npc-roles-title" style={{ fontSize: 16, margin: 0, color: "var(--color-text, #111827)" }}>
                你会遇见的人物
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>
              由世界 Agent 演绎的剧情登场人物。
            </p>
          </div>

          <div className="showcase-roles-grid">
            {npcRoles.map((role) => {
              const roleName = role.name.trim() || "神秘人物";
              const roleIdentity = role.identity?.trim() || "剧情人物";
              const roleHook =
                characterHook(role.cardHook) ||
                role.publicIntroduction?.trim() ||
                role.publicBackground?.trim() ||
                "";

              return (
                <article
                  key={role.id}
                  className="showcase-role-card"
                  data-playable="false"
                  style={{
                    background: "var(--color-surface, #ffffff)",
                    border: "1px solid var(--color-border-soft, #e5e7eb)",
                    borderRadius: 12,
                    padding: 16,
                    opacity: 0.95,
                  }}
                >
                  <div className="showcase-role-header" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                    <div
                      className="showcase-role-avatar"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "var(--color-border, #f3f4f6)",
                      }}
                    >
                      {role.image ? (
                        <img src={role.image} alt={roleName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#6b7280" }}>
                          {roleName[0] || "人"}
                        </div>
                      )}
                    </div>
                    <div className="showcase-role-meta">
                      <strong className="showcase-role-name" style={{ fontSize: 15, color: "var(--color-text, #111827)", display: "block" }}>
                        {roleName}
                      </strong>
                      <span className="showcase-role-identity" style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7280)" }}>
                        {roleIdentity}
                      </span>
                    </div>
                  </div>

                  {roleHook ? (
                    <p className="showcase-role-hook" title={roleHook} style={{ fontSize: 13, color: "var(--color-text-secondary, #4b5563)", lineHeight: 1.5, margin: "0 0 10px 0" }}>
                      {roleHook}
                    </p>
                  ) : null}

                  <div
                    style={{
                      padding: "5px 0",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--color-text-muted, #6b7280)",
                      background: "rgba(0,0,0,0.03)",
                      borderRadius: 6,
                      border: "1px dashed var(--color-border-soft, #e5e7eb)",
                    }}
                  >
                    世界出场人物 · NPC
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 重新开始确认弹窗（保护旧存档） */}
      {confirmRestartRoleId && (
        <div
          className="studio-modal-backdrop"
          onClick={() => setConfirmRestartRoleId(null)}
          style={{
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(3px)",
            padding: 16,
          }}
        >
          <div
            className="studio-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-restart-title"
            style={{
              maxWidth: 440,
              width: "100%",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <h3
              id="confirm-restart-title"
              style={{
                margin: "0 0 12px 0",
                fontSize: 17,
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ShieldAlert size={20} style={{ color: "#059669" }} />
              <span>开启新探索确认</span>
            </h3>
            <p style={{ margin: "0 0 12px 0", fontSize: 13, lineHeight: 1.6, color: "#374151" }}>
              检测到你在此世界已有进行中的探索记录（<strong>{data.existingRun?.roleName}</strong> · 第 {data.existingRun?.turn} 轮）。
            </p>
            <p style={{ margin: "0 0 20px 0", fontSize: 12, lineHeight: 1.5, color: "#6b7280" }}>
              开启新历程将以选定角色开启全新的探索。已有的图文探索进度仍可在“探索记录”中随时接续。
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Button variant="outline" size="sm" onClick={() => setConfirmRestartRoleId(null)}>
                取消
              </Button>
              {data.existingRun && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setConfirmRestartRoleId(null);
                    onResumeRun(data.existingRun!.id);
                  }}
                >
                  继续上次进度
                </Button>
              )}
              <Button
                className="primary-action"
                size="sm"
                onClick={() => {
                  const target = confirmRestartRoleId;
                  setConfirmRestartRoleId(null);
                  if (target) onStartWorld(target);
                }}
                style={{ background: "#059669", color: "#ffffff", fontWeight: 600 }}
              >
                确认开启新历程
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 底部合规与提示 */}
      <footer style={{ marginTop: 40, textAlign: "center", fontSize: 12, color: "var(--color-text-muted, #9ca3af)" }}>
        <p style={{ margin: 0 }}>设定来自创作者，后续故事由 AI 实时演绎。草稿与互动记录保存在当前浏览器。</p>
      </footer>
    </div>
  );
}

