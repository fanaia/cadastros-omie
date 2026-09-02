import { defineOonRoutes } from "@oondemand/oon-core-front/routing";
import { DashboardPage } from "../pages/DashboardPage";
import { PartnersPage } from "../pages/PartnersPage";
import { AuxiliariesPage } from "../pages/AuxiliariesPage";
import { SyncPage } from "../pages/SyncPage";
export const routes = defineOonRoutes([
  { path: "/", component: DashboardPage, permissions: ["cadastros.partner.read.connection"] },
  { path: "/parceiros", component: PartnersPage, permissions: ["cadastros.partner.read.connection"] },
  { path: "/auxiliares", component: AuxiliariesPage, permissions: ["cadastros.picker.read.connection"] },
  { path: "/sincronizacao", component: SyncPage, permissions: ["cadastros.partner.sync.connection"] },
]);
