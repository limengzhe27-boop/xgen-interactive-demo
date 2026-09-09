# 项目内容创作路由

遵守上级项目说明。创作或修订内容时使用本仓库对应 Skill，先完整阅读其 SKILL.md 和要求的引用：

- 新世界、爽文/狗血改写、角色目标：`.agents/skills/xgen-world-drama/SKILL.md`。
- 视频前情、分镜、生成提示：`.agents/skills/xgen-prologue-director/SKILL.md`。
- 视频生成前预检、续镜、成片验收：`.agents/skills/xgen-video-review/SKILL.md`。

纯功能修复不强行加载编剧规范。网站不会自动执行 SKILL.md；运行时接线和边界见 `docs/CREATIVE_SKILLS.md`。
任何付费序章提交（包括旧 editorial 脚本）必须先准备本次计划并通过 `scripts/prepare-prologue.mjs`，再完成事实与分镜自审；预检通过不是用户授权，不代表成片已合格。不要为验证 Skill 自动生成付费视频。
正式序章提示词须同时有故事层与逐镜表演层，使用 `--direction <direction.json>`；`--story`仅检查故事草案，不能将宽泛动作梗概称为完整导演提示。
