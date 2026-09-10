export type EventTier = 'flavour' | 'context' | 'story';

export type EventCategory = 'media' | 'board' | 'player' | 'weather' | 'rival' | 'fans';

export type Tone = 'positive' | 'neutral' | 'aggressive' | 'defensive';

export type ResultLetter = 'W' | 'L' | 'D' | 'T';

export interface NarrativeContext {
  teamName: string;
  matchesPlayed: number;
  recentResults: readonly ResultLetter[];
  /** 0-100, 50 neutral. */
  form: number;
  morale: number;
  boardConfidence: number;
  reputation: number;
  starPlayerName: string;
  starPlayerForm: number;
}

export interface Effects {
  morale?: number;
  boardConfidence?: number;
  reputation?: number;
  form?: number;
}

export interface EventConditions {
  minMatches?: number;
  minMorale?: number;
  maxMorale?: number;
  minForm?: number;
  maxForm?: number;
  minBoardConfidence?: number;
  maxBoardConfidence?: number;
  minReputation?: number;
  maxReputation?: number;
  lastResult?: ResultLetter;
}

export interface EventChoice {
  id: string;
  text: string;
  tone: Tone;
  effects: Effects;
  response: string;
}

export interface NarrativeEvent {
  id: string;
  tier: EventTier;
  category: EventCategory;
  title: string;
  body: string;
  weight: number;
  cooldownDays: number;
  conditions?: EventConditions;
  effects?: Effects;
  choices?: EventChoice[];
}
