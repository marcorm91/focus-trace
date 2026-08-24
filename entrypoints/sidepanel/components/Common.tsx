import { localeFor, localizedReferenceStatus, tr, type AppLanguage } from '../../../shared/i18n';
import type { StandardReference } from '../../../shared/types';

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
      {references.map((reference) => (
        <li key={`${reference.type}-${reference.id}`}>
          <a href={reference.url} target="_blank" rel="noreferrer">
            {reference.type} {reference.id}
            {reference.level ? ` · ${reference.level}` : ''}
          </a>
          {(reference.status === 'proposed' || reference.status === 'editor-draft') && (
            <span>{localizedReferenceStatus(reference.status, language)}</span>
          )}
        </li>
      ))}
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
