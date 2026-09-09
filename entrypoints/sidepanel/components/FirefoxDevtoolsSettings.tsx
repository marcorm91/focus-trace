import { useEffect, useState } from 'react';
import { browser } from '#imports';
import { tr, type AppLanguage } from '../../../shared/i18n';

type FirefoxDevtoolsPermissionsApi = {
  contains: (permissions: { permissions: string[] }) => Promise<boolean>;
  request: (permissions: { permissions: string[] }) => Promise<boolean>;
};

function firefoxDevtoolsPermissions(): FirefoxDevtoolsPermissionsApi {
  // Firefox supports the optional `devtools` permission, but the shared
  // Chromium-oriented WebExtension typings do not currently include that
  // Firefox-only permission string in ManifestPermission.
  return browser.permissions as unknown as FirefoxDevtoolsPermissionsApi;
}

export function FirefoxDevtoolsSettings({ language }: { language: AppLanguage }) {
  const firefox = import.meta.env.FIREFOX;
  const [enabled, setEnabled] = useState<boolean>();
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!firefox) return;
    let cancelled = false;
    const permissions = firefoxDevtoolsPermissions();

    void permissions.contains({ permissions: ['devtools'] })
      .then((granted) => {
        if (!cancelled) setEnabled(granted);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, [firefox]);

  if (!firefox) return null;

  const enableDevtools = async () => {
    setRequesting(true);
    try {
      const granted = await firefoxDevtoolsPermissions().request({ permissions: ['devtools'] });
      setEnabled(granted);
    } catch {
      setEnabled(false);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <fieldset className="settings-group settings-devtools-group">
      <legend>{tr(language, 'Firefox DevTools integration', 'Integración DevTools de Firefox')}</legend>
      <p className="settings-help">
        {tr(
          language,
          'Enable the FocusTrace tab inside Firefox Developer Tools to inspect a finding in the native DOM Inspector. This permission is optional so installing or updating FocusTrace does not require a new DevTools permission prompt.',
          'Activa la pestaña FocusTrace dentro de las Herramientas para desarrolladores de Firefox para inspeccionar un hallazgo en el Inspector DOM nativo. Este permiso es opcional para que instalar o actualizar FocusTrace no requiera un nuevo aviso de permiso de DevTools.',
        )}
      </p>
      <button
        type="button"
        disabled={enabled === true || requesting}
        onClick={() => void enableDevtools()}
      >
        {enabled === true
          ? tr(language, 'DevTools integration enabled', 'Integración DevTools activada')
          : requesting
            ? tr(language, 'Enabling…', 'Activando…')
            : tr(language, 'Enable DevTools integration', 'Activar integración DevTools')}
      </button>
      <p className="settings-breakpoint-note" aria-live="polite">
        {enabled === true
          ? tr(
              language,
              'Open or reopen Developer Tools with F12 and select FocusTrace. The normal Firefox sidebar remains available too.',
              'Abre o vuelve a abrir las Herramientas para desarrolladores con F12 y selecciona FocusTrace. El sidebar normal de Firefox también sigue disponible.',
            )
          : tr(
              language,
              'Until enabled, the Firefox sidebar works normally and Inspect in DOM remains unavailable.',
              'Hasta que lo actives, el sidebar de Firefox funciona con normalidad e Inspeccionar en el DOM permanece no disponible.',
            )}
      </p>
    </fieldset>
  );
}
