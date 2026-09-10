import { describe, expect, it } from 'vitest';
import { FORMATS } from '../src/formats';
import { Random } from '../src/rng';
import { simulateInnings } from '../src/simulate';
import type { FormatId } from '../src/types';
import { makeSide } from './helpers';

/**
 * Targets come from Cricsheet men's full-member matches since 2018 (see specs/00-engine.md).
 * The bands guard the per-ball realism of the outcome model.
 */
const TARGETS: Record<
  FormatId,
  { runsPerOver: [number, number]; dotRate: [number, number]; boundaryRate: [number, number] }
> = {
  test: { runsPerOver: [3.1, 3.7], dotRate: [0.7, 0.78], boundaryRate: [0.055, 0.075] },
  odi: { runsPerOver: [5.3, 6.1], dotRate: [0.47, 0.56], boundaryRate: [0.09, 0.115] },
  t20: { runsPerOver: [8.1, 9.2], dotRate: [0.33, 0.4], boundaryRate: [0.15, 0.19] },
};

interface Snapshot {
  format: FormatId;
  runsPerInnings: number;
  wicketsPerInnings: number;
  runsPerOver: number;
  ballsPerWicket: number;
  dotRate: number;
  boundaryRate: number;
}

function calibrate(format: FormatId, innings: number, seed: number): Snapshot {
  const random = new Random(seed);
  const { order, attack } = makeSide('A');
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let dotBalls = 0;
  let boundaries = 0;

  for (let i = 0; i < innings; i++) {
    const { state, metrics } = simulateInnings(random, {
      spec: FORMATS[format],
      battingTeamId: 'A',
      bowlingTeamId: 'B',
      battingOrder: order,
      bowlingAttack: attack,
    });
    runs += state.runs;
    wickets += state.wickets;
    legalBalls += state.legalBalls;
    dotBalls += metrics.dotBalls;
    boundaries += metrics.fours + metrics.sixes;
  }

  return {
    format,
    runsPerInnings: runs / innings,
    wicketsPerInnings: wickets / innings,
    runsPerOver: runs / (legalBalls / 6),
    ballsPerWicket: legalBalls / Math.max(1, wickets),
    dotRate: dotBalls / legalBalls,
    boundaryRate: boundaries / legalBalls,
  };
}

describe('simulation calibration against real cricket', () => {
  it('keeps per-ball rates within the calibrated bands', () => {
    const snapshots = [
      calibrate('t20', 2000, 1001),
      calibrate('odi', 2000, 1002),
      calibrate('test', 2000, 1003),
    ];

    console.table(
      snapshots.map((snapshot) => ({
        format: snapshot.format,
        runsPerInnings: snapshot.runsPerInnings.toFixed(1),
        wicketsPerInnings: snapshot.wicketsPerInnings.toFixed(2),
        runsPerOver: snapshot.runsPerOver.toFixed(2),
        ballsPerWicket: snapshot.ballsPerWicket.toFixed(1),
        dotRate: snapshot.dotRate.toFixed(3),
        boundaryRate: snapshot.boundaryRate.toFixed(3),
      })),
    );

    for (const snapshot of snapshots) {
      const target = TARGETS[snapshot.format];
      expect(snapshot.runsPerOver).toBeGreaterThanOrEqual(target.runsPerOver[0]);
      expect(snapshot.runsPerOver).toBeLessThanOrEqual(target.runsPerOver[1]);
      expect(snapshot.dotRate).toBeGreaterThanOrEqual(target.dotRate[0]);
      expect(snapshot.dotRate).toBeLessThanOrEqual(target.dotRate[1]);
      expect(snapshot.boundaryRate).toBeGreaterThanOrEqual(target.boundaryRate[0]);
      expect(snapshot.boundaryRate).toBeLessThanOrEqual(target.boundaryRate[1]);
      expect(snapshot.wicketsPerInnings).toBeLessThanOrEqual(10);
    }
  });
});
