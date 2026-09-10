import type { Random } from '@pavilion/engine';
import type { NarrativeContext } from './types';

export type HeadlineTone = 'positive' | 'neutral' | 'negative';

export interface Headline {
  outlet: string;
  text: string;
  tone: HeadlineTone;
}

const OUTLETS = ['The Pavilion Post', 'Stumps Daily', 'The Legside', 'Silly Point Gazette'];

type HeadlineFactory = (context: NarrativeContext) => string;

const POSITIVE: HeadlineFactory[] = [
  (context) => `${context.teamName} roll on as ${context.starPlayerName} dazzles`,
  (context) => `Fearless ${context.teamName} have the crowd believing`,
  (context) => `Masterclass: how ${context.teamName} turned the corner`,
];

const NEGATIVE: HeadlineFactory[] = [
  (context) => `Crisis? ${context.teamName} face awkward questions`,
  (context) => `${context.starPlayerName} left exposed as ${context.teamName} falter`,
  (context) => `Board patience wearing thin at ${context.teamName}`,
];

const NEUTRAL: HeadlineFactory[] = [
  (context) => `${context.teamName} grind out another mixed week`,
  (context) => `Selection debate rumbles on at ${context.teamName}`,
  (context) => `${context.starPlayerName} shows flashes but ${context.teamName} wait`,
];

export function generateHeadlines(
  random: Random,
  context: NarrativeContext,
  count = 4,
): Headline[] {
  const tone: HeadlineTone =
    context.form >= 60 ? 'positive' : context.form <= 40 ? 'negative' : 'neutral';
  const source = tone === 'positive' ? POSITIVE : tone === 'negative' ? NEGATIVE : NEUTRAL;
  const headlines: Headline[] = [];
  for (let i = 0; i < count; i += 1) {
    const factory = random.pick(source);
    headlines.push({
      outlet: random.pick(OUTLETS),
      text: factory(context),
      tone,
    });
  }
  return headlines;
}
