export type MediaReviewOutcome = 'pass' | 'review';
export type MediaTimingKind = 'prerecorded' | 'live' | 'unknown';

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

export interface PrerecordedVideoAlternativeEvaluation {
  element: HTMLVideoElement;
  outcome: MediaReviewOutcome;
  audioDescriptionSignals: string[];
  mediaAlternativeSignals: string[];
  audioTrackState: 'present' | 'absent' | 'unknown';
  detail: string;
}

export interface LiveCaptionEvaluation {
  element: HTMLVideoElement;
  outcome: MediaReviewOutcome;
  captionTracks: number;
  subtitleTracks: number;
  audioTrackState: 'present' | 'absent' | 'unknown';
  detail: string;
}

export interface PrerecordedAudioDescriptionEvaluation {
  element: HTMLVideoElement;
  outcome: MediaReviewOutcome;
  audioDescriptionSignals: string[];
  audioTrackState: 'present' | 'absent' | 'unknown';
  detail: string;
}

const TRANSCRIPT_PATTERN = /\b(?:transcript|transcription|transcripci[oó]n|transcri[cç][aã]o|trascrizione|transkript)\b/i;
const AUDIO_DESCRIPTION_PATTERN = /\b(?:audio[-\s]?description|audio[-\s]?described|described\s+version|audiodescripci[oó]n|versi[oó]n\s+audiodescrita|audiodescri[cç][aã]o|vers[aã]o\s+audiodescrita|audiodescrizione|versione\s+audiodescritta|audiodeskription)\b/i;
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

function mediaTimingEvidence(media: HTMLMediaElement): { kind: MediaTimingKind; reason: string } {
  const extended = media as MediaElementWithTracks;
  if (extended.srcObject) {
    return { kind: 'live', reason: 'a MediaStream/srcObject is attached' };
  }

  const duration = media.duration;
  if (duration === Number.POSITIVE_INFINITY) {
    return { kind: 'live', reason: 'duration is infinite' };
  }
  if (Number.isFinite(duration) && duration > 0) {
    return { kind: 'prerecorded', reason: `finite media duration ${duration.toFixed(2)}s` };
  }

  const sources = sourceUrls(media);
  if (!sources.length) return { kind: 'unknown', reason: 'no inspectable media source is present' };
  if (sources.some((source) => source.startsWith('mediastream:'))) {
    return { kind: 'live', reason: 'a mediastream source is present' };
  }
  if (sources.every((source) => source.startsWith('blob:'))) {
    return { kind: 'unknown', reason: 'only opaque blob sources are present' };
  }
  if (sources.every((source) => STREAM_SOURCE_PATTERN.test(source))) {
    return { kind: 'unknown', reason: 'only streaming-playlist sources are present without runtime timing evidence' };
  }

  return { kind: 'prerecorded', reason: 'an inspectable non-stream media source is present' };
}

function prerecordedEvidence(media: HTMLMediaElement): { applicable: boolean; reason: string } {
  const timing = mediaTimingEvidence(media);
  return { applicable: timing.kind === 'prerecorded', reason: timing.reason };
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

function nearbyScope(media: HTMLMediaElement): Element | null {
  const scope = media.closest('figure') ?? media.parentElement;
  if (!scope || scope === document.body || scope === document.documentElement) return null;
  return scope;
}

function transcriptLikeSignals(media: HTMLMediaElement): string[] {
  const signals: string[] = [];
  const localScope = nearbyScope(media);
  if (!localScope) return signals;

  for (const link of localScope.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const text = `${link.textContent ?? ''} ${link.getAttribute('aria-label') ?? ''} ${link.getAttribute('href') ?? ''}`;
    if (TRANSCRIPT_PATTERN.test(text)) signals.push(`transcript-like link ${JSON.stringify(link.getAttribute('href') ?? '')}`);
  }
  for (const details of localScope.querySelectorAll('details')) {
    const summary = details.querySelector(':scope > summary')?.textContent ?? '';
    if (TRANSCRIPT_PATTERN.test(summary)) signals.push('transcript-like details disclosure');
  }
  return signals;
}

function transcriptSignals(media: HTMLMediaElement): string[] {
  const signals = [...referencedTextSignals(media), ...transcriptLikeSignals(media)];

  const nativeCaptionTracks = [...media.querySelectorAll('track[kind="captions"][src]')];
  if (nativeCaptionTracks.length) signals.push(`${nativeCaptionTracks.length} native captions track(s)`);

  return [...new Set(signals)];
}

function videoMediaAlternativeSignals(video: HTMLVideoElement): string[] {
  return [...new Set([...referencedTextSignals(video), ...transcriptLikeSignals(video)])];
}

function nativeTextTrackCount(video: HTMLVideoElement, kind: 'captions' | 'subtitles' | 'descriptions'): number {
  const domTracks = [...video.querySelectorAll(`track[kind="${kind}"][src]`)].length;
  const runtimeTracks = (video as MediaElementWithTracks).textTracks;
  if (!runtimeTracks) return domTracks;

  let runtimeCount = 0;
  for (let index = 0; index < runtimeTracks.length; index += 1) {
    if (runtimeTracks[index]?.kind?.toLowerCase() === kind) runtimeCount += 1;
  }
  return Math.max(domTracks, runtimeCount);
}

function audioDescriptionSignals(video: HTMLVideoElement): string[] {
  const signals: string[] = [];
  const descriptionTracks = nativeTextTrackCount(video, 'descriptions');
  if (descriptionTracks > 0) signals.push(`${descriptionTracks} native descriptions track(s)`);

  const localScope = nearbyScope(video);
  if (localScope) {
    for (const candidate of localScope.querySelectorAll<HTMLElement>('a[href], button')) {
      const text = [
        candidate.textContent ?? '',
        candidate.getAttribute('aria-label') ?? '',
        candidate instanceof HTMLAnchorElement ? candidate.getAttribute('href') ?? '' : '',
      ].join(' ');
      if (!AUDIO_DESCRIPTION_PATTERN.test(text)) continue;
      if (candidate instanceof HTMLAnchorElement) {
        signals.push(`audio-description-like link ${JSON.stringify(candidate.getAttribute('href') ?? '')}`);
      } else {
        signals.push('audio-description-like button');
      }
    }
  }

  return [...new Set(signals)];
}

function audioTrackState(video: HTMLVideoElement): 'present' | 'absent' | 'unknown' {
  const tracks = (video as MediaElementWithTracks).audioTracks;
  if (!tracks || typeof tracks.length !== 'number') return 'unknown';
  if (tracks.length > 0) return 'present';
  return video.readyState >= video.HAVE_METADATA ? 'absent' : 'unknown';
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

export function evaluatePrerecordedVideoAlternatives(root: ScanRoot): PrerecordedVideoAlternativeEvaluation[] {
  const evaluations: PrerecordedVideoAlternativeEvaluation[] = [];

  for (const video of scopedElements<HTMLVideoElement>(root, 'video')) {
    const prerecorded = prerecordedEvidence(video);
    if (!prerecorded.applicable) continue;

    const audioState = audioTrackState(video);
    if (audioState === 'absent') continue;

    const descriptions = audioDescriptionSignals(video);
    const alternatives = videoMediaAlternativeSignals(video);
    const outcome: MediaReviewOutcome = descriptions.length || alternatives.length ? 'pass' : 'review';
    const audioEvidence = audioState === 'present'
      ? 'browser audioTracks reports synchronized auditory content'
      : 'synchronized auditory content could not be determined from browser media APIs';

    evaluations.push({
      element: video,
      outcome,
      audioDescriptionSignals: descriptions,
      mediaAlternativeSignals: alternatives,
      audioTrackState: audioState,
      detail: outcome === 'pass'
        ? `Prerecorded evidence: ${prerecorded.reason}; ${audioEvidence}. Observable audio-description signal(s): ${descriptions.join('; ') || 'none'}. Observable media-alternative signal(s): ${alternatives.join('; ') || 'none'}. FocusTrace does not verify that these candidates describe all meaningful visual information or provide an equivalent media alternative.`
        : `Prerecorded evidence: ${prerecorded.reason}; ${audioEvidence}. No native descriptions track, nearby audio-described-version control, non-empty aria-describedby/aria-details target, or nearby transcript-like alternative was observed. Review whether synchronized media is applicable and whether an adequate audio description or media alternative exists elsewhere before treating this as a failure.`,
    });
  }

  return evaluations;
}

export function evaluateLiveCaptions(root: ScanRoot): LiveCaptionEvaluation[] {
  const evaluations: LiveCaptionEvaluation[] = [];

  for (const video of scopedElements<HTMLVideoElement>(root, 'video')) {
    const timing = mediaTimingEvidence(video);
    if (timing.kind !== 'live') continue;

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
        ? `Live-media evidence: ${timing.reason}; ${audioEvidence}. ${captionTracks} observable captions track(s) found${subtitleTracks ? `; ${subtitleTracks} subtitles track(s) also present` : ''}. FocusTrace does not verify live-caption accuracy, completeness or latency.`
        : `Live-media evidence: ${timing.reason}; ${audioEvidence}. No observable captions track was found${subtitleTracks ? `; ${subtitleTracks} subtitles track(s) are present but are not treated as captions` : ''}. Review custom-player captions, burned-in live captions, whether the stream actually contains audio, and WCAG applicability before treating this as a failure.`,
    });
  }

  return evaluations;
}

export function evaluatePrerecordedAudioDescriptions(root: ScanRoot): PrerecordedAudioDescriptionEvaluation[] {
  const evaluations: PrerecordedAudioDescriptionEvaluation[] = [];

  for (const video of scopedElements<HTMLVideoElement>(root, 'video')) {
    const prerecorded = prerecordedEvidence(video);
    if (!prerecorded.applicable) continue;

    const audioState = audioTrackState(video);
    if (audioState === 'absent') continue;

    const descriptions = audioDescriptionSignals(video);
    const outcome: MediaReviewOutcome = descriptions.length ? 'pass' : 'review';
    const audioEvidence = audioState === 'present'
      ? 'browser audioTracks reports synchronized auditory content'
      : 'synchronized auditory content could not be determined from browser media APIs';

    evaluations.push({
      element: video,
      outcome,
      audioDescriptionSignals: descriptions,
      audioTrackState: audioState,
      detail: descriptions.length
        ? `Prerecorded evidence: ${prerecorded.reason}; ${audioEvidence}. Observable audio-description signal(s): ${descriptions.join('; ')}. FocusTrace does not verify description accuracy, completeness or whether all meaningful visual information needs description.`
        : `Prerecorded evidence: ${prerecorded.reason}; ${audioEvidence}. No native descriptions track or nearby audio-described-version control was observed. Review custom-player description tracks, alternate described versions, whether synchronized media is applicable, and the actual visual content before treating this as a failure.`,
    });
  }

  return evaluations;
}
