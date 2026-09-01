import { startCentralFromManifest, type CentralAppManifest, type CentralUiOnlyManifest } from "@oondemand/oon-core-front";
import app from "../../central.app.json";
import ui from "../central.ui.json";
import { CadastrosInitializationPage } from "@oondemand/cadastros-omie-ui";

startCentralFromManifest({ app: app as CentralAppManifest, ui: ui as CentralUiOnlyManifest }, {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "/api",
  runtimeMode: import.meta.env.DEV ? "local" : "platform",
  meusAppsUrl: import.meta.env.DEV ? undefined : import.meta.env.VITE_MEUS_APPS_URL,
  customComponents: { CadastrosInitializationPage },
});
