// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  evaluateLiveCaptions,
  evaluatePrerecordedAudioAlternatives,
  evaluatePrerecordedAudioDescriptions,
  evaluatePrerecordedCaptions,
  evaluatePrerecordedVideoAlternatives,
} from '../lib/audit/media-alternatives';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Media test</title></head><body><main><h1>Media</h1>${body}</main></body></html>`);
  document.close();
}

function mediaWithId(id: string): HTMLVideoElement {
  const video = document.querySelector<HTMLVideoElement>(`#${id}`);
  expect(video).not.toBeNull();
  if (!video) throw new Error(`Expected video fixture #${id}`);
  return video;
}

function setAudioState(video: HTMLVideoElement, length: number): void {
  Object.defineProperty(video, 'audioTracks', { configurable: true, value: { length } });
  Object.defineProperty(video, 'readyState', { configurable: true, value: video.HAVE_METADATA });
}

function setDuration(video: HTMLVideoElement, duration: number): void {
  Object.defineProperty(video, 'duration', { configurable: true, value: duration });
}

describe('WCAG prerecorded and live media review', () => {
  it('reviews likely prerecorded audio when no observable equivalent alternative is nearby', () => {
    render('<audio id="episode" src="episode.mp3" controls></audio>');

    expect(evaluatePrerecordedAudioAlternatives(document)).toMatchObject([
      {
        outcome: 'review',
        alternativeSignals: [],
      },
    ]);

    const scan = runFocusTraceScan();
    const issue = scan.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-017');
    expect(issue?.targets).toEqual(['#episode']);
    expect(issue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '1.2.1')).toBe(true);
  });

  it('treats a non-empty described-by transcript candidate as bounded pass evidence without claiming equivalence', () => {
    render(`
      <audio id="episode" src="episode.mp3" controls aria-describedby="transcript"></audio>
      <section id="transcript">Full textual alternative for the recording.</section>
    `);

    const [evaluation] = evaluatePrerecordedAudioAlternatives(document);
    expect(evaluation).toMatchObject({ outcome: 'pass' });
    expect(evaluation?.alternativeSignals).toContain('aria-describedby -> #transcript');
    expect(evaluation?.detail).toContain('does not verify equivalence');

    const scan = runFocusTraceScan();
    expect(scan.review.some((candidate) => candidate.ruleId === 'FT-REVIEW-017')).toBe(false);
    expect(scan.ruleResults?.find((result) => result.ruleId === 'FT-REVIEW-017')).toMatchObject({
      applicable: 1,
      passed: 1,
      reviews: 0,
    });
  });

  it('recognizes a nearby transcript-like link as candidate alternative evidence', () => {
    render(`
      <figure>
        <audio src="interview.ogg" controls></audio>
        <a href="/interview-transcript">Read transcript</a>
      </figure>
    `);

    const [evaluation] = evaluatePrerecordedAudioAlternatives(document);
    expect(evaluation?.outcome).toBe('pass');
    expect(evaluation?.alternativeSignals.some((signal) => signal.includes('transcript-like link'))).toBe(true);
  });

  it('does not classify a streaming-playlist URL alone as prerecorded or live evidence', () => {
    render(`
      <audio id="audio-stream" src="https://example.test/live.m3u8" controls></audio>
      <video id="video-stream" src="https://example.test/live.mpd" controls></video>
    `);
    expect(evaluatePrerecordedAudioAlternatives(document)).toEqual([]);
    expect(evaluatePrerecordedCaptions(document)).toEqual([]);
    expect(evaluateLiveCaptions(document)).toEqual([]);
  });

  it('reviews likely prerecorded video when no observable captions track is present', () => {
    render('<video id="demo" src="demo.mp4" controls></video>');

    const [evaluation] = evaluatePrerecordedCaptions(document);
    expect(evaluation).toMatchObject({
      outcome: 'review',
      captionTracks: 0,
      subtitleTracks: 0,
      audioTrackState: 'unknown',
    });

    const scan = runFocusTraceScan();
    const issue = scan.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-018');
    expect(issue?.targets).toEqual(['#demo']);
    expect(issue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '1.2.2')).toBe(true);
    expect(issue?.references.some((reference) => reference.type === 'ACT' && reference.id === 'f51b46')).toBe(true);
  });

  it('passes the bounded native-track expectation when a captions track is observable', () => {
    render(`
      <video src="demo.mp4" controls>
        <track kind="captions" src="captions-en.vtt" srclang="en" label="English captions">
      </video>
    `);

    const [evaluation] = evaluatePrerecordedCaptions(document);
    expect(evaluation).toMatchObject({ outcome: 'pass', captionTracks: 1 });
    expect(evaluation?.detail).toContain('does not verify caption accuracy or completeness');
  });

  it('does not treat subtitles alone as proof of captions', () => {
    render(`
      <video src="demo.mp4" controls>
        <track kind="subtitles" src="subtitles-es.vtt" srclang="es" label="Español">
      </video>
    `);

    const [evaluation] = evaluatePrerecordedCaptions(document);
    expect(evaluation).toMatchObject({ outcome: 'review', captionTracks: 0, subtitleTracks: 1 });
    expect(evaluation?.detail).toContain('are not treated as captions');
  });

  it('reviews prerecorded synchronized video for both 1.2.3 and 1.2.5 when no visual alternative signal is observable', () => {
    render('<video id="lesson" src="lesson.mp4" controls></video>');

    expect(evaluatePrerecordedVideoAlternatives(document)).toMatchObject([
      { outcome: 'review', audioDescriptionSignals: [], mediaAlternativeSignals: [] },
    ]);
    expect(evaluatePrerecordedAudioDescriptions(document)).toMatchObject([
      { outcome: 'review', audioDescriptionSignals: [] },
    ]);

    const scan = runFocusTraceScan();
    const alternativeIssue = scan.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-021');
    const descriptionIssue = scan.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-023');
    expect(alternativeIssue?.targets).toEqual(['#lesson']);
    expect(alternativeIssue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '1.2.3')).toBe(true);
    expect(descriptionIssue?.targets).toEqual(['#lesson']);
    expect(descriptionIssue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '1.2.5')).toBe(true);
  });

  it('treats a nearby transcript as a bounded 1.2.3 candidate without using it as 1.2.5 audio-description evidence', () => {
    render(`
      <figure>
        <video id="lesson" src="lesson.mp4" controls></video>
        <a href="/lesson-transcript">Read transcript</a>
      </figure>
    `);

    const [alternative] = evaluatePrerecordedVideoAlternatives(document);
    const [description] = evaluatePrerecordedAudioDescriptions(document);
    expect(alternative).toMatchObject({ outcome: 'pass' });
    expect(alternative?.mediaAlternativeSignals.some((signal) => signal.includes('transcript-like link'))).toBe(true);
    expect(alternative?.detail).toContain('does not verify');
    expect(description).toMatchObject({ outcome: 'review', audioDescriptionSignals: [] });
  });

  it('uses an observable native descriptions track as bounded evidence for 1.2.3 and 1.2.5', () => {
    render(`
      <video id="lesson" src="lesson.mp4" controls>
        <track kind="descriptions" src="descriptions-en.vtt" srclang="en" label="Audio description">
      </video>
    `);

    const [alternative] = evaluatePrerecordedVideoAlternatives(document);
    const [description] = evaluatePrerecordedAudioDescriptions(document);
    expect(alternative).toMatchObject({ outcome: 'pass' });
    expect(alternative?.audioDescriptionSignals).toContain('1 native descriptions track(s)');
    expect(description).toMatchObject({ outcome: 'pass' });
    expect(description?.audioDescriptionSignals).toContain('1 native descriptions track(s)');
  });

  it('uses a nearby audio-described version control as candidate evidence without claiming adequacy', () => {
    render(`
      <figure>
        <video id="lesson" src="lesson.mp4" controls></video>
        <a href="/lesson-audio-described.mp4">Audio described version</a>
      </figure>
    `);

    const [alternative] = evaluatePrerecordedVideoAlternatives(document);
    const [description] = evaluatePrerecordedAudioDescriptions(document);
    expect(alternative?.outcome).toBe('pass');
    expect(description?.outcome).toBe('pass');
    expect(description?.detail).toContain('does not verify description accuracy');
  });

  it('reviews strong live video evidence when no observable captions track is present', () => {
    render('<video id="live" controls></video>');
    const video = mediaWithId('live');
    setDuration(video, Number.POSITIVE_INFINITY);

    const [evaluation] = evaluateLiveCaptions(document);
    expect(evaluation).toMatchObject({ outcome: 'review', captionTracks: 0 });
    expect(evaluation?.detail).toContain('Live-media evidence: duration is infinite');

    const scan = runFocusTraceScan();
    const issue = scan.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-022');
    expect(issue?.targets).toEqual(['#live']);
    expect(issue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '1.2.4')).toBe(true);
  });

  it('uses native captions as bounded pass evidence for strong live video', () => {
    render(`
      <video id="live" controls>
        <track kind="captions" src="live-en.vtt" srclang="en" label="English captions">
      </video>
    `);
    const video = mediaWithId('live');
    setDuration(video, Number.POSITIVE_INFINITY);

    const [evaluation] = evaluateLiveCaptions(document);
    expect(evaluation).toMatchObject({ outcome: 'pass', captionTracks: 1 });
    expect(evaluation?.detail).toContain('does not verify live-caption accuracy');
  });

  it('declines synchronized-media review when the browser can prove the video has no audio track', () => {
    render('<video id="silent" src="silent.mp4" controls></video>');
    const video = mediaWithId('silent');
    setAudioState(video, 0);

    expect(evaluatePrerecordedCaptions(document)).toEqual([]);
    expect(evaluatePrerecordedVideoAlternatives(document)).toEqual([]);
    expect(evaluatePrerecordedAudioDescriptions(document)).toEqual([]);

    setDuration(video, Number.POSITIVE_INFINITY);
    expect(evaluateLiveCaptions(document)).toEqual([]);
  });

  it('keeps every media review scoped to the selected component', () => {
    render(`
      <section id="a"><audio id="inside" src="inside.mp3"></audio></section>
      <section id="b"><video id="outside" src="outside.mp4"></video></section>
    `);

    const scan = runFocusTraceScan({ type: 'component', selector: '#a', tag: 'section' });
    expect(scan.review.some((issue) => issue.ruleId === 'FT-REVIEW-017' && issue.targets.includes('#inside'))).toBe(true);
    expect(scan.review.some((issue) => ['FT-REVIEW-018', 'FT-REVIEW-021', 'FT-REVIEW-022', 'FT-REVIEW-023'].includes(issue.ruleId))).toBe(false);
  });
});
