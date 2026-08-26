import {
  componentContextLabel,
  componentPrimaryLabel,
  componentTypeLabel,
  type ReportComponentIdentity,
} from '../../../lib/report/component-identity';
import { tr, type AppLanguage } from '../../../shared/i18n';
import './report-component-identity.css';

export function ReportComponentIdentityView({
  component,
  language,
  compact = false,
}: {
  component?: ReportComponentIdentity | undefined;
  language: AppLanguage;
  compact?: boolean;
}) {
  if (!component) return null;
  const context = componentContextLabel(component);
  return (
    <div className={`report-component-identity ${compact ? 'is-compact' : ''}`}>
      <span className="report-component-id">{component.componentId}</span>
      <div>
        <small>{tr(language, 'Affected element', 'Elemento afectado')} · {componentTypeLabel(component, language)}</small>
        <strong title={componentPrimaryLabel(component)}>{componentPrimaryLabel(component)}</strong>
        {context && <span title={context}>{context}</span>}
      </div>
    </div>
  );
}
