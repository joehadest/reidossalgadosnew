import { normalizeStoreHours } from "./store-hours"
import { storeOpeningInfo } from "./admin-dashboard"

export function getStoreStatus(
  hours: { day: string; open: string; close: string; closed?: boolean }[],
  now = new Date(),
): boolean {
  if (!hours?.length) return false
  return storeOpeningInfo(normalizeStoreHours(hours), now).open
}
