import type { PreferenceStore } from "../storage/preferences";

export type TogglePreferenceStore = Pick<
  PreferenceStore,
  "getEnabled" | "setEnabled"
>;

export async function toggleEnabledPreference(
  preferenceStore: TogglePreferenceStore,
): Promise<void> {
  const enabled = await preferenceStore.getEnabled();
  await preferenceStore.setEnabled(!enabled);
}
