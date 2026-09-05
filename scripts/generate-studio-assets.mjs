// Explicitly authored public fictional asset briefs; no company materials or credentials.
import { access, writeFile } from 'node:fs/promises';
import { workplaceWorld, inheritanceWorld } from '../lib/studio-worlds.ts';
const origin = process.env.DEMO_BASE_URL || 'http://127.0.0.1:3000';
const briefs = [
  ['contract-cover', '电影剧照，现代上海顶层公寓的雨夜，落地窗外是金色城市灯光，玄关一只行李箱，远处28岁中国女性白衬衫与32岁中国男性深灰西装相隔几步相望，克制浪漫，豪门情感小说封面，环境占主要面积，横向构图'],
  ['contract-su', '电影半身肖像，28岁中国女性，及肩黑色直发，象牙白衬衫，银色耳钉，清醒坚定的目光，雨夜都市公寓柔和暖光，人物居中，头部完整'],
  ['contract-gu', '电影半身肖像，32岁中国男性，黑色短发，深炭灰西装，解开一颗领扣，银色腕表，英俊克制且疲惫的眼神，雨夜公寓落地窗，人物居中，头部完整'],
  ['contract-shen', '电影半身肖像，30岁中国男性，整洁黑发，细框眼镜，棕色西装，温和沉静的律师，暖色书房，人物居中，头部完整'],
  ['sea-train-cover', '电影环境剧照，暴风雨前的深蓝海面，一列复古列车行驶在临海铁路桥，车窗温暖金光，远处灯塔，悬念与冒险感，横向宽银幕构图'],
  ['roommate-cover', '电影环境剧照，现代城市合租公寓夜晚，暖色餐桌，五把椅子与一把新搬来的椅子，门口一只陌生行李箱，窗外城市灯光，生活感与微妙悬疑，横向宽银幕构图'],
  ['workplace-cover', '电影环境剧照，现代中国城市写字楼会议室，长桌上未签字的文件，主位空着，窗前29岁中国短发女性深蓝西装面对41岁中国男性深灰西装酒红领带，权力反转的紧张感，金色晨光，宽银幕横向构图'],
  ['inheritance-cover', '电影环境剧照，中国家族老宅夜晚会客厅，古木长桌上封存文件与钢笔，角落一把空椅子，远处26岁中国长黑发女性墨绿衬衫与35岁中国男性米色西装相隔而坐，财富争夺悬念，暖金色灯光与深色阴影，横向构图'],
  ...[workplaceWorld, inheritanceWorld].flatMap((entry) => entry.world.characters.map((role) => [entry.portraits[role.id].split('/').at(-1).replace('.jpg', ''), role.imagePrompt])),
];
const selected = new Set(process.argv.slice(2));
async function generate([name, prompt], i) {
  if (selected.size && !selected.has(name)) return;
  const path = new URL(`../public/assets/${name}.jpg`, import.meta.url);
  if (await access(path).then(() => true, () => false)) { console.log(`${name}: already exists, skipped`); return; }
  const response = await fetch(`${origin}/api/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: i + 1, sceneId: name, seed: 690510 + i, purpose: name.endsWith('-cover') ? 'scene' : 'portrait', prompt: `${prompt}。写实摄影，细节清晰，无文字、无水印、无界面。` }), signal: AbortSignal.timeout(110000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const body = await response.json();
  const match = /^data:image\/(?:jpeg|png|webp);base64,(.+)$/.exec(body.assetUrl || '');
  if (!match) throw new Error(`${name}: no persistent image`);
  await writeFile(path, Buffer.from(match[1], 'base64'), { flag: 'wx' });
  console.log(`${name}: saved (${body.provider})`);
}
// At most two in flight, one attempt per missing asset; never overwrite or retry a paid result.
for (let i = 0; i < briefs.length; i += 2) await Promise.all(briefs.slice(i, i + 2).map((brief, offset) => generate(brief, i + offset)));
