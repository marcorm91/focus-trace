import type { StructureHint, StructureMetrics, StructureSnapshot } from '../runtime/structure-evidence';
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

  if (hint.title === 'Generic element used as a button') {
    return {
      title: 'Elemento genérico usado como botón',
      description: 'Se está usando un elemento genérico con semántica de botón en lugar del control nativo.',
      suggestion: 'Cuando la interacción sea una acción, valora utilizar <button>.',
    };
  }
  if (hint.title === 'Generic element used as a link') {
    return {
      title: 'Elemento genérico usado como enlace',
      description: 'Se está usando un elemento genérico con semántica de enlace.',
      suggestion: 'Cuando la interacción navegue a otra ubicación, valora utilizar <a href="…">.',
    };
  }
  if (hint.title === 'Generic element used as a heading') {
    return {
      title: 'Elemento genérico usado como encabezado',
      description: 'Se está exponiendo semántica de encabezado mediante ARIA sobre un elemento genérico.',
      suggestion: 'Cuando la jerarquía lo permita, valora utilizar un <h1>–<h6> nativo.',
    };
  }
  if (hint.title === 'Generic element with click handler') {
    return {
      title: 'Elemento genérico con evento de clic',
      description: 'Se ha detectado un <div> o <span> con onclick sin utilizar un elemento interactivo nativo.',
      suggestion: 'Utiliza <button> para acciones o <a href="…"> para navegación cuando corresponda.',
    };
  }
  if (hint.title === 'Generic element in the tab order') {
    return {
      title: 'Elemento genérico incluido en el orden de tabulación',
      description: 'Un elemento genérico entra directamente en el foco secuencial sin exponer un rol semántico.',
      suggestion: 'Si es interactivo, valora sustituirlo por el elemento nativo que represente su función.',
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
    headings: tr(language, 'Headings', 'Encabezados'),
    landmarks: tr(language, 'Semantic regions', 'Regiones semánticas'),
    lists: tr(language, 'Lists', 'Listas'),
    forms: tr(language, 'Forms', 'Formularios'),
    buttons: tr(language, 'Buttons', 'Botones'),
    links: tr(language, 'Links', 'Enlaces'),
    formControls: tr(language, 'Form controls', 'Campos de formulario'),
    tables: tr(language, 'Tables', 'Tablas'),
    images: tr(language, 'Images', 'Imágenes'),
    structureHints: tr(language, 'Semantic suggestions', 'Sugerencias semánticas'),
  };
}
