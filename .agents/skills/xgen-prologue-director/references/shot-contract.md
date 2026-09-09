# 镜头交接契约

计划结构与机器检查的权威实现：项目 `lib/prologue-plan.ts`。新制作采用 `version: 2`，示例为 `docs/prologue-story.example.json` 与 `docs/prologue-first-person.example.json`。旧 `docs/prologue-plan.example.json` 只作历史兼容测试，不可据此启动新制作。

- `facts`：必须传达的公开事实；`visual` 必须有画面证据，`overlay` 可用明确后期文字。
- `characters`：列镜内人物及画外说话者，固定身份与参考形象描述。可引用已授权素材路径，不将私密档案当参考。
- `shots`：时间轴连续，从0开始，最后不超过30秒。每镜列演员ID、场景、开始状态、动作、结束状态；非首镜 `continuity` 解释如何接上上一镜。
- 每条 `evidence` 写 factId、channel、观众能看到的具体证据。不能用“氛围暧昧”证明出轨，也不能仅凭两人站在一起证明夫妻。
- `handoff`：最后镜头ID、现场未解决的问题和至少两项具体可行方向。允许新探索者加入，但不能在视频里提前决定其身份/能力。

例：运动垫+私教纠正动作证明“在瑜伽课”；女方主动环抱亲吻证明“非普通教学”；后期“丈夫：幼儿园快关门了”证明婚姻与时间压力。三条证据作用不同，不能互相替代。

- `story`：一句主因果、公共/固定第一人称视角、按镜排列的 `beats`（前因与局面变化），以及人物/关系/事件/压力/未决动作五项 `recall` 答案和事实引用。答案不能凭空当作观众已理解的证据。
- `audio`：默认且必须有声；`mode` 选 `native` 或 `post`，逐句写 `start/end/speakerId/kind/text/delivery`。旁白ID为 `narrator`，其余说话者要在人物表声明。收到文字消息的画外朗读不是接电话，不让画面演成通话。
- 当前用户明确要求所有后续视频有声音。新序章预检拒绝 `silent`；不能用背景音乐或一个空音轨冒充叙事声音。后期配音也是有声交付，但必须如实标注，不声称模型原生生成。

v2只解决故事与声音安排。正式提示词还需 `references/shot-performance.md` 的表演层，机器实现 `lib/prologue-direction.ts`；示例 `docs/prologue-first-person.direction.json` 与同名故事示例按镜头ID配对。节拍与动作声使用本镜相对秒，编译附全片时间；对话仍使用全片时间。

运行 `node scripts/prepare-prologue.mjs <plan.json> --direction <direction.json>`检查并编译完整导演稿，只本地运行，不联网、不扣费。默认/`--story`仍可检查v2故事草案；查看旧计划才用 `--legacy`。输出将文生视觉、图生运动、导演时间表、后期字幕、声轨分开，`submissionAuthorized: false`，不是付费提交器。实际参考图和模型能力默认未验证。

预检只能查时间、引用、因果声明、五项答案覆盖、台词重叠及明显超速，不能判断真人表演、画面真实性或语义是否真的成立。每秒五个汉字单位只是阻止明显塞词，不保证实际语速。剪辑后必须实际看、听成片，记录镜头时间点；未看只能报告“分镜自审”。用户暂停视频测试时不得先行试拍。
