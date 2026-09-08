import type { CreatorAgentResponse } from './ai-contracts';
import { isCreatorAgentResponse } from './ai-validation.ts';
import { creatorTaskIssues } from './creator-task-graph.ts';

// Repair uncommitted task structure only. Never silently rewrite the user's cast or premise.
export async function repairCreatorProposal(
  original: CreatorAgentResponse,
  fallbackRoleCount: number,
  repair: (issues: string[]) => Promise<unknown>,
): Promise<CreatorAgentResponse> {
  const roleCount = original.proposal.characters?.length || fallbackRoleCount;
  const issues = creatorTaskIssues(original.proposal.brief.tasks, roleCount);
  if (!issues.length) return original;
  const candidate = await repair(issues);
  if (!isCreatorAgentResponse(candidate)) throw new Error('invalid_creator_task_graph');
  const tasks = candidate.proposal.brief.tasks;
  // A repair must not "succeed" by deleting tasks or changing their owners/content.
  const previous = original.proposal.brief.tasks;
  if (tasks.length !== previous.length || tasks.some((task, index) => {
    const { id: _id, prerequisiteTaskIds: _pre, assignedRoleIds: _roles, ...content } = task;
    const { id: _oldId, prerequisiteTaskIds: _oldPre, assignedRoleIds: _oldRoles, ...oldContent } = previous[index];
    const validOldOwners = !_oldRoles?.length || _oldRoles.every(id => Array.from({ length: roleCount }, (_, i) => `draft-role-${i}`).includes(id));
    return (validOldOwners && JSON.stringify(_roles ?? []) !== JSON.stringify(_oldRoles ?? []))
      || Object.keys(oldContent).some(key => content[key as keyof typeof content] !== oldContent[key as keyof typeof oldContent]);
  }) || creatorTaskIssues(tasks, roleCount).length) throw new Error('invalid_creator_task_graph');
  return { ...original, proposal: { ...original.proposal, brief: { ...original.proposal.brief, tasks } },
    reply: `${original.reply}\n\n已修正任务引用关系；角色与故事设定保持不变，待你采纳后写入草稿。` };
}
