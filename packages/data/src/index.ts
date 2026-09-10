import type { Team } from '@pavilion/engine';
import { toEngineTeam } from './schema';
import type { RawMarquee, RawTeam, RawVenue } from './schema';
import { validateAllMarquee, validateAllTeams, validateAllVenues } from './schema';
import australiaRaw from './data/teams/australia-legends.json';
import australiaCurrentRaw from './data/teams/australia-current.json';
import englandRaw from './data/teams/england-legends.json';
import indiaRaw from './data/teams/india-legends.json';
import indiaCurrentRaw from './data/teams/india-current.json';
import westIndiesRaw from './data/teams/west-indies-legends.json';
import marqueeRaw from './data/marquee.json';
import venuesRaw from './data/venues.json';

export const venues = venuesRaw as unknown as RawVenue[];
export const teams = [
  englandRaw,
  indiaRaw,
  australiaRaw,
  westIndiesRaw,
  indiaCurrentRaw,
  australiaCurrentRaw,
] as unknown as RawTeam[];
export const marquee = marqueeRaw as unknown as RawMarquee[];

const contentErrors = [
  ...validateAllVenues(venues),
  ...validateAllTeams(teams),
  ...validateAllMarquee(marquee),
];
if (contentErrors.length > 0) {
  throw new Error(`invalid content data:\n${contentErrors.join('\n')}`);
}

export function findVenue(id: string): RawVenue {
  const venue = venues.find((entry) => entry.id === id);
  if (venue === undefined) throw new Error(`unknown venue: ${id}`);
  return venue;
}

export function findTeam(id: string): RawTeam {
  const team = teams.find((entry) => entry.id === id);
  if (team === undefined) throw new Error(`unknown team: ${id}`);
  return team;
}

export function findMarquee(id: string): RawMarquee {
  const entry = marquee.find((player) => player.id === id);
  if (entry === undefined) throw new Error(`unknown marquee player: ${id}`);
  return entry;
}

export function engineTeam(id: string): Team {
  return toEngineTeam(findTeam(id));
}

export { derivePortrait, toEnginePlayer, toEngineTeam } from './schema';
export type {
  Built,
  FacialHair,
  HairStyle,
  MarqueeRole,
  PortraitSpec,
  RawMarquee,
  RawPlayer,
  RawTeam,
  RawVenue,
} from './schema';
