import { SPEECH_MAX_CHARS } from './media-policy.ts';
export type SpeechSegment = { text: string; speaker: string };
export function speechSegments(narrative: string, dialogue: { characterId: string; text: string }[], legacy = ''): SpeechSegment[] {
  return [{text:narrative,speaker:'narrator'}, ...dialogue.map(line=>({text:line.text,speaker:line.characterId})),
    ...(!dialogue.length && legacy ? [{text:legacy,speaker:'narrator'}] : [])]
    .flatMap(segment=>{
      const chunks: SpeechSegment[]=[]; let rest=segment.text.trim();
      while(rest.length) {
        let end=Math.min(rest.length,SPEECH_MAX_CHARS);
        if(end<rest.length) {
          const boundary=rest.slice(0,end).search(/[。！？；\n][^。！？；\n]*$/u);
          if(boundary>=Math.floor(end/2)) end=boundary+1;
          // Do not split a surrogate pair.
          if(/[\uD800-\uDBFF]/.test(rest[end-1])) end--;
        }
        chunks.push({text:rest.slice(0,end),speaker:segment.speaker}); rest=rest.slice(end);
      }
      return chunks;
    });
}
