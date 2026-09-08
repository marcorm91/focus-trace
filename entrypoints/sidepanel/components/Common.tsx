import { localeFor, localizedReferenceStatus, tr, type AppLanguage } from '../../../shared/i18n';
import type { StandardReference } from '../../../shared/types';
import { wcagCoverageForCriterion } from '../../../shared/wcag-coverage';

export function timeLabel(timestamp: number, language: AppLanguage = 'en') {
  return new Intl.DateTimeFormat(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(timestamp);
}

export function ReferenceList({
  references,
  language = 'en',
}: {
  references?: StandardReference[] | undefined;
  language?: AppLanguage;
}) {
  if (!references?.length) return null;
  return (
    <ul className="references" aria-label={tr(language, 'Standards references', 'Referencias normativas')}>
      {references.map((reference) => {
        const en301549 = reference.type === 'WCAG'
          ? wcagCoverageForCriterion(reference.id)?.en301549
          : undefined;
        return (
          <li key={`${reference.type}-${reference.id}`}>
            <a href={reference.url} target="_blank" rel="noreferrer">
              {reference.type} {reference.id}
              {reference.level ? ` · ${reference.level}` : ''}
            </a>
            {(reference.status === 'proposed' || reference.status === 'editor-draft') && (
              <span>{localizedReferenceStatus(reference.status, language)}</span>
            )}
            {en301549 && (
              <a
                className="reference-en301549"
                href={en301549.url}
                target="_blank"
                rel="noreferrer"
                title={`${en301549.standard} ${en301549.version}`}
              >
                {en301549.standard} § {en301549.clause} · {en301549.version}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <section className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}
