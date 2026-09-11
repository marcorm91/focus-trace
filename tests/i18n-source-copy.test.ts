import { describe, expect, it } from 'vitest';
import {
  ALLOWED_ARIA_CHILD_RULE,
  ARIA_REFERENCE_RULE,
  ARIA_RELATIONSHIP_CONSISTENCY_RULE,
  ARIA_STATE_CONSISTENCY_RULE,
  INVALID_ARIA_ROLE_RULE,
  INVALID_ARIA_VALUE_RULE,
  REQUIRED_ARIA_PARENT_RULE,
  REQUIRED_ARIA_PROPERTY_RULE,
  UNKNOWN_ARIA_ATTRIBUTE_RULE,
  UNSUPPORTED_ARIA_PROPERTY_RULE,
} from '../shared/aria-authoring-rules';
import {
  DUPLICATE_ID_RULE,
  GENERIC_INTERACTIVE_SEMANTICS_RULE,
  MAIN_LANDMARK_RULE,
  MULTIPLE_MAIN_LANDMARKS_RULE,
  NATIVE_BUTTON_SEMANTICS_RULE,
  NATIVE_LINK_SEMANTICS_RULE,
  OBSOLETE_BUT_CONFORMING_HTML_RULE,
  OBSOLETE_HTML_ATTRIBUTE_RULE,
  OBSOLETE_HTML_ELEMENT_RULE,
} from '../shared/html-authoring-rules';
import { localizedReferenceLabel, localizedScanIssue } from '../shared/i18n';
import { RULES, type RuleDefinition } from '../shared/rule-catalog';
import { STRUCTURAL_HTML_RULES } from '../shared/structural-html-rules';
import type { ScanIssue } from '../shared/types';

const HTML_RULES: RuleDefinition[] = [
  DUPLICATE_ID_RULE,
  OBSOLETE_HTML_ELEMENT_RULE,
  OBSOLETE_HTML_ATTRIBUTE_RULE,
  OBSOLETE_BUT_CONFORMING_HTML_RULE,
  MAIN_LANDMARK_RULE,
  MULTIPLE_MAIN_LANDMARKS_RULE,
  NATIVE_BUTTON_SEMANTICS_RULE,
  NATIVE_LINK_SEMANTICS_RULE,
  GENERIC_INTERACTIVE_SEMANTICS_RULE,
];

const ARIA_RULES: RuleDefinition[] = [
  INVALID_ARIA_ROLE_RULE,
  UNKNOWN_ARIA_ATTRIBUTE_RULE,
  INVALID_ARIA_VALUE_RULE,
  REQUIRED_ARIA_PROPERTY_RULE,
  ARIA_REFERENCE_RULE,
  REQUIRED_ARIA_PARENT_RULE,
  ALLOWED_ARIA_CHILD_RULE,
  ARIA_STATE_CONSISTENCY_RULE,
  UNSUPPORTED_ARIA_PROPERTY_RULE,
  ARIA_RELATIONSHIP_CONSISTENCY_RULE,
];

const ALL_RULES: RuleDefinition[] = [
  ...Object.values(RULES),
  ...HTML_RULES,
  ...STRUCTURAL_HTML_RULES,
  ...ARIA_RULES,
];

function issue(overrides: Partial<ScanIssue>): ScanIssue {
  return {
    id: 'source-copy-test',
    ruleId: 'FT-REVIEW-003',
    title: 'Form field relies on placeholder text as its accessible name',
    description: 'The control has a programmatically computed name, but that name comes only from placeholder text.',
    severity: 'moderate',
    outcome: 'review',
    targets: ['#query'],
    references: [],
    ...overrides,
  };
}

describe('Spanish localization of synced/source copy', () => {
  it('localizes every standards label currently exposed by the rule catalog', () => {
    const references = new Map(
      ALL_RULES.flatMap((rule) => rule.references).map((reference) => [
        `${reference.type}:${reference.id}:${reference.label}`,
        reference,
      ]),
    );

    for (const reference of references.values()) {
      const localized = localizedReferenceLabel(reference, 'es');
      expect(localized, `${reference.type} ${reference.id} should have Spanish display copy`).not.toBe(reference.label);
      expect(localizedReferenceLabel(reference, 'en')).toBe(reference.label);
    }
  });

  it('localizes placeholder-source evidence while preserving the page value', () => {
    const localized = localizedScanIssue(issue({
      evidence: 'Accessible name "Search products" is sourced from placeholder.',
    }), 'es');

    expect(localized.evidence).toBe('El nombre accesible "Search products" procede de placeholder.');
    expect(localized.evidence).not.toContain('is sourced from');
  });

  it('localizes missing-main evidence instead of leaking scanner English', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-REVIEW-004',
      title: 'Page exposes a primary main landmark',
      description: 'The page does not expose a visible main landmark.',
      evidence: 'No exposed main landmark was detected. Prefer a native <main> element for the primary content when the document structure allows it.',
    }), 'es');

    expect(localized.evidence).toContain('No se ha detectado ningún landmark main expuesto');
    expect(localized.evidence).toContain('<main>');
    expect(localized.evidence).not.toContain('Prefer a native');
  });

  it('localizes consistent-help evidence while preserving compared page and order', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-REVIEW-011',
      title: 'Repeated help mechanisms may change order across pages',
      description: 'The same observed help mechanisms appear in a different relative order across sampled pages.',
      evidence: 'Observed order: human contact mechanism → self-help option. Comparison page https://example.com/help-b: self-help option → human contact mechanism.',
    }), 'es');

    expect(localized.title).toContain('mecanismos de ayuda');
    expect(localized.description).toContain('WCAG 3.2.6');
    expect(localized.evidence).toBe(
      'Orden observado: mecanismo de contacto humano → opción de autoayuda. Página comparada https://example.com/help-b: opción de autoayuda → mecanismo de contacto humano.',
    );
    expect(localized.evidence).not.toContain('Observed order');
    expect(localized.evidence).not.toContain('Comparison page');
  });

  it('localizes obsolete HTML evidence and modernization guidance', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-WARN-007',
      title: 'Obsolete but conforming HTML feature is used',
      description: 'The page uses an obsolete legacy feature.',
      evidence: 'style[type="text/css"] is obsolete but conforming. Suggested modernization: Remove type="text/css"; CSS is the default style language.',
      outcome: 'warning',
      severity: 'minor',
    }), 'es');

    expect(localized.evidence).toContain('está obsoleto pero sigue siendo conforme');
    expect(localized.evidence).toContain('Modernización sugerida');
    expect(localized.evidence).toContain('Elimina type="text/css"');
    expect(localized.evidence).not.toContain('Suggested modernization');
    expect(localized.evidence).not.toContain('default style language');
  });

  it('uses a Spanish safety fallback for unexpected generated English while preserving technical tokens', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-FUTURE-999',
      title: 'Unexpected source rule title',
      description: 'This generated source description has not been localized yet.',
      evidence: 'This element requires role="button" and references #save-panel.',
    }), 'es');

    expect(localized.title).toBe('Hallazgo de accesibilidad FT-FUTURE-999');
    expect(localized.description).toContain('requiere revisión');
    expect(localized.description).not.toContain('generated source description');
    expect(localized.evidence).toContain('role="button"');
    expect(localized.evidence).toContain('#save-panel');
    expect(localized.evidence).not.toContain('This element requires');
  });

  it('localizes measured reflow evidence without losing viewport geometry or selectors', () => {
    const localized = localizedScanIssue(issue({
      ruleId: 'FT-REVIEW-024',
      title: 'Narrow viewport may lose content or require two-dimensional scrolling',
      description: 'FocusTrace observed clipped content in the current narrow viewport.',
      targets: ['#continue'],
      evidence: 'Generated reflow evidence.',
      reflow: {
        kind: 'clipped-content',
        axis: 'horizontal',
        writingMode: 'horizontal-tb',
        viewportWidth: 320,
        viewportHeight: 800,
        scrollWidth: 320,
        scrollHeight: 800,
        clippedBy: '#panel',
        clippedPixels: 80,
        clipping: 'partial',
      },
    }), 'es');

    expect(localized.title).toContain('viewport estrecho');
    expect(localized.evidence).toContain('320 × 800 píxeles CSS');
    expect(localized.evidence).toContain('#continue');
    expect(localized.evidence).toContain('#panel');
    expect(localized.evidence).not.toContain('Generated reflow evidence');
  });
});

describe('Spanish use-of-color evidence', () => {
  it('localizes structured inline-link measurements without losing canonical colors or selectors', () => {
    const issue: ScanIssue = {
      id: 'color-only-link',
      ruleId: 'FT-REVIEW-025',
      title: 'Inline link may rely on color alone',
      description: 'Generated use-of-color review.',
      evidence: 'Generated use-of-color evidence.',
      severity: 'serious',
      outcome: 'review',
      targets: ['#guide'],
      useOfColor: {
        kind: 'inline-link',
        contextSelector: '#copy',
        surroundingTextSelector: '#copy',
        linkColor: 'rgb(0, 0, 255)',
        surroundingTextColor: 'rgb(0, 0, 0)',
        contrastRatio: 2.44,
        requiredRatio: 3,
        persistentVisualCue: 'none-observed',
      },
      references: [],
    };

    const localized = localizedScanIssue(issue, 'es');

    expect(localized.title).toContain('depender únicamente del color');
    expect(localized.evidence).toContain('#guide');
    expect(localized.evidence).toContain('#copy');
    expect(localized.evidence).toContain('rgb(0, 0, 255)');
    expect(localized.evidence).toContain('2.44:1');
    expect(localized.evidence).not.toContain('Generated');
  });
});

describe('Spanish pause-stop-hide evidence', () => {
  it('localizes structured motion evidence without losing timing, properties or selectors', () => {
    const issue: ScanIssue = {
      id: 'moving-carousel',
      ruleId: 'FT-REVIEW-026',
      title: 'Automatically moving content needs pause, stop or hide review',
      description: 'Generated motion review.',
      evidence: 'Generated motion evidence.',
      severity: 'serious',
      outcome: 'review',
      targets: ['#carousel'],
      pauseStopHide: {
        kind: 'moving-or-blinking',
        source: 'web-animation',
        automaticStart: 'unknown',
        parallelContent: 'observed',
        durationMs: 12_000,
        thresholdMs: 5_000,
        repeatsIndefinitely: false,
        animatedProperties: ['opacity', 'transform'],
        animationNames: ['carousel-cycle'],
        controlMechanism: 'candidate-observed',
        controlSelectors: ['#pause'],
      },
      references: [],
    };

    const localized = localizedScanIssue(issue, 'es');

    expect(localized.title).toContain('movimiento automático');
    expect(localized.evidence).toContain('#carousel');
    expect(localized.evidence).toContain('12000 ms');
    expect(localized.evidence).toContain('opacity, transform');
    expect(localized.evidence).toContain('#pause');
    expect(localized.evidence).not.toContain('Generated');
  });
});

describe('Spanish link-purpose context evidence', () => {
  it('localizes structured context without losing text, source kinds or selectors', () => {
    const issue: ScanIssue = {
      id: 'generic-link',
      ruleId: 'FT-REVIEW-027',
      title: 'Ambiguous link text needs purpose-in-context review',
      description: 'Generated link-purpose review.',
      evidence: 'Generated link-purpose evidence.',
      severity: 'serious',
      outcome: 'review',
      targets: ['#more'],
      linkPurposeContext: {
        kind: 'ambiguous-link-purpose',
        accessibleName: 'Read more',
        matchedPhrase: 'read more',
        contexts: [
          { source: 'sentence', selector: '#product', text: 'Read more about TrailPro.' },
          { source: 'aria-describedby', selector: '#description', text: 'TrailPro product details' },
        ],
        contextTextObserved: true,
      },
      references: [],
    };

    const localized = localizedScanIssue(issue, 'es');

    expect(localized.title).toContain('propósito en contexto');
    expect(localized.evidence).toContain('#more');
    expect(localized.evidence).toContain('#product');
    expect(localized.evidence).toContain('misma frase');
    expect(localized.evidence).toContain('aria-describedby');
    expect(localized.evidence).toContain('TrailPro product details');
    expect(localized.evidence).not.toContain('Generated');
  });
});

describe('Spanish text-resize evidence', () => {
  it('localizes structured comparison evidence without losing ratios or selectors', () => {
    const issue: ScanIssue = {
      id: 'resize-text',
      ruleId: 'FT-REVIEW-028',
      title: 'Text resized to 200% needs content and functionality review',
      description: 'Generated text-resize review.',
      evidence: 'Generated text-resize evidence.',
      severity: 'serious',
      outcome: 'review',
      targets: ['#summary'],
      textResize: {
        kind: 'insufficient-enlargement',
        baselineZoomFactor: 1,
        currentZoomFactor: 2,
        requiredScale: 2,
        observedScale: 1.2,
        label: 'Account summary',
      },
      references: [{
        type: 'WCAG',
        id: '1.4.4',
        label: 'Resize Text',
        level: 'AA',
        status: 'normative',
        url: 'https://www.w3.org/TR/WCAG22/#resize-text',
      }],
    };

    const localized = localizedScanIssue(issue, 'es');

    expect(localized.title).toContain('ampliado al 200 %');
    expect(localized.evidence).toContain('#summary');
    expect(localized.evidence).toContain('1.2:1');
    expect(localized.evidence).toContain('2:1');
    expect(localized.references[0]?.label).toBe('Cambio de tamaño del texto');
    expect(localized.evidence).not.toContain('Generated');
  });
});
