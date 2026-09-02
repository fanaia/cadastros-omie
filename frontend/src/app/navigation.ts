import { defineOonNavigation } from "@oondemand/oon-core-front/routing";
export const navigation = defineOonNavigation([
  { label: "Visão geral", href: "/", order: 10 },
  { label: "Clientes e fornecedores", href: "/parceiros", order: 20 },
  { label: "Auxiliares", href: "/auxiliares", order: 30 },
  { label: "Sincronização", href: "/sincronizacao", order: 40 },
]);
