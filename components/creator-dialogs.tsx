'use client';

import { X, LoaderCircle } from 'lucide-react';
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
