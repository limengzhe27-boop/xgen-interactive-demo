export function makeEndingFixture() {
  const world = {
    id: 'flood-archive', title: '涨水前的档案室', premise: '普通现实世界。社区档案室即将进水，值班员许宁要找到防水箱、装好三本台账，和同事陈舟把箱子搬到楼上。门未锁、箱子可用，不能临时新增困难。',
    timeSetting: '09:00', coreEvent: '保存三本社区台账', surpriseLevel: 1,
    locations: [{ id: 'archive', name: '档案室', description: '桌上三本台账，角落有一只未上锁的防水箱', connectedLocationIds: ['upstairs'] }, { id: 'upstairs', name: '楼上值班室', description: '干燥安全的房间', connectedLocationIds: ['archive'] }],
    characters: [
      { id: 'xu', name: '许宁', identity: '值班员', persona: '务实', publicBackground: '负责台账', privateKnowledge: [], secrets: [], goal: '保存台账', startLocationId: 'archive', imagePrompt: '成年值班员' },
      { id: 'chen', name: '陈舟', identity: '同事', persona: '可靠，听到求助会合作', publicBackground: '熟悉档案室', privateKnowledge: ['紧急联系人暗号紫槐51'], secrets: ['紫槐51'], goal: '帮助保存台账', startLocationId: 'archive', imagePrompt: '成年同事' },
    ], relationships: [],
    rules: [{ id: 'real', description: '遵守现实物理与角色知识；场景提供了足够资源，不能为拖长故事凭空增加锁、敌人或工具缺失。', kind: 'physical', immutable: true }],
    goals: [{ id: 'save', title: '保存三本台账', description: '搬到楼上', scope: 'world', requiredTaskIds: ['box', 'pack', 'move'] }],
    tasks: [
      { id: 'box', title: '拿到防水箱', description: '自行查看角落或请陈舟递来', kind: 'main', assignedRoleIds: ['xu'], prerequisiteTaskIds: [], successCondition: '防水箱已拿到手边', difficulty: '需要实际拿取' },
      { id: 'pack', title: '装入三本台账', description: '装箱并扣好盖子', kind: 'main', assignedRoleIds: ['xu'], prerequisiteTaskIds: ['box'], successCondition: '三本台账均已装箱并盖好', difficulty: '需要确认台账数量' },
      { id: 'move', title: '搬到楼上', description: '自行搬运或请陈舟帮忙', kind: 'main', assignedRoleIds: ['xu'], prerequisiteTaskIds: ['pack'], successCondition: '箱子已搬到干燥的楼上值班室', difficulty: '需要实际搬运' },
    ], difficultyConstraints: [], scheduledEvents: [],
    endingConditions: [
      { id: 'saved', outcome: 'success', description: '台账保存成功', requiredTaskIds: ['box', 'pack', 'move'], requiredFacts: ['台账已搬到楼上'] },
      { id: 'lost', outcome: 'failure', description: '唯一的三本台账被泡毁', requiredTaskIds: [], requiredFailedTaskIds: ['pack'], requiredFacts: ['三本台账已泡毁'] },
    ],
    openingScene: { locationId: 'archive', narrative: '水从门缝渗入，桌上三本台账，角落有可用防水箱。陈舟就在旁边。', presentCharacterIds: ['xu', 'chen'], choices: [] },
  };
  return {
    contractVersion: '2026-09-04.v2', world, selectedRoleId: 'xu', userAction: '', recentTurns: [],
    currentScene: { id: 'opening', title: '涨水前', narrative: world.openingScene.narrative, choices: [] },
    state: { turn: 0, clock: '09:00', location: 'archive', inventory: [], clues: [], knownSecrets: [], committedFacts: [], reachedEndingIds: [], completedTaskIds: [], failedTaskIds: [], taskNotes: {}, characterStates: {}, relationshipTrust: 42, eventLedger: [] },
  };
}
