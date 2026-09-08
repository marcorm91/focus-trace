export type MediaReviewOutcome = 'pass' | 'review';

type ScanRoot = Document | Element;

type MediaElementWithTracks = HTMLMediaElement & {
  audioTracks?: { length: number };
  textTracks?: ArrayLike<{ kind?: string }>;
  srcObject?: unknown;
};

export interface PrerecordedAudioAlternativeEvaluation {
  element: HTMLAudioElement;
  outcome: MediaReviewOutcome;
  alternativeSignals: string[];
  detail: string;
}

export interface PrerecordedCaptionEvaluation {
  element: HTMLVideoElement;
  outcome: MediaReviewOutcome;
  captionTracks: number;
  subtitleTracks: number;
  audioTrackState: 'present' | 'absent' | 'unknown';
  detail: string;
}

const TRANSCRIPT_PATTERN = /\b(?:transcript|transcription|transcripci[oó]n|transcri[cç][aã]o|trascrizione|transkript)\b/i;
const STREAM_SOURCE_PATTERN = /(?:\.m3u8|\.mpd)(?:$|[?#])/i;

function scopedElements<T extends Element>(root: ScanRoot, selector: string): T[] {
  const descendants = [...root.querySelectorAll<T>(selector)];
  return root instanceof Element && root.matches(selector) ? [root as T, ...descendants] : descendants;
}

function sourceUrls(media: HTMLMediaElement): string[] {
  const urls = new Set<string>();
  const currentSrc = media.currentSrc?.trim();
  if (currentSrc) urls.add(currentSrc);
  const ownSrc = media.getAttribute('src')?.trim();
  if (ownSrc) urls.add(ownSrc);
  for (const source of media.querySelectorAll('source[src]')) {
    const src = source.getAttribute('src')?.trim();
    if (src) urls.add(src);
  }
  return [...urls];
}

function prerecordedEvidence(media: HTMLMediaElement): { applicable: boolean; reason: string } {
  const duration = media.duration;
  if (duration === Number.POSITIVE_INFINITY) {
    return { applicable: false, reason: 'duration is infinite, which is a live-stream signal' };
  }
  if (Number.isFinite(duration) && duration > 0) {
    return { applicable: true, reason: `finite media duration ${duration.toFixed(2)}s` };
  }

  const extended = media as MediaElementWithTracks;
  if (extended.srcObject) {
    return { applicable: false, reason: 'a live MediaStream/srcObject is attached' };
  }

  const sources = sourceUrls(media);
  if (!sources.length) return { applicable: false, reason: 'no inspectable media source is present' };
  if (sources.every((source) => source.startsWith('blob:') || source.startsWith('mediastream:'))) {
    return { applicable: false, reason: 'only opaque stream/blob sources are present' };
  }
  if (sources.every((source) => STREAM_SOURCE_PATTERN.test(source))) {
    return { applicable: false, reason: 'only streaming-playlist sources are present' };
  }

  return { applicable: true, reason: 'an inspectable non-stream media source is present' };
}

function referencedTextSignals(media: HTMLElement): string[] {
  const signals: string[] = [];
  for (const attribute of ['aria-describedby', 'aria-details'] as const) {
    const ids = media.getAttribute(attribute)?.trim().split(/\s+/).filter(Boolean) ?? [];
    for (const id of ids) {
      const target = document.getElementById(id);
      const text = target?.textContent?.replace(/\s+/g, ' ').trim();
      if (text) signals.push(`${attribute} -> #${id}`);
    }
  }
  return signals;
}

function transcriptSignals(media: HTMLMediaElement): string[] {
  const signals = referencedTextSignals(media);

  const nativeCaptionTracks = [...media.querySelectorAll('track[kind="captions"][src]')];
  if (nativeCaptionTracks.length) signals.push(`${nativeCaptionTracks.length} native captions track(s)`);

  const localScope = media.closest('figure') ?? media.parentElement;
  if (localScope && localScope !== document.body && localScope !== document.documentElement) {
    for (const link of localScope.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const text = `${link.textContent ?? ''} ${link.getAttribute('aria-label') ?? ''} ${link.getAttribute('href') ?? ''}`;
      if (TRANSCRIPT_PATTERN.test(text)) signals.push(`transcript-like link ${JSON.stringify(link.getAttribute('href') ?? '')}`);
    }
    for (const details of localScope.querySelectorAll('details')) {
      const summary = details.querySelector(':scope > summary')?.textContent ?? '';
      if (TRANSCRIPT_PATTERN.test(summary)) signals.push('transcript-like details disclosure');
    }
  }

  return [...new Set(signals)];
}

function nativeTextTrackCount(video: HTMLVideoElement, kind: 'captions' | 'subtitles'): number {
  const domTracks = [...video.querySelectorAll(`track[kind="${kind}"][src]`)].length;
  const runtimeTracks = (video as MediaElementWithTracks).textTracks;
  if (!runtimeTracks) return domTracks;

  let runtimeCount = 0;
  for (let index = 0; index < runtimeTracks.length; index += 1) {
    if (runtimeTracks[index]?.kind?.toLowerCase() === kind) runtimeCount += 1;
  }
  return Math.max(domTracks, runtimeCount);
}

function audioTrackState(video: HTMLVideoElement): 'present' | 'absent' | 'unknown' {
  const tracks = (video as MediaElementWithTracks).audioTracks;
  if (!tracks || typeof tracks.length !== 'number') return 'unknown';
  return tracks.length > 0 ? 'present' : 'absent';
}

export function evaluatePrerecordedAudioAlternatives(
  root: ScanRoot,
): PrerecordedAudioAlternativeEvaluation[] {
  const evaluations: PrerecordedAudioAlternativeEvaluation[] = [];

  for (const audio of scopedElements<HTMLAudioElement>(root, 'audio')) {
    const prerecorded = prerecordedEvidence(audio);
    if (!prerecorded.applicable) continue;

    const alternatives = transcriptSignals(audio);
    const outcome: MediaReviewOutcome = alternatives.length ? 'pass' : 'review';
    evaluations.push({
      element: audio,
      outcome,
      alternativeSignals: alternatives,
      detail: alternatives.length
        ? `Prerecorded evidence: ${prerecorded.reason}. Observable alternative signal(s): ${alternatives.join('; ')}. FocusTrace does not verify equivalence of the alternative content.`
        : `Prerecorded evidence: ${prerecorded.reason}. No captions track, non-empty aria-describedby/aria-details target, or nearby transcript-like link/disclosure was observed. FocusTrace cannot rule out an equivalent alternative elsewhere in the page or application.`,
    });
  }

  return evaluations;
}

export function evaluatePrerecordedCaptions(root: ScanRoot): PrerecordedCaptionEvaluation[] {
  const evaluations: PrerecordedCaptionEvaluation[] = [];

  for (const video of scopedElements<HTMLVideoElement>(root, 'video')) {
    const prerecorded = prerecordedEvidence(video);
    if (!prerecorded.applicable) continue;

    const audioState = audioTrackState(video);
    if (audioState === 'absent') continue;

    const captionTracks = nativeTextTrackCount(video, 'captions');
    const subtitleTracks = nativeTextTrackCount(video, 'subtitles');
    const outcome: MediaReviewOutcome = captionTracks > 0 ? 'pass' : 'review';
    const audioEvidence = audioState === 'present'
      ? 'browser audioTracks reports auditory content'
      : 'auditory content could not be determined from browser media APIs';

    evaluations.push({
      element: video,
      outcome,
      captionTracks,
      subtitleTracks,
      audioTrackState: audioState,
      detail: captionTracks > 0
        ? `Prerecorded evidence: ${prerecorded.reason}; ${audioEvidence}. ${captionTracks} observable captions track(s) found${subtitleTracks ? `; ${subtitleTracks} subtitles track(s) also present` : ''}. FocusTrace does not verify caption accuracy or completeness.`
        : `Prerecorded evidence: ${prerecorded.reason}; ${audioEvidence}. No observable captions track was found${subtitleTracks ? `; ${subtitleTracks} subtitles track(s) are present but are not treated as captions` : ''}. Review burned-in captions, custom-player captions, whether the video actually contains audio, and WCAG applicability before treating this as a failure.`,
    });
  }

  return evaluations;
}
