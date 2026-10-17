import type { NarrationIntent } from './panelPlayback';

// Makes the narrator do what narrationIntent() says — and nothing else. It
// decides WHICH take runs; the ordering of native audio commands within a
// take (buffer → seek → play → confirm) is ClipBank's job, behind
// startClip/stopClip. Backends are injected so this is tested without native
// modules; PanelCarousel wires expo-speech and the sequencer in.

export type NarrationBackend = {
  speak(text: string, rate: number): void;
  stopSpeech(): void;
  /** Play `url` from `startMs` at `rate`, superseding any clip in flight. */
  startClip(url: string, startMs: number, rate: number): void;
  stopClip(): void;
};

export class NarrationDriver {
  private key: string | null = null;

  constructor(private readonly backend: NarrationBackend) {}

  /** Applies an intent. A repeat of the current take is a no-op. */
  apply(intent: NarrationIntent): void {
    if (intent.key === this.key) return;
    this.key = intent.key;
    // Exactly one channel at a time: whatever was playing stops first.
    this.backend.stopSpeech();
    this.backend.stopClip();
    if (intent.kind === 'silent') return;
    if (intent.kind === 'speech') {
      this.backend.speak(intent.text, intent.rate);
      return;
    }
    this.backend.startClip(intent.url, intent.startMs, intent.rate);
  }

  /** The current take failed; the next apply must run even with the same key. */
  clipFailed(): void {
    this.key = null;
  }

  /** Stop everything and forget the current take (new sequence, unmount). */
  reset(): void {
    this.backend.stopSpeech();
    this.backend.stopClip();
    this.key = null;
  }

  get currentKey(): string | null {
    return this.key;
  }
}
