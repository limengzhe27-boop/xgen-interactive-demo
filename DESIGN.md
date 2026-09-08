# DESIGN.md · Worldstudio 浅色画廊工作台

### 序章同屏选角 · 覆盖先前下方长面板布局

- 电脑端播放结束后左侧保留影片、右侧展开紧凑选角；手机缩小影片，上下同屏显示角色和开始按钮。视频不卸载、不重播，不靠自动向下滚动来替代布局修复。
- 首层仅身份、角色选项、短目标和开始按钮；长背景与完整目标按需展开。极矮屏/长列表允许局部滚动，不能裁掉开始操作。沿用 L1、绿色令牌与44px触控，不增加动效依赖。

### 能力适配 · 沿用 L1

- 用单列可选项替代能力下拉框，标题与一句解释同时可见，原生 radio 支持键盘；绿色选中态、44px 触控、无独立弹窗。
- 新增由世界 Agent 判断；固定清单与旧清单挑选模式不变。只有清单模式展开清单输入，新模式直接解释“根据世界规则允许、削弱或拒绝；确认后生效”。

### 画廊混排与序章连续入场 · 沿用 L1

- 首页以稳定ID排序后分散同世界内容，新增世界与角色自动纳入；输入、筛选和重渲染不随机跳位。
- 视频自然结束后原地展开下方选角面板，末帧与字幕保留。可提前展开；无视频的世界直接展示面板。复用现有按钮与身份控件，单列、不锁滚动、不堆叠弹窗。

### 新人物入场 · 延续已确认 L1

- 开放自带形象的世界，先显示“用我的形象加入／扮演世界角色”两种方式。前者无需选择原角色，保留原人物与目标，创建独立探索者。
- 不另增页面主题。日常聊天与记忆仅用一个折叠入口，数量明确为带入的日常聊天，不代表创作讨论条数。

### 2026-09-08 序章入口 · 沿用已确认 L1

- 本轮修订：进入视频序章即静音自动播放，被浏览器阻止时保留播放按钮；隐藏该页账号工具栏，标题与操作缩紧，影片高度随视口收敛。字幕和选角按钮保持在正常文档流，常见桌面与手机首屏可见；完整文字按需展开，不用固定高度裁切内容。
- 瑜伽新版先验证带人物参考的训练—越界关键镜头，再续接丈夫消息打断、回到隔间的动作；不用裸露或性行为表现婚外关系，不提前替玩家回复消息。

- 新进入世界先看公共序章，再选角色，从该角色所在地点接入行动。继续存档不重播，独立人物聊天不经过此页。
- 单列960px以内：返回、名称、16:9播放画面、短字幕、一个“选择角色继续”主按钮。可跳过；手机自然文档流，底部安全区，操作至少44px；轻入场复用L1。
- 首批瑜伽世界4×5秒；只有真实成片才标为视频，未准备视频的世界显示静态公共简介，不用幻灯片冒充视频。
- 加载只读共享资产，不调用生成接口，不自动外放。播放失败仍可选角。公共序章不展示人物秘密、账单数额或未来结局；选角后才进入本人已知信息。

### 形象上传与记忆详情 · 延续 L1

- 虚拟角色编辑顶部直接提供上传、更换、移除图片；本机压缩，点击保存身份才持久保留。文字外观修改不清空上传图；AI 生图仍是独立可选操作。
- 聊天记忆保持正文与编辑直接可见，来源、确认时间、最近五次修订在原生 details 中按需展开；不补造历史来源，不把旧版本发送给模型。
- 沿用已有浅色令牌、44px 按钮和单列阅读宽度，不新增图片请求、页面主题或动效依赖。

### 我的作品管理 · 沿用已确认 L1 二级页

- 无本机原稿时提供“恢复并编辑”，确认后从作者公开版本恢复虚构内容与已有图片，私人创作讨论不恢复。更新窗口读取最新版本令牌，冲突时保留草稿并要求重新核对。

- “我的世界”顶部以单列作品清单展示，本机草稿／公开版本两种视图；保留原有体验记录，不增加首页导航项。
- 编辑只修改草稿，再次确认发布才更新公开世界。公开版本标明已发布／已下架及更新时间；下架二次确认，明确无法撤回已保存的副本和公开图片。
- 使用既有按钮、字体、绿色令牌，宽度900px以内，长标题换行，手机操作折行；保留失败重试、忙碌禁用和减少动效。
- 来源标识只用于连接本机原稿，不从同名标题猜测归属；没有原稿时不伪装支持完整恢复编辑。

### 2026-09-07 真实资料分离与免费语音基础版

- 沿用 web-design 的 L1 二级页规范与浅色令牌。「我的资料 / 虚拟形象」作为并列入口，默认资料；资料直接编辑，虚拟角色手动表单前置，AI 设计折叠为可选工具。
- 自我介绍、偏好、交流方式保存为独立 userProfile，不写入 playerPersona。现有记忆可纠正与删除；历史来源不补造。资料用于个人助手，未授权不带入创作和角色对话。
- 语音输入使用系统听写指引，不请求麦克风、不调用远程识别。文字由用户确认发送。
- 个人助手回复和独立角色对话提供按需朗读；只选择 localService 的中文声音，无自动播放或远程回退。角色按稳定键分配设备音色，允许单段调整语速与音色。只有一种声音则明确限制，不声称有情感配音。
- 切换播放、离页、隐藏页面时停止朗读；语音设置折叠，控件至少44px。没有可用中文声音时显示安装/系统朗读提示，不阻断文字聊天。

### 2026-09-07 直接角色对话与滚动修复

- 用户明确取消独立角色会面的身份选择：点击人物直接打开对话。内部中性参与者不复制已有角色的秘密、关系、目标或真人资料；探索世界仍保留选角。
- 所有弹窗以动态视口限制高度并内部滚动，抽屉子元素不压缩，底部留安全距离。短屏、手机、长内容需要验证最后一个操作可达。
- 虚拟角色编辑默认展开，明确仅用于世界探索；真人资料和 Agent 记忆独立于虚拟角色，个人中心完整改版另行交付。

> 让图片成为入口，让对话成为创作工具；界面退后，故事与人物走到前面。

状态：2026-09-07 用户已确认浅色画廊与 L2，进入实施。本规范覆盖历史黑金 L1 视觉；原有身份、任务、记忆同意、手动创作与数据隔离约束继续保留。旧规范归档至 docs/DESIGN_HISTORY.md。

### 2026-09-07 二级页面减法 · 第一批

用户确认减法方案后，选角与剧情页采用 L1（180ms 轻入场、160ms 按压、180ms 抽屉），首页继续 L2。沿用本规范色彩和字体，不增加依赖。个人 Agent、创作页的同类改造仍待后续实施。

- 选角：1120px 内容容器，桌面当前角色大图与介绍两栏，手机上下排列；全部角色名字可切换，一个主按钮确认入场。背景与秘密主动展开，自带形象仅在世界允许时显示，隐私确认保留。
- 剧情：760px 单列阅读，完整正文与小头像对白；场景图桌面上限320px，手机上限28dvh。当前可推进目标＋自由行动为主，不再常驻任务／人物／背包侧栏。
- 故事资料复用现有 Sheet：目标（含支线）、人物、物品与线索、经历、设置一次展示一个类别；系统仅对拥有它的角色显示，准备能力仅填入输入框，不自动发送。
- 手机聚焦流程不显示底部全站导航，始终有返回世界／重新选角路径。输入在正文后正常文档流内，不悬浮遮挡文字；长正文需要滚动至输入处。不是固定单屏强塞全部内容。
- 交互必须保留 Enter发送／Shift+Enter换行／中文输入保护、失败保留输入、Esc关闭与焦点返回。抽屉内的能力回填后焦点移到输入框。
- 新样式集中在 `app/experience.css`，所有颜色复用变量、支持减少动态效果。禁止为这次布局改动自动生成图片、升级生图模型或改变任何存档格式。

## 1. Visual Theme & Atmosphere

**Style**：Editorial Creative Gallery，编辑式创作画廊。

**Keywords**：图片优先、轻盈、中性底色、紧密错落、安静的工具栏、精确反馈。

**Tone**：像浏览艺术作品一样发现世界，像和朋友讨论一样开始创作。避免后台管理系统的满屏容器、金色描边和说明书式文字。

**Interaction Tier**：采用 L2 流畅交互。以短距离、短时长、有明确触发的动效为主，不做 3D、滚动劫持或宣传页大场景。

**Dependencies**：沿用 Next.js、React、已有 Radix/Lucide；CSS + IntersectionObserver + requestAnimationFrame，不新增动画运行库。优先复用已有 reveal 逻辑，不并行叠加旧动画。

### 参考与实测依据

参考：[即梦 AI 首页](https://jimeng.jianying.com/ai-tool/home?need_login=true) 与用户提供的浅色瀑布流截图。已通过 Tabbit 的真实浏览器查看首页、滚动后的画廊及卡片悬停；未登录、未生成图片、未上传项目资料。使用当前浏览器读取 DOM/CSS，避免独立爬虫切换浏览器环境。

实际官网的四个主要区域：窄侧栏；标题与大输入面板；创作快捷入口；发现筛选与瀑布流。下滚后出现紧凑的底部输入面板。推广横幅不属于我们要移植的产品功能。

| 项目 | 实际观察 | 本项目采用方式 |
| --- | --- | --- |
| 配色 | 本次访问官网默认深色；用户截图是浅色观感 | 浅色为主提案，深色为备选；不声称官网默认浅色 |
| 导航 | 窄侧栏、简洁图标与小标签 | 80px 桌面侧栏，保留新建、发现、我的世界、角色、个人 Agent |
| 图片 | 1440px 视口约五列，列宽约 252px，部分图片 9:16，接近无圆角 | 3–5 列、6–10px 缝隙；世界横图与角色竖图混排 |
| 主输入面板 | 约 1000×174px，内部输入区约 900×96px | 最大 920px、约 150px 高；仅保留真实可用的创作功能 |
| 悬浮输入面板 | 滚动后约 622×72px | 680px 上限，继续同一份输入；移动端适配安全区 |
| 图片悬停 | scale 约 1.02；200ms；cubic-bezier(.4,.95,.6,1.1) | 保留相近幅度与节奏；键盘焦点提供同等信息 |
| 面板变化 | 输入区 height/padding 约 350ms；cubic-bezier(.15,.75,.3,1) | 以输入面板状态切换实现，不频繁重排整页 |

滚动 reveal、标题短入场与微视差是本项目拟增加的 L2 设计，不是对官网已有实现的断言。

保留原创封面和人物素材、原有世界与角色双入口；不搬用即梦用户作品、品牌标识、专有字体或未实现的参考图上传功能。

## 2. Color Palette & Roles

以下为提案 Token，并非官网色值的逐项复制。组件不得硬编码颜色；批准后将现有 `--color-*` 变量映射到本规范，以保证创作、弹窗、探索页一致。

```css
:root {
  --bg: #f7f7f5;
  --surface: #ffffff;
  --surface-alt: #efefed;
  --surface-hover: #e9eae7;
  --border: #dedfda;
  --border-hover: #a8b7b0;
  --text: #202521;
  --text-secondary: #59615b;
  --text-tertiary: #68716a;
  --accent: #176650;
  --accent-hover: #10533f;
  --on-accent: #ffffff;
  --on-image: #ffffff;
  --image-shade-rgb: 8, 15, 13;
  --bg-rgb: 247, 247, 245;
  --surface-rgb: 255, 255, 255;
  --accent-rgb: 23, 102, 80;
  --ink-rgb: 20, 28, 23;
  --success: #287141;
  --error: #b53837;
  --warning: #805b16;
  --ambient: #e4ebe6;
  --focus: #177558;
  --radius-card: 8px;
  --radius-panel: 24px;
  --radius-control: 12px;
}

/* 仅在选择深色方向时启用，不默认增加主题切换功能。 */
[data-gallery-theme="dark"] {
  --bg: #121313;
  --surface: #1d1f1e;
  --surface-alt: #272a28;
  --surface-hover: #343934;
  --border: #383d38;
  --border-hover: #6a8277;
  --text: #f0f2ef;
  --text-secondary: #bbc4bd;
  --text-tertiary: #9aa69d;
  --accent: #b8e0ce;
  --accent-hover: #d1edde;
  --on-accent: #15291e;
  --bg-rgb: 18, 19, 19;
  --surface-rgb: 29, 31, 30;
  --accent-rgb: 184, 224, 206;
  --ink-rgb: 0, 0, 0;
  --success: #90c9a1;
  --error: #ffb2ac;
  --warning: #e5c381;
  --ambient: #23352c;
  --focus: #b8e0ce;
}
```

规则：中性色承担绝大部分面积；绿只用于焦点与主要动作。图片上的文字使用独立遮罩，不受页面主题切换影响。错误与警告同时带文字，不仅依赖颜色。上线前以最终实际字号检查正文、标签、按钮与焦点对比度。

## 3. Typography Rules

沿用项目已有 Noto 字体，避免额外字体种类或下载。字体来源记录如下，应用只加载一次：

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;600&display=swap');
:root {
  --font-ui: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-reading: "Noto Serif SC", "Songti SC", serif;
}
body { font-family: var(--font-ui); letter-spacing: .02em; line-height: 1.7; }
```

| 层级 | 字体 | 桌面 / 手机 | 字重 | 行高 |
| --- | --- | --- | --- | --- |
| 首页 H1 | UI | 36 / 28px | 600 | 1.7 |
| 区块 H2 | UI | 24 / 22px | 600 | 1.7 |
| 图片卡标题 | UI | 18 / 16px | 600 | 1.7 |
| 表单 / 聊天正文 | UI | 16 / 16px | 400 | 1.8 |
| 剧情正文 | Reading | 18 / 17px | 400 | 1.9 |
| 标签 / 辅助说明 | UI | 13 / 13px | 500 | 1.7 |

文字装饰判断：H1/H2 均不采用渐变文字或投影。艺术感来自真实图片、布局密度和字体节奏；标题使用短距离遮罩入场，不用发光文字。禁用系统 Times 作为中文展示标题、全站衬线化、装饰英文替代真实中文导航。

## 4. Component Stylings

### 按钮、链接、标签与导航

```css
.gallery-button, .gallery-filter, .gallery-nav-button {
  min-height: 44px; min-width: 44px; border: 0;
  border-radius: var(--radius-control); font: inherit;
  color: var(--text); background: var(--surface-alt);
  padding: 10px 16px; cursor: pointer;
  transition: background-color .18s, color .18s, transform .18s;
}
.gallery-button[data-primary="true"] {
  background: var(--accent); color: var(--on-accent);
}
.gallery-button:hover, .gallery-filter:hover, .gallery-nav-button:hover {
  background: var(--surface-hover);
}
.gallery-button[data-primary="true"]:hover { background: var(--accent-hover); }
.gallery-button:active, .gallery-filter:active, .gallery-nav-button:active {
  transform: scale(.98);
}
.gallery-button:disabled, .gallery-filter:disabled, .gallery-nav-button:disabled {
  opacity: .48; cursor: not-allowed; transform: none;
}
.gallery-filter { border-radius: 999px; background: transparent; }
.gallery-filter[aria-pressed="true"], .gallery-nav-button[aria-current="page"] {
  color: var(--accent); background: rgba(var(--accent-rgb), .09);
}
.gallery-nav { background: var(--bg); border-inline-end: 1px solid var(--border); }
.gallery-nav-button { display: grid; place-content: center; background: transparent; }
.gallery-nav[data-scrolled="true"] { box-shadow: 1px 0 12px rgba(var(--ink-rgb), .025); }
.gallery-link { color: var(--accent); text-underline-offset: 5px; }
.gallery-link:hover { text-decoration: underline; }
.gallery-link:active { opacity: .72; }
.gallery-link[aria-disabled="true"] { opacity: .48; pointer-events: none; }
:where(button, a, input, textarea, summary):focus-visible {
  outline: 2px solid var(--focus); outline-offset: 4px;
}
.gallery-badge { padding: 3px 9px; border-radius: 999px; background: var(--surface-alt); }
```

### 世界 / 人物作品卡

卡片是图片入口，不是盛放全文的表格。固定显示名称、类型与必要身份提示；简介、进入世界、和 TA 聊聊按需显现。触摸端不依赖 hover。完整简介与角色详情放入可访问 Dialog。无虚构点赞、评分、在线人数。

```css
.gallery-card { position: relative; border-radius: var(--radius-card); overflow: hidden; }
.gallery-card img { display: block; width: 100%; height: auto; transition: transform .2s cubic-bezier(.4,.95,.6,1.1); }
.gallery-card-cover { position: absolute; inset: 0; overflow: hidden; }
.gallery-card-copy {
  position: absolute; inset: auto 0 0; padding: 44px 16px 14px;
  color: var(--on-image);
  background: linear-gradient(transparent, rgba(var(--image-shade-rgb), .82));
}
.gallery-card-actions {
  opacity: 0; transform: translateY(6px);
  transition: opacity .18s, transform .2s;
}
.gallery-card:hover img, .gallery-card:focus-within img { transform: scale(1.02); }
.gallery-card:hover .gallery-card-actions, .gallery-card:focus-within .gallery-card-actions {
  opacity: 1; transform: none;
}
.gallery-card:focus-within { outline: 2px solid var(--focus); outline-offset: 3px; }
.gallery-card [aria-disabled="true"] { opacity: .5; cursor: not-allowed; }
@media (hover: none) {
  .gallery-card-actions { opacity: 1; transform: none; }
}
```

封面使用同一世界自身封面或自身角色，不借用其他世界图片伪装。标题最多两行、角色说明最多一行；没有图片时展示有名称、动作和真实状态的文本卡，不用空色块冒充封面，不自动生图填空。

### 创作输入面板、聊天、弹层

```css
.gallery-composer {
  width: min(920px, 100%); padding: 20px;
  border: 1px solid var(--border); border-radius: var(--radius-panel);
  background: var(--surface); box-shadow: var(--shadow-panel);
  transition: box-shadow .22s, border-color .22s;
}
.gallery-composer:focus-within {
  border-color: var(--border-hover); box-shadow: var(--shadow-focus);
}
.gallery-composer textarea {
  width: 100%; min-height: 72px; border: 0; resize: none;
  color: var(--text); background: transparent; font: inherit; line-height: 1.8;
}
.gallery-composer textarea::placeholder { color: var(--text-tertiary); }
.gallery-composer textarea:disabled { opacity: .5; cursor: not-allowed; }
.gallery-composer[data-floating="true"] {
  position: fixed; bottom: 24px; left: calc(50% + 40px);
  transform: translateX(-50%); width: min(680px, calc(100vw - 128px)); z-index: 35;
}
.gallery-dialog {
  background: var(--surface); color: var(--text); border: 1px solid var(--border);
  border-radius: var(--radius-panel); box-shadow: var(--shadow-dialog);
  width: min(680px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto;
}
.gallery-message { max-width: 720px; overflow-wrap: anywhere; }
.gallery-message[data-speaker="user"] {
  margin-inline-start: auto; background: var(--surface-alt);
  border-radius: 18px 18px 5px 18px; padding: 12px 18px;
}
```

输入始终铺满面板可用宽度，发送按钮不夹在半截输入后。Enter 发送、Shift+Enter 换行，保留 IME 保护、请求中状态、取消与错误反馈。主输入与悬浮输入共用草稿；不在输入法组合、聚焦或手机键盘展开时强行迁移焦点。

个人 Agent 保持朋友与助理定位；消息正文不夹大块“用这条消息开始创作”按钮，改为消息旁的紧凑操作入口。推荐结果使用真正可进入的世界卡；候选记忆仍需同意，不把虚构身份当成真人资料。

2026-09-07 统一助手补充：个人 Agent 与创作是同一助手的不同工作模式。创作工具建议放在输入区上方的紧凑操作卡，点击后使用现有可访问弹层确认创作方向、可选记忆与选中的最近讨论；不在页面切换时自动复制整段私聊。创作四步共用“你的 Agent · 创作中”，辅助上下文可展开查看、关闭或移除。提供继续原稿/返回日常聊天，保留草稿。以上控制复用现有按钮、焦点、间距与浅色 Token，不引入新动效或图片请求。

## 5. Layout Principles

私人云存档沿用账号栏入口与浅色 Dialog：明确“本机→云端”“云端→本机”两个方向，不用含糊的同步按钮。上传与恢复/删除分别确认；版本、错误、冲突保留在弹层中。手机弹层保持 16px 边距和独立滚动，操作不被底部导航遮挡。此阶段不自动同步、不自动迁移游客记录，也不把云存档等同公开发布。

桌面主区不再限于一张窄大卡片；侧栏 80px，主内容横向留白 28px，画廊随可用宽度扩展，最大 1800px。输入区域居中，不超过 920px；正文阅读宽度不超过 760px。

首页自上而下：简洁标题 → 创作输入 → 紧凑的继续互动（仅有真实记录时显示）→ 世界 / 角色筛选 → 混合画廊。取消把内容推到第二屏的大型主推横幅和空白最近记录卡。普通 1440×900 视口中应能看见第一排作品的主体，不把首屏用说明占满。

画廊默认可同时发现世界横封面和角色竖肖像，用户可切换仅世界或仅角色。分组语义与键盘焦点保持阅读顺序；采用保持 DOM 行序的 CSS Grid 行跨距测量，而不是造成视觉横读与键盘竖读冲突的 CSS columns。图片解码和容器改变时更新跨行数，测量经 ResizeObserver 与 rAF 合并；不每次滚动重排。

```css
.gallery-main { margin-left: 80px; padding: 28px 28px 128px; }
.gallery-feed {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 4px; gap: 8px; align-items: start;
}
.gallery-feed > * { min-width: 0; grid-row-end: span var(--gallery-span, 30); }
.gallery-copy { width: min(760px, 100%); margin-inline: auto; }
.agent-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 28px; }
.creator-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; }
```

世界封面优先保持原始横图比例；人物保留竖图。不同类型混合带来错落，不任意拉伸人脸。现有资产不足以覆盖的大图不放大成模糊巨幅。

个人 Agent：对话为主，记忆/虚构身份置于可折叠辅助区；未有推荐时不保留空推荐栏。创建世界：编辑与讨论双栏保留，进度条压缩为小型步骤导航，角色、目标、任务独立折叠；模型建议仍分项采纳和撤销。探索页保留独立的场景图与文字阅读区，不恢复人像压住长篇正文。

间距尺度：4 / 8 / 12 / 16 / 24 / 32 / 48px。图与图紧密，工具与内容保持清楚的呼吸空间；不靠卡片 min-height 和空白拉齐。

## 6. Depth & Elevation

```css
:root {
  --shadow-panel: 0 8px 30px rgba(var(--ink-rgb), .045);
  --shadow-focus: 0 8px 32px rgba(var(--accent-rgb), .085);
  --shadow-floating: 0 12px 48px rgba(var(--ink-rgb), .14);
  --shadow-dialog: 0 24px 80px rgba(var(--ink-rgb), .18);
}
.gallery-composer[data-floating="true"] { box-shadow: var(--shadow-floating); }
```

| 层级 | 用途 | 表现 |
| --- | --- | --- |
| 平面 | 图片流、常规文字 | 无阴影、无外层描边 |
| 抬高一级 | 输入框、局部工具 | 微弱阴影与中性表面 |
| 悬浮 | 滚动创作栏 | 紧凑清晰阴影，不模糊整屏 |
| 模态 | 身份选择、剧情详情、发布确认 | 独立遮罩与焦点锁定；不嵌到侧栏下方 |

## 7. Animation & Interaction

**Motion Philosophy**：动作只解释进入、选择、展开和继续，不抢夺读图与阅读注意力。

**Tier**：L2，已确认。六类覆盖如下；不复制未经阅读的第三方源码，不虚构使用 reactbits。

| 类别 | 落点 | 触发 / 驱动 | 效果与时长 |
| --- | --- | --- | --- |
| H1 | 首页短标题 | 首次进入 / CSS | 两段遮罩上移 12px，480ms，间隔 70ms |
| H2 | 发现 / 继续互动标题 | 首次可见 / Observer | 上移 8px、淡入，360ms |
| 正文 / 标签 | eyebrow 和辅助短句 | 首次进入 / CSS | 淡入，300ms；不逐字打印长文 |
| 元素 | 图片、发送按钮 | hover、focus、active | 图片 scale 1.02 / 200ms；按钮按下 .98 |
| 构件 | 画廊、主输入→悬浮输入 | Observer 与受控状态 | 卡片错峰入场 360ms，延迟上限 240ms；输入切换 350ms |
| 氛围层 | 标题后的一层低对比光感 | CSS + 页面可见状态 | 静态径向渐变缓慢移动一次，7s；滚动微视差上限 8px |

至少四个可辨识时刻：标题展开；第一组图片错峰出现；卡片放大与操作显现；滚动后悬浮输入接续草稿。不会每次切筛选重复整页淡出，也不让内容在等待动画时不可操作。

```css
@keyframes gallery-title-in {
  from { opacity: 0; transform: translateY(12px); clip-path: inset(0 0 100%); }
  to { opacity: 1; transform: none; clip-path: inset(0); }
}
@keyframes gallery-label-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes gallery-reveal-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
@keyframes gallery-atmosphere {
  from { transform: translate(-1%, 0); opacity: .35; }
  to { transform: translate(1%, 1%); opacity: .7; }
}
.gallery-title-part { display: inline-block; animation: gallery-title-in .48s both; }
.gallery-title-part + .gallery-title-part { animation-delay: .07s; }
.gallery-eyebrow { animation: gallery-label-in .3s both; }
.gallery-reveal[data-visible="true"] {
  animation: gallery-reveal-in .36s both;
  animation-delay: min(var(--reveal-delay, 0ms), 240ms);
}
.gallery-ambient { pointer-events: none; transform: translateY(var(--ambient-y, 0px)); }
.gallery-ambient::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 20%, var(--ambient), transparent 65%);
  animation: gallery-atmosphere 7s ease-in-out both;
}
.gallery-ambient[data-visible="false"]::before { animation-play-state: paused; }
```

下面为可运行的挂载/清理基线；React 中在 Effect 挂载并返回清理函数，不以全局重复监听替代生命周期。

```js
function mountGalleryMotion(root = document) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ambient = root.querySelector('.gallery-ambient');
  const nav = root.querySelector('.gallery-nav');
  const targets = root.querySelectorAll('.gallery-reveal');
  let raf = 0;
  let observer;
  const update = () => {
    raf = 0;
    nav?.setAttribute('data-scrolled', String(scrollY > 24));
    ambient?.style.setProperty('--ambient-y', `${reduce.matches ? 0 : Math.min(8, scrollY * .025)}px`);
  };
  const scroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-visible', 'true');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .1 });
    targets.forEach(target => observer.observe(target));
  } else {
    targets.forEach(target => target.setAttribute('data-visible', 'true'));
  }
  addEventListener('scroll', scroll, { passive: true });
  reduce.addEventListener('change', update);
  update();
  return () => {
    observer?.disconnect();
    removeEventListener('scroll', scroll);
    reduce.removeEventListener('change', update);
    cancelAnimationFrame(raf);
  };
}
```

必须补充氛围层离开可视区与 document.hidden 的暂停控制；无持续 rAF 循环。禁止全页 opacity 动画、对运动元素叠 blur、全屏 backdrop blur、滚动时测量所有卡片、不限制数量的 will-change。

```css
@media (prefers-reduced-motion: reduce) {
  .gallery-main *, .gallery-main *::before, .gallery-nav * {
    animation: none !important; transition: none !important;
    scroll-behavior: auto !important;
  }
  .gallery-title-part, .gallery-reveal, .gallery-eyebrow { opacity: 1; transform: none; clip-path: none; }
  .gallery-ambient { transform: none; }
  .gallery-card:hover img, .gallery-card:focus-within img { transform: none; }
}
```

减少动效不隐藏信息，不取消操作显现或键盘焦点。手机关闭微视差与氛围移动，保留即时状态反馈。

## 8. Do's and Don'ts

### Do

- 从用户真实世界、角色、记录构建画廊，世界与角色两种入口始终可辨识。
- 标题短、封面大；完整剧情按需阅读，操作靠近当前内容。
- 复用原创公共图片与共享存储地址；浏览、切换、滚动不触发生图。
- 保留个人 Agent 对话、记忆确认、虚构身份和账号资料的区分。
- 保留每个角色的目标、任务、能力边界与身份确认，创作四步都有 Agent 讨论入口。
- 桌面与手机都以实际浏览器验收，查看截图而非仅检查源代码。
- 先测试、再提交、再部署 Vercel，最后验证正式地址及关键接口。

### Don't

- ❌ 不再用黑金描边卡片包裹每一块内容，不把按钮和标签排成满屏药丸。
- ❌ 不把整段剧情塞进首页卡片，不让一篇长简介撑高同排卡片。
- ❌ 不用假评分、假热度、假点赞和虚构在线人数充当视觉装饰。
- ❌ 不复制即梦用户作品、品牌 Logo 或没有实现的生图/参考图工具。
- ❌ 不为本次视觉改版自动重新生成图片，不默认切昂贵模型。
- ❌ 不牺牲键盘和触摸用户：操作不能只在鼠标 hover 时可见可用。
- ❌ 不在滚动过程中清除输入、切断中文输入法组合或丢失草稿。
- ❌ 不把角色对话假装成主线探索，不让 NPC 的选择替代玩家选择。
- ❌ 不因换主题覆盖角色目标、任务、世界规则、账号、本地存档或访问权限。
- ❌ 不把尚未完成的跨设备云同步和公开发布画成已启用；实际状态必须可见。
- ❌ 不让动效遮住内容、制造大幅视差眩晕、增加生图或文本模型费用。
- ❌ 不通过多个文件末尾反复叠加互相冲突的样式覆盖。旧规则应有明确退役范围。

## 9. Responsive Behavior

| 断点 | 结构 |
| --- | --- |
| ≥1600px | 五列图流，主区最大 1800px；80px 左导航 |
| 1200–1599px | 四列图流；个人 Agent / 创作双栏 |
| 900–1199px | 三列图流；必要时辅助栏折叠，不挤压聊天正文 |
| 601–899px | 两列图流；创作编辑/讨论切换；底部导航 |
| ≤600px | 两列简洁图片流；长详情、编辑、聊天均单列 |

手机两列画廊只显示图片、短标题和 44px 入口，复杂简介放详情层；若 200% 字号下空间不足则切为单列，不能裁切正文。所有操作目标至少 44×44px，不用放大整个卡片空白实现。

```css
@media (min-width: 1600px) { .gallery-feed { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@media (max-width: 1199px) {
  .gallery-feed { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .agent-workspace, .creator-workspace { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 899px) {
  .gallery-main { margin-left: 0; padding: 24px 16px 172px; }
  .gallery-feed { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .gallery-nav { position: fixed; inset: auto 0 0; display: flex; justify-content: space-around; z-index: 40; padding-bottom: env(safe-area-inset-bottom); }
  .gallery-composer[data-floating="true"] { left: 50%; bottom: calc(80px + env(safe-area-inset-bottom)); width: calc(100vw - 24px); }
}
@media (max-width: 600px) {
  .gallery-main { padding-inline: 12px; }
  .gallery-composer { padding: 14px; border-radius: 20px; }
  .gallery-card-copy { padding-inline: 10px; }
  .gallery-card-actions { opacity: 1; transform: none; }
  .gallery-ambient, .gallery-ambient::before { transform: none; animation: none; }
}
```

### 实施顺序与验收

1. 主题与 L2 方向确认；将批准规范迁入应用，保留历史产品行为约束。
2. 先改首页、导航、世界/角色图片流、详情层与悬浮创作输入；检查滚动、筛选、进入角色和草稿保持。
3. 再统一个人 Agent 与创作工作台：减少常驻说明、弱化容器、整理表单与消息操作，不改模型权限或存储行为。
4. 桌面 1440、手机 390、键盘、减少动效、长中文标题、空数据、加载失败、弹窗、输入法与 Enter 行为验收。确认没有新增自动生图请求。
5. 跑现有回归与构建，提交本轮代码，部署并检查 Vercel 正式地址；未验证不声称完成。
6. 视觉闭环之后回到未完成的跨设备云同步和公开发布，不在本次换皮中混入未经验证的账号/存储迁移。

### 系统流体验面板补充（沿用 L2 已确认规范）

- 仅有系统设定的世界显示；位于体验页自由行动框上方，使用现有浅色面板、绿色强调与文字色令牌，不新增视觉主题。
- 原生可折叠标题展示当前身份与解锁数量；条目区分已解锁/待解锁，显示任务条件但不提前透露奖励细节。
- “准备行动”只填入输入框，不自动发送或生图；按钮至少 44px，支持键盘焦点与减少动效。
- 角色面板和任务进度共同保存，不引入独立的“系统 Agent”或收费轮询。移动端单列、长文本自然换行。
- 新题材沿用的旧资产明确标注为参考图，不宣称是新角色的正式立绘。专属美术另行准备，本轮不自动调用生图。

### 2026-09-07 二级页面减法 · 个人与创作（覆盖上文双栏规则）

沿用浅色中性底、深绿强调、既有字体与 44px 操作目标；根据用户继续实施的要求执行二级页面减法提案，二级页使用 L1，不改变首页 L2。

- 个人页只有连续对话和输入；空态最多两个起点。推荐卡片附在产生推荐的那条回复下，最多两张，保留编号；普通聊天不挪动旧推荐。历史裁切后的推荐在“关于我”中查找。
- “关于我”按需打开记忆、已有个人形象编辑和隐私说明；候选记忆在聊天旁明确询问，未经确认不保存。
- 创作是同一个助手的工作模式。个人聊天进入创作仍需确认方向及要带入的私人上下文；默认不带记忆。返回日常聊天时保留草稿。
- 创作主屏显示讨论、一个可选追问、待确认的变更摘要和输入。角色/任务/规则/预览统一在“查看设定”抽屉中按需编辑，不常驻四步表单。
- 每个角色可展开修改身份与目标；单项任务归属、困难、前置条件保持可编辑。建议仍逐项审阅、采纳、撤销，不能覆盖之后的手动修改。
- 移除重复的意外滑块和预览大占位图。预览强调各角色目标，主要动作“保存并试玩”；发布入口受真实服务开关控制。批量生图另行展开并提示费用，不自动触发。
- 桌面主阅读宽760px，设定抽屉最大760px；手机全宽抽屉、单列正文和输入，隐藏这几页底部全站导航，保留返回。Esc、焦点恢复、减少动效保持可用。

本次不等于完成个人形象的对话式创建、公开作品管理或新剧本专属美术；这些继续排入后续任务。

### 2026-09-07 二级页面减法 · 身份与角色会面

继续沿用 web-design 的 L1 二级页面规范，不增加新的视觉主题。

- 个人 Agent → 关于我 → 我的虚构身份：先描述想法、讨论草案，再采用、手改、保存。采用不是保存；身份图片另行主动生成，不随讨论触发。
- 手动字段默认折叠，采用建议后展开检查。手改使旧建议失效；发给模型的只有本次虚构身份和讨论，不带私人记忆或图片地址。
- 角色会面先看对象、选择自己的身份，再开始；自带身份和会面说明折叠。手机首屏突出一个开始按钮。
- 会面正文使用单列阅读，人物资料、场景图片和手动生图移入按需打开的资料抽屉。对话灵感默认收起，不占据阅读空间。
- 手机会面页隐藏全站底部导航，保留返回；抽屉支持 Esc 关闭与焦点恢复，输入遵循 Enter 发送、Shift+Enter 换行。

本轮完成独立入口中的身份讨论，不代表个人日常聊天已经能自动识别并调用身份设计工具。公开作品管理、发布验收和新题材专属美术仍待完成。

### 我的形象入口前移

- 个人 Agent 顶部常驻一个“我的形象”入口；未创建显示“创建我的形象”，已有身份显示名字和现有头像。取消“关于我”内的深层身份入口。
- 点开即见身份讨论，不再先展开“我的虚构身份”。已有身份的手动编辑默认展开。世界选角和角色会面复用同一编辑抽屉，关闭后保留原选角位置。
- 单个紧凑入口、44px 以上触摸目标，沿用 L1、现有色彩与焦点行为；不新增自动生图，不改变账号存储或世界准入规则。

### 账号级个人中心与专属美术

#### 草稿管理修订（2026-09-08）

- 复用已确认的浅色、森林绿、L1 交互规范，不改变整体视觉方向。草稿保持简洁列表，编辑使用浅绿紧凑按钮，删除为有可访问名称的 44px 图标按钮。
- 删除改为居中圆角确认框，明确仅删除本机草稿与创作讨论；默认焦点在“保留草稿”，危险色只用于最终确认。手机可滚动、无横向溢出，支持 Esc、焦点回归与减少动态效果。

- 用户最新要求覆盖“形象从属于个人 Agent”：首页账号栏与侧栏提供“我的”，集中展示虚构形象、人设性格、Agent 已确认记忆与待确认了解。两类资料同页分区，不混写、不公开、不自动产生人格标签。
- 个人 Agent 保持聊天工具，只提供个人中心快捷入口。个人中心沿用 L1、760px 阅读容器、单列分节，不增加仪表盘卡阵。
- 为 12 个仍借图的内置世界准备专属封面与每角色肖像，复用已完成的三个现代世界美术；采用静态 WebP 资源随站点发布，所有访客共享读取，不因访问调用生图。
