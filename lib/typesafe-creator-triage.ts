/**
 * A deliberately small System One judgment used to steer the co-creation
 * conversation. It is advisory only: author instructions and the deterministic
 * creator guidance remain the source of truth.
 */
export type CreatorTriage = {
  focus: 'world_foundation' | 'character_depth' | 'event_evolution' | 'story_canvas' | 'open_discussion';
  confidence: number;
  shouldClarify: boolean;
  horizontal?: 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6';
  vertical?: 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'none';
};

const focusValues = new Set<CreatorTriage['focus']>([
  'world_foundation', 'character_depth', 'event_evolution', 'story_canvas', 'open_discussion',
]);

const TRIAGE_TIMEOUT_MS = 2_500;
const MINIMUM_CONFIDENCE = 0.65;

function stringValue(value: unknown, limit: number) {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function resultFor(payload: unknown, name: string) {
  const root = recordValue(payload);
  if (!root) return null;
  for (const container of [root, recordValue(root.results), recordValue(root.answers), recordValue(root.questions)]) {
    const result = container && recordValue(container[name]);
    if (result) return result;
  }
  return null;
}

function probability(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

// Thresholds are conservative application defaults, not calibrated accuracy claims.
export function parseCreatorTriage(payload: unknown): CreatorTriage | null {
  const focus = resultFor(payload, 'focus');
  const choice = typeof focus?.choice === 'string' ? focus.choice : '';
  if (!focusValues.has(choice as CreatorTriage['focus']) || !probability(focus?.confidence) || focus.confidence < MINIMUM_CONFIDENCE) return null;
  const clarify = resultFor(payload, 'shouldClarify');
  const horizontal = resultFor(payload, 'horizontal');
  const vertical = resultFor(payload, 'vertical');
  const h = horizontal?.type === 'choice' && probability(horizontal.confidence) && horizontal.confidence >= 0.75
    && typeof horizontal.choice === 'string' && /^H[1-6]$/.test(horizontal.choice) ? horizontal.choice as CreatorTriage['horizontal'] : undefined;
  const v = vertical?.type === 'choice' && probability(vertical.confidence) && vertical.confidence >= 0.75
    && typeof vertical.choice === 'string' && /^(V[1-6]|none)$/.test(vertical.choice) ? vertical.choice as CreatorTriage['vertical'] : undefined;
  return {
    focus: choice as CreatorTriage['focus'], confidence: focus.confidence,
    shouldClarify: clarify?.type === 'noul' && probability(clarify.noul) && clarify.noul >= 0.7,
    ...(h ? { horizontal: h } : {}), ...(v ? { vertical: v } : {}),
  };
}

/**
 * Send only the minimal, current creator-turn context. In particular, companion
 * memories, draft premise, relationship notes, and pending proposals are not
 * sent to TypeSafe.
 */
export async function classifyCreatorTurn(input: unknown): Promise<CreatorTriage | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  const request = recordValue(input);
  if (!apiKey || !request) return null;

  const userMessage = stringValue(request.userMessage, 1_200);
  if (!userMessage) return null;

  const editingContext = recordValue(request.editingContext);
  const characters = Array.isArray(request.characters) ? request.characters.slice(0, 5).flatMap((value) => {
    const character = recordValue(value);
    if (!character) return [];
    return [{
      name: stringValue(character.name, 80),
      identity: stringValue(character.identity, 120),
    }];
  }) : [];
  const conversation = Array.isArray(request.conversation) ? request.conversation.slice(-3).flatMap((value) => {
    const message = recordValue(value);
    const content = stringValue(message?.content, 400);
    return content ? [{ role: stringValue(message?.role, 16), content }] : [];
  }) : [];

  const state = {
    userMessage,
    editingContext: editingContext ? {
      section: stringValue(editingContext.section, 120),
      focusedField: stringValue(editingContext.focusedField, 80),
    } : null,
    characters,
    recentConversation: conversation,
  };

  try {
    const response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state,
        questions: {
          horizontal: {
            type: 'choice',
            instructions: 'Select the immediate creative work requested in userMessage. Use recentConversation only to resolve continuation or pronouns. Current instructions and negation override old topics and editingContext. A mentioned topic is not necessarily the requested task. This selects advice, never permission to edit. Choose unknown if not clear.',
            criteria: {
              H1: 'Clarify content direction, tone, participation and scope.',
              H2: 'Develop or locally edit a character identity, personality, motivation or appearance.',
              H3: 'Define world rules, relationships or who knows what.',
              H4: 'Design the shared opening or a selectable character entry and takeover.',
              H5: 'Develop later events, conditional consequences, branches or endings.',
              H6: 'Write public title, synopsis, selection introduction or presentation brief.',
              unknown: 'Insufficient context, unrelated request, or media production rather than content creation.',
            },
          },
          vertical: {
            type: 'choice',
            instructions: 'Which ONE participation-design method is most useful for the current request, resolving continuation using recentConversation? Do not assign based on genre or a negated word. Choose none for simple edits, public copy, media production, unclear requests, or no applicable method. This is optional advice, not a story decision.',
            criteria: {
              V1: 'Discovering and evaluating information or clues.',
              V2: 'Listening, expressing needs, boundaries and relationship changes.',
              V3: 'Negotiating goals, controlled leverage, exchanges and concessions.',
              V4: 'Survival, scarce resources and risk tradeoffs.',
              V5: 'Exploring unknown spaces, learning abilities and overcoming obstacles.',
              V6: 'Building or managing something through investment and sustained feedback.',
              none: 'No participation method needed or supported by this request.',
            },
          },
          focus: {
            type: 'choice',
            instructions: 'Classify the author\'s immediate co-creation focus. Do not infer hidden preferences or create story content.',
            criteria: {
              world_foundation: 'They are defining or changing setting, rules, premise, or shared world assumptions.',
              character_depth: 'They are defining or changing a character, motivation, relationship, identity, or appearance.',
              event_evolution: 'They are discussing a concrete event, conflict, consequence, or possible plot development.',
              story_canvas: 'They are explicitly working on story graph nodes, branches, entries, opening, or connections.',
              open_discussion: 'They are exploring broadly, greeting, or the focus is not sufficiently specific.',
            },
          },
          shouldClarify: {
            type: 'noul',
            instructions: 'Would a single targeted clarification materially prevent the assistant from inventing a consequential story assumption? Answer no when the author gives an explicit instruction that can be executed as written.',
          },
        },
      }),
      signal: AbortSignal.timeout(TRIAGE_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    return parseCreatorTriage(await response.json());
  } catch {
    // TypeSafe is an optional advisory service. Preserve normal creation when unavailable.
    return null;
  }
}

export function creatorTriageGuidance(triage: CreatorTriage | null) {
  if (!triage) return '';
  const focus = {
    world_foundation: '世界前提与共同规则',
    character_depth: '人物、动机或关系',
    event_evolution: '具体事件、冲突或后果',
    story_canvas: '故事画布、节点或分支',
    open_discussion: '开放探索与当前想法',
  }[triage.focus];
  return `\n【结构化创作焦点（辅助判断，不覆盖作者原话）】\n本轮可能聚焦：${focus}。先承接作者这轮的具体内容，并遵守既有共创与画布规则。${triage.shouldClarify ? '若作者尚未明确委托执行，且一个关键前提会改变后续设定，可以只问一个具体问题；作者已有可执行指令时仍直接执行。' : '信息已足以沿当前方向讨论或执行；不要为了提问而阻断明确指令。'}`;
}
