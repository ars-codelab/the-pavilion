import type { MatchResult } from '@pavilion/engine';
import type { PressQuestion } from '@pavilion/narrative';
import type { Actor, Cue, Scene } from './types';

const PRESENTER: Actor = {
  id: 'presenter',
  name: 'Presenter',
  portrait: 'presenter',
  expression: 'neutral',
  position: 'left',
};

function presenterCue(text: string, expression?: string): Cue {
  return expression === undefined
    ? { kind: 'say', actorId: 'presenter', text }
    : { kind: 'say', actorId: 'presenter', text, expression };
}

export function preMatchScene(match: MatchResult, venueName: string, formatName: string): Scene {
  const tossWinner =
    match.toss.winnerTeamId === match.innings[0]?.battingTeamId
      ? `${match.toss.winnerTeamId}`
      : match.toss.winnerTeamId;
  return {
    id: 'pre-match',
    background: 'stadium-day',
    actors: [PRESENTER],
    cues: [
      { kind: 'background', background: 'stadium-day' },
      { kind: 'enter', actor: PRESENTER },
      presenterCue(`Good morning and welcome to ${venueName}.`),
      presenterCue(`It's ${formatName} cricket, and the crowd is building.`),
      presenterCue(`${tossWinner} won the toss and elected to ${match.toss.decision}.`),
      presenterCue('The players take the field. We are ready to begin.', 'happy'),
    ],
  };
}

function topPerformers(match: MatchResult): {
  batter: string;
  runs: number;
  bowler: string;
  wickets: number;
} {
  let batter = '—';
  let runs = -1;
  let bowler = '—';
  let wickets = -1;
  for (const innings of match.innings) {
    for (const entry of innings.state.battingCard) {
      if (entry.runs > runs) {
        runs = entry.runs;
        batter = entry.playerId;
      }
    }
    for (const entry of innings.bowlers) {
      if (entry.wickets > wickets) {
        wickets = entry.wickets;
        bowler = entry.playerId;
      }
    }
  }
  return { batter, runs, bowler, wickets };
}

export function postMatchScene(match: MatchResult): Scene {
  const performers = topPerformers(match);
  return {
    id: 'post-match',
    background: 'stadium-dusk',
    actors: [PRESENTER],
    cues: [
      { kind: 'background', background: 'stadium-dusk' },
      { kind: 'enter', actor: PRESENTER },
      presenterCue('What a contest we have had here.'),
      presenterCue(match.resultText, 'happy'),
      presenterCue(
        `Top score of the match: ${performers.batter} with ${Math.max(0, performers.runs)}.`,
      ),
      presenterCue(
        `Best with the ball: ${performers.bowler}, ${Math.max(0, performers.wickets)} wickets.`,
      ),
      presenterCue('That is all from the Pavilion. Join us next time.', 'happy'),
    ],
  };
}

export function interviewScene(question: PressQuestion): Scene {
  const options = question.options.map((option) => ({
    id: option.id,
    text: option.text,
    effects: option.effects,
  }));
  return {
    id: `interview-${question.id}`,
    background: 'press-room',
    actors: [PRESENTER],
    cues: [
      { kind: 'background', background: 'press-room' },
      { kind: 'enter', actor: PRESENTER },
      presenterCue(question.text),
      { kind: 'choice', prompt: question.text, options },
    ],
  };
}
