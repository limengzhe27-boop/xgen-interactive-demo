# DESIGN.md

## 2026-09-06 账号与公开发布

- 沿用已确认的黑金 L1 规范、原有 Button / Dialog / Input，不引入新视觉方向或生图。
- 账号入口独立于个人 Agent，不把登录、真实身份和虚构角色混在一起；游客仍可试玩。
- 创作保留“保存并试玩”，公开发布必须单独确认发布范围。登录不会自动上传草稿、个人记忆或聊天记录。
- 发布弹窗列出将公开的世界标题、剧情框架、角色设定与图片，并明确不公开个人 Agent 对话、创作讨论与游玩记录。完整剧本可能包含虚构角色秘密与结局，不能描述为技术上不可查看。
- 桌面弹窗宽度不超过 640px，手机两侧 16px；正文可滚动，按钮换行且不小于 44px。沿用主题色、焦点、关闭和 reduced-motion 行为。

## 2026-09-05 交互修复与 Agent 定位校正

- 沿用已确认的黑金 L1 规范，不另换视觉方向。恢复 Next.js 的 Tailwind 编译，让 Dialog 的定位、遮罩、焦点辅助和表单宽度真正进入生产 CSS；不得只修改源码里的类名而不检查构建产物。
- 个人 Agent 是认识用户的 AI 助理与聊天伙伴，剧情匹配只是按需能力。首屏提供聊近况、整理事情、讨论创作与找故事；没有推荐时不展示空的推荐区域。
- 个人记忆采用“提出候选 → 用户确认 → 本机保存”，支持删除；最近对话保留在当前浏览器。不得把角色扮演推断成用户真实性格，不自动把私人记忆带入世界创作。
- 新建世界第一屏开放创作对话，零角色也能讨论；结构化人物与世界框架先预览、再主动采纳。手动填写角色与故事继续可用。
- 手机与桌面实测弹窗居中、身份切换、Escape 关闭、输入宽度与对话入口。复用现有图片，不增加生图费用。

## 2026-09-05 第二版执行补充（用户已确认，覆盖下方同名旧规则）

1. **Visual Theme & Atmosphere**：黑金剧集片库，内容消费而非宣传落地页。保留 Frank 的侧栏、创作输入、最近互动、世界／角色双入口；主推封面形成视觉重心，轻量 L1，不使用 3D 或持续发光。
2. **Color Palette & Roles**：继续使用已有完整 `--color-*` 与 RGB 变量。黑色画布、炭黑表面、暖金主操作、雾蓝个人 Agent。组件内零新增硬编码颜色；图片上的渐变遮罩仅保障文字可读。
3. **Typography Rules**：沿用已加载的 Noto Sans SC 与 Noto Serif SC、原有字体 URL 和 fallback。主推标题使用 `--font-story`，桌面 36–44px／手机 28px；页面标题 28px，卡片 20px，正文 16px／1.8，标签 14px／1.7，字距 0.02em。各级文字无渐变和投影。
4. **Component Stylings**：主推封面＋独立剧情简介 Dialog＋紧凑世界卡；卡片简介最多三行、标题最多两行，完整内容在 Dialog 阅读。现有 Button、Textarea、Tabs、Dialog 保留。默认弱边框；hover 强化边框／图片轻放大；active 复位；focus-visible 2px 主题色轮廓；disabled 降低透明度并禁止操作。个人 Agent 推荐卡只显示本次真实结果，不枚举整库。
5. **Layout Principles**：内容区最大 1440px，桌面 40px／移动 16px 边距。世界片库三列、平板两列、手机一列；网格 align-items:start，不让长内容撑高整排。主推横幅内部左文右图，最小高度 330px，文字增长时自然增高；最近互动卡压缩为约 144px。个人 Agent 主区与 340px 结果侧栏，间隔 28px。
6. **Depth & Elevation**：普通卡片仅边框与细微表面层次；主推底部渐变与原有阴影强调内容；Dialog 使用原有遮罩与弹层阴影。正文不压在大幅人像上。
7. **Animation & Interaction**：L1，CSS only；复用 `studio-enter` 240ms 淡入，hover 180–280ms，位移不超过 2px、图片缩放不超过 1.025。所有动效受 prefers-reduced-motion 降级，无新依赖。
8. **Do's and Don'ts**：保留手写创作；保留双入口身份隔离；保留旧存档；只推荐已有世界；偏好可删除；卡片长文可打开阅读全文。不展示虚构在线状态，不默认固定推荐旧悬疑本，不重复铺满整库，不虚构评分人数，不用空白撑高卡片，不为本轮换皮重生成图片，不把狗血写成全员理性开会，不把刺激误解为替玩家强制选择或强迫亲密。
9. **Responsive Behavior**：1100px 以下片库两列、Agent 单列；600px 以下片库单列、主推图片改为上图下文、简介按钮与主操作可换行。768px 以下仍使用原底部导航。触摸目标至少 44px，所有网格子项 min-width:0，长字串可换行，200% 字体放大时正文自然增高。

### 内容与个人 Agent 范围

- 原创三本分别加强替身／死对头三角关系、抢功／当众打脸、逼弃继承／家族权力反转。改动人物立场、开场、任务障碍和后续事件，不仅换标题；旧存档继续使用自身世界快照。
- 个人 Agent 页面：对话记录、明确的匹配进度／错误、至多两项本次推荐、可删除的兴趣记忆。未产生匹配时不伪造推荐。最近对话进入下一轮请求，失败不清除用户输入。
- 该产品不是 Landing Page，故不套用宣传页“爆点”和滚动大场景要求。沿用现有图片与节省生图逻辑。

> **设计宣言（2026-09-05 改版）**：一个可以挑本、遇见角色、继续创作的黑金世界工作台。用户已确认 Frank 草图的侧栏、紧凑创作入口、最近互动和双入口内容库。下述 Worldstudio 规则覆盖旧版首页及 L2 动效说明；原有创作、探索规则不冲突时保留。

### Worldstudio 本轮执行规范

- 首页结构：96px 固定侧栏；主区上方紧凑创作输入；我的世界／最近互动；世界与角色切换的内容库。桌面 3–4 列卡片，移动端单列，底部五项导航。
- 视觉：沿用下方颜色变量，主画布调整为近黑 `--color-bg: #090a0c`（RGB 9,10,12），主强调色调整为浅暖金 `--color-primary: #e8c879`（RGB 232,200,121）。个人 Agent 保留雾蓝识别。首页取消大范围动态背景。
- 字体：沿用 Noto Sans SC；首页 H1 24px，H2 22px，H3 18px，正文 16px，标签 14px；行高 1.7、字距 0.02em。首页所有标题无渐变、投影。剧情正文仍允许使用原中文衬线体。
- 组件：`.studio-button`、`.studio-card`、`.studio-nav-button`、`.studio-composer` 和 `.studio-filter` 的完整 default/hover/active/focus-visible/disabled 样式以 `app/studio.css` 为实现规范；Tabs 与 Dialog 复用现有可访问组件，不修改供应商组件。
- 布局：主区最大 1480px，桌面边距 36px，卡片间隔 20px，区块间隔 32px；封面 16:10、角色半身肖像 4:5。长标题允许换行，容器 min-width:0。
- 层次：普通卡片边框分隔、不默认悬浮；详情层使用原 Overlay 阴影。正文在不透明阅读区内，不在大幅人物立绘上叠字。
- 动效：**L1，CSS only**；淡入 240ms，hover 上移 2px／边框变化 180ms，active 复位；没有滚动视差、持续发光或鼠标跟随。`prefers-reduced-motion` 下取消动画和位移。
- 护栏：世界进入是代入所选角色；角色聊天必须展示不同的用户／对方身份；两种会话独立；不虚构热度、分享或参考图能力；未完成本子不作为可玩卡片；个人 Agent 只能推荐实际世界；手动创作仍可用；本地存储明确标注，失败可见，不删除旧存档。
- 响应式：1280px 以下内容库 3 列，1000px 以下 2 列，600px 以下 1 列；768px 以下侧栏转底栏，主区预留底部安全距离。触摸目标至少 44×44px，长文字可换行。

## 1. Visual Theme & Atmosphere

**Philosophy**：界面不是游戏宣传页，而是“个人 Agent + 世界入口 + 互动舞台”组成的工作表面。深色背景降低环境干扰，暖金用于行动与世界入口，雾蓝用于个人 Agent 与记忆线索；图片和角色立绘承担情绪，UI 本身保持克制。

**Keywords**：暗色叙事、电影感、角色中心、档案感、温暖科技、层次清晰、低噪声

**Visual Direction**：
- 基础来自“暗黑科技”的深色层级，但去掉刺眼霓虹和赛博装饰。
- 排版融入“中文编辑感”：世界标题与剧情关键句使用中文衬线体，操作界面使用中文无衬线体。
- 世界卡片像可以被打开的“故事档案”，角色选择像一组不同视角的入场凭证。
- 探索页采用视觉小说式舞台：背景图为环境，角色立绘持续在场，对话与行动位于画面下方。
- 个人 Agent 使用稳定的雾蓝光标识，不使用拟人卡通机器人图标。

**Working Product Name**：小世界（仅作为 Demo 工作名，可随时替换）

**Interaction Tier**：L2 流畅交互

**L2 选择理由**：产品需要世界卡片、角色选择、Agent 对话和场景切换产生沉浸感，但当前 Demo 不需要 WebGL、滚动劫持、全局自定义光标或电影级长页面。

## 2. Color Palette & Roles

```css
:root {
  color-scheme: dark;

  /* Foundations */
  --color-bg: #090b10;
  --color-bg-rgb: 9, 11, 16;
  --color-bg-elevated: #0d1118;
  --color-bg-elevated-rgb: 13, 17, 24;
  --color-surface: #121721;
  --color-surface-rgb: 18, 23, 33;
  --color-surface-strong: #191f2b;
  --color-surface-strong-rgb: 25, 31, 43;
  --color-surface-hover: #202735;
  --color-surface-hover-rgb: 32, 39, 53;

  /* Borders */
  --color-border: #2a3241;
  --color-border-rgb: 42, 50, 65;
  --color-border-soft: #202735;
  --color-border-soft-rgb: 32, 39, 53;
  --color-border-strong: #465268;
  --color-border-strong-rgb: 70, 82, 104;

  /* Text */
  --color-text: #f4f1e9;
  --color-text-rgb: 244, 241, 233;
  --color-text-secondary: #b7becb;
  --color-text-secondary-rgb: 183, 190, 203;
  --color-text-muted: #858f9f;
  --color-text-muted-rgb: 133, 143, 159;
  --color-text-disabled: #596273;
  --color-text-disabled-rgb: 89, 98, 115;

  /* Primary action / world entry */
  --color-primary: #e2b66f;
  --color-primary-rgb: 226, 182, 111;
  --color-primary-hover: #efc782;
  --color-primary-hover-rgb: 239, 199, 130;
  --color-primary-active: #c99a52;
  --color-primary-active-rgb: 201, 154, 82;
  --color-on-primary: #171108;
  --color-on-primary-rgb: 23, 17, 8;

  /* Personal Agent */
  --color-agent: #78b8c8;
  --color-agent-rgb: 120, 184, 200;
  --color-agent-hover: #91ccda;
  --color-agent-hover-rgb: 145, 204, 218;
  --color-agent-soft: #172830;
  --color-agent-soft-rgb: 23, 40, 48;

  /* Semantic */
  --color-success: #75b68a;
  --color-success-rgb: 117, 182, 138;
  --color-warning: #d9a85f;
  --color-warning-rgb: 217, 168, 95;
  --color-danger: #dc7a82;
  --color-danger-rgb: 220, 122, 130;
  --color-info: #7fa6d9;
  --color-info-rgb: 127, 166, 217;

  /* Overlays */
  --color-overlay: rgba(var(--color-bg-rgb), 0.76);
  --color-image-scrim: rgba(var(--color-bg-rgb), 0.58);
  --color-focus-ring: rgba(var(--color-agent-rgb), 0.72);
  --color-selection: rgba(var(--color-primary-rgb), 0.24);
}
```

**Usage Rules**：
- 页面 70% 以上面积使用 `--color-bg` 与 `--color-bg-elevated`。
- 暖金 `--color-primary` 只用于主操作、选中角色、世界入口和关键进度。
- 雾蓝 `--color-agent` 专属于个人 Agent、Agent 记忆和推荐理由，避免与普通系统信息混用。
- 危险色只用于删除、退出未保存创作和明确失败状态。
- 世界封面可拥有自己的图片色彩，但文字区必须叠加统一遮罩保证可读性。

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@500;600;700&display=swap');

:root {
  --font-ui: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --font-story: "Noto Serif SC", "Songti SC", "SimSun", serif;
  --font-mono: "SFMono-Regular", "Cascadia Code", "Roboto Mono", monospace;
}

body {
  font-family: var(--font-ui);
  font-size: 1rem;
  line-height: 1.72;
  letter-spacing: 0.02em;
}
```

| Level | Size | Weight | Line height | Font | Use |
|---|---:|---:|---:|---|---|
| Display | clamp(2.5rem, 6vw, 5rem) | 600 | 1.08 | Story | 世界名称、沉浸式开场 |
| H1 | clamp(2rem, 4vw, 3.5rem) | 600 | 1.15 | Story | 页面主标题 |
| H2 | clamp(1.5rem, 2.4vw, 2.25rem) | 600 | 1.3 | Story | 区域标题、角色选择标题 |
| H3 | 1.25rem | 600 | 1.45 | UI | 卡片标题、角色名称 |
| Body L | 1.125rem | 400 | 1.8 | Story | 剧情正文、开场叙述 |
| Body | 1rem | 400 | 1.72 | UI | Agent 对话、说明、表单正文 |
| Label | 0.875rem | 600 | 1.45 | UI | 输入标签、选项标签 |
| Meta | 0.75rem | 500 | 1.5 | UI | 时间、状态和次要信息 |

**Text Decoration**：
- Display/H1：不使用渐变文字。暗色背景上的世界主标题允许非常轻的暖金环境投影：`0 0 36px rgba(var(--color-primary-rgb), 0.16)`。
- H2/H3：无渐变、无投影，依靠字体与间距建立层级。
- Agent 名称或记忆标题：使用雾蓝色，不加发光文字。
- 正文：禁止渐变、投影、描边和全大写装饰。
- 链接：hover 时增加下划线偏移，不使用发光。

**Forbidden Fonts**：
- 禁止只设置 Inter、Arial 等英文字体导致中文随机回退。
- 禁止在正文使用手写体、圆体或过度装饰字体。
- 禁止世界标题与 UI 操作都使用同一种衬线体，必须保持“故事／操作”区分。

## 4. Component Stylings

### Buttons

```css
.button {
  min-height: 44px;
  padding: 0.75rem 1.125rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font: 600 0.9375rem/1 var(--font-ui);
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 160ms ease, background-color 180ms ease,
              border-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
}

.button--primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
  box-shadow: 0 8px 28px rgba(var(--color-primary-rgb), 0.15);
}

.button--primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(var(--color-primary-rgb), 0.22);
}

.button--primary:active {
  background: var(--color-primary-active);
  transform: translateY(0) scale(0.98);
  box-shadow: 0 4px 14px rgba(var(--color-primary-rgb), 0.12);
}

.button--secondary {
  color: var(--color-text);
  background: var(--color-surface-strong);
  border-color: var(--color-border);
}

.button--secondary:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.button:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 3px;
}

.button:disabled,
.button[aria-disabled="true"] {
  color: var(--color-text-disabled);
  background: var(--color-surface);
  border-color: var(--color-border-soft);
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}
```

### World Cards

```css
.world-card {
  position: relative;
  min-height: 320px;
  overflow: hidden;
  border: 1px solid var(--color-border-soft);
  border-radius: 18px;
  background: var(--color-surface);
  color: var(--color-text);
  isolation: isolate;
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
              border-color 220ms ease, box-shadow 260ms ease;
}

.world-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(360px circle at var(--pointer-x, 50%) var(--pointer-y, 40%),
    rgba(var(--color-primary-rgb), 0.13), transparent 68%);
  opacity: 0;
  transition: opacity 220ms ease;
}

.world-card:hover {
  transform: translateY(-5px);
  border-color: rgba(var(--color-primary-rgb), 0.58);
  box-shadow: 0 24px 60px rgba(var(--color-bg-rgb), 0.42);
}

.world-card:hover::after { opacity: 1; }
.world-card:active { transform: translateY(-2px) scale(0.995); }
.world-card:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 4px;
}
.world-card[aria-disabled="true"] {
  opacity: 0.48;
  pointer-events: none;
}
```

### Character Cards

```css
.character-card {
  position: relative;
  display: grid;
  grid-template-rows: minmax(220px, 1fr) auto;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
}

.character-card:hover {
  transform: translateY(-3px);
  border-color: var(--color-border-strong);
}

.character-card[data-selected="true"] {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary),
              0 18px 44px rgba(var(--color-primary-rgb), 0.14);
}

.character-card:active { transform: scale(0.99); }
.character-card:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 4px;
}
.character-card[aria-disabled="true"] {
  opacity: 0.46;
  pointer-events: none;
}
```

### Navigation

```css
.app-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  min-height: 64px;
  background: rgba(var(--color-bg-rgb), 0.72);
  border-bottom: 1px solid transparent;
  transition: background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
}

.app-nav[data-scrolled="true"] {
  background: rgba(var(--color-bg-rgb), 0.9);
  border-bottom-color: var(--color-border-soft);
  box-shadow: 0 8px 28px rgba(var(--color-bg-rgb), 0.3);
  backdrop-filter: blur(12px);
}

.nav-link {
  color: var(--color-text-secondary);
  border-radius: 9px;
  transition: color 160ms ease, background-color 160ms ease;
}
.nav-link:hover { color: var(--color-text); background: var(--color-surface); }
.nav-link:active { background: var(--color-surface-strong); }
.nav-link[aria-current="page"] { color: var(--color-primary); }
.nav-link:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.nav-link[aria-disabled="true"] { color: var(--color-text-disabled); pointer-events: none; }
```

### Links

```css
.text-link {
  color: var(--color-agent);
  text-decoration-color: transparent;
  text-underline-offset: 0.28em;
  transition: color 160ms ease, text-decoration-color 160ms ease;
}
.text-link:hover { color: var(--color-agent-hover); text-decoration-color: currentColor; }
.text-link:active { color: var(--color-primary); }
.text-link:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 3px; }
.text-link[aria-disabled="true"] { color: var(--color-text-disabled); pointer-events: none; }
```

### Tags / Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-text-secondary);
  background: rgba(var(--color-surface-rgb), 0.78);
  font: 500 0.75rem/1.2 var(--font-ui);
}
.badge[data-tone="agent"] {
  color: var(--color-agent-hover);
  border-color: rgba(var(--color-agent-rgb), 0.34);
  background: var(--color-agent-soft);
}
.badge:hover { border-color: var(--color-border-strong); color: var(--color-text); }
.badge:active { background: var(--color-surface-strong); }
.badge:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.badge[aria-disabled="true"] { opacity: 0.46; pointer-events: none; }
```

### Inputs and Textareas

```css
.field {
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-text);
  background: var(--color-bg-elevated);
  font: 400 1rem/1.6 var(--font-ui);
  caret-color: var(--color-primary);
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}
.field::placeholder { color: var(--color-text-muted); }
.field:hover { border-color: var(--color-border-strong); }
.field:focus {
  outline: none;
  border-color: var(--color-agent);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px rgba(var(--color-agent-rgb), 0.16);
}
.field:active { border-color: var(--color-agent); }
.field:disabled { color: var(--color-text-disabled); background: var(--color-surface); cursor: not-allowed; }
```

### Agent Chat

```css
.agent-panel {
  border: 1px solid rgba(var(--color-agent-rgb), 0.22);
  border-radius: 20px;
  background: linear-gradient(145deg,
    rgba(var(--color-agent-soft-rgb), 0.9),
    rgba(var(--color-surface-rgb), 0.94));
  box-shadow: 0 22px 64px rgba(var(--color-bg-rgb), 0.36);
}
.agent-message {
  color: var(--color-text);
  border-left: 2px solid var(--color-agent);
  padding-left: 1rem;
}
.agent-panel:hover { border-color: rgba(var(--color-agent-rgb), 0.4); }
.agent-panel:active { border-color: rgba(var(--color-agent-rgb), 0.52); }
.agent-panel:focus-within { box-shadow: 0 0 0 3px rgba(var(--color-agent-rgb), 0.13); }
.agent-panel[aria-disabled="true"] { opacity: 0.5; pointer-events: none; }
```

### Story Choices

```css
.story-choice {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 52px;
  padding: 0.75rem 1rem;
  color: var(--color-text-secondary);
  background: rgba(var(--color-surface-rgb), 0.86);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  text-align: left;
  transition: color 160ms ease, background-color 160ms ease,
              border-color 160ms ease, transform 160ms ease;
}
.story-choice:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
  border-color: rgba(var(--color-primary-rgb), 0.52);
  transform: translateX(4px);
}
.story-choice:active { transform: translateX(2px) scale(0.995); }
.story-choice:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 3px; }
.story-choice:disabled { color: var(--color-text-disabled); background: var(--color-surface); transform: none; cursor: not-allowed; }
```

### Slider / Surprise Level

```css
.surprise-slider {
  accent-color: var(--color-primary);
  min-height: 44px;
}
.surprise-slider:hover { filter: brightness(1.08); }
.surprise-slider:active { accent-color: var(--color-primary-active); }
.surprise-slider:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 3px; }
.surprise-slider:disabled { opacity: 0.42; cursor: not-allowed; }
```

### Creator Agent Workbench

- 第二步使用“左侧 Agent 对话，右侧可编辑框架”的工作台。桌面端对话区可在视口内粘滞，框架区独立展示目标、成功/失败条件、复杂度与任务。
- Agent 的建议不得直接覆盖用户内容；必须先以雾蓝建议卡呈现，由用户点击“采纳到右侧”后才写入框架。
- 任务卡使用扁平边框，按“名称—内容—成功条件—困难/代价”排列；不使用复杂节点图。
- 世界复杂度使用 4 个显式选项，文案是“轻量/标准/丰富/多线”，不显示预计分钟数。

### Goal Progress

- 探索页顶部进度条表示“已完成的主线条件 / 全部必要条件”，不以回合数或预设分幕伪装成剧情进度。
- 自由输入是主行动面，使用暖金边框和主按钮；AI 生成选项放在其后，标注为“行动灵感”。
- 任务进度卡只公开目标、完成状态和已知困难，不泄露其他角色的私密行动。

## 5. Layout Principles

**Container**：
- Application max width: `1440px`
- Page horizontal padding: desktop `32px`, tablet `24px`, mobile `16px`
- Reading/story column: `680px`
- Creation form column: `760px`
- Agent side panel: `320px`

**Spacing Scale**：
- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-5: 24px`
- `--space-6: 32px`
- `--space-7: 48px`
- `--space-8: 64px`
- Page section padding: `48px 0`
- Component gap: `16px–24px`
- Card padding: `20px–24px`

**Primary Shell**：

```css
.app-shell {
  width: min(100% - 64px, 1440px);
  margin-inline: auto;
}

.agent-home-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.78fr) minmax(0, 1.7fr);
  gap: 32px;
  align-items: start;
}

.world-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 20px;
}

.world-grid > :nth-child(1) { grid-column: span 7; }
.world-grid > :nth-child(2) { grid-column: span 5; }
.world-grid > :nth-child(n + 3) { grid-column: span 4; }

.explore-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  min-height: calc(100dvh - 96px);
}

.story-stage {
  position: relative;
  min-height: 620px;
  overflow: hidden;
  border-radius: 22px;
  background: var(--color-surface);
}
```

**Hierarchy Rules**：
- 首屏优先级：个人 Agent 对话 > 推荐世界 > 创建入口，不放宣传 Hero。
- 推荐区至少展示三个可进入世界；个人 Agent 的推荐结果用雾蓝描边标记，但不隐藏其他选择。
- 创作流程使用分步进度，但每一步只出现当前必要字段。
- 故事创作必须并列提供“直接使用我的剧情”和“让 AI 帮我展开”，AI 结果以可编辑表单呈现，不能锁死成只读草案。
- 创作 Agent 的对话与框架编辑同屏存在；用户既可通过对话获得灵感，也可不经 Agent 直接修改任何字段。
- 世界长度以复杂度、主线任务数量和前置条件表达，不用固定分钟数。
- 意外程度同时提供四个文字档位卡和滑杆，明确由创作者手动决定；选择结果必须真正写入世界运行状态。
- 探索页舞台占据主要面积，状态信息放右侧可收起面板。
- 行动选项必须位于剧情文本之后且无需滚动即可触达。

## 6. Depth & Elevation

```css
:root {
  --shadow-flat: none;
  --shadow-subtle: 0 8px 24px rgba(var(--color-bg-rgb), 0.22);
  --shadow-raised: 0 18px 48px rgba(var(--color-bg-rgb), 0.36);
  --shadow-overlay: 0 28px 80px rgba(var(--color-bg-rgb), 0.56);
  --shadow-agent: 0 20px 64px rgba(var(--color-agent-rgb), 0.1);
  --shadow-primary: 0 16px 42px rgba(var(--color-primary-rgb), 0.16);
}
```

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, border only | 输入区、列表行、状态项 |
| Subtle | `--shadow-subtle` | 普通角色卡、创建步骤卡 |
| Raised | `--shadow-raised` | 世界卡、推荐结果、探索舞台 |
| Overlay | `--shadow-overlay` | Dialog、Sheet、结局卡 |
| Agent | `--shadow-agent` | 个人 Agent 面板和记忆确认 |

规则：阴影只用于表达层级，不用于给所有元素增加“悬浮感”；同一视口最多一个 Overlay 层级。

## 7. Animation & Interaction

**Motion Philosophy**：动效服务于“世界被打开”和“选择产生影响”。使用 opacity、transform、clip-path 与轻量径向光；不使用移动模糊、不劫持滚动。

**Tier**：L2 流畅交互

### Dependencies

无需 GSAP、Lenis 或 WebGL。React 状态、CSS 动画与 `IntersectionObserver` 足够完成第一版。

### 7.1 Text Animation — Page H1

世界名称和个人 Agent 首句使用一次性 mask reveal：

```css
@keyframes titleReveal {
  from { opacity: 0; transform: translateY(24px); clip-path: inset(0 0 100% 0); }
  to { opacity: 1; transform: translateY(0); clip-path: inset(0 0 0 0); }
}
.title-reveal {
  animation: titleReveal 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

### 7.2 Text Animation — Section H2

页面区块标题进入视口时淡入上浮：

```css
.section-heading {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 560ms ease, transform 560ms cubic-bezier(0.16, 1, 0.3, 1);
}
.section-heading[data-visible="true"] {
  opacity: 1;
  transform: translateY(0);
}
```

### 7.3 Text Animation — Agent Body / Label

Agent 正在组织推荐时使用克制的逐段出现，不模拟无限打字：

```css
@keyframes messageIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.agent-message-line {
  animation: messageIn 360ms ease both;
  animation-delay: calc(var(--line-index, 0) * 90ms);
}
```

### 7.4 Element Interaction — Choice Feedback

用户点击行动后，选中项短暂向右推进，其他选项淡出：

```css
.choice-group[data-committed="true"] .story-choice:not([data-selected="true"]) {
  opacity: 0.38;
  transform: translateX(-6px);
}
.story-choice[data-selected="true"] {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: var(--color-primary);
  transform: translateX(8px);
}
```

### 7.5 Component Interaction — World Spotlight Cards

世界卡响应指针位置产生轻量聚光，指针监听必须通过 `requestAnimationFrame` 节流；触摸设备禁用聚光，仅保留按压反馈。

```js
export function updateSpotlight(card, event) {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (card.__spotlightFrame) return;
  card.__spotlightFrame = requestAnimationFrame(() => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
    card.__spotlightFrame = null;
  });
}
```

### 7.6 Background Atmosphere

个人 Agent 首页使用两层静态径向渐变和一个缓慢漂移的低透明光层。动画仅改变 transform 与 opacity，禁止在移动元素上使用 blur。

```css
@keyframes ambientDrift {
  0%, 100% { transform: translate3d(-3%, -2%, 0) scale(1); opacity: 0.42; }
  50% { transform: translate3d(4%, 3%, 0) scale(1.08); opacity: 0.58; }
}
.ambient-light {
  position: fixed;
  inset: -20%;
  pointer-events: none;
  background:
    radial-gradient(circle at 26% 30%, rgba(var(--color-agent-rgb), 0.12), transparent 30%),
    radial-gradient(circle at 76% 62%, rgba(var(--color-primary-rgb), 0.09), transparent 34%);
  animation: ambientDrift 18s ease-in-out infinite;
}
```

### 7.7 Scroll Reveal and Navigation State

世界列表卡片使用 stagger fadeInUp；导航在滚动超过 32px 后进入紧凑毛玻璃状态。背景图允许最大 20px 的轻微视差，不影响内容命中区域。

```js
export function observeReveal() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.setAttribute('data-visible', 'true');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.16 });
  document.querySelectorAll('[data-reveal]').forEach((node) => observer.observe(node));
  return () => observer.disconnect();
}
```

### 7.8 Scene Transition

场景变化时先淡出文字与角色，再交叉淡入新背景；总时长不超过 520ms。普通角色对话不触发全场景转场。

```css
.scene-layer {
  transition: opacity 360ms ease, transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
}
.scene-layer[data-transitioning="true"] {
  opacity: 0;
  transform: scale(1.015);
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .ambient-light { display: none; }
  .world-card:hover,
  .character-card:hover,
  .story-choice:hover,
  .story-choice[data-selected="true"] { transform: none; }
}
```

## 8. Do's and Don'ts

### Do

- 用个人 Agent 面板作为产品入口，并通过雾蓝色建立持续识别。
- 让角色形象和当前场景成为探索页视觉中心。
- 用暖金色明确表达“进入、选择、生成、继续”等主行动。
- 世界卡片使用真实故事标题、角色和冲突，不使用抽象营销文案。
- 明确区分角色公开信息、选角后私密信息和 Agent 记忆。
- 创作流程每一步只呈现当前必要字段，复杂配置折叠到“进一步设置”。
- 所有生成、空状态、错误和重试状态都保留清晰反馈。
- 图片加载时保留上一个有效场景，避免舞台闪成空白。
- 桌面与移动端都保证操作按钮和行动选项至少 44px 高。
- 动效必须解释状态变化：进入、选中、生成、场景切换或结局。

### Don't

- ❌ 不做宣传型大 Hero，不让用户滚动后才能开始使用产品。
- ❌ 不把每个故事角色表现成独立 Agent；当前角色是可选、可代入的世界对象。
- ❌ 不使用高饱和霓虹紫蓝填满界面，避免廉价“AI 产品”视觉。
- ❌ 不使用大面积玻璃拟态或超过 14px 的背景模糊。
- ❌ 不在移动元素上使用 `filter: blur()`。
- ❌ 不为每个按钮、卡片和标签同时添加阴影与发光。
- ❌ 不使用 Emoji 代替功能图标、人物头像或状态图标。
- ❌ 不让正文、剧情和按钮出现渐变文字或描边字。
- ❌ 不在每轮普通对话重新生成完整场景图。
- ❌ 不隐藏自由输入入口，也不让预设选项成为唯一行动方式。
- ❌ 不用“离谱程度”暗示世界规则可以失控；界面名称统一为“意外程度”。
- ❌ 不偷偷保存个人 Agent 推断出的敏感信息；记忆需要可见、可修改。
- ❌ 不使用全局自定义光标、滚动劫持、长时间加载动画或无意义粒子特效。
- ❌ 不让旧图片或旧生成结果覆盖用户已经进入的新场景。

## 9. Responsive Behavior

**Breakpoints**：

| Name | Width | Key Changes |
|---|---:|---|
| Wide desktop | `> 1280px` | 个人 Agent 与推荐世界双栏；探索舞台 + 320px 状态栏 |
| Desktop/tablet | `769px–1280px` | 双栏比例收紧；世界卡 2 列；状态栏缩至 280px |
| Mobile | `≤ 768px` | 全部单栏；底部固定操作区；状态栏改为 Sheet；角色卡横向滚动 |
| Small mobile | `≤ 480px` | 页面边距 16px；世界卡单列；按钮默认满宽；Display 最大 2.5rem |

**Touch Targets**：最小 `44px × 44px`；剧情选项建议最小高度 `52px`。

**Collapsing Strategy**：
- 个人 Agent 首页：Agent 对话在前，推荐世界在后，不把 Agent 折叠成悬浮聊天按钮。
- 世界卡片：桌面使用不等宽布局，移动端变为单列；封面比例统一为 `4:5` 或 `16:10`。
- 角色选择：桌面卡片网格，移动端横向 snap 列表；选中角色详情固定显示在列表下方。
- 世界创作：步骤导航在移动端变为顶部简化进度“2 / 4”。
- 探索页：桌面右侧状态栏在移动端变为底部 Sheet；对话与操作区贴近视口底部但不得遮挡剧情。
- 结局页：关键选择时间线由双栏变为单列。

```css
@media (max-width: 1280px) {
  .app-shell { width: min(100% - 48px, 1180px); }
  .explore-layout { grid-template-columns: minmax(0, 1fr) 280px; }
  .world-grid > * { grid-column: span 6; }
}

@media (max-width: 768px) {
  .app-shell { width: min(100% - 32px, 100%); }
  .agent-home-grid,
  .explore-layout { grid-template-columns: 1fr; }
  .world-grid { grid-template-columns: 1fr; gap: 16px; }
  .world-grid > * { grid-column: auto; }
  .desktop-state-panel { display: none; }
  .mobile-state-trigger { display: inline-flex; }
  .story-stage { min-height: calc(100dvh - 116px); border-radius: 16px; }
  .character-strip {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(78%, 300px);
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .character-strip > * { scroll-snap-align: center; }
}

@media (max-width: 480px) {
  .button { width: 100%; }
  .app-nav { min-height: 56px; }
  .world-card { min-height: 280px; }
}
```

**Accessibility Notes**：
- 图片必须提供与剧情相关的替代文本，不重复图片下方已有完整文本。
- 颜色不作为角色选择、关系变化或意外程度的唯一表达方式。
- Agent 流式文本使用适当的 `aria-live="polite"`，避免每个字符都被读屏重复播报。
- 对话输入提交后，将焦点移动到新剧情标题或状态摘要，再允许用户进入下一组选项。
- 所有 Sheet、Dialog 和角色详情支持 Escape 关闭与正确焦点返回。
