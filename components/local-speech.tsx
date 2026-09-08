'use client';
import { CompanyMedia } from './company-media';
// Compatibility component name; runtime synthesis uses the company gateway.
export function LocalSpeech(props:{text:string;speaker?:string;accountScope:string}) {
  return <CompanyMedia kind="speech" {...props}/>;
}
