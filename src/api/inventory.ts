import { robloxAPI } from "./roblox.js";
import { delay } from "../misc/helper.js";
import {
  retrieveUserFile,
  retrieveInventory,
  appendInventory,
  verifyingTTL,
} from "../misc/file.js";
import { error, success, warning, info, devmodelog } from "../misc/logger.js";
import { type InstanceResponse, type CollectibleItem, type InventoryResponse } from "../types/api.js";

const assetTypes = [
  8, 17, 18, 19, 41, 42, 43, 44, 45, 46, 61, 47, 64, 65, 66, 67, 68, 69, 70, 71, 72, 76,
  77, 79,
];

const RETRYABLE_ERRORS = ["stream has been aborted", "socket hang up", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND"];

const getInstanceInfo = async (
  collectibleItemId: string,
  attempt: number = 0,
): Promise<InstanceResponse | null> => {
  try {
    const user = await robloxAPI.getUser();

    const instance = await robloxAPI.request<InstanceResponse>(
      "GET",
      `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/resellable-instances?ownerType=User&ownerId=${user.id}&limit=500`
    );

    devmodelog(`[getInstanceInfo] ${instance.itemInstances.length} instances`);

    if (instance.itemInstances.length === 0) {
      warning("User does not own this item, skipping.");
      return null;
    }

    return instance;
  } catch (err: any) {
    const message: string = err?.message ?? "";

    if (message.includes("429")) {
      warning("Rate limit detected while fetching item details; retrying in 60s.");
      await delay(60000, "Proceeding now");
      return getInstanceInfo(collectibleItemId, attempt);
    }

    if (message.includes("400")) {
      warning("User does not own this item. Skipping.");
      return null;
    }

    if (RETRYABLE_ERRORS.some((e) => message.toLowerCase().includes(e.toLowerCase()))) {
      if (attempt >= 3) {
        error(`[getInstanceInfo] Failed after 3 retries for ${collectibleItemId}: ${message}`);
        return null;
      }
      const waitMs = 5000 * (attempt + 1);
      warning(`[getInstanceInfo] Transient error (${message}), retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/3)`);
      await delay(waitMs, "Moment");
      return getInstanceInfo(collectibleItemId, attempt + 1);
    }

    error(`An unexpected error occurred. Contact the owner if this continues.\n${message}`);
    return null;
  }
};

const canViewInventory = async (): Promise<boolean> => {
  try {
    const user = await robloxAPI.getUser();

    const res = await robloxAPI.request<{ canView: boolean }>(
      "GET",
      `https://inventory.roblox.com/v1/users/${user.id}/can-view-inventory`
    );

    devmodelog(`[canViewInventory] canView: ${res.canView}`);
    return res.canView;
  } catch {
    return false;
  }
};

const getInventory = async (): Promise<CollectibleItem[]> => {
  const cachedInventory = await retrieveInventory();

  if (await verifyingTTL("inventory") && cachedInventory.data.length > 0) {
    devmodelog(`[getInventory] cached ${cachedInventory.data.length} items`);
    info("Using cached inventory");
    return cachedInventory.data;
  }

  const items: CollectibleItem[] = [];
  const cursorMap: Record<number, string> = {};
  let itemCount = 0;
  const user = await robloxAPI.getUser();

  for (const assetType of assetTypes) {
    let cursor = cursorMap[assetType] || "";

    while (true) {
      const res = await robloxAPI.request<InventoryResponse>(
        "GET",
        `https://inventory.roblox.com/v2/users/${user.id}/inventory/${assetType}?limit=100&cursor=${cursor}`
      );

      devmodelog(`[getInventory] assetType: ${assetType} items: ${res.data?.length || 0}`);

      if (!res.data || res.data.length === 0) {
        break;
      }

      const data: CollectibleItem[] = res.data ?? [];

      const filteredItems = data
        .filter((item: CollectibleItem) => item.serialNumber !== null)
        .map((item: CollectibleItem) => {
          itemCount++;
          info(`ITEM: ${item.assetName} | SERIAL: ${item.serialNumber}# | COUNT: ${itemCount}`);
          return {
            assetId: item.assetId,
            assetName: item.assetName,
            serialNumber: item.serialNumber as number,
            collectibleItemId: item.collectibleItemId,
            collectibleItemInstanceId: item.collectibleItemInstanceId,
          };
        });

      items.push(...filteredItems);
      cursor = res.nextPageCursor || "";
      cursorMap[assetType] = cursor;

      if (!cursor) break;
      await delay(100, "");
    }
  }

  await appendInventory(items);
  success(`Found: ${items.length} items starting to resell now.`);
  return items;
};

export { getInventory, getInstanceInfo };