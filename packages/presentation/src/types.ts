import type { Effects } from '@pavilion/narrative';

export type StagePosition = 'left' | 'centre' | 'right';

export interface Actor {
  id: string;
  name: string;
  /** Sprite/portrait key resolved by the renderer. */
  portrait: string;
  expression: string;
  position: StagePosition;
}

export interface ChoiceOption {
  id: string;
  text: string;
  effects?: Effects;
}

export type Cue =
  | { kind: 'say'; actorId: string; text: string; expression?: string }
  | { kind: 'enter'; actor: Actor }
  | { kind: 'exit'; actorId: string }
  | { kind: 'background'; background: string }
  | { kind: 'wait'; ms: number }
  | { kind: 'effect'; effects: Effects }
  | { kind: 'choice'; prompt: string; options: ChoiceOption[] };

export interface Scene {
  id: string;
  background: string;
  actors: Actor[];
  cues: Cue[];
}

export interface TimelineLine {
  actorId: string;
  text: string;
}

export interface PendingChoice {
  prompt: string;
  options: ChoiceOption[];
}

export interface TimelineState {
  sceneId: string;
  background: string;
  actors: Actor[];
  index: number;
  lines: TimelineLine[];
  pendingChoice: PendingChoice | null;
  effects: Effects;
  done: boolean;
}
