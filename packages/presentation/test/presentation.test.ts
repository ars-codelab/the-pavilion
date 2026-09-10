import { describe, expect, it } from 'vitest';
import { FORMATS, Random, simulateMatch } from '@pavilion/engine';
import type { MatchResult, Player, Team } from '@pavilion/engine';
import type { PressQuestion } from '@pavilion/narrative';
import { interviewScene, postMatchScene, preMatchScene } from '../src/scenes';
import { playScene, startScene, tick } from '../src/timeline';
import type { Scene } from '../src/types';

function player(id: string, batting: number, bowling: number): Player {
  return {
    id,
    surname: id,
    initials: 'X',
    nationality: 'TST',
    battingPositionRole: 'specialist',
    battingStyle: 'strokeplayer',
    bowlingType: bowling > 0 ? 'fast' : 'none',
    bowlingRole: bowling > 0 ? 'main' : 'never',
    fieldingType: 'normal',
    isWicketKeeper: false,
    ratings: {
      battingSkill: batting,
      bowlingSkill: bowling,
      fieldingSkill: 15,
      battingAggression: 50,
      bowlingAggression: 50,
    },
  };
}

function team(id: string): Team {
  return {
    id,
    name: id,
    battingOrder: [48, 44, 42, 40, 38, 34, 30, 24, 16, 10, 7].map((bat, index) =>
      player(`${id}${index + 1}`, bat, 0),
    ),
    bowlingAttack: [50, 46, 42, 38].map((bowl, index) => player(`${id}B${index + 1}`, 12, bowl)),
  };
}

function sampleMatch(): MatchResult {
  return simulateMatch(new Random(9), { spec: FORMATS.t20, home: team('HOM'), away: team('AWY') });
}

const SCENE: Scene = {
  id: 'test',
  background: 'bg1',
  actors: [],
  cues: [
    { kind: 'background', background: 'bg2' },
    {
      kind: 'enter',
      actor: { id: 'a', name: 'A', portrait: 'a', expression: 'neutral', position: 'left' },
    },
    { kind: 'say', actorId: 'a', text: 'Hello', expression: 'happy' },
    {
      kind: 'choice',
      prompt: 'Pick',
      options: [
        { id: 'x', text: 'X', effects: { morale: 5 } },
        { id: 'y', text: 'Y', effects: { morale: -5 } },
      ],
    },
    { kind: 'exit', actorId: 'a' },
    { kind: 'effect', effects: { reputation: 3 } },
  ],
};

describe('presentation timeline', () => {
  it('applies staging, dialogue and choices', () => {
    const start = startScene(SCENE);
    expect(start.background).toBe('bg1');

    let state = tick(start, SCENE);
    expect(state.background).toBe('bg2');
    state = tick(state, SCENE);
    expect(state.actors).toHaveLength(1);
    state = tick(state, SCENE);
    expect(state.lines).toEqual([{ actorId: 'a', text: 'Hello' }]);
    expect(state.actors[0]?.expression).toBe('happy');

    state = tick(state, SCENE);
    expect(state.pendingChoice).not.toBeNull();
    expect(state.done).toBe(false);
    state = tick(state, SCENE, 'x');
    expect(state.effects.morale).toBe(5);
  });

  it('plays a scene to completion with choices', () => {
    const state = playScene(SCENE, ['y']);
    expect(state.done).toBe(true);
    expect(state.actors).toHaveLength(0);
    expect(state.effects.morale).toBe(-5);
    expect(state.effects.reputation).toBe(3);
    expect(state.lines.map((line) => line.text)).toEqual(['Hello', 'Y']);
  });

  it('builds and plays a pre-match scene', () => {
    const match = sampleMatch();
    const state = playScene(preMatchScene(match, "Lord's", 'T20'));
    expect(state.done).toBe(true);
    expect(state.lines.length).toBeGreaterThan(3);
  });

  it('builds a post-match scene containing the result', () => {
    const match = sampleMatch();
    const state = playScene(postMatchScene(match));
    expect(state.lines.some((line) => line.text === match.resultText)).toBe(true);
  });

  it('turns a press question into an interactive interview', () => {
    const question: PressQuestion = {
      id: 'form',
      text: 'How do you feel?',
      options: [
        { id: 'good', text: 'Confident', tone: 'positive', effects: { morale: 4 }, reply: 'Good.' },
        { id: 'bad', text: 'Worried', tone: 'defensive', effects: { morale: -2 }, reply: 'Hmm.' },
      ],
    };
    const scene = interviewScene(question);
    const pending = playScene(scene, []);
    expect(pending.pendingChoice).not.toBeNull();
    const resolved = playScene(scene, ['good']);
    expect(resolved.pendingChoice).toBeNull();
    expect(resolved.effects.morale).toBe(4);
  });
});
