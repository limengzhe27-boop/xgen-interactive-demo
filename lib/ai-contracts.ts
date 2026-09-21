import type { WorldIncident, WorldState } from '@/lib/world-state';

export const AI_CONTRACT_VERSION = '2026-09-04.v2';

export type AgentMemory = {
  id: string;
  category: 'genre' | 'tone' | 'character' | 'interaction' | 'surprise' | 'profile' | 'interest' | 'goal' | 'communication';
  value: string;
  confidence: number;
  source: 'explicit' | 'behavior';
  requiresConfirmation: boolean;
};

export type ExperienceSummary = {
  worldId: string;
  selectedRoleId: string;
  completed: boolean;
  actionStyle: string[];
  discoveredClueIds: string[];
  endingId?: string;
};

export type PersonalAgentRequest = {
  activeCreation?: { title: string; step: number; premise: string; conversation: CreatorChatMessage[] };
  recommendationContext?: PersonalAgentResponse['recommendations'];
  conversation?: { role: 'user' | 'assistant'; content: string }[];
  contractVersion: typeof AI_CONTRACT_VERSION;
  userMessage: string;
  currentMemories: AgentMemory[];
  recentExperiences: ExperienceSummary[];
  availableWorldIds: string[];
  availableWorlds: {
    id: string;
    title: string;
    genre: string;
    surpriseLevel: number;
    premise: string;
  }[];
};

export type PersonalAgentResponse = {
  action?: { type: 'none' } | { type: 'open-world'; worldId: string } | { type: 'create-world'; seed: string } | { type: 'resume-creation' };
  reply: string;
  memoryCandidates: AgentMemory[];
  recommendations: {
    worldId: string;
    reason: string;
    matchedMemoryIds: string[];
  }[];
};

export type CharacterDefinition = {
  /** Public display copy, never a projection of private persona or secrets. */
  publicIntroduction?: string;
  chatOpening?: { scene: string; text: string; suggestions?: string[] };
  playable?: boolean;
  isDefault?: boolean;
  entry?: {
    storyAnchor: string;
    completedTaskIds: string[];
    worldFacts: string[];
    knownFacts: string[];
    scene: string;
  };
  cardHook?: string;
  id: string;
  name: string;
  identity: string;
  persona: string;
  publicBackground: string;
  privateKnowledge: string[];
  secrets: string[];
  goal: string;
  startLocationId: string;
  imagePrompt: string;
};

export type CharacterRelationship = {
  fromCharacterId: string;
  toCharacterId: string;
  publicLabel: string;
  privateContext?: string;
  initialTrust: number;
};

export type WorldRule = {
  id: string;
  description: string;
  kind: 'physical' | 'social' | 'knowledge' | 'story';
  immutable: boolean;
};

export type EndingCondition = {
  id: string;
  // Omitted means a world-wide ending (legacy-compatible); otherwise only these roles.
  applicableRoleIds?: string[];
  outcome?: 'success' | 'failure';
  requiredFailedTaskIds?: string[];
  description: string;
  requiredTaskIds: string[];
  requiredFacts: string[];
  forbiddenFacts?: string[];
};

export type WorldGoal = {
  id: string;
  title: string;
  description: string;
  scope: 'world' | 'role';
  roleId?: string;
  requiredTaskIds: string[];
};

export type WorldTask = {
  id: string;
  title: string;
  description: string;
  kind: 'main' | 'side';
  assignedRoleIds: string[];
  prerequisiteTaskIds: string[];
  successCondition: string;
  difficulty: string;
};

export type DifficultyConstraint = {
  id: string;
  description: string;
  blocksTaskId?: string;
  bypassCondition: string;
  consequence: string;
};

export type ScheduledWorldEvent = {
  id: string;
  title: string;
  trigger: string;
  earliestTurn: number;
  effect: string;
};

export type WorldDefinition = {
  publicSynopsis?: string;
  /** Creator's possible story directions, never the current save's event history. */
  storyGraph?: import('./creator-story-graph').CreatorStoryGraph;
  storyHook?: string;
  discoveryGenre?: string;
  system?: import('./world-system').WorldSystem;
  entryPolicy?: import('./player-persona').EntryPolicy;
  /** Private runtime adaptation; never publish a player's session as the original world. */
  entryAdmission?: { mode?: 'newcomer'; roleId: string; originalName: string; name: string; grantedAbilities: string[] };
  id: string;
  title: string;
  premise: string;
  timeSetting: string;
  locations: { id: string; name: string; description: string; connectedLocationIds: string[] }[];
  characters: CharacterDefinition[];
  relationships: CharacterRelationship[];
  rules: WorldRule[];
  coreEvent: string;
  surpriseLevel: 1 | 2 | 3 | 4;
  goals: WorldGoal[];
  tasks: WorldTask[];
  difficultyConstraints: DifficultyConstraint[];
  scheduledEvents: ScheduledWorldEvent[];
  endingConditions: EndingCondition[];
  openingScene: {
    locationId: string;
    narrative: string;
    presentCharacterIds: string[];
    choices: { id: string; label: string; intent: string }[];
  };
};

export type StoryOutlineBeat = {
  id: string;
  title: string;
  location: string;
  objective: string;
  turningPoint: string;
};

export type CreatorTaskDraft = {
  id: string;
  title: string;
  description: string;
  kind: 'main' | 'side';
  prerequisiteTaskIds: string[];
  successCondition: string;
  difficulty: string;
  /** Missing means legacy/all roles; an explicit list assigns this task. */
  assignedRoleIds?: string[];
};

export type CreatorBrief = {
  synopsis?: string;
  storyGraph?: import('./creator-story-graph').CreatorStoryGraph;
  discoveryGenre?: string;
  coreGoal: string;
  preferredDirection: string;
  alternativeDirection: string;
  complexityLevel: 1 | 2 | 3 | 4;
  tasks: CreatorTaskDraft[];
  difficulties: string[];
  scheduledEvents: { title: string; trigger: string; effect: string }[];
};

export type CreatorChatMessage = {
  role: 'creator' | 'agent';
  content: string;
  incomplete?: boolean;
};

export type CreatorAgentRequest = {
  authorContext?: import('./creator-author-context').CreatorAuthorContext;
  pendingProposal?: CreatorAgentResponse['proposal'];
  pendingSuggestions?: {section: string; value: unknown}[];
  companionContext?: { confirmedMemories: string[]; conversation: NonNullable<PersonalAgentRequest['conversation']> };
  contractVersion: typeof AI_CONTRACT_VERSION;
  userMessage: string;
  conversation: CreatorChatMessage[];
  characters: (Pick<CharacterDefinition, 'name' | 'identity' | 'persona' | 'cardHook' | 'publicIntroduction'> & { id?: string; goal?: string; relationship?: string; appearance?: string })[];
  editingContext?: { step: number; section: string; focusedField?: string };
  relationshipNotes: string[];
  currentDraft: {
    entryPolicy?: import('./player-persona').EntryPolicy;
    title: string;
    premise: string;
    surpriseLevel: 1 | 2 | 3 | 4;
    brief: CreatorBrief;
  };
};

export type CreatorAgentResponse = {
  /** A real conversation reply with no applicable draft mutation. */
  discussionOnly?: boolean;
  proposalIssue?: string;
  reply: string;
  proposal: {
    entryPolicy?: import('./player-persona').EntryPolicy;
    surpriseLevel?: 1 | 2 | 3 | 4;
    title: string;
    premise: string;
    characters?: { name: string; identity: string; persona: string; relationship: string; appearance: string; goal?: string; cardHook?: string; publicIntroduction?: string }[];
    brief: CreatorBrief;
  };
  nextQuestions: string[];
  readiness: 'needs_detail' | 'ready';
};

export type WorldGenerationRequest = {
  continuation?: { base: WorldDefinition; previousProposal?: WorldDefinition };
  contractVersion: typeof AI_CONTRACT_VERSION;
  creatorIntent?: string;
  characters: (Pick<CharacterDefinition, 'name' | 'identity' | 'persona' | 'cardHook'> & { id?: string; goal?: string })[];
  relationshipNotes: string[];
  storySeed?: string;
  surpriseLevel: 1 | 2 | 3 | 4;
  creatorBrief: CreatorBrief;
};

export type WorldGenerationResponse = {
  world: WorldDefinition;
  storyOutline: StoryOutlineBeat[];
  generationNotes: string[];
  unresolvedQuestions: string[];
};

export type StatePatch = {
  clock?: string;
  locationId?: string;
  addInventory?: string[];
  removeInventory?: string[];
  addClues?: string[];
  addKnownSecrets?: string[];
  completeTaskIds?: string[];
  failTaskIds?: string[];
  taskNotes?: Record<string, string>;
  characterUpdates?: Record<string, { locationId?: string; status?: string; lastAction?: string }>;
  relationshipDeltas?: Record<string, number>;
  committedFacts: string[];
};

export type ImageDirective = {
  required: boolean;
  reason: 'opening' | 'location_changed' | 'character_changed' | 'major_event' | 'reuse';
  sceneId: string;
  prompt?: string;
  reuseAssetId?: string;
};

export type WorldTurnRequest = {
  presentation?: { medium: 'native-video'; seconds: 5 | 15 };
  contractVersion: typeof AI_CONTRACT_VERSION;
  world: WorldDefinition;
  selectedRoleId: string;
  interaction?: { mode: 'character-chat'; targetCharacterId: string };
  conversationMemory?: {
    firstUserMessage: string | null;
    greeting: string | null;
    totalTurns: number;
  };
  userAction: string;
  state: WorldState;
  recentTurns: { action: string; result: string }[];
  currentScene: {
    id: string;
    title: string;
    narrative: string;
    speakerCharacterId?: string;
    dialogue?: string;
    choices: {
      id: string;
      label: string;
      intent: string;
      outcomeHint?: string;
      statePatchHint?: Pick<StatePatch, 'addClues' | 'relationshipDeltas'>;
    }[];
  };
  nextScene?: {
    id: string;
    title: string;
    narrative: string;
    speakerCharacterId?: string;
    dialogue?: string;
    choices: { id: string; label: string; intent: string }[];
  };
  interruptedDraft?: string;
};

export type WorldTurnResponse = {
  actionDecision: {
    allowed: boolean;
    reason?: string;
    suggestedAlternative?: string;
  };
  narrative: string;
  dialogue: { characterId: string; text: string; visibleToRoleIds: string[] }[];
  statePatch: StatePatch;
  nextChoices: { id: string; label: string; intent: string }[];
  incident?: WorldIncident;
  image: ImageDirective;
  goalProgress: {
    activeTaskIds: string[];
    completedTaskIds: string[];
    summary: string;
  };
  ending: { reached: boolean; endingId?: string; outcome?: 'success' | 'failure'; canContinue: boolean };
};

export type StreamChunk = {
  delta: string;
  text: string;
};

export interface AIAdapter {
  talkToPersonalAgent(input: PersonalAgentRequest, signal?: AbortSignal, onChunk?: (chunk: StreamChunk) => void): Promise<PersonalAgentResponse>;
  coCreateWorld(input: CreatorAgentRequest, signal?: AbortSignal, onChunk?: (chunk: StreamChunk) => void): Promise<CreatorAgentResponse>;
  generateWorld(input: WorldGenerationRequest, signal?: AbortSignal, onChunk?: (chunk: StreamChunk) => void): Promise<WorldGenerationResponse>;
  advanceWorld(input: WorldTurnRequest, signal?: AbortSignal, onChunk?: (chunk: StreamChunk) => void): Promise<WorldTurnResponse>;
}
