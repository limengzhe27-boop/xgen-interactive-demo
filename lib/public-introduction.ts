/** Shared authoring contract. Guidance, not a destructive text sanitizer. */
export const PUBLIC_INTRODUCTION_GUIDANCE = `
【公开介绍写作规范】作品公开简介只写 brief.synopsis，与工作台“展示与素材”的作品公开简介及世界介绍页正文一一对应。不把 premise、storyHook、openingScene 拼成第二段介绍，不照搬内部剧情梗概。
推荐80—160个中文字符、2—4句，内容简单时可以更短，不为凑字扩写：必要背景与眼前异常 → 具体人物矛盾或尚未解决的问题 → 已支持的参与身份/行动机会。用具体处境吸引读者，不写“精彩纷呈、无限可能”等空泛保证，不强制以问句结尾。
禁止放入目标受众年龄（如“面向12～28岁”）、市场定位、笑点来源、Skill/架构/复杂度、给生成模型的指令、内部秘密、后续转折和最终结局。内容分级若需要应独立配置，不混入营销简介。未来可选择的行动不能宣传为必然发生的情节。
角色公开介绍写 characters[].publicIntroduction，推荐40—80字：公开身份、可感知的行为特点、眼前处境；不罗列私密目标和未知秘密。cardHook 是不超过20字的角色卡短句，不是第二份完整介绍。上述长度是编辑建议，不自动截断作者原文。
作者委托整理公开介绍时，空白字段直接提案；已有文案如过长、重复、包含内部定位或剧透，也给出局部改写建议并说明删减理由，不以“保留已有文案”为由跳过问题。保留原稿直到作者采纳，不新增故事事实、不生成媒体、不自动发布。`;

/** An explicit blank public field stays blank; never replace it with internal story text. */
export function publicSynopsis(value: string | undefined, legacyPublicText = ''): string {
  return (value === undefined ? legacyPublicText : value).trim();
}

export function publicRoleIntroduction(value: string | undefined, legacyPublicText = ''): string {
  return (value === undefined ? legacyPublicText : value).trim();
}
