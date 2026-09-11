import type {WorldTurnRequest} from './ai-contracts';

// Model-only projection: validation and saved/billing keys keep the full request.
// Keep every rule, task, fact, relationship and character knowledge boundary.
export function compactVideoScriptInput(input:WorldTurnRequest){
  const {openingScene:_opening,storyHook:_hook,discoveryGenre:_genre,...world}=input.world;
  const {eventLedger:_duplicateHistory,rolePerspectives:_otherPrivateHistories,...state}=input.state;
  return {...input,state,world:{...world,characters:world.characters.map(({cardHook:_cardHook,...character})=>character)}};
}
