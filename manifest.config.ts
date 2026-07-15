import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Better Albert",
  version: "0.1.0",
  description:
    "A local-first, NYU-aligned interface enhancement for NYU Albert.",
  permissions: ["storage"],
  host_permissions: ["https://sis.portal.nyu.edu/*"],
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  action: {
    default_title: "Enable or disable Better Albert",
  },
  content_scripts: [
    {
      matches: ["https://sis.portal.nyu.edu/*"],
      js: ["src/content/bootstrap.ts"],
      run_at: "document_idle",
    },
  ],
});
