import { useEffect, useMemo, useState } from 'react';
import {
  ALL_AUDIT_PROFILE_REFERENCE_TYPES,
  ALL_AUDIT_PROFILE_SCOPES,
  ALL_AUDIT_PROFILE_SEVERITIES,
  ALL_AUDIT_RULE_FAMILIES,
  AUDIT_PROFILE_VERSION,
  DEFAULT_AUDIT_PROFILE_ID,
  activeAuditProfile,
  type AuditProfile,
  type AuditProfileReferenceType,
  type AuditProfileScope,
  type AuditProfileStandard,
  type AuditRuleFamily,
} from '../../../lib/audit/audit-profiles';
import {
  activateAuditProfile,
  loadAuditProfileStore,
  removeAuditProfile,
  resetStoredAuditProfiles,
  saveAuditProfile,
} from '../../../lib/audit/audit-profile-storage';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { Severity } from '../../../shared/types';
import './audit-profile-settings.css';

const FAMILY_LABELS: Record<AuditRuleFamily, { en: string; es: string }> = {
  semantics: { en: 'Names and semantics', es: 'Nombres y semántica' },
  structure: { en: 'Structure', es: 'Estructura' },
  'keyboard-focus': { en: 'Keyboard and focus', es: 'Teclado y foco' },
  forms: { en: 'Forms', es: 'Formularios' },
  visual: { en: 'Visual presentation', es: 'Presentación visual' },
  media: { en: 'Images and media', es: 'Imágenes y multimedia' },
  language: { en: 'Language', es: 'Idioma' },
  other: { en: 'Other rules', es: 'Otras reglas' },
};

const SCOPE_LABELS: Record<AuditProfileScope, { en: string; es: string }> = {
  page: { en: 'Page', es: 'Página' },
  component: { en: 'Component', es: 'Componente' },
  site: { en: 'Site Audit', es: 'Site Audit' },
};

const SEVERITY_LABELS: Record<Severity, { en: string; es: string }> = {
  critical: { en: 'Critical', es: 'Crítica' },
  serious: { en: 'Serious', es: 'Seria' },
  moderate: { en: 'Moderate', es: 'Moderada' },
  minor: { en: 'Minor', es: 'Menor' },
  info: { en: 'Info', es: 'Info' },
};

function localized(label: { en: string; es: string }, language: AppLanguage): string {
  return language === 'es' ? label.es : label.en;
}

function profileId(): string {
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function copyForEditing(profile: AuditProfile): AuditProfile {
  return {
    ...profile,
    scopes: [...profile.scopes],
    referenceTypes: [...profile.referenceTypes],
    ruleIds: [...profile.ruleIds],
    severities: [...profile.severities],
    ruleFamilies: [...profile.ruleFamilies],
  };
}

function toggleValue<T extends string>(values: T[], value: T, enabled: boolean): T[] {
  return enabled ? [...new Set([...values, value])] : values.filter((item) => item !== value);
}

export function AuditProfileSettings({ language }: { language: AppLanguage }) {
  const [profiles, setProfiles] = useState<AuditProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState(DEFAULT_AUDIT_PROFILE_ID);
  const [draft, setDraft] = useState<AuditProfile>();
  const [status, setStatus] = useState<string>();

  useEffect(() => {
    void loadAuditProfileStore().then((store) => {
      setProfiles(store.profiles);
      setActiveProfileId(store.activeProfileId);
      setDraft(copyForEditing(activeAuditProfile(store)));
    });
  }, []);

  const selected = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId),
    [activeProfileId, profiles],
  );
  const editable = Boolean(draft && !draft.builtIn);

  const refresh = async (nextStatus?: string) => {
    const store = await loadAuditProfileStore();
    setProfiles(store.profiles);
    setActiveProfileId(store.activeProfileId);
    setDraft(copyForEditing(activeAuditProfile(store)));
    setStatus(nextStatus);
  };

  const selectProfile = async (id: string) => {
    const store = await activateAuditProfile(id);
    setProfiles(store.profiles);
    setActiveProfileId(store.activeProfileId);
    setDraft(copyForEditing(activeAuditProfile(store)));
    setStatus(tr(language, 'Profile applied locally.', 'Perfil aplicado localmente.'));
  };

  const createFromSelected = async () => {
    const source = selected ?? activeAuditProfile(await loadAuditProfileStore());
    const now = Date.now();
    const profile: AuditProfile = {
      ...copyForEditing(source),
      version: AUDIT_PROFILE_VERSION,
      id: profileId(),
      name: tr(language, `${source.name} copy`, `Copia de ${source.name}`),
      createdAt: now,
      updatedAt: now,
      builtIn: false,
    };
    await saveAuditProfile(profile);
    await refresh(tr(language, 'Editable profile created.', 'Perfil editable creado.'));
  };

  const saveDraft = async () => {
    if (!draft || draft.builtIn) return;
    if (!draft.name.trim() || !draft.scopes.length || !draft.referenceTypes.length || !draft.severities.length || !draft.ruleFamilies.length) {
      setStatus(tr(
        language,
        'Keep a name and at least one scope, standards source, severity and rule family.',
        'Mantén un nombre y al menos un alcance, fuente normativa, severidad y familia de reglas.',
      ));
      return;
    }
    await saveAuditProfile({ ...draft, name: draft.name.trim(), updatedAt: Date.now() });
    await refresh(tr(language, 'Profile saved and applied.', 'Perfil guardado y aplicado.'));
  };

  const deleteSelected = async () => {
    if (!selected || selected.builtIn) return;
    await removeAuditProfile(selected.id);
    await refresh(tr(language, 'Profile deleted.', 'Perfil eliminado.'));
  };

  const resetProfiles = async () => {
    await resetStoredAuditProfiles();
    await refresh(tr(language, 'Profiles reset to the complete default profile.', 'Perfiles restablecidos al perfil completo predeterminado.'));
  };

  if (!draft) return null;

  return (
    <fieldset className="settings-group audit-profile-settings">
      <legend>{tr(language, 'Audit profiles', 'Perfiles de auditoría')}</legend>
      <p className="settings-help">
        {tr(
          language,
          'Reuse a local reporting profile across scans. Profiles filter stored findings by scope, WCAG target, severity and rule family; they never change the inspected page.',
          'Reutiliza un perfil local entre análisis. Los perfiles filtran los hallazgos guardados por alcance, objetivo WCAG, severidad y familia de reglas; nunca modifican la página inspeccionada.',
        )}
      </p>

      <label className="audit-profile-field">
        <span>{tr(language, 'Active profile', 'Perfil activo')}</span>
        <select value={activeProfileId} onChange={(event) => void selectProfile(event.currentTarget.value)}>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
      </label>

      <div className="audit-profile-actions">
        <button className="ft-button" type="button" onClick={() => void createFromSelected()}>
          {tr(language, 'Duplicate to edit', 'Duplicar para editar')}
        </button>
        <button className="ft-button" type="button" disabled={!editable} onClick={() => void deleteSelected()}>
          {tr(language, 'Delete profile', 'Eliminar perfil')}
        </button>
        <button className="ft-button" type="button" onClick={() => void resetProfiles()}>
          {tr(language, 'Reset profiles', 'Restablecer perfiles')}
        </button>
      </div>

      <label className="audit-profile-field">
        <span>{tr(language, 'Profile name', 'Nombre del perfil')}</span>
        <input
          type="text"
          maxLength={80}
          value={draft.name}
          disabled={!editable}
          onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })}
        />
      </label>

      <label className="audit-profile-field">
        <span>{tr(language, 'WCAG target', 'Objetivo WCAG')}</span>
        <select
          value={draft.standard}
          disabled={!editable}
          onChange={(event) => setDraft({ ...draft, standard: event.currentTarget.value as AuditProfileStandard })}
        >
          <option value="all">{tr(language, 'All supported rules', 'Todas las reglas compatibles')}</option>
          <option value="A">WCAG 2.2 A</option>
          <option value="AA">WCAG 2.2 AA</option>
          <option value="AAA">WCAG 2.2 AAA</option>
        </select>
      </label>

      <div className="audit-profile-dimension" role="group" aria-label={tr(language, 'Profile scopes', 'Alcances del perfil')}>
        <strong>{tr(language, 'Scope', 'Alcance')}</strong>
        {ALL_AUDIT_PROFILE_SCOPES.map((scope) => (
          <label key={scope}>
            <input
              type="checkbox"
              disabled={!editable}
              checked={draft.scopes.includes(scope)}
              onChange={(event) => setDraft({ ...draft, scopes: toggleValue(draft.scopes, scope, event.currentTarget.checked) })}
            />
            <span>{localized(SCOPE_LABELS[scope], language)}</span>
          </label>
        ))}
      </div>

      <div className="audit-profile-dimension" role="group" aria-label={tr(language, 'Profile severities', 'Severidades del perfil')}>
        <strong>{tr(language, 'Severity', 'Severidad')}</strong>
        {ALL_AUDIT_PROFILE_SEVERITIES.map((severity) => (
          <label key={severity}>
            <input
              type="checkbox"
              disabled={!editable}
              checked={draft.severities.includes(severity)}
              onChange={(event) => setDraft({ ...draft, severities: toggleValue(draft.severities, severity, event.currentTarget.checked) })}
            />
            <span>{localized(SEVERITY_LABELS[severity], language)}</span>
          </label>
        ))}
      </div>

      <div className="audit-profile-dimension" role="group" aria-label={tr(language, 'Profile standards sources', 'Fuentes normativas del perfil')}>
        <strong>{tr(language, 'Standards sources', 'Fuentes normativas')}</strong>
        {ALL_AUDIT_PROFILE_REFERENCE_TYPES.map((referenceType) => (
          <label key={referenceType}>
            <input
              type="checkbox"
              disabled={!editable}
              checked={draft.referenceTypes.includes(referenceType)}
              onChange={(event) => setDraft({ ...draft, referenceTypes: toggleValue<AuditProfileReferenceType>(draft.referenceTypes, referenceType, event.currentTarget.checked) })}
            />
            <span>{referenceType}</span>
          </label>
        ))}
      </div>

      <div className="audit-profile-dimension" role="group" aria-label={tr(language, 'Profile rule families', 'Familias de reglas del perfil')}>
        <strong>{tr(language, 'Rule families', 'Familias de reglas')}</strong>
        {ALL_AUDIT_RULE_FAMILIES.map((family) => (
          <label key={family}>
            <input
              type="checkbox"
              disabled={!editable}
              checked={draft.ruleFamilies.includes(family)}
              onChange={(event) => setDraft({ ...draft, ruleFamilies: toggleValue(draft.ruleFamilies, family, event.currentTarget.checked) })}
            />
            <span>{localized(FAMILY_LABELS[family], language)}</span>
          </label>
        ))}
      </div>

      <label className="audit-profile-field">
        <span>{tr(language, 'Exact rule IDs', 'IDs exactos de regla')}</span>
        <textarea
          rows={4}
          disabled={!editable}
          value={draft.ruleIds.join('\n')}
          placeholder="FT-WCAG-003\nFT-REVIEW-024"
          aria-describedby="audit-profile-rule-ids-help"
          onChange={(event) => setDraft({
            ...draft,
            ruleIds: event.currentTarget.value.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean),
          })}
        />
        <small id="audit-profile-rule-ids-help">
          {tr(
            language,
            'Leave empty to include every rule allowed by the other filters. Use FocusTrace rule IDs separated by spaces, commas or new lines.',
            'Déjalo vacío para incluir todas las reglas permitidas por los demás filtros. Usa IDs de FocusTrace separados por espacios, comas o líneas.',
          )}
        </small>
      </label>

      <button className="ft-button audit-profile-save" type="button" disabled={!editable} onClick={() => void saveDraft()}>
        {tr(language, 'Save and apply profile', 'Guardar y aplicar perfil')}
      </button>

      {status && <p className="audit-profile-status" role="status" aria-live="polite">{status}</p>}
    </fieldset>
  );
}