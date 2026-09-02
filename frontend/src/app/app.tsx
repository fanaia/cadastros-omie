import { defineOonApp, type OonAppKind, type OonTenancyModel } from "@oondemand/oon-core-front";
import manifest from "../../../central.app.json";
import { navigation } from "./navigation";
import { routes } from "./routes";
import { theme } from "./theme";
export const app = defineOonApp({
  app: { id: manifest.id, name: manifest.name, title: manifest.name, kind: manifest.appKind as OonAppKind, tenancyModel: manifest.tenancyModel as OonTenancyModel, capabilities: manifest.capabilities },
  api: { baseUrl: import.meta.env.VITE_API_URL ?? "/api", meusAppsUrl: import.meta.env.DEV ? undefined : import.meta.env.VITE_MEUS_APPS_URL },
  runtimeMode: import.meta.env.DEV ? "local" : "platform",
  routes: [...routes], navigation: [...navigation], theme, shell: { shell: "default" },
});
