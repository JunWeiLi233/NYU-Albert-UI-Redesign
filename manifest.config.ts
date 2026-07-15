import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Better Albert",
  version: "0.2.0",
  description:
    "A local-first, NYU-aligned interface enhancement for NYU Albert.",
  permissions: ["storage"],
  host_permissions: ["https://sis.portal.nyu.edu/*"],
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  action: {
    default_title: "Better Albert is on — click to disable",
  },
  content_scripts: [
    {
      matches: [
        "https://sis.portal.nyu.edu/*",
        "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL*",
      ],
      css: ["src/design-system/native-theme.css"],
      js: ["src/content/bootstrap.ts"],
      run_at: "document_idle",
      all_frames: true,
    },
  ],
});
