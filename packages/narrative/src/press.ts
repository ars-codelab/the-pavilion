import type { Random } from '@pavilion/engine';
import type { Effects, NarrativeContext, Tone } from './types';

export interface PressOption {
  id: string;
  text: string;
  tone: Tone;
  effects: Effects;
  reply: string;
}

export interface PressQuestion {
  id: string;
  text: string;
  options: PressOption[];
}

type QuestionFactory = (context: NarrativeContext) => PressQuestion;

const FACTORIES: QuestionFactory[] = [
  (context) => ({
    id: 'form',
    text: `${context.teamName} have had a mixed run. Where do you stand?`,
    options: [
      {
        id: 'confident',
        text: 'We are building something and I back this group',
        tone: 'positive',
        effects: { morale: 4, reputation: 1 },
        reply: 'A confident message that settles the dressing room.',
      },
      {
        id: 'honest',
        text: 'We are not good enough right now',
        tone: 'neutral',
        effects: { morale: -2, boardConfidence: 2 },
        reply: 'Honest, if not exactly uplifting.',
      },
      {
        id: 'deflect',
        text: 'I will not be discussing the team in public',
        tone: 'defensive',
        effects: { morale: -1, reputation: -1 },
        reply: 'The room grows colder.',
      },
    ],
  }),
  (context) => ({
    id: 'star',
    text: `Are you worried about holding on to ${context.starPlayerName}?`,
    options: [
      {
        id: 'protect',
        text: `He is staying put. End of story`,
        tone: 'aggressive',
        effects: { morale: 3, reputation: 2 },
        reply: 'A rallying cry the supporters repeat all week.',
      },
      {
        id: 'dodge',
        text: 'You would have to ask his agent',
        tone: 'neutral',
        effects: { morale: -1 },
        reply: 'The rumour mill spins on.',
      },
    ],
  }),
  (context) => ({
    id: 'board',
    text: `The board has been quiet about ${context.teamName}. Is your position secure?`,
    options: [
      {
        id: 'calm',
        text: 'I speak to the board every week; we are aligned',
        tone: 'positive',
        effects: { boardConfidence: 3, morale: 1 },
        reply: 'A steady answer that keeps the wolves at bay.',
      },
      {
        id: 'challenge',
        text: 'If they want me gone, they can say so',
        tone: 'aggressive',
        effects: { boardConfidence: -3, reputation: 2 },
        reply: 'A gamble that plays well with the fans.',
      },
    ],
  }),
  (context) => ({
    id: 'pressure',
    text: `The ${context.teamName} supporters are getting restless. Your message to them?`,
    options: [
      {
        id: 'grateful',
        text: 'Stay with us. This team will repay your faith',
        tone: 'positive',
        effects: { morale: 2, reputation: 2 },
        reply: 'The terraces respond warmly.',
      },
      {
        id: 'demand',
        text: 'We need more from everyone, including the stands',
        tone: 'aggressive',
        effects: { morale: 1, reputation: -2 },
        reply: 'A spiky line that splits opinion.',
      },
    ],
  }),
];

export function generatePressConference(
  random: Random,
  context: NarrativeContext,
  count = 3,
): PressQuestion[] {
  const pool = [...FACTORIES];
  const questions: PressQuestion[] = [];
  while (questions.length < count && pool.length > 0) {
    const index = random.int(0, pool.length - 1);
    const factory = pool.splice(index, 1)[0];
    if (factory !== undefined) questions.push(factory(context));
  }
  return questions;
}
