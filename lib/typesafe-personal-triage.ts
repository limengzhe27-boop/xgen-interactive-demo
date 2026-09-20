/**
 * TypeSafe System One Intent & Creation Triage for Personal Agent.
 * Follows TypeSafe official patterns (Intent Routing & Confidence Gating).
 * Evaluates whether user wants casual chat, story browsing, or world creation.
 */

export type PersonalTriage = {
  intent: 'casual_chat' | 'browse_stories' | 'create_world' | 'roleplay';
  confidence: number;
  creationReadiness?: number;
  targetGenre?: 'urban_romance' | 'family_estate' | 'workplace' | 'historical_wuxia' | 'mystery_suspense' | 'fantasy_scifi' | 'other';
  shouldSuggestCreation: boolean;
};

const intentValues = new Set<PersonalTriage['intent']>([
  'casual_chat', 'browse_stories', 'create_world', 'roleplay',
]);

const genreValues = new Set<NonNullable<PersonalTriage['targetGenre']>>([
  'urban_romance', 'family_estate', 'workplace', 'historical_wuxia', 'mystery_suspense', 'fantasy_scifi', 'other',
]);

const MINIMUM_CONFIDENCE = 0.60;
const TRIAGE_TIMEOUT_MS = 2_500;

function stringValue(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function resultFor(payload: unknown, name: string): Record<string, unknown> | null {
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

export function parsePersonalTriage(payload: unknown): PersonalTriage | null {
  const intentResult = resultFor(payload, 'intent');
  const choice = typeof intentResult?.choice === 'string' ? intentResult.choice : '';
  if (!intentValues.has(choice as PersonalTriage['intent']) || !probability(intentResult?.confidence) || intentResult.confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  const creationResult = resultFor(payload, 'shouldSuggestCreation');
  const readinessResult = resultFor(payload, 'creationReadiness');
  const genreResult = resultFor(payload, 'targetGenre');

  const readiness = typeof readinessResult?.score === 'number' && Number.isFinite(readinessResult.score)
    ? Math.max(0, Math.min(2, Math.round(readinessResult.score)))
    : undefined;

  const genre = genreResult?.type === 'choice' && typeof genreResult.choice === 'string' && genreValues.has(genreResult.choice as NonNullable<PersonalTriage['targetGenre']>)
    ? genreResult.choice as NonNullable<PersonalTriage['targetGenre']>
    : undefined;

  const shouldSuggestCreation = creationResult?.type === 'noul' && probability(creationResult.noul) && creationResult.noul >= 0.65;

  return {
    intent: choice as PersonalTriage['intent'],
    confidence: intentResult.confidence,
    ...(readiness !== undefined ? { creationReadiness: readiness } : {}),
    ...(genre ? { targetGenre: genre } : {}),
    shouldSuggestCreation,
  };
}

/**
 * Classifies user intent in Personal Agent conversation using TypeSafe System One.
 * Sends minimal, non-sensitive context.
 * Falls back to null when offline or without API key.
 */
export async function classifyPersonalTurn(input: {
  userMessage: string;
  recentConversation?: { role: string; content: string }[];
}): Promise<PersonalTriage | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return null;

  const userMessage = stringValue(input.userMessage, 1_200);
  if (!userMessage) return null;

  const conversation = Array.isArray(input.recentConversation)
    ? input.recentConversation.slice(-3).flatMap((turn) => {
        const content = stringValue(turn?.content, 400);
        return content ? [{ role: stringValue(turn?.role, 16), content }] : [];
      })
    : [];

  const state = {
    userMessage,
    recentConversation: conversation,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRIAGE_TIMEOUT_MS);

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
          intent: {
            type: 'choice',
            instructions: 'Classify the primary intent of this user message to the personal assistant. Use recentConversation only to resolve pronouns. Negation ("不要做世界", "先别建") overrides creation keywords.',
            criteria: {
              casual_chat: 'Daily conversation, sharing feelings, asking for listening, life advice, or ordinary chat.',
              browse_stories: 'Asking to find, recommend, explore or enter existing published stories or worlds.',
              create_world: 'Expressing an idea for a new story, wanting to brainstorm or create a world, or asking the assistant to generate an interactive world.',
              roleplay: 'Discussing user persona, character identity, or playing a role directly.',
            },
          },
          creationReadiness: {
            type: 'score',
            instructions: 'Rate how ready and explicit this thought is for world creation.',
            criteria: [
              '0: Just chatting or a vague keyword without asking for world generation.',
              '1: Has an interesting story premise, conflict or topic to brainstorm.',
              '2: Explicit request or command to create, build or generate a complete world right now.',
            ],
          },
          targetGenre: {
            type: 'choice',
            instructions: 'The genre or theme of the creative concept, if mentioned.',
            criteria: {
              urban_romance: 'Urban romance, contracts, emotional drama, substitute lover.',
              family_estate: 'Family conflicts, inheritance dispute, wealthy family drama.',
              workplace: 'Modern career, workplace, business rivalry.',
              historical_wuxia: 'Historical dynasty, martial arts, palace, ancient drama.',
              mystery_suspense: 'Investigation, suspense, crime solving, secrets, manor mystery.',
              fantasy_scifi: 'Xianxia, fantasy, sci-fi, supernatural, magic world.',
              other: 'Other genre or unspecified.',
            },
          },
          shouldSuggestCreation: {
            type: 'noul',
            instructions: 'Is the user actively asking or proposing to create an interactive world with characters and plot? Return false if user is rejecting creation or just making small talk.',
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    return parsePersonalTriage(data);
  } catch {
    return null;
  }
}

/**
 * Top-level triage function for Personal Agent.
 * Runs TypeSafe System One (Jev) first.
 * If offline or without API key, smoothly degrades to deterministic classifier.
 */
export async function triagePersonalAgentMessage(input: {
  userMessage: string;
  conversation?: { role: string; content: string }[];
  hasActiveCreation?: boolean;
  activeCreationTitle?: string;
}): Promise<{
  intent: 'casual_chat' | 'browse_stories' | 'create_world' | 'roleplay';
  confidence: number;
  creationReadiness: 'none' | 'exploring' | 'ready';
  targetGenre?: string;
  shouldSuggestCreation: boolean;
}> {
  const remote = await classifyPersonalTurn({
    userMessage: input.userMessage,
    recentConversation: input.conversation,
  });

  if (remote) {
    return {
      intent: remote.intent,
      confidence: remote.confidence,
      creationReadiness: remote.creationReadiness === 2 ? 'ready' : remote.creationReadiness === 1 ? 'exploring' : 'none',
      targetGenre: remote.targetGenre,
      shouldSuggestCreation: remote.shouldSuggestCreation,
    };
  }

  // Deterministic fallback (offline or without remote API key)
  const text = input.userMessage.trim();

  const isRejecting = /(不要做世界|先别建|先聊聊|不急着|别急着给建议|只想聊|随便聊)/.test(text);
  if (isRejecting) {
    return {
      intent: 'casual_chat',
      confidence: 0.95,
      creationReadiness: 'none',
      shouldSuggestCreation: false,
    };
  }

  const isBrowsing = /(推荐|有什么好玩的|找个世界|选一个|看看有什么故事|打开《|进入世界)/.test(text);
  if (isBrowsing) {
    return {
      intent: 'browse_stories',
      confidence: 0.9,
      creationReadiness: 'none',
      shouldSuggestCreation: false,
    };
  }

  const isCreating = /(构思|创造|生成|写一个|做个|建一个|开新坑|世界观|剧本|争家产|仙侠|悬疑|密室|商战)/.test(text);
  if (isCreating) {
    const isExplicitReady = /(帮我|请|来|现在|直接)?(生成|创建|写一个|做个|建一个|构思一个)/.test(text);
    let genre = '剧情推演';
    if (/家产|豪门|遗产|继承|商战/.test(text)) genre = '家族商战';
    else if (/仙侠|宗门|修仙|灵兽|秘境/.test(text)) genre = '仙侠悬疑';
    else if (/密室|暴风雪|山庄|凶案|凶手|不在场/.test(text)) genre = '密室悬疑';
    else if (/合约|白月光|替身|恋爱|情感/.test(text)) genre = '都市情感';

    return {
      intent: 'create_world',
      confidence: 0.88,
      creationReadiness: isExplicitReady ? 'ready' : 'exploring',
      targetGenre: genre,
      shouldSuggestCreation: true,
    };
  }

  return {
    intent: 'casual_chat',
    confidence: 0.8,
    creationReadiness: 'none',
    shouldSuggestCreation: false,
  };
}
