import { startCentralFromManifest } from "@oondemand/oon-core-front";
import app from "../../central.app.json";
import ui from "../central.ui.json";

startCentralFromManifest({ app, ui }, {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "/api",
  runtimeMode: import.meta.env.DEV ? "local" : "platform",
  meusAppsUrl: import.meta.env.DEV ? undefined : import.meta.env.VITE_MEUS_APPS_URL,
});
