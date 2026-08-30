import {
  localizedRuleTitle as baseLocalizedRuleTitle,
  localizedScanIssue as baseLocalizedScanIssue,
} from './i18n-base';
import type { AppLanguage } from './i18n-base';
import type { ScanIssue } from './types';

export * from './i18n-base';

const EXTRA_COPY_ES: Record<string, { title: string; description: string }> = {
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
  'FT-WARN-012': {
    title: 'El rol ARIA explícito no puede resolverse de forma segura',
    description: 'El atributo role contiene un rol abstracto o no puede resolverse a ningún rol WAI-ARIA registrado y no abstracto aplicando el modelo estándar de tokens alternativos.',
  },
  'FT-WARN-013': {
    title: 'Se utiliza un atributo aria-* desconocido',
    description: 'Este atributo aria-* no existe en el registro WAI-ARIA sincronizado, por lo que no puede exponer de forma fiable el estado, nombre o relación que se pretendía.',
  },
  'FT-WARN-014': {
    title: 'Un estado o propiedad ARIA tiene un valor no válido',
    description: 'Este estado o propiedad ARIA utiliza un valor que no coincide con la gramática actual de WAI-ARIA que FocusTrace puede verificar de forma determinista.',
  },
  'FT-WARN-015': {
    title: 'Al rol ARIA le falta un estado o propiedad obligatoria',
    description: 'El rol ARIA explícito resuelto requiere un estado o propiedad que no está presente y que tampoco queda proporcionado por una semántica nativa equivalente del elemento.',
  },
  'FT-WARN-016': {
    title: 'La referencia ARIA por ID no resuelve una relación válida',
    description: 'Esta relación ARIA basada en IDs está vacía, no resuelve, crea un ciclo, tiene varios propietarios o apunta fuera de la relación de accesibilidad que requiere la propiedad.',
  },
  'FT-WARN-017': {
    title: 'El rol ARIA está fuera de su contexto padre de accesibilidad requerido',
    description: 'El rol ARIA resuelto no se encuentra dentro del contexto padre de accesibilidad exigido después de tener en cuenta wrappers transparentes y relaciones aria-owns válidas.',
  },
  'FT-WARN-018': {
    title: 'El contenedor ARIA expone un rol hijo de accesibilidad incompatible',
    description: 'Este contenedor ARIA expone un hijo semántico cuyo rol queda fuera del modelo de roles hijo permitido para ese contenedor.',
  },
  'FT-WARN-019': {
    title: 'El rango o estado de conjunto ARIA es internamente incoherente',
    description: 'El elemento expone valores ARIA de rango, posición o conjunto que se contradicen entre sí aunque cada atributo individual pueda ser sintácticamente válido.',
  },
  'FT-WARN-020': {
    title: 'El estado o propiedad ARIA no es compatible con el rol resuelto',
    description: 'Este estado o propiedad ARIA existe en WAI-ARIA, pero no está admitido por el rol explícito o nativo resuelto para el elemento. La semántica resultante queda indefinida y las tecnologías de asistencia pueden ignorar el estado previsto.',
  },
  'FT-WARN-021': {
    title: 'La relación ARIA y el estado expuesto son incoherentes',
    description: 'La relación ARIA resuelve correctamente, pero el estado expuesto por el elemento contradice esa relación o la disponibilidad actual del contenido relacionado. Revisa aria-invalid, aria-errormessage, aria-expanded y aria-controls según la evidencia.',
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
  if (language === 'es' && EXTRA_COPY_ES[ruleId]) return EXTRA_COPY_ES[ruleId].title;
  return baseLocalizedRuleTitle(ruleId, fallback, language);
}

export function localizedScanIssue(issue: ScanIssue, language: AppLanguage): ScanIssue {
  const copy = language === 'es' ? EXTRA_COPY_ES[issue.ruleId] : undefined;
  if (!copy) return baseLocalizedScanIssue(issue, language);
  return baseLocalizedScanIssue({ ...issue, title: copy.title, description: copy.description }, language);
}
