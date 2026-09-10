export type FormatId = 'test' | 'odi' | 't20';

export type BattingPositionRole =
  'opener' | 'specialist' | 'all-rounder' | 'late-order' | 'tail-ender';

export type BattingStyle = 'grafter' | 'strokeplayer' | 'aggressive' | 'slogger';

export type BowlingType =
  'none' | 'off-spin' | 'leg-spin' | 'slow' | 'medium' | 'medium-fast' | 'fast-medium' | 'fast';

export type BowlingRole =
  'new-ball' | 'main' | 'support' | 'occasional' | 'very-occasional' | 'never';

export type FieldingType = 'wicket-keeper' | 'specialist' | 'slip' | 'normal' | 'poor';

export interface PlayerRatings {
  /** Roughly a Test batting average; 0-100 scale. */
  battingSkill: number;
  /** 70 - Test bowling average; 0-100 scale so it is comparable to battingSkill. */
  bowlingSkill: number;
  fieldingSkill: number;
  /** 0 = passive, 100 = maximum aggression. */
  battingAggression: number;
  bowlingAggression: number;
}

export interface Player {
  id: string;
  surname: string;
  initials: string;
  nationality: string;
  battingPositionRole: BattingPositionRole;
  battingStyle: BattingStyle;
  bowlingType: BowlingType;
  bowlingRole: BowlingRole;
  fieldingType: FieldingType;
  isWicketKeeper: boolean;
  ratings: PlayerRatings;
}

export type BallColour = 'red' | 'white';

export interface FormatSpec {
  id: FormatId;
  name: string;
  ballsPerOver: number;
  inningsPerTeam: 1 | 2;
  maxOversPerInnings: number | null;
  maxDays: number | null;
  maxOversPerDay: number | null;
  hasDeclarations: boolean;
  hasFollowOn: boolean;
  followOnRuns: number | null;
  hasPowerplay: boolean;
  hasFreeHit: boolean;
  usesDls: boolean;
  newBallOvers: number | null;
  ballColour: BallColour;
}

export type ExtraKind = 'wide' | 'noball' | 'bye' | 'legbye';

export type DismissalKind =
  'bowled' | 'caught' | 'lbw' | 'run-out' | 'stumped' | 'hit-wicket' | 'retired';

export type DismissedEnd = 'striker' | 'non-striker';

export interface DeliveryExtra {
  kind: ExtraKind;
  /** Additional runs beyond the mandatory one for a wide/no-ball. */
  runs: number;
}

export interface DeliveryWicket {
  kind: DismissalKind;
  batter: DismissedEnd;
}

/** A delivery whose outcome has already been decided; the law reducer applies it. */
export interface ResolvedDelivery {
  runsOffBat: number;
  extra: DeliveryExtra | null;
  wicket: DeliveryWicket | null;
}

export interface BatterInnings {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
}

export interface BowlerInnings {
  playerId: string;
  legalBalls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  maidens: number;
}

export interface InningsState {
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  /** Legal deliveries bowled in the innings. */
  legalBalls: number;
  batters: [BatterInnings, BatterInnings];
  /** Every batter who has batted, in order of arrival, with final figures. */
  battingCard: BatterInnings[];
  striker: 0 | 1;
  battingOrder: string[];
  nextBatter: number;
  closed: boolean;
}
