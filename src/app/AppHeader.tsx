import { useState } from "react";

export interface AppHeaderProps {
  onDisable: () => Promise<void>;
}

export function AppHeader({ onDisable }: AppHeaderProps) {
  const [isDisabling, setIsDisabling] = useState(false);

  const handleDisable = (): void => {
    setIsDisabling(true);
    void onDisable();
  };

  return (
    <header className="ba-header" aria-label="Better Albert">
      <div className="ba-brand-lockup">
        <span className="ba-nyu">NYU</span>
        <span className="ba-brand-rule" aria-hidden="true" />
        <span className="ba-product-name">Better Albert</span>
        <span className="ba-product-status">Unofficial local enhancement</span>
      </div>
      <button
        className="ba-disable-button"
        type="button"
        disabled={isDisabling}
        onClick={handleDisable}
      >
        {isDisabling ? "Disabling…" : "Disable Better Albert"}
      </button>
    </header>
  );
}
