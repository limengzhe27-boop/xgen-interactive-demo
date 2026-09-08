# 刘华强买瓜 · 非官方互动世界

2026-09-08。新增而非覆盖夜市怪谈本。四位可选角色：刘华强、卖瓜老板、摊边黑衣男子、瓜摊看客。后两位是原场景站位的描述性称呼，正式姓名及关系未考证；性格、任务、选择是互动扩展，不是原作证据。原片未逐帧完整验收，不能宣称完整复刻。

保留现实瓜摊、人物形象与称重冲突，不扩写神怪或系统。玩家从冲突前段接手，分支不强制原片结果，不搬运完整原片台词。看客有独立目标、主支线和离场选择。所有人物起初同场，离开后不得隔空获知私语。

## 资料来源与边界

- https://www.thepaper.cn/newsDetail_forward_13816266 ：原片场景背景、服装、瓜摊和称重道具；文章为导演采访报道。
- https://otomad.wiki/%E5%88%98%E5%8D%8E%E5%BC%BA%E4%B9%B0%E7%93%9C ：多人原场景参考截图。
- https://www.sohu.com/a/489418830_100120160 ：摊主面部参考截图。
- 公开图片仅作本次用户明确要求的 GPT 参考重绘输入，不把源文件加入公开资源目录；生成图片不等于取得原作、演员形象或商业使用授权，页面标示非官方重绘。未复制演员声音。

## 生图记录

使用 Codex 内置 imagegen，identity-preserve，非付费网关；非像素级超分，生成细节可能与原片存在差异。没有改变人物为不同身份或年轻偶像。全图经目视检查：四人顺序、黑夹克买瓜人、绿T恤摊主、灰T恤黑衣男子、浅色外套看客均在。五张最终 WebP 总计约389KB，作为固定站点资源供所有访客复用，不随浏览触发生图。

输入参考：
- 刘华强：https://imagepphcloud.thepaper.cn/pph/image/145/313/913.jpg
- 摊主：https://p9.itc.cn/images01/20210912/46d30278250740b5be48c6f8cfc8cbdf.png
- 多人：https://otomad.wiki/images/4/4c/%E8%BF%99%E7%93%9C%E4%BF%9D%E7%86%9F%E5%90%97.png

最终提示词集：

1. 刘华强／摊主单人肖像共用提示：
   Use case: identity-preserve. Restore the fictional TV character shown in the reference as a clear high-resolution vertical waist-up character portrait for an unofficial interactive drama. [人物说明] Lock face identity, age, hairstyle, clothing and build to reference, no beautifying or replacing with model. Background blurred humble Chinese street watermelon stall, early 2000s, soft natural daylight, authentic skin texture. Portrait facing three-quarter toward viewer, neutral alert expression. No captions, no watermark, no logos, no weapons, no violence. AI restored fan image not a real-world incident.
   人物说明分别为：Liu Huaqiang played by Sun Honglei: buzz cut, narrow eyes, black patterned jacket over black T-shirt. / The watermelon vendor: short black hair, stocky body, textured weathered face, faded blue-black jacket over olive T-shirt.
2. 黑衣男子／看客／四人封面共用提示：
   Use case: identity-preserve. Unofficial fictional TV 征服 scene high-definition restoration for an interactive world. [构图] Natural daylight, realistic skin, no beautification, no modern fashion, no fantasy, no blood, no attack, no weapons in use. Keep all identities recognizable. Remove image compression blur through careful restoration. No text or logos. This is an AI fan reconstruction, not an actual event.
   构图分别为：
   - Create a vertical waist-up portrait of ONLY the third man from left in the reference, between vendor and far-right tan jacket man. Short dark hair, longer face, black open jacket over gray crewneck shirt. Preserve reference face, ordinary adult age and body; do not substitute either protagonist.
   - Create a vertical waist-up portrait of ONLY the far-right man in the reference, tan/light brown jacket over light lavender blue collared shirt tucked into dark trousers, short black hair. Preserve his reference face and ordinary adult age, not either protagonist.
   - Create a wide ensemble scene of ALL FOUR men as in reference with the same face identities and clothing: Liu Huaqiang left black jacket buzzcut, vendor olive shirt dark jacket, third man black jacket gray crewneck, far-right onlooker tan jacket light blue-lavender collared shirt. Preserve their order and original modest fruit-stall environment, watermelon on traditional scale, old shop and bicycles. Faces visible. No new invented character.

最终资源位于 public/assets/conquest-v1/{cover,liu,vendor,helper,witness}.webp。第一张双人封面未采用，保留在本机生成目录，不发布。

## 待验证

本轮结构测试不代表真实模型多轮叙事质量。尚需四身份实际多轮体验、看客不越权、异地不插话与私谈验收。此前形象上传完整实测、数据库迁移和真实双账号发布验收、网关运行接入仍未完成；语音继续暂停。
