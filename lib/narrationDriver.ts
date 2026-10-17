import type { NarrationIntent } from './panelPlayback';

// Makes the narrator do what narrationIntent() says — and nothing else. The
// only stateful part of narration: which take is playing and which clip the
// audio player holds. Backends are injected so this is tested without native
// modules; PanelCarousel wires expo-speech and expo-audio in.

export type NarrationBackend = {
  speak(text: string, rate: number): void;
  stopSpeech(): void;
  /** Swap the audio player's source. */
  loadClip(url: string): void;
  seekClip(seconds: number): void;
  setClipRate(rate: number): void;
  playClip(): void;
  pauseClip(): void;
};

export class NarrationDriver {
  private key: string | null = null;
  private loadedUrl: string | null = null;
  private pendingSeek: { url: string; seconds: number } | null = null;

  constructor(private readonly backend: NarrationBackend) {}

  /** Applies an intent. A repeat of the current take is a no-op. */
  apply(intent: NarrationIntent): void {
    if (intent.key === this.key) return;
    this.key = intent.key;
    // Exactly one channel at a time: whatever was playing stops first.
    this.backend.stopSpeech();
    this.backend.pauseClip();
    this.pendingSeek = null;
    if (intent.kind === 'silent') return;
    if (intent.kind === 'speech') {
      this.backend.speak(intent.text, intent.rate);
      return;
    }
    const sameSource = this.loadedUrl === intent.url;
    if (!sameSource) {
      this.backend.loadClip(intent.url);
      this.loadedUrl = intent.url;
    }
    const seconds = intent.startMs / 1000;
    // A clip already loaded is always positioned explicitly: one that played
    // to its end stays parked there (restarting used to be silent because of
    // it). A fresh clip starts at 0 on its own and only needs a seek for an
    // offset — re-applied once it has loaded, since a seek on a still-loading
    // source can be dropped.
    if (sameSource || seconds > 0) this.backend.seekClip(seconds);
    if (!sameSource && seconds > 0) this.pendingSeek = { url: intent.url, seconds };
    this.backend.setClipRate(intent.rate);
    this.backend.playClip();
  }

  /** The audio player reported that `url` finished loading. */
  clipLoaded(url: string): void {
    const pending = this.pendingSeek;
    if (pending && pending.url === url && this.loadedUrl === url) {
      this.pendingSeek = null;
      this.backend.seekClip(pending.seconds);
    }
  }

  /** `url` failed; the next apply must not assume it is loaded or playing. */
  clipFailed(url: string): void {
    if (this.loadedUrl === url) this.loadedUrl = null;
    this.pendingSeek = null;
    this.key = null;
  }

  /** Stop everything and forget the current take (new sequence, unmount). */
  reset(): void {
    this.backend.stopSpeech();
    this.backend.pauseClip();
    this.key = null;
    this.pendingSeek = null;
  }

  get currentKey(): string | null {
    return this.key;
  }
}
