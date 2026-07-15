import { describe, expect, it, vi } from "vitest";

import { toggleEnabledPreference } from "../../src/background/toggle-preference";

describe("toolbar preference toggle", () => {
  it.each([
    { current: true, expected: false },
    { current: false, expected: true },
  ])("changes $current to $expected", async ({ current, expected }) => {
    const getEnabled = vi.fn().mockResolvedValue(current);
    const setEnabled = vi.fn().mockResolvedValue(undefined);

    await toggleEnabledPreference({ getEnabled, setEnabled });

    expect(getEnabled).toHaveBeenCalledOnce();
    expect(setEnabled).toHaveBeenCalledWith(expected);
  });
});
