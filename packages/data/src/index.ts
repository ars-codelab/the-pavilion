import type { Team } from '@pavilion/engine';
import { toEngineTeam } from './schema';
import type { RawTeam, RawVenue } from './schema';
import { validateAllTeams, validateAllVenues } from './schema';
import australiaRaw from './data/teams/australia-legends.json';
import englandRaw from './data/teams/england-legends.json';
import indiaRaw from './data/teams/india-legends.json';
import westIndiesRaw from './data/teams/west-indies-legends.json';
import venuesRaw from './data/venues.json';

export const venues = venuesRaw as unknown as RawVenue[];
export const teams = [englandRaw, indiaRaw, australiaRaw, westIndiesRaw] as unknown as RawTeam[];

const contentErrors = [...validateAllVenues(venues), ...validateAllTeams(teams)];
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

export function engineTeam(id: string): Team {
  return toEngineTeam(findTeam(id));
}

export { toEnginePlayer, toEngineTeam } from './schema';
export type { RawPlayer, RawTeam, RawVenue } from './schema';
