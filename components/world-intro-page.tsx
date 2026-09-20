"use client";

import React from "react";
import { ArrowLeft, Sparkles, Film, Compass, User, Clock, Play, Check, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/components/creator-workspace.css";
import { characterHook } from "@/lib/character-card";
import { characterPublicIntroduction } from "@/lib/character-presentation";

const SURPRISE_LABELS = ["平稳推进", "偶有插曲", "充满变数", "命运难料"];
const COMPLEXITY_LABELS = ["轻量微型", "标准探索", "错综复杂", "多方权谋"];

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
  surpriseLevel?: number;
  complexityLabel?: string;
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
  const surpriseText = data.surpriseLevel ? SURPRISE_LABELS[Math.max(0, Math.min(data.surpriseLevel - 1, 3))] : "标准变数";
  const complexityText = data.complexityLabel || "标准探索";

  const [confirmRestartRoleId, setConfirmRestartRoleId] = React.useState<string | null>(null);

  const playableRoles = data.characters.filter((c) => c.playable !== false);
  const singleRole = playableRoles.length === 1;

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
      {/* 顶部导航工具栏 */}
      <header className="flow-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button
          className="flow-control back-link"
          type="button"
          onClick={onBack}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 14, padding: "6px 0" }}
        >
          <ArrowLeft size={16} />
          <span>返回首页</span>
        </button>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>世界介绍 · 《{displayTitle}》</p>
      </header>

      {/* 16:9 电影质感海报 Hero */}
      <div className="showcase-hero" style={{ borderRadius: 16, marginBottom: 24 }}>
        {data.cover ? (
          <img src={data.cover} alt={`${displayTitle} 封面海报`} className="showcase-hero-img" />
        ) : (
          <div className="showcase-hero-placeholder">
            <Compass size={48} className="showcase-compass-icon" />
          </div>
        )}
        <div className="showcase-hero-overlay" />
        <div className="showcase-hero-info">
          <div className="showcase-badges">
            <span className="showcase-badge genre-badge">
              <Film size={12} />
              {displayGenre}
            </span>
            <span className="showcase-badge">意外度 · {surpriseText}</span>
            <span className="showcase-badge">架构 · {complexityText}</span>
            <span className="showcase-badge">
              <User size={12} />
              共 {data.characters.length} 位角色 · {playableRoles.length} 位可扮演
            </span>
          </div>
          <h1 id="world-intro-title" className="showcase-title" style={{ fontSize: "clamp(22px, 3.5vw, 32px)", margin: "8px 0" }}>
            {displayTitle}
          </h1>
          <p className="showcase-premise" style={{ maxWidth: 760, fontSize: 14, lineHeight: 1.6 }}>
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
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
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
                background: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
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
                <strong style={{ fontSize: 15, color: "var(--color-text)" }}>发现历史探索存档</strong>
                {data.existingRun.savedAt ? (
                  <small style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                    上次保存于 {formatDate(data.existingRun.savedAt)}
                  </small>
                ) : null}
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                扮演角色：<strong>{data.existingRun.roleName}</strong> · 第 {data.existingRun.turn} 轮 · 地点：{data.existingRun.location}
              </p>
              <small style={{ display: "block", marginTop: 4, color: "var(--color-text-muted)", fontSize: 11 }}>
                点击“继续上次探索”恢复已有进度；若选择下方角色将开启全新历程。
              </small>
            </div>
          </div>
          <Button
            className="primary-action"
            size="sm"
            onClick={() => onResumeRun(data.existingRun!.id)}
            style={{
              background: "#f59e0b",
              color: "#111",
              fontWeight: 600,
              padding: "8px 18px",
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
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-soft)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={16} style={{ color: "#f59e0b" }} />
            <strong style={{ fontSize: 14, color: "var(--color-text)" }}>开场处境与故事焦点</strong>
          </div>
          {data.storyHook && data.storyHook !== data.premise && (
            <blockquote
              style={{
                margin: "0 0 10px 0",
                paddingLeft: 12,
                borderLeft: "3px solid #f59e0b",
                fontStyle: "italic",
                color: "var(--color-text)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              “{data.storyHook}”
            </blockquote>
          )}
          {data.openingScene?.scene && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {data.openingScene.location ? <span style={{ color: "var(--color-text)", fontWeight: 500 }}>【{data.openingScene.location}】</span> : null}
              {data.openingScene.scene}
            </p>
          )}
        </section>
      )}

      {/* 单角色作品专属简化选角引导 */}
      {singleRole && playableRoles[0] && (
        <section
          className="world-intro-single-role-spotlight"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-soft)",
            borderRadius: 14,
            padding: "20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                overflow: "hidden",
                flexShrink: 0,
                background: "var(--color-border)",
              }}
            >
              {playableRoles[0].image ? (
                <img src={playableRoles[0].image} alt={playableRoles[0].name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20 }}>
                  {playableRoles[0].name[0] || "人"}
                </div>
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 16, color: "var(--color-text)" }}>{playableRoles[0].name}</strong>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-bg)", padding: "2px 6px", borderRadius: 4 }}>
                  {playableRoles[0].identity}
                </span>
                <span style={{ fontSize: 11, color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.4)", padding: "1px 6px", borderRadius: 10 }}>
                  独家主角视角
                </span>
              </div>
              {(() => {
                const singleHook = characterHook(playableRoles[0].cardHook) ||
                  playableRoles[0].publicIntroduction?.trim() ||
                  playableRoles[0].publicBackground?.trim() ||
                  '';
                return singleHook ? (
                  <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
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
              background: "#f59e0b",
              color: "#111",
              fontWeight: 600,
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Play size={16} style={{ marginRight: 6 }} />
            <span>{data.existingRun ? `以 ${playableRoles[0].name} 的身份重新开始` : `以 ${playableRoles[0].name} 开始体验`}</span>
          </Button>
        </section>
      )}

      {/* 角色入场矩阵 */}
      <section className="world-intro-roles-section" aria-labelledby="roles-section-title">
        <div className="showcase-section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="showcase-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} style={{ color: "#f59e0b" }} />
            <h2 id="roles-section-title" style={{ fontSize: 16, margin: 0, color: "var(--color-text)" }}>
              {singleRole ? "全剧角色总览" : "选择可扮演角色 · 即刻开局"}
            </h2>
          </div>
          <span className="showcase-role-count" style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            共 {data.characters.length} 位角色
          </span>
        </div>

        {data.characters.length === 0 ? (
          <div className="showcase-empty-roles" style={{ textAlign: "center", padding: "32px 16px", background: "var(--color-surface)", borderRadius: 14 }}>
            <User size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }} />
            <p style={{ margin: 0, color: "var(--color-text)" }}>本世界暂无角色记录</p>
          </div>
        ) : (
          <div className="showcase-roles-grid">
            {data.characters.map((role) => {
              const isPlayable = role.playable !== false;
              const roleName = role.name.trim() || "神秘角色";
              const roleIdentity = role.identity?.trim() || "世界人物";
              
              // 严格脱敏：绝不回退至 persona/personality/goal/secrets 等内部设定
              const roleHook =
                characterHook(role.cardHook) ||
                role.publicIntroduction?.trim() ||
                role.publicBackground?.trim() ||
                '';

              return (
                <article
                  key={role.id}
                  className="showcase-role-card"
                  data-playable={isPlayable}
                  style={{
                    opacity: isPlayable ? 1 : 0.85,
                    border: isPlayable ? undefined : "1px dashed var(--color-border)",
                  }}
                >
                  <div className="showcase-role-header">
                    <div className="showcase-role-avatar">
                      {role.image ? (
                        <img src={role.image} alt={roleName} />
                      ) : (
                        <div className="showcase-avatar-placeholder">{roleName[0] || "人"}</div>
                      )}
                    </div>
                    <div className="showcase-role-meta">
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <strong className="showcase-role-name">{roleName}</strong>
                        {role.isDefault && (
                          <span style={{ fontSize: 10, color: "#f59e0b", background: "rgba(245, 158, 11, 0.12)", padding: "1px 4px", borderRadius: 3 }}>
                            推荐首选
                          </span>
                        )}
                      </div>
                      <span className="showcase-role-identity">{roleIdentity}</span>
                    </div>
                  </div>

                  {/* 公开短句/介绍，仅在有明确公开内容时展示，不兜底私人性格 */}
                  {roleHook ? (
                    <p className="showcase-role-hook" title={roleHook}>
                      {roleHook}
                    </p>
                  ) : null}

                  {/* 动作入口 */}
                  {isPlayable ? (
                    <Button
                      size="sm"
                      className="showcase-play-btn"
                      onClick={() => handleRoleClick(role.id)}
                      title={`以 ${roleName} 的身份进入世界`}
                    >
                      <Play size={12} />
                      <span>{data.existingRun ? `以 ${roleName} 重新开始` : `以 ${roleName} 身份开始`}</span>
                    </Button>
                  ) : (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "6px 0",
                        textAlign: "center",
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        background: "var(--color-bg)",
                        borderRadius: 6,
                        border: "1px solid var(--color-border-soft)",
                      }}
                    >
                      世界人物 · NPC（不可扮演）
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

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
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
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
              background: "var(--color-surface, #1e1e24)",
              border: "1px solid var(--color-border, #333)",
              borderRadius: 14,
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <h3
              id="confirm-restart-title"
              style={{
                margin: "0 0 12px 0",
                fontSize: 17,
                color: "var(--color-text, #fff)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ShieldAlert size={20} style={{ color: "#f59e0b" }} />
              <span>开启新探索确认</span>
            </h3>
            <p style={{ margin: "0 0 14px 0", fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary, #aaa)" }}>
              检测到你在此世界已有进行中的探索记录（<strong>{data.existingRun?.roleName}</strong> · 第 {data.existingRun?.turn} 轮）。
            </p>
            <p style={{ margin: "0 0 20px 0", fontSize: 12, lineHeight: 1.5, color: "var(--color-text-muted, #888)" }}>
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
                style={{ background: "#f59e0b", color: "#111", fontWeight: 600 }}
              >
                确认开启新历程
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 底部合规与提示 */}
      <footer style={{ marginTop: 36, textAlign: "center", fontSize: 12, color: "var(--color-text-muted)" }}>
        <p style={{ margin: 0 }}>设定来自创作者，后续故事由 AI 实时演绎。草稿与互动记录保存在当前浏览器。</p>
      </footer>
    </div>
  );
}
