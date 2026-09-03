import { useEffect, useRef } from 'react';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { AccessibilityAudit } from '../../../lib/audit/multipage-audit';

export function AuditScopeDialog({
  audit,
  site,
  language,
  onAdd,
  onNew,
  onCancel,
}: {
  audit?: AccessibilityAudit | undefined;
  site?: string | undefined;
  language: AppLanguage;
  onAdd: () => void;
  onNew: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const newAuditRef = useRef<HTMLButtonElement>(null);
  const open = Boolean(audit && site);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => newAuditRef.current?.focus());
      return;
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="trace-reset-dialog audit-scope-dialog"
      aria-labelledby="audit-scope-title"
      aria-describedby="audit-scope-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="trace-reset-dialog-copy">
        <p className="eyebrow">{tr(language, 'Current audit', 'Auditoría actual')}</p>
        <h3 id="audit-scope-title">{tr(
          language,
          'This page belongs to another site',
          'Esta página pertenece a otro sitio',
        )}</h3>
        <p id="audit-scope-description">{tr(
          language,
          'Choose whether this page should join the current audit or start a separate one. Nothing is analyzed until you choose.',
          'Elige si esta página debe añadirse a la auditoría actual o iniciar una independiente. No se analizará nada hasta que elijas.',
        )}</p>
      </div>

      <dl className="audit-scope-context">
        <div>
          <dt>{tr(language, 'Current audit', 'Auditoría actual')}</dt>
          <dd>{audit?.name}</dd>
        </div>
        <div>
          <dt>{tr(language, 'Current page site', 'Sitio de la página actual')}</dt>
          <dd>{site}</dd>
        </div>
      </dl>

      <div className="trace-reset-dialog-actions audit-scope-actions">
        <button type="button" onClick={onCancel}>
          {tr(language, 'Cancel', 'Cancelar')}
        </button>
        <button type="button" onClick={onAdd}>
          {tr(language, 'Add to current audit', 'Añadir a la auditoría actual')}
        </button>
        <button ref={newAuditRef} className="trace-reset-confirm" type="button" onClick={onNew}>
          {tr(language, 'Start new audit', 'Empezar una nueva auditoría')}
        </button>
      </div>
    </dialog>
  );
}
