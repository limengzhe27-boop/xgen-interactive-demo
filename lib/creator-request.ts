// Only the current request may commit into the active draft, including cleanup.
export class CreatorRequest {
  private controller: AbortController | null = null;
  cancel() { this.controller?.abort(); this.controller = null; }
  start() { this.cancel(); const controller = new AbortController(); this.controller = controller; return controller.signal; }
  current(signal: AbortSignal) { return this.controller?.signal === signal && !signal.aborted; }
}
