import { describe, expect, it } from 'vitest';
import { FORMATS } from '../src/formats';
import { Random } from '../src/rng';
import { simulateInnings } from '../src/simulate';
import type { FormatId } from '../src/types';
import { makeSide } from './helpers';

interface Snapshot {
  format: FormatId;
  innings: number;
  runsPerInnings: number;
  wicketsPerInnings: number;
  runsPerOver: number;
  runsPerWicket: number;
}

function calibrate(format: FormatId, innings: number, seed: number): Snapshot {
  const random = new Random(seed);
  const { order, attack } = makeSide('A');
  let runs = 0;
  let wickets = 0;
  let balls = 0;

  for (let i = 0; i < innings; i++) {
    const { state } = simulateInnings(random, {
      spec: FORMATS[format],
      battingTeamId: 'A',
      bowlingTeamId: 'B',
      battingOrder: order,
      bowlingAttack: attack,
    });
    runs += state.runs;
    wickets += state.wickets;
    balls += state.legalBalls;
  }

  const overs = balls / 6;
  return {
    format,
    innings,
    runsPerInnings: runs / innings,
    wicketsPerInnings: wickets / innings,
    runsPerOver: runs / overs,
    runsPerWicket: runs / Math.max(1, wickets),
  };
}

describe('simulation calibration snapshot', () => {
  it('produces plausible aggregate ranges per format', () => {
    const snapshots = [
      calibrate('t20', 300, 1001),
      calibrate('odi', 300, 1002),
      calibrate('test', 300, 1003),
    ];
    console.table(
      snapshots.map((snapshot) => ({
        format: snapshot.format,
        runsPerInnings: snapshot.runsPerInnings.toFixed(1),
        wicketsPerInnings: snapshot.wicketsPerInnings.toFixed(2),
        runsPerOver: snapshot.runsPerOver.toFixed(2),
        runsPerWicket: snapshot.runsPerWicket.toFixed(1),
      })),
    );

    const byFormat = new Map(snapshots.map((snapshot) => [snapshot.format, snapshot]));
    const t20 = byFormat.get('t20');
    const odi = byFormat.get('odi');
    const test = byFormat.get('test');
    if (t20 === undefined || odi === undefined || test === undefined) {
      throw new Error('missing snapshot');
    }

    expect(t20.runsPerInnings).toBeGreaterThan(60);
    expect(t20.runsPerInnings).toBeLessThan(300);
    expect(odi.runsPerInnings).toBeGreaterThan(100);
    expect(odi.runsPerInnings).toBeLessThan(400);
    expect(test.runsPerInnings).toBeGreaterThan(120);
    expect(test.runsPerInnings).toBeLessThan(600);

    for (const snapshot of snapshots) {
      expect(snapshot.wicketsPerInnings).toBeGreaterThanOrEqual(0);
      expect(snapshot.wicketsPerInnings).toBeLessThanOrEqual(10);
    }
  });
});
