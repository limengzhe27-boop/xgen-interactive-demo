// Editorial-only, two paid shots at most. Never imported by the app.
// Submit the second shot only after reviewing the first and extracting its final frame.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { companyFetch, companyAssetUrl } from '../lib/company-gateway.ts';
import { videoResult } from '../lib/media-policy.ts';
const dir = 'work/yoga-prologue-v2';
const prompts = [
  '现实主义中国婚姻悬疑短剧，16:9电影摄影。参考图1是36岁已婚女学员林栀，参考图2是27岁男瑜伽私教陆晨，保持两人的脸、发型和年龄一致。唯一场景是傍晚暖光私人瑜伽教室，镜墙、瑜伽垫、瑜伽砖清晰可见，只有两名成年人。女主穿鼠尾草绿高领短袖运动上衣和黑色运动长裤，米白开衫搭在身旁椅子上，手腕有小莲花手链；男教练穿深灰运动T恤黑色运动长裤。连续10秒，0至3秒中景：女主在瑜伽垫上站姿伸展，男教练在侧后方用手扶她的肩背与腰侧指导动作，明确是私教课。3至6秒她停止伸展，主动转身面对他，他的手没有离开她的腰，她伸手搂住他的肩，两人相视。6至10秒她主动靠近，两人相拥并短暂亲吻，明显超出师生关系，然后仍相拥。镜头从能看清瑜伽垫的双人中景缓缓推近双人半身。亲密而紧张的秘密恋情，不是专业按摩。保持空间轴线、服装、人物一致，动作自然。没有裸体，没有性行为，没有床，没有儿童，没有字幕文字，没有拼贴分屏，没有新人物，没有夸张慢镜头。',
  '接续参考首帧，保持同一对成年中国男女、相同脸型发型服装、同一暖光瑜伽教室和空间方向。36岁已婚女学员林栀与27岁男私教陆晨刚刚短暂接吻，现在仍拥抱。连续10秒叙事：0至3秒，女主手中手机忽然亮起，她低头看屏幕，笑容消失，慌张地把手机屏幕贴向胸口，不让男教练看。男教练试图继续搂住她，她轻轻推开他的手。3至6秒她拿起椅子上米白开衫，披在绿色上衣外，快步走向相邻更衣室，回头看男教练一眼。6至10秒镜头跟随她进入更衣室独立隔间，她关上门，独自靠着门看手机，神情从沉迷变成慌乱与犹豫，手指悬在手机上但没有点击，最后停在她和未解锁的门前。男教练留在教室，不进入隔间，不出现其他人。手机屏幕不要生成任何可读文字，消息将后期叠加。完整穿着，只有克制的拥抱，没有裸露性行为，没有儿童，真实连续动作，不分屏不拼贴，电影摄影，横屏16:9。',
];
await mkdir(dir, { recursive: true });
let journal;
try { journal = JSON.parse(await readFile(`${dir}/jobs.json`, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; journal = { shots: prompts.map((prompt, index) => ({ index, prompt, status: 'new' })) }; }
const save = () => writeFile(`${dir}/jobs.json`, JSON.stringify(journal, null, 2));
const action = process.argv[2] || 'status';
const selected = Number(process.argv[3] || 1) - 1;
if (![0, 1].includes(selected)) throw Error('invalid_shot');
const shot = journal.shots[selected];
if (action === 'submit' && shot.status === 'new') {
  shot.prompt = prompts[selected]; // Editorial revisions only before the first submission.
  const paths = selected === 0 ? [`${dir}/lin.png`, `${dir}/lu.png`] : [`${dir}/continuation.png`];
  const image_list = await Promise.all(paths.map(async path => ({ image: (await readFile(path)).toString('base64'), ...(selected === 1 ? { type: 'first_frame' } : {}) })));
  shot.status = 'submitting'; await save();
  const r = await companyFetch('/videos', { model: 'kling-video-o1', prompt: shot.prompt, seconds: '10', size: '1280x720', mode: 'std', image_list }, 60000);
  if (!r.ok) { shot.status = `http-${r.status}`; await save(); }
  else {
    const job = await r.json(); const id = job.id || job.task_id;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw Error('invalid_job_id');
    shot.id = id; shot.status = 'queued'; await save();
  }
}
if (action === 'collect' && shot.id && shot.status !== 'ready') {
  const r = await companyFetch(`/videos/${shot.id}`, undefined, 20000);
  if (!r.ok) throw Error(`query_http_${r.status}`);
  const result = videoResult(await r.json());
  if (result.status === 'ready') {
    const video = await fetch(companyAssetUrl(result.url), { redirect: 'error', signal: AbortSignal.timeout(60000) });
    if (!video.ok || Number(video.headers.get('content-length')) > 40000000) throw Error('invalid_download');
    const bytes = Buffer.from(await video.arrayBuffer());
    if (bytes.length > 40000000 || bytes.subarray(4, 8).toString() !== 'ftyp') throw Error('invalid_mp4');
    await writeFile(`${dir}/shot-${selected + 1}.mp4`, bytes);
    shot.status = 'ready'; shot.bytes = bytes.length; await save();
  } else if (result.status === 'failed') { shot.status = 'failed'; await save(); }
}
console.log(`shot ${selected + 1}: ${shot.status}${shot.bytes ? ` (${shot.bytes} bytes)` : ''}`);
