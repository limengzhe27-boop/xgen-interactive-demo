'use client';

import { X, LoaderCircle, Sparkles, Play, AlertCircle, Share2, Film, Compass, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CreatorBrief } from '@/lib/ai-contracts';

export interface CreatorDialogRole {
  editorId?: string;
  name: string;
  identity?: string;
  personality?: string;
  appearance?: string;
  goal?: string;
  cardHook?: string;
  publicIntroduction?: string;
}

export function DeleteRoleDialog({
  open,
  roleIndex,
  roles,
  creatorBrief,
  onClose,
  onConfirm,
}: {
  open: boolean;
  roleIndex: number | null;
  roles: CreatorDialogRole[];
  creatorBrief: CreatorBrief;
  onClose: () => void;
  onConfirm: (index: number) => void;
}) {
  if (!open || roleIndex === null || !roles[roleIndex]) return null;

  const roleToDelete = roles[roleIndex];
  const roleId = `draft-role-${roleIndex}`;
  const assignedTasks = (creatorBrief.tasks ?? []).filter(t => t.assignedRoleIds?.includes(roleId));
  const entryNode = creatorBrief.storyGraph?.entries?.find(e => e.roleId === roleId);
  const nodeTitle = entryNode ? creatorBrief.storyGraph?.nodes?.find(n => n.id === entryNode.nodeId)?.title : null;

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div className="studio-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-role-title">
        <h3 id="delete-role-title">确认删除角色【{roleToDelete.name || `角色 ${roleIndex + 1}`}】？</h3>
        <p className="modal-desc">将移除该角色的人物设定、性格外貌与专属目标。其他角色的立绘和数据将完整保留。</p>
        <ul className="modal-impact-list">
          <li><strong>故事入场</strong>：{nodeTitle ? `将解除在节点「${nodeTitle}」的登场绑定` : '该角色尚未绑定初次入场节点'}</li>
          <li><strong>专属任务</strong>：{assignedTasks.length > 0 ? `涉及 ${assignedTasks.length} 项关联任务（将同步解除角色分配）` : '无专属任务关联'}</li>
          <li><strong>立绘保全</strong>：其他角色的立绘和形象数据<strong>完整保留</strong>。</li>
        </ul>
        <div className="modal-actions">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(roleIndex)}
          >
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PortraitBatchDialog({
  open,
  roles,
  roleImages,
  selectedIndices,
  batchProgress,
  onSelectChange,
  onClose,
  onStart,
}: {
  open: boolean;
  roles: CreatorDialogRole[];
  roleImages: Record<string, string>;
  selectedIndices: number[];
  batchProgress: { current: number; total: number } | null;
  onSelectChange: (indices: number[]) => void;
  onClose: () => void;
  onStart: () => void;
}) {
  if (!open) return null;

  return (
    <div className="studio-modal-backdrop" onClick={() => !batchProgress && onClose()}>
      <div className="studio-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="batch-portrait-title">
        <h3 id="batch-portrait-title">批量制作角色形象</h3>
        <p className="modal-desc">选择要制作形象的角色。已有形象的角色默认保留，可按需勾选重新制作。</p>
        <div className="batch-roles-list">
          {roles.map((role, idx) => {
            const hasImg = Boolean(roleImages[`draft-role-${idx}`]);
            const isChecked = selectedIndices.includes(idx);
            return (
              <label key={role.editorId || idx} className="batch-role-item">
                <div className="batch-role-info">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!!batchProgress}
                    onChange={e => {
                      if (e.target.checked) onSelectChange([...selectedIndices, idx]);
                      else onSelectChange(selectedIndices.filter(i => i !== idx));
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>{role.name || `角色 ${idx + 1}`}</span>
                  {role.identity && <small style={{ color: 'var(--color-text-secondary)' }}>· {role.identity}</small>}
                </div>
                <span className={`batch-role-badge ${hasImg ? 'has-image' : 'no-image'}`}>
                  {hasImg ? '已有形象' : '未生成'}
                </span>
              </label>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span>已选 {selectedIndices.length} / {roles.length} 位角色</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
              onClick={() => {
                const unpainted = roles.map((_, i) => i).filter(i => !roleImages[`draft-role-${i}`]);
                onSelectChange(unpainted.length > 0 ? unpainted : roles.map((_, i) => i));
              }}
            >
              仅选未生成
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12 }}
              onClick={() => onSelectChange(selectedIndices.length === roles.length ? [] : roles.map((_, i) => i))}
            >
              {selectedIndices.length === roles.length ? '取消全选' : '全选'}
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="outline" disabled={!!batchProgress} onClick={onClose}>取消</Button>
          <Button
            className="primary-action"
            disabled={selectedIndices.length === 0 || !!batchProgress}
            onClick={onStart}
          >
            {batchProgress ? (
              <><LoaderCircle className="is-spinning" size={14} />制作中 ({batchProgress.current}/{batchProgress.total})</>
            ) : (
              `开始制作 (${selectedIndices.length} 位)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ImagePreviewModal({
  image,
  onClose,
}: {
  image: string | null;
  onClose: () => void;
}) {
  if (!image) return null;

  return (
    <div className="image-lightbox-backdrop" onClick={onClose}>
      <div className="image-lightbox-content" onClick={e => e.stopPropagation()}>
        <button type="button" className="image-lightbox-close" onClick={onClose} title="关闭大图">
          <X size={18} />
        </button>
        <img src={image} alt="角色高清立绘" />
      </div>
    </div>
  );
}

const SURPRISE_LABELS = ['顺理成章', '意料之外', '剧情反转', '完全失控'];
const COMPLEXITY_LABELS = ['轻量微型', '标准探索', '错综复杂', '多方权谋'];

export function CreatorShowcaseModal({
  open,
  onClose,
  worldTitle,
  worldSeed,
  genre,
  surprise,
  complexityLevel,
  cover,
  roles,
  roleImages,
  taskIssues,
  canPublish,
  onPlayRole,
  onShare,
  isBusy,
}: {
  open: boolean;
  onClose: () => void;
  worldTitle: string;
  worldSeed: string;
  genre?: string;
  surprise: number;
  complexityLevel: number;
  cover?: string;
  roles: CreatorDialogRole[];
  roleImages: Record<string, string>;
  taskIssues: string[];
  canPublish: boolean;
  onPlayRole: (roleIndex: number) => void;
  onShare: () => void;
  isBusy: boolean;
}) {
  if (!open) return null;

  const displayTitle = worldTitle.trim() || '未命名世界';
  const displayPremise = worldSeed.trim() || '尚在构思的世界前提，与 Agent 对话或在设定面板中填写以丰富剧情冲突。';
  const displayGenre = genre?.trim() || '互动故事';
  const surpriseText = SURPRISE_LABELS[Math.max(0, Math.min(surprise - 1, 3))];
  const complexityText = COMPLEXITY_LABELS[Math.max(0, Math.min(complexityLevel - 1, 3))];

  return (
    <div className="studio-modal-backdrop showcase-backdrop" onClick={onClose}>
      <div className="studio-modal showcase-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="showcase-title">
        {/* 关闭按钮 */}
        <button type="button" className="showcase-close-btn" onClick={onClose} aria-label="关闭预览">
          <X size={20} />
        </button>

        {/* 顶部 16:9 电影质感海报 Hero */}
        <div className="showcase-hero">
          {cover ? (
            <img src={cover} alt={`${displayTitle} 封面海报`} className="showcase-hero-img" />
          ) : (
            <div className="showcase-hero-placeholder">
              <Compass size={48} className="showcase-compass-icon" />
            </div>
          )}
          <div className="showcase-hero-overlay" />
          <div className="showcase-hero-info">
            <div className="showcase-badges">
              <span className="showcase-badge genre-badge"><Film size={12} />{displayGenre}</span>
              <span className="showcase-badge">意外度 · {surpriseText}</span>
              <span className="showcase-badge">架构 · {complexityText}</span>
            </div>
            <h2 id="showcase-title" className="showcase-title">{displayTitle}</h2>
            <p className="showcase-premise">{displayPremise}</p>
          </div>
        </div>

        {/* 核心角色入场矩阵 */}
        <div className="showcase-body">
          <div className="showcase-section-header">
            <div className="showcase-section-title">
              <Sparkles size={16} className="text-amber" />
              <span>选择代入身份 · 即刻开局</span>
            </div>
            <span className="showcase-role-count">共 {roles.length} 位角色</span>
          </div>

          {roles.length === 0 ? (
            <div className="showcase-empty-roles">
              <User size={32} />
              <p>尚未创建角色</p>
              <small>在「人物与关系」中添加角色后，将在此展示沉浸入场卡片。</small>
            </div>
          ) : (
            <div className="showcase-roles-grid">
              {roles.map((role, index) => {
                const roleId = `draft-role-${index}`;
                const portrait = roleImages[roleId];
                const roleName = role.name.trim() || `角色 ${index + 1}`;
                const roleIdentity = role.identity?.trim() || '神秘人';
                const roleHook = role.cardHook?.trim() || role.goal?.trim() || role.personality?.trim() || '暂无专属动机说明';

                return (
                  <div key={role.editorId || index} className="showcase-role-card">
                    <div className="showcase-role-header">
                      <div className="showcase-role-avatar">
                        {portrait ? (
                          <img src={portrait} alt={roleName} />
                        ) : (
                          <div className="showcase-avatar-placeholder">
                            {roleName[0] || '人'}
                          </div>
                        )}
                      </div>
                      <div className="showcase-role-meta">
                        <strong className="showcase-role-name">{roleName}</strong>
                        <span className="showcase-role-identity">{roleIdentity}</span>
                      </div>
                    </div>
                    <p className="showcase-role-hook">{roleHook}</p>
                    <Button
                      size="sm"
                      className="showcase-play-btn"
                      disabled={isBusy || taskIssues.length > 0 || !worldSeed.trim()}
                      onClick={() => {
                        onClose();
                        onPlayRole(index);
                      }}
                      title={taskIssues.length > 0 ? '请先解决任务冲突' : `以 ${roleName} 身份开始探索`}
                    >
                      <Play size={12} fill="currentColor" />
                      以「{roleName}」开局体验
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 任务问题提示 */}
          {taskIssues.length > 0 && (
            <div className="showcase-issues-alert" role="alert">
              <AlertCircle size={15} />
              <div>
                <strong>体验前请注意任务关系：</strong>
                {taskIssues.map((issue, idx) => <p key={idx}>{issue}</p>)}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作条 */}
        <div className="showcase-footer">
          <small className="showcase-footer-hint">
            体验将基于当前设定实时动态推演，记录独立保存，不影响草稿。
          </small>
          <div className="showcase-footer-actions">
            <Button variant="ghost" size="sm" onClick={onClose}>
              返回继续打磨
            </Button>
            {canPublish && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onShare();
                }}
                disabled={taskIssues.length > 0 || !worldSeed.trim() || isBusy}
              >
                <Share2 size={13} />
                发布设置
              </Button>
            )}
            <Button
              className="primary-action"
              size="sm"
              disabled={isBusy || taskIssues.length > 0 || !worldSeed.trim()}
              onClick={() => {
                onClose();
                onPlayRole(0);
              }}
            >
              <Play size={13} fill="currentColor" />
              立即开始试玩
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

