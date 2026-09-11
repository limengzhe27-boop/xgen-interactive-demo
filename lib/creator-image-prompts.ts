// One shared direction for creator portraits and automatically prepared publication art.
// Prompt constraints reduce drift; they are not proof of the generated image's style.
export const CREATOR_IMAGE_STYLE = '真人电影剧照风格，摄影级写实，自然皮肤纹理、真实人体比例、真实布料与环境光，统一自然电影调色。禁止动漫、二次元、漫画、插画、游戏立绘、卡通、油画和3D渲染';
export function creatorPortraitPrompt(role: { name: string; identity: string; appearance: string; personality?: string }, worldTitle = '', context?: { scene: string; cast: { name: string; appearance: string }[] }) {
  return `${CREATOR_IMAGE_STYLE}。${worldTitle ? `同一作品《${worldTitle}》的角色照片。` : ''}单人角色：${role.name || '角色'}，身份：${role.identity}。固定外观：${role.appearance || '依据身份设计自然外貌和服装'}。性格：${role.personality || '以当前设定为准'}。${context ? `故事场景参考：${context.scene}。其他角色仅作差异对照，不画入画面：${context.cast.filter(c=>c.name!==role.name).map(c=>`${c.name}：${c.appearance}`).join('；')}。` : ''}保留固定外观，在未限定处设计独立脸型、五官组合、发型轮廓与穿衣习惯，不能统一网红脸。用一个符合性格与当前处境的动作、眼神及环境细节制造接近或追问动机，不泄露故事秘密，不添加新剧情事实。景别、姿势、构图随人物变化，不统一正面站姿、暗背景或微笑背包照。只画此人，不混用其他角色的脸。不要文字、姓名标签、证件文字、水印或边框。`;
}
