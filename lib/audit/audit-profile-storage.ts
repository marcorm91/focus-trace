import { browser } from '#imports';
import {
  activeAuditProfile,
  deleteAuditProfile,
  normalizeAuditProfileStore,
  resetAuditProfiles,
  upsertAuditProfile,
  type AuditProfile,
  type AuditProfileStore,
} from './audit-profiles';

export const AUDIT_PROFILE_STORAGE_KEY = 'focustrace.auditProfiles.v1';

export async function loadAuditProfileStore(): Promise<AuditProfileStore> {
  const stored = await browser.storage.local.get(AUDIT_PROFILE_STORAGE_KEY);
  return normalizeAuditProfileStore(stored[AUDIT_PROFILE_STORAGE_KEY]);
}

export async function saveAuditProfileStore(store: AuditProfileStore): Promise<AuditProfileStore> {
  const normalized = normalizeAuditProfileStore(store);
  await browser.storage.local.set({ [AUDIT_PROFILE_STORAGE_KEY]: normalized });
  return normalized;
}

export async function loadActiveAuditProfile(): Promise<AuditProfile> {
  return activeAuditProfile(await loadAuditProfileStore());
}

export async function activateAuditProfile(profileId: string): Promise<AuditProfileStore> {
  const current = await loadAuditProfileStore();
  if (!current.profiles.some((profile) => profile.id === profileId)) return current;
  return saveAuditProfileStore({ ...current, activeProfileId: profileId });
}

export async function saveAuditProfile(profile: AuditProfile): Promise<AuditProfileStore> {
  return saveAuditProfileStore(upsertAuditProfile(await loadAuditProfileStore(), profile));
}

export async function removeAuditProfile(profileId: string): Promise<AuditProfileStore> {
  return saveAuditProfileStore(deleteAuditProfile(await loadAuditProfileStore(), profileId));
}

export async function resetStoredAuditProfiles(): Promise<AuditProfileStore> {
  const reset = resetAuditProfiles();
  await browser.storage.local.remove(AUDIT_PROFILE_STORAGE_KEY);
  return reset;
}
