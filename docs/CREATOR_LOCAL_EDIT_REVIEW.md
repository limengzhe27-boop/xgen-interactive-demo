# 创作工作区“人物局部修改与手改保护”代码复核报告

- **复核人**：小安（独立代码复核）
- **复核对象**：`xgen-interactive-demo` 创作工作区（涵盖 `lib/creator-changes.ts`、`lib/creator-response.ts`、`lib/creator-story-graph.ts`、`lib/creator-guidance.ts`、`app/page.tsx`）
- **复核时间**：2026-09-20
- **复核约束**：只读代码复核与静态推演；未修改 `lib/typesafe-creator-triage.ts`、`lib/creator-skill-routing.ts`、`app/api/ai/route.ts` 及任何业务代码；无 Git 提交、无部署、无调用付费 API。

---

## 一、四项核心要求专项排查结论

### 1. 只修改沙僧时，其他角色的字段、图片和入场信息是否保留？
- **排查结论**：**有条件保留，存在严重的名单缩容删人隐患。**
- **机制与依据**：
  - 现行机制依赖提示词（`lib/creator-guidance.ts` L9, L45）强制约束大模型：“*返回完整角色名单只是防止丢人... 只有形成明确修改时才在 proposal.characters 返回完整名单，未讨论字段原样保留*”。
  - 当模型严格返回包含全部角色的数组时（4 个角色中仅沙僧字段更新），`app/page.tsx` L2342 调用 `identifyProposedRoles` 能通过 `name` 与位置匹配保留其他角色的 `editorId`；采纳时（L2521-2537），由于唐僧、悟空、八戒的 `portraitCacheKey` 未变，其立绘（`roleImages`）与 `storyGraph.entries` 的入场绑定能够完整保留。
  - **致命隐患**：如果模型遵从局部修改直觉，在 `proposal.characters` 中**仅返回沙僧 1 个角色**，`identifyProposedRoles`（`lib/creator-changes.ts` L24）返回的数组长度将直接变成 1。此时在 L2344 与 L2530 中，系统会将其判定为“角色名单发生删减（4 人变 1 人）”，进而**将唐僧、悟空、八戒全量从草稿中抹除**，并清空其立绘与入场关联（详见优先问题 1）。

### 2. 作者手改后采纳旧提案，是否可能覆盖新内容？
- **排查结论**：**必然覆盖！手改保护机制在采纳时彻底失效。**
- **机制与依据**：
  - `lib/creator-changes.ts` L83 本设计了乐观锁校验：`if (index < 0 || !equal(cast.roles[index][target.field] || , expected)) return null;`，若当前草稿不等于旧提案生成时的 `before`，理应返回 `null` 并提示覆盖拦截。
  - **但由于 `app/page.tsx` L2505 的无条件重基注入**：`if (!undo) change = rebaseCreatorAcceptance(creatorSections(), change);`，在应用变更前，`rebaseCreatorAcceptance`（`lib/creator-changes.ts` L101-108）将 `change.before` **强制改写为当前草稿的最新值**。
  - 结果：`cast.roles[index][target.field]` 永远等于重基后的 `expected`，防覆盖校验形同虚设，作者的手动修改必定被旧建议静默冲掉，L2509 的拦截提示语变成了永远不会触发的死代码（详见优先问题 2）。

### 3. 角色改名、删除或名单变化后，行动、任务、入场及图片是否仍对应正确角色？
- **排查结论**：**名单删除时有重映射保护，但改名时存在画布行动人文本断链与立绘刷新丢图缺陷。**
- **机制与依据**：
  - **角色删除**：`app/page.tsx` L2106-2165 (`removeDraftRole`) 相对健全，对 `allowedRoleIds`、`assignedRoleIds`、`roleImages` 均按 `n > index ? n - 1 : id` 进行了前移重排；通过 `remapCreatorStoryRoles` 维护了画布 entry 的映射。
  - **角色改名**：`app/page.tsx` L2094-2097 (`updateDraftRole`) 仅更新了 `draftRoles[index].name` 并调用了 `remapCreatorStoryRoles`。但：
    1. `remapCreatorStoryRoles` 只更新了节点的 `roleId`，**没有将节点 `possibilities[].actor` 的字符串姓名同步替换为新名字**；
    2. 任务标题/说明中的角色名不具备动态联动；
    3. 改名后 `portraitCacheKey` 变动，但页面未迁移既有图片映射，**一旦刷新页面，立绘因 cacheKey 改变直接退化为占位符**（详见优先问题 3、4）。

### 4. 页面声称“已添加/已保存”时，草稿是否确实变化，刷新后是否保留？
- **排查结论**：**已采纳与手动保存确能可靠持久化；但存在“Agent 口头吹嘘已添加而实际落空”的虚假体验。**
- **机制与依据**：
  - 真实的草稿状态通过 `app/page.tsx` L1430-1470 的双重存储（`demoStorageKey` 活动快照 + `studioStorageKey` 文档库）在每次状态变化时防抖写入本地 `localStorage`；页面启动时（L1320-1360）完全还原。因此**只要触发了采纳或手改，草稿确已变化且刷新可保留**。
  - **虚假落空场景**：当模型在回复对话框中口头宣称“*好的，已为你构思并添加节点「流沙河收徒」*”，但底层并未返回有效结构化节点数据时，右侧画布和本地草稿实际上没有任何变动。用户若信以为真直接刷新，会发现所有新增节点全部凭空消失（详见优先问题 5）。

---

## 二、六大优先问题清单

### 问题 1：单角色局部修改在模型仅返回目标角色时引发“整队删人”
- **实际代码依据**：
  1. `lib/creator-changes.ts` L24-35：`identifyProposedRoles(before, proposed)` 返回数组由 `proposed.map` 驱动，长度等于 `proposed.length`。
  2. `app/page.tsx` L2342：`const nextRoles = response.proposal.characters?.length ? identifyProposedRoles(draftRoles, ...) : draftRoles;`。
  3. `lib/creator-changes.ts` L51-54：当 `nextCast.roles` 长度与 `oldCast.roles` 不等时，降级为粗粒度的 `{ key: castAndTasks, label: 角色名单与关联任务调整 }` 变更。
  4. `app/page.tsx` L2530-2537：应用 `castAndTasks` 时直接执行 `setDraftRoles(cast.roles)`。
- **可复现步骤（代码推断）**：
  1. 草稿中已有 4 名角色（唐僧、孙悟空、猪八戒、沙僧）。
  2. 用户对话：“把沙僧的性格改为坚韧隐忍”。
  3. 模型按局部意图仅返回：`proposal.characters = [{ name: "沙僧", persona: "坚韧隐忍", ... }]`（未重复返回前 3 人）。
  4. 系统计算变更，由于角色数量从 4 变 1，生成了“角色名单与关联任务调整”提案。
  5. 用户点击一键采纳。
- **观察结果**：
  工作区中的角色列表瞬间只剩沙僧一人；唐僧、悟空、八戒及其立绘、专属任务、入场节点被全部抹除。
- **风险**：严重数据丢失破坏事故，完全违背创作者预期。
- **最小修复建议**：
  在 `app/page.tsx` L2342 或 `lib/creator-changes.ts` 的 `identifyProposedRoles` 中引入**局部补齐（Merge Patch）机制**：当 `proposed.length < before.length` 且 `proposed` 中的角色均能通过名字或 ID 在 `before` 中找到匹配时，判定为局部更新，将未提及的角色从 `before` 中按原顺序完整合并补齐，而非直接截断名单。

---

### 问题 2：`rebaseCreatorAcceptance` 导致作者手改在采纳旧建议时被静默覆盖
- **实际代码依据**：
  1. `app/page.tsx` L2504-2509：
     ```ts
     function applyCreatorProposal(change: CreatorChange, undo = false) {
       if (!undo) change = rebaseCreatorAcceptance(creatorSections(), change);
       ...
       const next = applyCreatorChange(creatorSections(), change, undo);
       if (!next) { setCreatorChangeNotice(`「${change.label}」已有新的手动修改，未覆盖。请重新讨论或手动调整。`); return false; }
     ```
  2. `lib/creator-changes.ts` L101-108：
     ```ts
     export function rebaseCreatorAcceptance(current: Record<string, unknown>, change: CreatorChange): CreatorChange {
       ...
       const before = target?.kind === role ? cast?.roles.find(role => role.editorId === target.id)?.[target.field] || 
         : target?.kind === task ? cast?.tasks.find(task => task.id === target.id) : current[change.key];
       return { ...change, before };
     }
     ```
  3. `lib/creator-changes.ts` L83：
     `if (index < 0 || !equal(cast.roles[index][target.field] || , expected)) return null;`（此处 `expected` 即为已被重基覆盖的最新值）。
- **可复现步骤（代码推断）**：
  1. Agent 对话提出建议，将沙僧的身份改为“卷帘神将”（生成提案卡，`change.before = "水怪"`，`change.after = "卷帘神将"`）。
  2. 作者在右侧工作区手动将沙僧身份输入修改为“金身罗汉”（当前草稿最新值为“金身罗汉”）。
  3. 作者回到左侧建议卡，点击该条建议的“采纳”。
- **观察结果**：
  由于 `rebaseCreatorAcceptance` 将 `change.before` 动态篡改为了“金身罗汉”，`applyCreatorChange` 误以为当前草稿值与预期一致，成功写入 `change.after`。作者刚刚手动打字保存的“金身罗汉”被无声冲掉，变为“卷帘神将”，且无任何冲突拦截提示。
- **风险**：违背“作者手改永远具有最高仲裁权”的铁律，导致创作者劳动成果被旧模型输出覆盖。
- **最小修复建议**：
  严格区分“无冲突的依赖重基”与“字段值脏写覆盖”：在 `rebaseCreatorAcceptance` 中，**不得直接覆盖已发生手改的字段 `before` 值**。如果 `current[field] !== change.before`，应保留原 `change.before`，从而使 `applyCreatorChange` 正常返回 `null`，准确触发 L2509 的手改保护提示：“*已有新的手动修改，未覆盖*”。

---

### 问题 3：角色改名后节点内的 `possibilities[].actor` 文本脱节致使行动人断链
- **实际代码依据**：
  1. `app/page.tsx` L2095：`if (key === name) setCreatorBrief(current => ({ ...current, storyGraph: remapCreatorStoryRoles(current.storyGraph, draftRoles, draftRoles.map((r, i) => i === index ? { ...r, name: value } : r)) }));`
  2. `lib/creator-story-graph.ts` L75-78 (`mapCreatorStoryRoleIds`) 与 L80-88 (`remapCreatorStoryRoles`)：
     ```ts
     export function mapCreatorStoryRoleIds(graph: CreatorStoryGraph, map: (id: string) => string | undefined): CreatorStoryGraph {
       return { ...graph, entries: ...,
         nodes: graph.nodes.map(n => n.possibilities ? { ...n, possibilities: n.possibilities.map(p => p.roleId ? { ...p, roleId: map(p.roleId) ?? null } : p) } : n) };
     }
     ```
- **可复现步骤（代码推断）**：
  1. 故事画布中存在事件节点，其中一条走向配置为：`actor: "沙僧", action: "潜入河底探查", roleId: "draft-role-3"`。
  2. 作者在人物面板将角色名从“沙僧”改为“沙和尚”。
  3. 查看画布节点的可能性详情。
- **观察结果**：
  虽然 `p.roleId` 依然为 `draft-role-3`，但 `p.actor` 文本仍然死死定格为旧名字“沙僧”。如果后续运行时或导出逻辑读取 `p.actor`，或进行姓名匹配（如 `possibilityRoleId` L66），将导致人名判定失联。
- **风险**：画布展示与底层数据分裂，多视角切换时无法正确识别该行动归属者。
- **最小修复建议**：
  在 `remapCreatorStoryRoles` 的映射更新中，同步更新 `possibilities[].actor`：若该项绑定的 `roleId` 对应改名角色，则自动将 `p.actor` 刷新为新名字。

---

### 问题 4：角色改名引发 `portraitCacheKey` 变更导致刷新后立绘“假丢失”
- **实际代码依据**：
  1. `app/page.tsx` L953-955：
     ```ts
     function portraitCacheKey(role: DraftRole) {
       return makeContentImageKey(portrait, role.name, role.identity, role.personality, role.appearance);
     }
     ```
  2. `app/page.tsx` L2096：手改角色名称时，`roleImages` 维持不变，界面依然显示已生成的图片。
  3. `app/page.tsx` L1498-1505：页面刷新时，从 IndexedDB 恢复立绘完全依赖当前的 `portraitCacheKey(role)`。
- **可复现步骤（代码推断）**：
  1. 为角色“沙僧”生成立绘，系统以 `portrait:沙僧:...` 为 key 存入 IndexedDB，页面显示该立绘。
  2. 作者将名字手动调整为“沙和尚”（未重新点击生图，期望沿用当前图片）。
  3. 此时当前页面依然显示沙僧立绘。
  4. 作者按 F5 刷新页面。
- **观察结果**：
  页面重新加载后，启动 Effect 根据新名字“沙和尚”计算 cacheKey，IndexedDB 找不到匹配记录，`roleImages[draft-role-3]` 变为未生成状态，立绘退化回灰色文字占位符。
- **风险**：创作者误以为系统吞掉了已生成的图片资产，体验极具挫败感。
- **最小修复建议**：
  在 `updateDraftRole` 中，若修改了影响 `portraitCacheKey` 的字段，将已有的图片 URL 重新映射保存到新的 cacheKey，或在草稿级 `creatorAssets.portraits` 中持久绑定图片引用。

---

### 问题 5：Agent 对话口头宣称“已添加节点”而底层空转时的虚假反馈
- **实际代码依据**：
  1. `lib/creator-response.ts` L78-80：
     ```ts
     return creatorDiscussion(本轮没有返回可写入的事件节点，画布未改动。请重试追加事件。, input,
       没有返回节点数据，不将对话中的“已添加”当作完成。);
     ```
  2. `app/page.tsx` L2366：当模型仅在 `reply` 吹嘘而无 `proposal` 时，系统仅在底部通知栏渲染弱提示 `creatorChangeNotice`，但主聊天区原样渲染了 Agent 充满误导性的口头回复。
- **可复现步骤（代码推断）**：
  1. 用户指令：“把下一个事件添加进画布”。
  2. 模型回复自然语言：`"没问题！我已经在画布中为你添加了新节点「智取红孩儿」..."`，但返回的 JSON 中 `proposal.brief.storyGraph` 为空。
  3. 用户未注意底部灰色小字通知，直接信以为真并关闭或刷新页面。
- **观察结果**：
  画布上没有任何新节点，所谓“已添加”纯属模型幻觉；草稿未发生实质变化。
- **风险**：破坏产品诚信度，用户无法直观辨别设定到底写入了工作区还是仅存在于闲聊对话中。
- **最小修复建议**：
  在客户端展示 Agent 回复时增加语义守卫：若 Agent 回复包含“已添加/已建立/已写入”等承诺性字眼，但 `proposal` 实际为空或未采纳，在气泡下方追加明确的显式系统警告标签：“*⚠️ 本轮未收到结构化节点数据，画布草稿尚未实际写入*”。

---

### 问题 6：撤销多项建议时角色立绘被一次性误杀清空
- **实际代码依据**：
  1. `app/page.tsx` L2521-2528：
     ```ts
     Array.from({ length: Math.max(cast.roles.length, draftRoles.length) }).forEach((_, index) => {
       const role = cast.roles[index];
       if (!role || !draftRoles[index] || role.editorId !== draftRoles[index].editorId || portraitCacheKey(role) !== portraitCacheKey(draftRoles[index])) {
         const id = `draft-role-${index}`;
         roleImageRequestRef.current[id] = (roleImageRequestRef.current[id] ?? 0) + 1;
         setRoleImages((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));
         setRoleImageStates((current) => ({ ...current, [id]: idle }));
       }
     });
     ```
  2. 当执行撤销整批变更（`undo = true`）或撤销 `castAndTasks` 时，目标角色的属性回滚到旧版本。
- **可复现步骤（代码推断）**：
  1. 用户采纳了一批建议，其中沙僧的身份由“水怪”变为“罗汉”，用户为此重新生成了新立绘。
  2. 用户后续点击“撤销”，将草稿回退至采纳前。
- **观察结果**：
  由于撤销导致 `portraitCacheKey` 改变，系统在 L2526 中直接将 `roleImages` 对应的图片删掉，并将状态置为 `idle`。即便该角色此前的旧立绘可能仍存在于缓存中，页面也直接变成了未生成状态，且无法从界面撤销该图片的删除。
- **风险**：破坏已生成的视觉资产，导致用户不得不重复消耗算力重新生成。
- **最小修复建议**：
  在角色属性变动导致 `portraitCacheKey` 失效时，不要粗暴直接 `delete` 内存中的图片，而是尝试以回退后的 key 检索旧缓存；若存在旧缓存，自动平滑恢复旧立绘。
