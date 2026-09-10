---
name: xgen-title-hooks
description: 为XGEN发现卡写一图一句的吸引标题，或批量修订世界与角色入口文案。用于命名、发现页文案、首屏选题；不重写完整剧本，不使用固定人称或短剧公式。
---

# 一图一句，让人想靠近

用户最新的一图一句要求取代旧三层卡片。先完整阅读共享规则 [discovery-copy-guidance.ts](../../../lib/discovery-copy-guidance.ts)（从本Skill目录需向上三级到仓库根，读取 lib/discovery-copy-guidance.ts）；它也是创作 Agent 的运行时原文，禁止维护两份不同口径。研究依据见 [research-and-examples.md](references/research-and-examples.md)，写标题时读取。

先看现有封面和公开设定，选择值得点进去的一点，而不是强行解释谁在哪里做什么。不要规定三候选、问句、反转、固定人称或某类占比。名字本身可以有吸引力，但不独立放一栏；图片足够有吸引力时，一句自然邀请也可以。用户要求的是兴趣，不是每卡一场危机。

## 落地边界

- 内置文案集中在 lib/discovery-headlines.ts，用稳定 world ID / role ID 定位；不改存档、人物姓名、秘密或剧情。
- 角色作者文案仍是 cardHook；世界仍用 title。已发布作者内容、私人草稿不得批量覆盖。作者明确清空时允许纯图，不恢复旧文案或名字。
- Codex 每次修改本规则时同步检查共享运行时文件；Agent 的 co-create-world / generate-world 通过 creativeGuidance 注入，普通聊天不注入标题规则。
- 检查首屏之外的全部目标、批次句式与兴趣差异、角色名及新旧标题搜索、点击目的地、两行标题限制；类别筛选和卡上徽标不同，不擅自删除筛选。
- 验证：node --test scripts/test-home-editorial.mjs scripts/test-character-card.mjs scripts/test-discovery-headlines.mjs。通过只证明数据和接线，不证明用户点击欲或模型生成质量。

## 自审

单看图与一句话，是否产生想认识/想看看/想试试/想追问中的任一种兴趣？删去多余解释后是否更清楚？是否与旁边几张撞句式？点击后是否仍是承诺的体验？不以每张必须出现情景、姓名或冲突为验收条件。
