import type { Effects } from '@pavilion/narrative';
import type { ChoiceOption, PendingChoice, Scene, TimelineState } from './types';

function mergeEffects(base: Effects, add?: Effects): Effects {
  if (add === undefined) return base;
  return {
    morale: (base.morale ?? 0) + (add.morale ?? 0),
    boardConfidence: (base.boardConfidence ?? 0) + (add.boardConfidence ?? 0),
    reputation: (base.reputation ?? 0) + (add.reputation ?? 0),
    form: (base.form ?? 0) + (add.form ?? 0),
  };
}

export function startScene(scene: Scene): TimelineState {
  return {
    sceneId: scene.id,
    background: scene.background,
    actors: scene.actors.map((actor) => ({ ...actor })),
    index: 0,
    lines: [],
    pendingChoice: null,
    effects: {},
    done: scene.cues.length === 0,
  };
}

function atEnd(index: number, scene: Scene): boolean {
  return index >= scene.cues.length;
}

export function tick(state: TimelineState, scene: Scene, optionId?: string): TimelineState {
  if (state.done) return state;

  if (state.pendingChoice !== null) {
    if (optionId === undefined) return state;
    const option = state.pendingChoice.options.find((entry) => entry.id === optionId);
    const nextIndex = state.index + 1;
    return {
      ...state,
      pendingChoice: null,
      index: nextIndex,
      effects: mergeEffects(state.effects, option?.effects),
      lines:
        option === undefined
          ? state.lines
          : [...state.lines, { actorId: 'player', text: option.text }],
      done: atEnd(nextIndex, scene),
    };
  }

  const cue = scene.cues[state.index];
  if (cue === undefined) return { ...state, done: true };
  const nextIndex = state.index + 1;
  const base = { ...state, index: nextIndex, done: atEnd(nextIndex, scene) };

  switch (cue.kind) {
    case 'say': {
      const actors = state.actors.map((actor) =>
        actor.id === cue.actorId && cue.expression !== undefined
          ? { ...actor, expression: cue.expression }
          : actor,
      );
      return { ...base, actors, lines: [...state.lines, { actorId: cue.actorId, text: cue.text }] };
    }
    case 'enter':
      return { ...base, actors: [...state.actors, { ...cue.actor }] };
    case 'exit':
      return { ...base, actors: state.actors.filter((actor) => actor.id !== cue.actorId) };
    case 'background':
      return { ...base, background: cue.background };
    case 'effect':
      return { ...base, effects: mergeEffects(state.effects, cue.effects) };
    case 'wait':
      return base;
    case 'choice': {
      const pendingChoice: PendingChoice = { prompt: cue.prompt, options: cue.options };
      return { ...state, pendingChoice };
    }
  }
}

/** Run a scene to completion, supplying the ids of choices in order. */
export function playScene(scene: Scene, choices: readonly string[] = []): TimelineState {
  let state = startScene(scene);
  let choiceIndex = 0;
  let guard = 0;
  while (!state.done && guard < 1000) {
    guard += 1;
    if (state.pendingChoice !== null) {
      const optionId = choices[choiceIndex];
      choiceIndex += 1;
      if (optionId === undefined) break;
      state = tick(state, scene, optionId);
    } else {
      state = tick(state, scene);
    }
  }
  return state;
}

export function choiceOptions(state: TimelineState): ChoiceOption[] {
  return state.pendingChoice?.options ?? [];
}
