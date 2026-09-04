import type { WorldIncident, WorldState } from '@/lib/world-state';

export const AI_CONTRACT_VERSION = '2026-09-04.v1';

export type AgentMemory = {
  id: string;
  category: 'genre' | 'tone' | 'character' | 'interaction' | 'surprise';
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
  reply: string;
  memoryCandidates: AgentMemory[];
  recommendations: {
    worldId: string;
    reason: string;
    matchedMemoryIds: string[];
  }[];
};

export type CharacterDefinition = {
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
  description: string;
  requiredFacts: string[];
  forbiddenFacts?: string[];
};

export type WorldDefinition = {
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

export type WorldGenerationRequest = {
  contractVersion: typeof AI_CONTRACT_VERSION;
  creatorIntent?: string;
  characters: Pick<CharacterDefinition, 'name' | 'identity' | 'persona'>[];
  relationshipNotes: string[];
  storySeed?: string;
  surpriseLevel: 1 | 2 | 3 | 4;
  targetDurationMinutes: number;
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
  contractVersion: typeof AI_CONTRACT_VERSION;
  world: WorldDefinition;
  selectedRoleId: string;
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
  ending: { reached: boolean; endingId?: string; canContinue: boolean };
};

export interface AIAdapter {
  talkToPersonalAgent(input: PersonalAgentRequest): Promise<PersonalAgentResponse>;
  generateWorld(input: WorldGenerationRequest): Promise<WorldGenerationResponse>;
  advanceWorld(input: WorldTurnRequest, signal?: AbortSignal): Promise<WorldTurnResponse>;
}
