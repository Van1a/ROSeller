import { robloxAPI } from "./roblox.js";
import { calculateDiscount } from "../misc/helper.js";
import { removeFromInventory } from "../misc/file.js";
import { updateOnSale } from "./webhook/hook.js";
import { getAssetThumbnail } from "./thumbnail.js";
import { config } from "../configuration.js";
import { getResellData } from "./asset.js";
import { error, success, warning, info, devmodelog } from "../misc/logger.js";
import {
  type ResellParams,
  type ResellersResponse,
  type PriceHistory,
  type ResellData,
} from "../types/api.js";

const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

const hasPriceHistory = async (collectibleItemId: string): Promise<boolean> => {
  try {
    const history = await robloxAPI.request<PriceHistory>(
      "GET",
      `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/resale-data`,
    );

    const points = history.priceDataPoints;

    if (!points || points.length === 0) return false;

    const allZero = points.every((p) => p?.value === 0);

    return !allZero;
  } catch {
    return false;
  }
};

const collectiblePrices = new Map<string, number>();

const getCurrentPrice = async (collectibleItemId: string): Promise<number> => {
  if (collectiblePrices.has(collectibleItemId)) {
    return collectiblePrices.get(collectibleItemId)!;
  }

  try {
    const user = await robloxAPI.getUser();

    const list = await robloxAPI.request<ResellersResponse>(
      "GET",
      `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/resellers?cursor=&limit=10`,
    );

    console.log(list.data.length);

    if (list.data.length === 0) {
      return config.autosaleConfiguration.default_price_no_competition;
    }

    const data = (list.data ?? []).filter(
      (listing) => listing.seller.sellerId === user.id
    );

    const price = data[0]?.price ?? list.data[0]!.price;
    collectiblePrices.set(collectibleItemId, price);
    return price;
  } catch (err: any) {
    if (err.message.includes("429")) {
      warning("Rate limited, retrying in 60s.");
      await new Promise((resolve) => setTimeout(resolve, 60000));
      return getCurrentPrice(collectibleItemId);
    }

    return config.autosaleConfiguration.default_price_no_competition;
  }
};

const getResellParams = async (
  collectibleItemId: string,
): Promise<ResellParams> => {
  try {
    const params = await robloxAPI.request<ResellParams>(
      "GET",
      `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/get-resale-parameters`,
    );
    devmodelog(`[getResellParams] priceFloor: ${params.priceFloor}`);
    return params;
  } catch (err: any) {
    if (err.message.includes("429")) {
      warning("Rate limit retrying in 60s.");
      await new Promise((resolve) => setTimeout(resolve, 60000));
      return getResellParams(collectibleItemId);
    }
    return err.response?.data;
  }
};

const calculateResellPrice = async (
  collectibleItemId: string,
): Promise<number> => {
  try {
    const currentPrice = await getCurrentPrice(collectibleItemId);

    if(currentPrice === config.autosaleConfiguration.default_price_no_competition){
      return config.autosaleConfiguration.default_price_no_competition
    }

    const params = await getResellParams(collectibleItemId);

    const discountedPrice = await calculateDiscount(currentPrice);

    if (discountedPrice <= params.priceFloor) {
      return params.priceFloor;
    }

    return discountedPrice;
  } catch {
    return 0;
  }
};

const resellItem = async (
  isOnSale: boolean,
  collectibleProductId: string,
  collectibleItemId: string,
  collectibleItemInstanceId: string,
  serial: number,
  itemData: ResellData,
): Promise<void> => {
  devmodelog(
    `[resellItem] isOnSale: ${isOnSale}, collectibleProductId: ${collectibleProductId}, collectibleItemInstanceId: ${collectibleItemInstanceId} serial: ${serial}`,
  );

  // skip the creator
  if (config.autosaleConfiguration.creator.enable) {
    if (
      config.autosaleConfiguration.creator.skip_creator.includes(
        itemData.creator.CreatorTargetId,
      )
    ){ 
      warning(`Skipping ${itemData.name} because of creator skip list ${itemData.creator.CreatorTargetId}`)
      return;
     }
  }

  // Skip protected serials
  if (config.autosaleConfiguration.skip_serial.some((x) => x === serial)) {
    warning(
      `Skipping ${itemData.name} ${serial}# due to skip serial configuration`,
    );
    removeFromInventory(itemData, true);
    return;
  }

  // Check if item is resellable
  if (!(await hasPriceHistory(collectibleItemId))) {
    warning(
      `Skipping ${itemData.name} ${serial}# because this item is not resellable`,
    );
    removeFromInventory(itemData, true);
    return;
  }

  // Calculate resell price
  const price = await calculateResellPrice(collectibleItemId);

  try {
    const user = await robloxAPI.getUser();

    const payload = {
      price,
      isOnSale,
      sellerId: user.id,
      sellerType: "User",
      collectibleProductId,
    };

    await robloxAPI.request(
      "PATCH",
      `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/instance/${collectibleItemInstanceId}/resale`,
      payload,
      true,
    );

    devmodelog(`[resellItem] ${itemData.name} price: ${price}`);

    // Get thumbnail
    const thumb = await getAssetThumbnail(
      "asset",
      itemData.assetId,
      "420x420",
      false,
    );

    const imageUrl = thumb?.data?.[0]?.imageUrl ?? "";

    success(`Item ${itemData.name} (${serial}#) is now listed at ${price}`);
    removeFromInventory(itemData, false);
    await updateOnSale(
      itemData.name,
      itemData.assetId,
      imageUrl,
      serial,
      price,
    );
    return;
  } catch (err: any) {
    const status = err?.response?.status;

    if (status === 412) {
      warning(`This item ${itemData.name} is not resellable. Skipping`);
      removeFromInventory(itemData, true);
      return;
    }

    if (status === 429) {
      warning(
        `Rate limited on item ${itemData.name} (${serial}#) → retrying in 60s`,
      );
      await new Promise((resolve) => setTimeout(resolve, 60000));
      return resellItem(
        isOnSale,
        collectibleProductId,
        collectibleItemId,
        collectibleItemInstanceId,
        serial,
        itemData,
      );
    }

    info(
      `Name: ${itemData.name} price ${price}\nonsale: ${isOnSale}\nsellerId: ${(await robloxAPI.getUser()).id}\nInstanceId: ${collectibleItemInstanceId}\ncollectible: ${collectibleItemId}\nproductId: ${collectibleProductId}`,
    );

    error(
      `Failed reselling item (${itemData.name}) → status: ${status}. If this persists, contact the maintainer.`,
    );
  }
};

export { resellItem, getCurrentPrice };