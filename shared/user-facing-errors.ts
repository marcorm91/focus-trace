import { tr, type AppLanguage } from './i18n';

export type UserErrorContext =
  | 'analysis'
  | 'page-action'
  | 'trace'
  | 'focus-walk'
  | 'breakpoint'
  | 'session'
  | 'reset'
  | 'site-audit'
  | 'site-audit-page'
  | 'report';

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === 'string' ? reason : String(reason ?? '');
}

function includesAny(value: string, fragments: string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment));
}

function fallbackFor(context: UserErrorContext, language: AppLanguage): string {
  if (context === 'analysis') {
    return tr(language,
      'FocusTrace could not analyze this page. Reload it and try again.',
      'FocusTrace no ha podido analizar esta página. Recárgala y vuelve a intentarlo.',
    );
  }
  if (context === 'page-action') {
    return tr(language,
      'FocusTrace could not access the current page to complete this action.',
      'FocusTrace no ha podido acceder a la página actual para completar esta acción.',
    );
  }
  if (context === 'trace') {
    return tr(language,
      'FocusTrace could not update the current Trace session. Try again.',
      'FocusTrace no ha podido actualizar la sesión de Trace actual. Vuelve a intentarlo.',
    );
  }
  if (context === 'focus-walk') {
    return tr(language,
      'FocusTrace could not complete the automatic focus journey on this page.',
      'FocusTrace no ha podido completar el recorrido automático de foco en esta página.',
    );
  }
  if (context === 'breakpoint') {
    return tr(language,
      'FocusTrace could not update the accessibility breakpoint settings.',
      'FocusTrace no ha podido actualizar la configuración de breakpoints de accesibilidad.',
    );
  }
  if (context === 'session') {
    return tr(language,
      'FocusTrace could not load the session for the current tab.',
      'FocusTrace no ha podido cargar la sesión de la pestaña actual.',
    );
  }
  if (context === 'reset') {
    return tr(language,
      'FocusTrace could not clear the data for the current tab. Try again.',
      'FocusTrace no ha podido borrar los datos de la pestaña actual. Vuelve a intentarlo.',
    );
  }
  if (context === 'site-audit') {
    return tr(language,
      'Site Audit could not complete the audit. Check the site and try again.',
      'Site Audit no ha podido completar la auditoría. Revisa el sitio y vuelve a intentarlo.',
    );
  }
  if (context === 'site-audit-page') {
    return tr(language,
      'This representative page could not be analyzed.',
      'Esta página representativa no se ha podido analizar.',
    );
  }
  return tr(language,
    'FocusTrace could not load this report. Open it again from the current analysis.',
    'FocusTrace no ha podido cargar este informe. Ábrelo de nuevo desde el análisis actual.',
  );
}

export function localizedUserError(
  reason: unknown,
  language: AppLanguage,
  context: UserErrorContext,
): string {
  const raw = errorMessage(reason).trim();
  const normalized = raw.toLowerCase();

  if (includesAny(normalized, [
    'cannot access a chrome://',
    'cannot access a chrome-extension://',
    'cannot access a moz-extension://',
    'cannot access contents of url',
    'cannot access contents of the page',
    'extensions gallery cannot be scripted',
    'extension gallery cannot be scripted',
    'this page cannot be scripted',
    'restricted url',
    'missing host permission',
    'cannot access browser page',
  ])) {
    return tr(language,
      'This page cannot be analyzed because the browser does not allow extensions to access it. Open a normal http/https page and try again.',
      'Esta página no se puede analizar porque el navegador no permite que las extensiones accedan a ella. Abre una página http/https normal y vuelve a intentarlo.',
    );
  }

  if (includesAny(normalized, [
    'could not establish connection',
    'receiving end does not exist',
    'message port closed',
    'the message port closed',
  ])) {
    return tr(language,
      'FocusTrace lost access to the page, usually because it reloaded or navigated. Try the action again.',
      'FocusTrace ha perdido el acceso a la página, normalmente porque se ha recargado o ha navegado. Vuelve a intentar la acción.',
    );
  }

  if (includesAny(normalized, [
    'no tab with id',
    'no active browser tab',
    'no active tab',
    'tab was closed',
    'invalid tab id',
  ])) {
    return tr(language,
      'The browser tab is no longer available. Select the page you want to inspect and try again.',
      'La pestaña del navegador ya no está disponible. Selecciona la página que quieras inspeccionar y vuelve a intentarlo.',
    );
  }

  if (normalized.includes('page load timed out')) {
    return tr(language,
      'The page took too long to load and could not be analyzed within the safety limit.',
      'La página ha tardado demasiado en cargar y no se ha podido analizar dentro del límite de seguridad.',
    );
  }

  if (normalized.includes('browser did not create a scan tab')) {
    return tr(language,
      'The browser could not open the representative page needed for this audit.',
      'El navegador no ha podido abrir la página representativa necesaria para esta auditoría.',
    );
  }

  if (includesAny(normalized, [
    'permission',
    'user gesture',
    'user denied',
    'not allowed',
  ])) {
    return tr(language,
      'FocusTrace does not have the page access required for this action. Grant access and try again.',
      'FocusTrace no tiene el acceso a la página necesario para esta acción. Concede el acceso y vuelve a intentarlo.',
    );
  }

  return fallbackFor(context, language);
}
