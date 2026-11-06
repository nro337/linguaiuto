import type { Cue } from '@/core/cues';

/** Subset of a YouTube caption track from the player response. */
export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  /** 'asr' for auto-generated tracks. */
  kind?: string;
  vssId?: string;
  /** Whether YouTube can auto-translate this track. */
  isTranslatable?: boolean;
}

export interface TrackChoice {
  track: CaptionTrack;
  /** Set when YouTube must auto-translate `track` into this language. */
  tlang?: string;
}

const primary = (code: string) => code.toLowerCase().split(/[-_]/)[0] ?? '';

/**
 * Best track for `lang`: human-made in that language, then auto-generated in
 * that language, then YouTube's auto-translation of the best other track.
 */
export function chooseTrack(tracks: readonly CaptionTrack[], lang: string): TrackChoice | null {
  const want = primary(lang);
  const inLang = tracks.filter((t) => primary(t.languageCode) === want);
  const manual = inLang.find((t) => t.kind !== 'asr');
  if (manual) return { track: manual };
  if (inLang[0]) return { track: inLang[0] };

  const source = tracks.find((t) => t.kind !== 'asr') ?? tracks[0];
  return source ? { track: source, tlang: want } : null;
}

/** Track-specific params we set ourselves; everything else is copied from the player's request. */
const TRACK_PARAMS = new Set(['lang', 'kind', 'name', 'tlang', 'fmt']);

/**
 * Builds a timedtext URL for `choice` using the player's own request as a
 * template, so it carries the token (`pot`) and client params the player sent.
 */
export function buildTimedTextUrl(capturedUrl: string, choice: TrackChoice): string {
  const captured = new URL(capturedUrl, 'https://www.youtube.com');
  const url = new URL(choice.track.baseUrl, 'https://www.youtube.com');
  for (const [key, value] of captured.searchParams) {
    if (!TRACK_PARAMS.has(key) && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  url.searchParams.set('fmt', 'json3');
  if (choice.tlang) url.searchParams.set('tlang', choice.tlang);
  else url.searchParams.delete('tlang');
  return url.toString();
}

interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: { utf8?: string }[];
}

/** Parses YouTube's json3 caption format into sorted, non-overlapping cues. */
export function parseJson3(data: unknown): Cue[] {
  const events = (data as { events?: Json3Event[] } | null)?.events ?? [];
  const cues: Cue[] = [];
  for (const event of events) {
    if (!event.segs || event.tStartMs == null) continue;
    const text = event.segs
      .map((s) => s.utf8 ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    cues.push({ start: event.tStartMs, end: event.tStartMs + (event.dDurationMs ?? 0), text });
  }
  cues.sort((a, b) => a.start - b.start);
  // Auto-generated captions overlap (rolling two-line window). Show one cue at a time.
  for (let i = 0; i < cues.length - 1; i++) {
    const next = cues[i + 1]!;
    if (cues[i]!.end > next.start) cues[i]!.end = next.start;
  }
  return cues.filter((c) => c.end > c.start);
}
