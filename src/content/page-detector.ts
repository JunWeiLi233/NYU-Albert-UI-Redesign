const SUPPORTED_ALBERT_HOST = "sis.portal.nyu.edu";
const SUPPORTED_ALBERT_TITLE = "albert";

export interface PageDetectionContext {
  document: Document;
  location: Pick<Location, "hostname" | "protocol">;
  topLevel: boolean;
}

export function isSupportedAlbertPage({
  document,
  location,
  topLevel,
}: PageDetectionContext): boolean {
  return (
    topLevel &&
    location.protocol === "https:" &&
    location.hostname === SUPPORTED_ALBERT_HOST &&
    document.title.trim().toLowerCase() === SUPPORTED_ALBERT_TITLE &&
    document.body !== null
  );
}
