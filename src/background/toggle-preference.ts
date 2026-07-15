import type { PreferenceStore } from "../storage/preferences";

export type TogglePreferenceStore = Pick<
  PreferenceStore,
  "getEnabled" | "setEnabled"
>;

export async function toggleEnabledPreference(
  preferenceStore: TogglePreferenceStore,
): Promise<boolean> {
  const enabled = await preferenceStore.getEnabled();
  const nextEnabled = !enabled;
  await preferenceStore.setEnabled(nextEnabled);
  return nextEnabled;
}
