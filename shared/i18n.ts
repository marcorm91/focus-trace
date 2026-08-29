import {
  localizedRuleTitle as baseLocalizedRuleTitle,
  localizedScanIssue as baseLocalizedScanIssue,
} from './i18n-base';
import type { AppLanguage } from './i18n-base';
import type { ScanIssue } from './types';

export * from './i18n-base';

const STRUCTURAL_COPY_ES: Record<string, { title: string; description: string }> = {
  'FT-WARN-008': {
    title: 'El elemento HTML se utiliza fuera de su contexto semántico requerido',
    description: 'Este elemento HTML nativo está fuera del contexto en el que el HTML Living Standard define su semántica estructural. Revisa la relación padre/ancestro indicada en la evidencia.',
  },
  'FT-WARN-009': {
    title: 'La estructura semántica HTML incumple un modelo de contenido nativo',
    description: 'Esta estructura HTML nativa no respeta el modelo de hijos, agrupación u orden definido por el HTML Living Standard. Corrige la estructura indicada en la evidencia.',
  },
  'FT-WARN-010': {
    title: 'Hay contenido interactivo nativo anidado en una estructura incompatible',
    description: 'Esta estructura interactiva o de etiquetado contiene una combinación de descendientes que HTML prohíbe porque puede volver ambiguos el foco, la activación o las relaciones entre controles.',
  },
  'FT-WARN-011': {
    title: 'El elemento main nativo no tiene una jerarquía válida',
    description: 'Este elemento <main> tiene un ancestro no permitido por la definición HTML de un main jerárquicamente correcto. Revisa la estructura de ancestros indicada en la evidencia.',
  },
  'FT-REVIEW-009': {
    title: 'El contenido de sección debería poder identificarse por su estructura',
    description: 'Este section o article no tiene un encabezado que le pertenezca ni un nombre accesible calculado. Revisa si la sección puede identificarse correctamente o si un contenedor genérico se ajustaría mejor al contenido.',
  },
  'FT-REVIEW-010': {
    title: 'Los landmarks repetidos deberían tener nombres accesibles diferenciables',
    description: 'Hay varios landmarks con el mismo rol y este no tiene un nombre accesible diferenciable. Revisa sus etiquetas para que los usuarios puedan distinguir las regiones al navegar por landmarks.',
  },
};

export function localizedRuleTitle(ruleId: string, fallback: string, language: AppLanguage): string {
  if (language === 'es' && STRUCTURAL_COPY_ES[ruleId]) return STRUCTURAL_COPY_ES[ruleId].title;
  return baseLocalizedRuleTitle(ruleId, fallback, language);
}

export function localizedScanIssue(issue: ScanIssue, language: AppLanguage): ScanIssue {
  const copy = language === 'es' ? STRUCTURAL_COPY_ES[issue.ruleId] : undefined;
  if (!copy) return baseLocalizedScanIssue(issue, language);
  return baseLocalizedScanIssue({ ...issue, title: copy.title, description: copy.description }, language);
}
