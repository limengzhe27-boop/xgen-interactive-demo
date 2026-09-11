// One shared direction for creator portraits and automatically prepared publication art.
// Prompt constraints reduce drift; they are not proof of the generated image's style.
export const CREATOR_IMAGE_STYLE = '真人电影剧照风格，摄影级写实，自然皮肤纹理、真实人体比例、真实布料与环境光，统一自然电影调色。禁止动漫、二次元、漫画、插画、游戏立绘、卡通、油画和3D渲染';
export function creatorPortraitPrompt(role: { name: string; identity: string; appearance: string }, worldTitle = '') {
  return `${CREATOR_IMAGE_STYLE}。${worldTitle ? `同一作品《${worldTitle}》的角色照片。` : ''}单人角色：${role.name || '角色'}，身份：${role.identity}。固定外观：${role.appearance || '依据身份设计自然外貌和服装'}。三分之二身，人物清晰完整，背景简洁且符合故事环境。只画此人，不混用其他角色的脸。不要文字、姓名标签、证件文字、水印或边框。`;
}
