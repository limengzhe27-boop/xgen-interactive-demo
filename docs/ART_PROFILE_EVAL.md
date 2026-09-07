# 2026-09-07 · 专属图片与账号个人中心

## 本轮范围

- 内置 imagegen 生成新增剧本美术，不调用用户的硅基流动密钥。不发送公司资料、Frank 录音或个人存档。
- 49 个计划素材中 47 个成功：11 张封面、36 张角色图；12 个新增世界覆盖。跨界同人封面和托尼人像被服务安全系统拒绝，没有重试这些请求，也没有付费接口兜底；对应两处保留旧参考图并在世界说明标注。
- 原有合适的图与旧存档均保留。不是给所有未来分支预生成场景，也不擅自生成用户个人形象。
- 新素材位于 `public/assets/library-v1/`，WebP quality 82，共约 6.2 MB。`lib/library-art.ts` 是精确映射与发布白名单，不接受任意本地路径。
- 静态图片随站点部署，所有访客共享读取；访问和刷新不触发生图。仍可能有普通网络流量，不承诺托管服务无限免费或永不失效。

## 提示词与检查

- 初始完整提示词集：`docs/library-art-prompts.json`（包含两个被拒绝的计划项）。模式为内置生图，不是 CLI。
- 47 张逐一通过四张接触表检查世界年代、服装、角色对应及可见瑕疵。
- 许燃初版性别呈现不符；使用原图定向修订，保留盔甲、剑、城堡、紫色光线与构图。最终检查为成年男性。
- 修订提示词：Edit this fictional fantasy hero portrait. Correct only the character to match the story: Xu Ran is an adult man aged 22, the grown son of the queen. Give him clearly adult masculine facial features and male build, short tousled golden hair, no feminine makeup. Preserve the beautiful blue and silver light armor, holy sword in hand, astonished expression, magical castle background, purple lighting, composition and painterly illustration quality. One adult man, not a child. No text or watermark.
- 原始 PNG 保留在生成目录，站点使用压缩 WebP；不删除原图。

## 个人中心

- 首页账号栏“我的形象与资料”和侧栏“我的”进入同一个页面；个人 Agent 内保留跳转入口，不再把形象编辑器摆在聊天主页面。
- “故事里的我”：虚拟形象、身份、性格、外观、愿望能力；“Agent 了解的我”：用户确认的记忆与待确认建议，同页分区。
- 不把虚构性格自动当成真实用户画像。沿用账号隔离与手动云存档，不变更登录或公开发布权限。

## 验证

- 129 项自动测试通过，含 47 个静态文件、角色映射、发布路径白名单、个人中心渲染与已有账号/Agent/故事回归。
- TypeScript 检查通过；本轮独立组件与美术映射定向 lint 通过。整页 lint 仍包含既有 ref-render、effect-dependency 与语义标签问题，不宣称整仓 lint 全通过。
- Tabbit 独立合成账号：桌面首页入口打开；390px 手机导航六项可见且无横向溢出；编辑保存身份后关闭可立即查看性格；删除记忆不删人设；切换另一个合成账号后不显示前账号身份与记忆。
- 首次浏览器连接中断，按工具要求新建只读复核后继续；手机端浏览器扩展浮层一度挡住底栏，改用桌面首页账号入口完成 B 账号检查，没有强制点击或操作用户真实存档。
- 未发送真实用户资料或触发模型聊天/生图 API；页面测试拦截这些请求。

## 尚未完成

- 两张被拒绝的同人素材尚无专属替换。
- 公开发布及作者管理仍待独立跨账号验收，本轮没有开启发布。
- Next.js 正式构建已通过；提交、正式部署与线上资源复核以本轮交付回执为准。
