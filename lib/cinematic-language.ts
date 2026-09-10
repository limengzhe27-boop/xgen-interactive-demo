/** Original project guidance informed by film technique references, not copied templates.
 * Shared by Codex (read from the director Skill) and the runtime Agent.
 * Never triggers a model call, changes duration, or selects a provider.
 */
export const CINEMATIC_LANGUAGE_VERSION = 'story-camera-1';

export function cinematicGuidance(perspective: 'first-person' | 'external') {
  return `【剧情镜头语言 ${CINEMATIC_LANGUAGE_VERSION}】
先确定本段真实发生的行动与后果，再选零到两种有必要的拍摄手法；不随机抽风格，不每段使用同一组合。没有必要就维持稳定机位。候选：
- 视线观察：跟随角色注意力，让观众看清正在发生的变化。
- 焦点转移：前后景已有物件/人物之间改变清晰度，揭示线索或反应；不移动物件，不模糊关键接触，不默认耗时两秒。
- 随行动跟移：跟随已授权的位移，保留动作对象与空间地标；不是人站着、镜头替人移动。
- 细节强调：确有新证据时短暂看清手、道具或表情，随后回到行动；不连续堆特写。
- 遮挡揭示：人物或既有遮挡物移动后露出现场信息；不能为揭示新造门、凶器或隐藏角色。
- 多人关系构图：让行动者、对象和反应同框可读；只用于当前视角能看到的人。
每次选择都具体说明为了看清哪个变化、从哪里到哪里、在哪停。序章写入已有camera与beats.camera字段；续演直接融入动作描述，不输出术语清单。不得为运镜增加剧情事实或代替演员动作。
${perspective === 'first-person' ? '严格第一人称：摄像机是体验角色眼睛，只按其实际姿态、视线和已授权步伐响应。禁航拍、外拍自己的脸/背影、从自己肩后拍摄；细节靠合理视线或注意力变化，不瞬移成微距摄影机。' : '外部视角可用中景、跟拍或必要的关系构图；机位始终服务已确认事件，不突然跳入某个角色的私人认知。'}
同一连续场景锁定角色外观、地标、光源方向、曝光倾向和色调。图生承接真实末帧，不重新设计一套风格。新场景仅在剧情确实换场时调整。不要堆设备品牌、胶片名、8K或帧率来冒充实际接口参数。
慢动作、倾斜机位、眩晕变焦和空镜不是默认选项；若无明确叙事必要则不用。不牺牲原生对白、同步接触声、动作完成和未决尾态的时间来炫技。镜头指令是意图，不代表模型必定执行。`;
}

/** Compact execution constraints; the detailed technique selection belongs to the planner. */
export const CINEMATIC_EXECUTION = '镜头只响应已确认的动作；为了看清变化才跟移、调整视线或焦点，不另外添加运镜表演。保留同场景既有光源方向、色调、人物和空间地标；有参考末帧时以它为准。不用慢动作、空镜或连续特写填时长，不越出指定视角。完整演出动作与反应，保留同步原生声音和未决尾态。';
