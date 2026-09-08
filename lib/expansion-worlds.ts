import { createExpansion } from './expansion-builder.ts';
import { classicSeeds } from './expansion-classics.ts';
import { firstPersonSeeds } from './expansion-first-person.ts';
import { dramaSeeds } from './expansion-drama.ts';

export const expansionSeeds = [...classicSeeds, ...firstPersonSeeds, ...dramaSeeds];
export const expansionWorlds = expansionSeeds.map(createExpansion);
