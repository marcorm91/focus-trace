import { useEffect, useState } from 'react';
import { MAX_AUDITOR_NOTE_LENGTH } from '../../../shared/auditor-notes';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { AuditorNote } from '../../../shared/types';

export function AuditorNoteEditor({
  note,
  language,
  onSave,
}: {
  note?: AuditorNote | undefined;
  language: AppLanguage;
  onSave: (text: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.text ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(note?.text ?? '');
  }, [editing, note?.text]);

  const save = async (text: string) => {
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave(text);
      setEditing(false);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (!editing && !note) {
    return (
      <div className="auditor-note-editor is-empty">
        <button type="button" onClick={() => setEditing(true)}>
          <span aria-hidden="true">＋</span>
          {tr(language, 'Add auditor note', 'Añadir nota del auditor')}
        </button>
      </div>
    );
  }

  return (
    <section className="auditor-note-editor" aria-label={tr(language, 'Auditor note', 'Nota del auditor')}>
      <div className="auditor-note-heading">
        <strong>{tr(language, 'Auditor note', 'Nota del auditor')}</strong>
        {!editing && (
          <div>
            <button type="button" onClick={() => setEditing(true)}>
              {tr(language, 'Edit', 'Editar')}
            </button>
            <button className="danger" type="button" onClick={() => void save('')} disabled={saving}>
              {tr(language, 'Remove', 'Eliminar')}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="auditor-note-form">
          <label>
            <span>{tr(
              language,
              'Add human context without changing the detected result or severity.',
              'Añade contexto humano sin cambiar el resultado detectado ni su gravedad.',
            )}</span>
            <textarea
              autoFocus
              rows={4}
              maxLength={MAX_AUDITOR_NOTE_LENGTH}
              value={draft}
              placeholder={tr(
                language,
                'Example: reproduced with keyboard after opening the account menu.',
                'Ejemplo: reproducido con teclado tras abrir el menú de cuenta.',
              )}
              onChange={(event) => setDraft(event.currentTarget.value)}
            />
          </label>
          <div className="auditor-note-form-footer">
            <small>{draft.length}/{MAX_AUDITOR_NOTE_LENGTH}</small>
            <div>
              <button type="button" onClick={() => {
                setEditing(false);
                setSaveError(false);
              }} disabled={saving}>
                {tr(language, 'Cancel', 'Cancelar')}
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => void save(draft)}
                disabled={saving || !draft.trim() || draft.trim() === note?.text}
              >
                {saving ? tr(language, 'Saving…', 'Guardando…') : tr(language, 'Save note', 'Guardar nota')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="auditor-note-text">{note?.text}</p>
      )}

      {saveError && (
        <p className="auditor-note-error" role="alert">
          {tr(language, 'The note could not be saved. Try again.', 'No se ha podido guardar la nota. Inténtalo de nuevo.')}
        </p>
      )}
    </section>
  );
}
