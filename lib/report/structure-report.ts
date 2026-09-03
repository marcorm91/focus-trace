import type { StructureHint, StructureMetrics, StructureSnapshot } from '../runtime/structure-map';
import { tr, type AppLanguage } from '../../shared/i18n';

export type StructureReportEvidence = {
  capturedAt: number;
  metrics: StructureMetrics;
  hints: StructureHint[];
  truncated: boolean;
};

export type StructureHintCopy = {
  title: string;
  description: string;
  suggestion?: string;
};

export function buildStructureReportEvidence(
  snapshot: StructureSnapshot | undefined,
): StructureReportEvidence | undefined {
  if (!snapshot) return undefined;
  return {
    capturedAt: snapshot.capturedAt,
    metrics: snapshot.metrics,
    hints: snapshot.hints,
    truncated: snapshot.truncated,
  };
}

export function structureHintCopy(
  hint: StructureHint,
  language: AppLanguage,
): StructureHintCopy {
  if (language !== 'es') {
    return {
      title: hint.title,
      description: hint.description,
      ...(hint.suggestion ? { suggestion: hint.suggestion } : {}),
    };
  }

  if (hint.title === 'Generic element used as a control') {
    return {
      title: 'Elemento genérico usado como control',
      description: 'Se está usando un <div> o <span> con comportamiento similar a un botón.',
      suggestion: 'Valora usar <button> cuando la interacción sea una acción de botón.',
    };
  }
  if (hint.title === 'Repeated sibling structure') {
    return {
      title: 'Estructura repetida entre elementos hermanos',
      description: 'Hay varios elementos hermanos con una estructura muy similar que podrían representar una lista semántica.',
      suggestion: 'Valora <ul>/<ol> con <li> cuando los elementos formen una lista con significado.',
    };
  }
  if (hint.title === 'Navigation-like link group') {
    return {
      title: 'Grupo de enlaces con aspecto de navegación',
      description: 'La mayoría de elementos directos del contenedor son enlaces y podrían formar un bloque de navegación.',
      suggestion: 'Valora <nav> o role="navigation" cuando el grupo sea realmente navegación del sitio o de la página.',
    };
  }
  if (hint.title === 'Deep generic wrapper chain') {
    return {
      title: 'Cadena profunda de contenedores genéricos',
      description: 'Hay cuatro o más <div> de un único hijo anidados antes de llegar a contenido con significado.',
      suggestion: 'Revisa si todos los contenedores son necesarios para layout, estilos o comportamiento.',
    };
  }
  if (hint.title === 'High <div> density') {
    return {
      title: 'Alta densidad de <div>',
      description: 'Una proporción elevada del DOM analizado está formada por contenedores <div>. No es un error por sí mismo, pero puede indicar oportunidades de mejorar la semántica.',
      suggestion: 'Revisa si HTML semántico puede sustituir contenedores genéricos cuando el contenido tenga una finalidad clara.',
    };
  }

  return {
    title: hint.title,
    description: hint.description,
    ...(hint.suggestion ? { suggestion: hint.suggestion } : {}),
  };
}

export function structureSummaryLabels(language: AppLanguage) {
  return {
    domElements: tr(language, 'DOM elements', 'Elementos DOM'),
    semanticElements: tr(language, 'Semantic elements', 'Elementos semánticos'),
    landmarks: tr(language, 'Semantic regions', 'Regiones semánticas'),
    lists: tr(language, 'Lists', 'Listas'),
    maxDepth: tr(language, 'Maximum DOM depth', 'Profundidad DOM máxima'),
    genericContainers: tr(language, 'Generic containers', 'Contenedores genéricos'),
    genericRatio: tr(language, 'Generic ratio', 'Proporción de elementos genéricos'),
    structureHints: tr(language, 'Structural suggestions', 'Sugerencias estructurales'),
  };
}
