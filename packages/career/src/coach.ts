import type { Random } from '@pavilion/engine';
import { generateObjectives, recordObjectiveProgress } from './objectives';
import type { CoachCareer, JobOffer, MatchOutcome } from './types';

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function createCoach(
  id: string,
  name: string,
  teamId: string,
  random: Random,
  deadline: string,
): CoachCareer {
  return {
    id,
    name,
    teamId,
    reputation: 50,
    boardConfidence: 60,
    objectives: generateObjectives(random, deadline),
    seasons: 0,
  };
}

/** Update reputation and board confidence after a result, and credit objectives. */
export function recordResult(career: CoachCareer, outcome: MatchOutcome): CoachCareer {
  const swing: Record<MatchOutcome, { reputation: number; board: number }> = {
    W: { reputation: 2, board: 3 },
    L: { reputation: -2, board: -4 },
    D: { reputation: 0, board: -1 },
    T: { reputation: 1, board: 0 },
  };
  const delta = swing[outcome];
  let objectives = career.objectives;
  if (outcome === 'W') objectives = recordObjectiveProgress(objectives, 'win-matches');
  return {
    ...career,
    reputation: clamp(career.reputation + delta.reputation),
    boardConfidence: clamp(career.boardConfidence + delta.board),
    objectives,
  };
}

export function generateJobOffers(
  random: Random,
  coach: CoachCareer,
  teams: readonly { id: string; name: string }[],
  count = 3,
): JobOffer[] {
  const pool = teams.filter((team) => team.id !== coach.teamId);
  const offers: JobOffer[] = [];
  const remaining = [...pool];
  const wanted = Math.min(count, remaining.length);
  for (let i = 0; i < wanted; i += 1) {
    const team = random.pick(remaining);
    remaining.splice(
      remaining.findIndex((entry) => entry.id === team.id),
      1,
    );
    const reputationRequired = random.int(30, 80);
    offers.push({
      teamId: team.id,
      teamName: team.name,
      reputationRequired,
      salary: 100 + reputationRequired * 2,
    });
  }
  return offers;
}

export function canAccept(coach: CoachCareer, offer: JobOffer): boolean {
  return coach.reputation >= offer.reputationRequired;
}

export function acceptJob(
  coach: CoachCareer,
  offer: JobOffer,
  random: Random,
  deadline: string,
): CoachCareer {
  if (!canAccept(coach, offer)) throw new Error('reputation too low for this role');
  return {
    ...coach,
    teamId: offer.teamId,
    boardConfidence: 60,
    objectives: generateObjectives(random, deadline),
    seasons: 0,
  };
}
