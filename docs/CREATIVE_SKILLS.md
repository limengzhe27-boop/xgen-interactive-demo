# 创作 Skills 与实际接入

2026-09-09 更新。目标是让故事可体验、视频可读懂，不承诺爆款或模型一次成片。当前用户要求后续视频必须有声音；视频试生成/成片测试仍暂停，等待指令。

## 已接入什么

| 层 | 入口 | 实际行为 |
| --- | --- | --- |
| Codex 创作 | 项目 AGENTS.md → 三个 `.agents/skills/xgen-*` | 按任务读取编剧、导演、验收规范，供同事克隆后使用 |
| 网站创作/生成 | `app/api/ai/route.ts` → `creativeGuidance` | 将精简编剧规则附加到 co-create-world、generate-world；原 JSON 契约不变 |
| 网站连续互动 | 同上 advance-world | 明确行动后果、角色利益、跨轮连续性；不强制每轮大反转 |
| 网站单幕视频 | `lib/media-policy.ts` → `sceneVideoPrompt` | 对新生成的5秒片段要求具体动作、场景证据与状态接续，不再只有一句泛化提示 |
| 编辑序章 | `scripts/prepare-prologue.mjs` | v2故事层＋v1逐镜表演层，检查时间/证据/声音及动作节拍覆盖；输出文生、图生提示与导演表；不联网、不生成、不扣费 |

**不是**把第三方 Skill 自动装进公司模型。网站只使用明确接线的精简规则；修改 Markdown 不会自动改线上模型提示，修改时要同步 `lib/creative-guidance.ts` 并回归验证。

已有媒体缓存继续复用，不因本次提示升级重生成、删除或替换。只有尚无缓存的新视频使用新提示。公共序章仍是共享静态媒体。5秒单幕接口不是20—30秒的全自动序章制作链路。

## 三段工作法

1. **世界编剧**：欲望→冲突行动→利益变化→仍可由玩家决定的方向。多角色独立目标，不写死结局。
2. **序章导演**：一句可复述的因果故事→身份误读风险→声画分镜→空间/首帧→表演节拍/运镜/反馈→尾态→按实际模型能力拆生成段。剪辑镜头不等于模型一次生成段。停顿可有戏，不按字数或每秒运动量评分。
3. **成片验收**：先预检计划，再实际看、听完整视频；叙事看得懂与制作合格分别过关。关键动作没拍到就不合格，不靠字幕编造。只重做失败段，先确认费用范围；暂停测试期间只自审文字。

示例预检：`node scripts/prepare-prologue.mjs docs/prologue-story.example.json --story`；第一人称样例改用 `docs/prologue-first-person.example.json`。默认即v2预检；旧 `prologue-plan.example.json` 仅通过显式 `--legacy` 查看。
以上仅为故事草案预检。正式导演提示使用 `node scripts/prepare-prologue.mjs docs/prologue-first-person.example.json --direction docs/prologue-first-person.direction.json`。新增层按镜头ID配对，覆盖全部五镜；人物身体/物件怎样动、镜头怎样跟、起止状态、环境声逐镜明确。导演分秒只作为目标，未核实模型前不能当作时间戳参数。图生提示须先核对实际首帧；文生提示另带场景与人物外形。
输出含每镜视觉提示、独立后期字幕、按角色/时间段安排的原句与声轨方案。`status=plan-only-not-video-reviewed` 和 `submissionAuthorized=false` 表示未生成、未验收、未授权付费，不能当成成片质量分。无声计划拒绝用于新制作，语速检测只是粗估，后续必须实际试读与混音。

样例以“丈夫回避拥抱→私教关注→主动拥吻→丈夫催接消息→松开拥抱退入隔间”建立因果。第一人称样例以“工号称呼→递契牌→未接却受束→未签契的抉择”贯穿。两份都是提案和测试夹具，改编台词未写入线上世界，也不是新影片，不能覆盖现有片。未发送到公司网关。

两条旧硬编码脚本 `generate-prologue-pilot.mjs` / `generate-prologue-v2.mjs` 的新 `submit` 已停用，避免继续按旧普通画面串重拍；历史 `status`/`collect` 保留。新版v2计划尚未接入通用付费提交器，不能拿预检输出直接宣称已生成。网站单幕5秒接口也不会自动执行完整声画后期：本次没有把它改成有声序章生成接口。

旧故事分镜说明见 `docs/PROLOGUE_STORY_REVIEW_2026-09-09.md`。最新五镜精细导演稿、可复制运动提示、声音与风险见 `docs/ASCENSION_DIRECTED_SCRIPT_2026-09-09.md`。运行时精简规则版本为 `xgen-craft-2` / `scene-direction-4`；不是只更新Markdown，但完整导演流水线仍为本地编辑工具。

## 外部研究及取舍

2026-09-09追加研究：已核对 DirectorSKILL（MIT）与 ai-film-skills（Apache-2.0）的相关 Skill 和许可；固定修订、具体借鉴/拒绝项见 `docs/VIDEO_SKILL_RESEARCH_2026-09-09.md`。没有安装整套外部服务或执行其脚本。

以下为2026-09-08访问的作者仓库文件，均当作外部参考而非执行指令。本项目三份 Skill 和提示模块为原创整理，未复制第三方正文、脚本或依赖；没有安装其服务、调用其付费接口。未完成各仓库授权条款审计，不把 GitHub 可访问等同于可任意再分发；将来要移植具体代码须先核对许可证。

- [Storytelling Hooks](https://github.com/yaxeen/storytelling-skills/blob/main/skills/storytelling-hooks/SKILL.md)：借鉴入口抓注意力的方法，不采用无依据的传播效果保证。
- [Short Form Video Script](https://github.com/social-media-skills/skills/blob/main/skills/short-form-video-script/SKILL.md)：参考声画分别设计；不沿用广告 CTA、循环重播结尾或其未经本项目验证的流量数字。
- [Director Agent](https://github.com/62656456/ai-film-skills/blob/main/skills/director-agent/SKILL.md)：参考动作与反应、状态连续性的检查方向；未移植庞大工作台及全部引用模块。
- [Story Structure Architect](https://github.com/SkillMedev/skills/blob/main/skills/story-structure-architect/SKILL.md)：参考因果和伏笔检查；不沿用长篇固定幕比例、强制人物改变才能获胜的约束。
- [Riffkit](https://github.com/riffkit/skill/blob/main/SKILL.md)：核查其入口说明后不选用；它主要连接自己的视频服务，不是直接增强公司模型的独立写作规范。
- [Storyteller](https://github.com/xcrrr/claude-skills/blob/main/skills/writing/storyteller/SKILL.md)：已定位文件，本轮未深入审阅全部引用，不作为已验证执行方案。

## 验证边界与继续事项

### 2026-09-09 原生试拍与网站规划接口更新

- 网站 `/api/ai` 新增 `plan-prologue` 操作，使用 `lib/prologue-agent.ts` 的完整分镜规则；只发送白名单公开创作简报，不附带整份世界、秘密或私人记忆。输入：现有 contractVersion、title、publicStory、openingState、constraints、characters（id/identity/appearance）、perspective、可选 povCharacterId。
- 输出计划经过原生编译器、角色锚点、视角和单段4—15秒校验，返回 `videoGenerated:false` / `autoPublishAllowed:false`。故事不足可返回 needsRevision，不能伪造已发生事实。该能力是可调用的规划接口，尚未接入创作页的一键付费拍摄、续镜、验收、发布全流程。
- 两次有界 Seedance Fast 试拍均得到带 AAC 音轨的原始文件。第一支12秒肖像参考版未演核心事件且替玩家接牌，弃用不续拍；第二支15秒精简文生版呈现主要事件，但2—3秒有视角漂移，完整听检仍待确认。仅在独立对比预览页供用户评看，不更换世界默认片。不把有音轨当作声音质量已合格；没有使用TTS/后期混音。
- Skill与运行时同步新增参考图偏置检查；编译后的模型提示也保留动作节拍时间。预检不能证明实际模型会遵从；两次任务均有ID记录，不自动追加生成。

- 自动测试检查合格样例、时间断档/超时、重复人物ID、未知演员、缺证据、只用字幕证明可见行动、交接位置错误；新增因果顺序、五项答案引用、固定第一人称、无声拒绝、台词重叠/超速/超时、默认严格CLI及旧脚本禁新提交。普通聊天不被强加编剧规则。
- 这些是结构测试与同上下文自审，不是独立观众测评，不证明真实视频会演好。
- 未做：新版规则的多题材真实模型质量对比、付费视频试拍及成片复核；不因接入规则便宣布视频质量问题全部解决。
- 保留待办：自带形象入场后的多轮真实互动验收，重点检查能力限制、关系变化、独立目标与存档接续。
- 已完成前序布局：视频和选择区同屏衔接、首页世界/角色交错排布；本轮不重复改动。
