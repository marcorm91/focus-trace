import type { RuleDefinition } from './rule-catalog';

export const PRERECORDED_AUDIO_ALTERNATIVE_RULE: RuleDefinition = {
  id: 'FT-REVIEW-017',
  title: 'Prerecorded audio may lack an observable equivalent alternative',
  severity: 'serious',
  severityRationale: {
    en: 'Audio-only content without an equivalent text alternative can make the information unavailable to people who cannot hear it. FocusTrace keeps this as review because it can observe candidate alternatives but cannot prove that their information is equivalent to the recording.',
    es: 'El contenido solo de audio sin una alternativa textual equivalente puede dejar la información fuera del alcance de personas que no pueden oírla. FocusTrace lo mantiene como revisión porque puede observar alternativas candidatas, pero no demostrar que su información sea equivalente a la grabación.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.2.1',
      label: 'Audio-only and Video-only (Prerecorded)',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#audio-only-and-video-only-prerecorded',
    },
  ],
};

export const PRERECORDED_CAPTIONS_RULE: RuleDefinition = {
  id: 'FT-REVIEW-018',
  title: 'Prerecorded video may lack observable captions',
  severity: 'serious',
  severityRationale: {
    en: 'Prerecorded synchronized video with auditory information needs captions so people who cannot hear the audio can access that information. FocusTrace keeps this as review because captions can be burned into the picture or supplied by a custom player that is not represented by a native track element.',
    es: 'El vídeo sincronizado pregrabado con información auditiva necesita subtítulos para que las personas que no pueden oír el audio accedan a esa información. FocusTrace lo mantiene como revisión porque los subtítulos pueden estar incrustados en la imagen o proporcionados por un reproductor personalizado sin un elemento track nativo.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.2.2',
      label: 'Captions (Prerecorded)',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#captions-prerecorded',
    },
    {
      type: 'ACT',
      id: 'f51b46',
      label: 'Video element auditory content has captions',
      status: 'proposed',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/f51b46/proposed/',
    },
  ],
};

export const PRERECORDED_VIDEO_ALTERNATIVE_RULE: RuleDefinition = {
  id: 'FT-REVIEW-021',
  title: 'Prerecorded video may lack an observable media alternative or audio description',
  severity: 'serious',
  severityRationale: {
    en: 'Prerecorded synchronized video can make important visual information unavailable when neither an equivalent media alternative nor audio description is provided. FocusTrace keeps this as review because it can only observe candidate descriptions or nearby alternatives, not prove that they cover the meaningful visual content.',
    es: 'El vídeo sincronizado pregrabado puede dejar información visual importante fuera del alcance cuando no existe una alternativa equivalente para el medio ni audiodescripción. FocusTrace lo mantiene como revisión porque solo puede observar audiodescripciones o alternativas candidatas cercanas, no demostrar que cubran el contenido visual significativo.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.2.3',
      label: 'Audio Description or Media Alternative (Prerecorded)',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#audio-description-or-media-alternative-prerecorded',
    },
    {
      type: 'ACT',
      id: 'c5a4ea',
      label: 'Video element visual content has accessible alternative',
      status: 'proposed',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/c5a4ea/proposed/',
    },
  ],
};

export const LIVE_CAPTIONS_RULE: RuleDefinition = {
  id: 'FT-REVIEW-022',
  title: 'Live video may lack observable captions',
  severity: 'serious',
  severityRationale: {
    en: 'Live synchronized media with auditory information needs captions so people who cannot hear the audio can follow the same information as it happens. FocusTrace keeps this as review because custom-player or burned-in captions may not appear as native text tracks, and only strong live-media signals are treated as applicable.',
    es: 'Los medios sincronizados en directo con información auditiva necesitan subtítulos para que las personas que no pueden oír el audio sigan la misma información mientras ocurre. FocusTrace lo mantiene como revisión porque los subtítulos de reproductores personalizados o incrustados pueden no aparecer como pistas de texto nativas y solo se consideran aplicables señales sólidas de contenido en directo.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.2.4',
      label: 'Captions (Live)',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#captions-live',
    },
  ],
};

export const PRERECORDED_AUDIO_DESCRIPTION_RULE: RuleDefinition = {
  id: 'FT-REVIEW-023',
  title: 'Prerecorded video may lack an observable audio description',
  severity: 'serious',
  severityRationale: {
    en: 'Prerecorded video can make meaningful visual information unavailable when no audio description is provided. FocusTrace keeps this as review because native description tracks and nearby described-version controls are only candidate signals and their accuracy, completeness and applicability require human judgement.',
    es: 'El vídeo pregrabado puede dejar información visual significativa fuera del alcance cuando no se proporciona audiodescripción. FocusTrace lo mantiene como revisión porque las pistas nativas de descripción y los controles cercanos de versión audiodescrita solo son señales candidatas y su precisión, integridad y aplicabilidad requieren criterio humano.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.2.5',
      label: 'Audio Description (Prerecorded)',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#audio-description-prerecorded',
    },
    {
      type: 'ACT',
      id: '1ec09b',
      label: 'Video element visual content has strict accessible alternative',
      status: 'proposed',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/1ec09b/proposed/',
    },
  ],
};

export const MEDIA_RULES: RuleDefinition[] = [
  PRERECORDED_AUDIO_ALTERNATIVE_RULE,
  PRERECORDED_CAPTIONS_RULE,
  PRERECORDED_VIDEO_ALTERNATIVE_RULE,
  LIVE_CAPTIONS_RULE,
  PRERECORDED_AUDIO_DESCRIPTION_RULE,
];
