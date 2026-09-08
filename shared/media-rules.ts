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

export const MEDIA_RULES: RuleDefinition[] = [
  PRERECORDED_AUDIO_ALTERNATIVE_RULE,
  PRERECORDED_CAPTIONS_RULE,
];
