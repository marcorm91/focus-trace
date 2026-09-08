// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  evaluatePrerecordedAudioAlternatives,
  evaluatePrerecordedCaptions,
} from '../lib/audit/media-alternatives';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Media test</title></head><body><main><h1>Media</h1>${body}</main></body></html>`);
  document.close();
}

describe('WCAG prerecorded media review', () => {
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

  it('does not classify an obvious streaming playlist as prerecorded audio evidence', () => {
    render('<audio src="https://example.test/live.m3u8" controls></audio>');
    expect(evaluatePrerecordedAudioAlternatives(document)).toEqual([]);
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

  it('declines WCAG 1.2.2 review when the browser can prove the video has no audio track', () => {
    render('<video id="silent" src="silent.mp4" controls></video>');
    const video = document.querySelector<HTMLVideoElement>('#silent');
    expect(video).not.toBeNull();
    Object.defineProperty(video, 'audioTracks', { configurable: true, value: { length: 0 } });

    expect(evaluatePrerecordedCaptions(document)).toEqual([]);
  });

  it('keeps media review scoped to the selected component', () => {
    render(`
      <section id="a"><audio id="inside" src="inside.mp3"></audio></section>
      <section id="b"><video id="outside" src="outside.mp4"></video></section>
    `);

    const scan = runFocusTraceScan({ type: 'component', selector: '#a', tag: 'section' });
    expect(scan.review.some((issue) => issue.ruleId === 'FT-REVIEW-017' && issue.targets.includes('#inside'))).toBe(true);
    expect(scan.review.some((issue) => issue.ruleId === 'FT-REVIEW-018')).toBe(false);
  });
});
