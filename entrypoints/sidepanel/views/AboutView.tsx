import { browser } from '#imports';
import { localeFor, tr, type AppLanguage } from '../../../shared/i18n';
import '../about.css';

const VERSION_DATE = '2026-08-24';
const CREATOR_NAME = 'Marco Romero';
const CREATOR_LINKEDIN = 'https://es.linkedin.com/in/marcorm91';

export function AboutView({ language }: { language: AppLanguage }) {
  const version = browser.runtime.getManifest().version;
  const formattedVersionDate = new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${VERSION_DATE}T00:00:00Z`));

  return (
    <section className="panel about-panel" aria-labelledby="about-title">
      <div className="section-heading">
        <div>
          <h2 id="about-title">{tr(language, 'About FocusTrace', 'Acerca de FocusTrace')}</h2>
          <p>{tr(language, 'Product information and project provenance.', 'Información del producto y procedencia del proyecto.')}</p>
        </div>
      </div>

      <article className="about-card">
        <div className="about-product">
          <span className="about-mark" aria-hidden="true">FT</span>
          <div>
            <strong>FocusTrace</strong>
            <p>{tr(language, 'Debug accessibility focus like you debug JavaScript.', 'Depura el foco de accesibilidad como depuras JavaScript.')}</p>
          </div>
        </div>

        <dl className="about-meta">
          <div>
            <dt>{tr(language, 'Version', 'Versión')}</dt>
            <dd><code>v{version}</code></dd>
          </div>
          <div>
            <dt>{tr(language, 'Version date', 'Fecha de versión')}</dt>
            <dd><time dateTime={VERSION_DATE}>{formattedVersionDate}</time></dd>
          </div>
          <div>
            <dt>{tr(language, 'Created by', 'Creado por')}</dt>
            <dd>{CREATOR_NAME}</dd>
          </div>
        </dl>

        <a className="about-link" href={CREATOR_LINKEDIN} target="_blank" rel="noreferrer">
          {tr(language, `View ${CREATOR_NAME} on LinkedIn`, `Ver a ${CREATOR_NAME} en LinkedIn`)} <span aria-hidden="true">↗</span>
        </a>
      </article>

      <div className="notice about-privacy">
        <strong>{tr(language, 'Local-first by design', 'Local-first por diseño')}</strong>
        <p>
          {tr(
            language,
            'FocusTrace analyzes accessibility evidence locally in the browser and does not require a FocusTrace account or backend.',
            'FocusTrace analiza la evidencia de accesibilidad localmente en el navegador y no necesita una cuenta ni un backend de FocusTrace.',
          )}
        </p>
      </div>
    </section>
  );
}
