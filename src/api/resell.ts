import { robloxAPI } from "./roblox.js";
import chalk from "chalk";
import { calculateDiscount } from "../misc/helper.js";
import { removeFromInventory } from "../misc/file.js";
import { webhookUpdateOnsale } from "./webhook/hook.js";
import { getAssetThumbnail } from "./thumbnail.js";
import { config } from "../configuration.js";
import { getResellData } from "./asset.js";
import { error, success, warning, info, devmodelog } from "../misc/logger.js";
import {
  type ResellParams,
  type ResellersResponse,
  type PriceHistory,
  type ResellData,
  type InstanceResponse,
} from "../types/api.js";

const collectiblePrices = new Map<string, number>();

const hasPriceHistory = async (collectibleItemId: string, isonsale?: boolean): Promise<boolean> => {
  try {
    const history = await robloxAPI.request<PriceHistory>(
      "GET",
      `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/resale-data`,
    );

    if(isonsale){
      return true
    }

    const points = history.priceDataPoints;

    if (!points || points.length === 0) return false;

    const allZero = points.every((p) => p?.value === 0);

    return !allZero;
  } catch {
    return false;
  }
};

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

    if (list.data.length === 0) {
      return config.autosaleConfiguration.default_price_no_competition;
    }

    const data = (list.data ?? []).filter(
      (listing) => listing.seller.sellerId === user.id,
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

const wasAlreadyOnsale = async (
  instanceId: string,
  collectibleId: string,
): Promise<{ isOnsale: boolean; price: number }> => {
  const user = await robloxAPI.getUser();

  const matchesInstance = (instances: InstanceResponse["itemInstances"]) =>
    instances?.find(
      (i) => i.collectibleInstanceId === instanceId && i.saleState === "OnSale",
    );

  const buildUrl = (cursor: string) =>
    `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleId}/resellable-instances?cursor=${cursor}&ownerType=User&ownerId=${user.id}&limit=500`;

  const paginate = async (
    startCursor: string | null,
    direction: "next" | "prev",
  ): Promise<{ isOnsale: boolean; price: number }> => {
    let cursor = startCursor;
    while (cursor !== null) {
      const res: InstanceResponse = await robloxAPI.request<InstanceResponse>(
        "GET",
        buildUrl(cursor),
      );
      const match = matchesInstance(res.itemInstances);
      if (match) return { isOnsale: true, price: match.price ?? 0 };
      cursor =
        direction === "next"
          ? (res.nextPageCursor ?? null)
          : (res.previousPageCursor ?? null);
    }
    return { isOnsale: false, price: 0 };
  };

  try {
    const firstRes: InstanceResponse =
      await robloxAPI.request<InstanceResponse>("GET", buildUrl(""));

    const match = matchesInstance(firstRes.itemInstances);
    if (match) return { isOnsale: true, price: match.price ?? 0 };

    const [fromNext, fromPrev] = await Promise.all([
      paginate(firstRes.nextPageCursor ?? null, "next"),
      paginate(firstRes.previousPageCursor ?? null, "prev"),
    ]);

    return fromNext.isOnsale ? fromNext : fromPrev;
  } catch (err: any) {
    console.log(err?.response?.status);
    return { isOnsale: true, price: 0 };
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

    if (
      currentPrice === config.autosaleConfiguration.default_price_no_competition
    ) {
      return config.autosaleConfiguration.default_price_no_competition;
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
  assetId: number,
  isOnSale: boolean,
  targetInstanceId: string,
): Promise<void> => {
  const itemData = await getResellData(assetId);

  if (!itemData?.itemInstances?.length) {
    warning(
      ` ${chalk.yellowBright("[!]")} No instances found for assetId ${assetId}, skipping.`,
    );
    if (itemData)
      await removeFromInventory(itemData, true, "No instances found", targetInstanceId);
    return;
  }

  const targetInstance =
    itemData.itemInstances.find(
      (i) => i.collectibleInstanceId === targetInstanceId,
    ) ?? itemData.itemInstances[0];

  const serial = targetInstance?.serialNumber;
  const name = itemData.name;
  const collectibleItemId = itemData.collectibleItemId;
  const collectibleInstanceId = targetInstance?.collectibleInstanceId;
  const collectibleProductId = targetInstance?.collectibleProductId;

  devmodelog(
    `[resellItem] isOnSale: ${isOnSale}, collectibleProductId: ${collectibleProductId}, collectibleInstanceId: ${collectibleInstanceId} serial: ${serial}`,
  );

  // LOS layer of strictness

  // skip by configuration assetId
  if (
    config.autosaleConfiguration.skip_assetId.some(
      (v) => v === itemData.assetId,
    )
  ) {
    warning(
      `  ${chalk.bgYellowBright("[!]")} Skipping ${chalk.bold(name)} #${serial} id ${assetId} due to skip_assetId configuration`,
    );
    await removeFromInventory(
      itemData,
      true,
      "Item was skipped due to configuration of skip_assetId",
      collectibleInstanceId,
    );
    return;
  }

  // skip by configuration serial
  if (config.autosaleConfiguration.skip_serial.some((x) => x === serial)) {
    warning(
      ` ${chalk.yellowBright("[!]")} Skipping ${chalk.bold(name)} ${serial}# due to skip serial configuration`,
    );
    await removeFromInventory(itemData, true, "Item was remove because of serial configuration", collectibleInstanceId);
    return;
  }

  // skip because this item was not resellable
  if (!(await hasPriceHistory(collectibleItemId, itemData.collectiblesItemDetails.IsForSale))) {
    warning(
      ` ${chalk.yellowBright("[!]")} Skipping ${chalk.bold(name)} ${serial}# because this item is not resellable`,
    );
    await removeFromInventory(itemData, true, "Skipping the item because this item is not resellable", collectibleInstanceId);
    return;
  }

  // skip by configuration creator skip
  if (config.autosaleConfiguration.creator.enable) {
    if (
      config.autosaleConfiguration.creator.skip_creator.includes(
        itemData.creator.CreatorTargetId,
      )
    ) {
      warning(
        ` ${chalk.yellowBright("[!]")} Skipping ${chalk.bold(name)} because of creator skip list ${itemData.creator.CreatorTargetId}`,
      );
      await removeFromInventory(itemData, true, "Skipping this item because of creator skip configuration", collectibleInstanceId);
      return;
    }
  }

  // skip by configuration skip_on_sale
  if (config.autosaleConfiguration.skip_on_sale) {
    const onSaleCheck = await wasAlreadyOnsale(
      collectibleInstanceId ?? "",
      collectibleItemId,
    );

    if (onSaleCheck.isOnsale) {
      warning(
        ` ${chalk.yellowBright("[!]")} This item was already on sale ${chalk.bold(name)} ${serial}# at price ${onSaleCheck.price}`,
      );
      await removeFromInventory(itemData, true, "Item was skipped because item was already on-sale", collectibleInstanceId);
      return;
    }
  }

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
      `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/instance/${collectibleInstanceId}/resale`,
      payload,
      true,
    );

    devmodelog(`[resellItem] ${itemData.name} price: ${price}`);

    const thumb = await getAssetThumbnail(
      "asset",
      itemData.assetId,
      "420x420",
      false,
    );

    const imageUrl = thumb?.data?.[0]?.imageUrl ?? "";

    success(
      ` ${chalk.yellowBright("[+]")}  Item ${chalk.bold(itemData.name)} (${serial}#) is now listed at ${price}`,
    );
    await removeFromInventory(itemData, false, undefined, collectibleInstanceId);

    if(config.webhook.onsale.enable) await webhookUpdateOnsale(
      itemData.name,
      itemData.assetId,
      serial ?? 0,
      price,
      itemData.collectiblesItemDetails.TotalQuantity,
      itemData.creator.Name,
      itemData.creator.CreatorTargetId,
      itemData.creator.CreatorType,
      imageUrl,
    );

    return;
  } catch (err: any) {
    const status = err?.response?.status;
    info(
      `Name: ${name} price ${price}\nonsale: ${isOnSale}\nsellerId: ${(await robloxAPI.getUser()).id}\nInstanceId: ${collectibleInstanceId}\ncollectible: ${collectibleItemId}\nproductId: ${collectibleProductId}`,
    );

    error(
      `Failed reselling item (${name}) → status: ${status}. If this persists, contact the maintainer.`,
    );
  }
};

export { resellItem, getCurrentPrice, hasPriceHistory,  wasAlreadyOnsale };