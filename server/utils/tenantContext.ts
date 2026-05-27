import { AsyncLocalStorage } from "async_hooks";

export const tenantLocalStorage = new AsyncLocalStorage<string>();

export const getTenantId = (): string | undefined => {
  return tenantLocalStorage.getStore();
};
