import axios from "axios";
import { delay } from "../misc/helper.js";
import { getInstanceInfo } from "./inventory.js";
import { devmodelog } from "../misc/logger.js";
import { type EconomyData, type ResellData, type InstanceResponse } from "../types/api.js";

const getAssetInfo = async (
  assetId: number,
): Promise<EconomyData | null> => {
  try {
    const item = await axios.get<EconomyData>(
      `https://economy.roblox.com/v2/assets/${assetId}/details`
    );

    devmodelog(`[getAssetInfo] ${item.data.Name}`);

    if (item.status === 200) return item.data;
    if (item.status === 400) return null;

    return null;
  } catch (err: any) {
    if (err?.response?.status === 429) {
      await delay(60000, "retry");
      return getAssetInfo(assetId);
    }

    return null;
  }
};

const getResellData = async (
  assetId: number,
): Promise<ResellData | null> => {
  try {
    const economyData = await getAssetInfo(assetId);
    if (!economyData) {
      devmodelog(`[getResellData] Failed with EconomyApi returned null`);
      return null;
    }

    const instanceData = await getInstanceInfo(economyData.CollectibleItemId);
    if (!instanceData) {
      devmodelog(`[getResellData] InstanceApi returned null`);
      return null;
    }

    devmodelog(`[getResellData] ${economyData.Name} instances: ${instanceData.itemInstances[0]?.collectibleInstanceId}`);

    const validInstances = instanceData.itemInstances
      .filter(
        (i) =>
          i.collectibleInstanceId &&
          i.collectibleItemId &&
          i.collectibleProductId &&
          i.serialNumber,
      )
      .map((i) => ({
        collectibleInstanceId: i.collectibleInstanceId!,
        collectibleItemId: i.collectibleItemId!,
        collectibleProductId: i.collectibleProductId!,
        serialNumber: i.serialNumber!,
      }));

    return {
      assetId: economyData.AssetId,
      name: economyData.Name,
      description: economyData.Description,
      assetTypeId: economyData.AssetTypeId,
      priceInRobux: economyData.PriceInRobux,
      sales: economyData.Sales,
      remaining: economyData.Remaining,
      collectibleItemId: economyData.CollectibleItemId,
      collectibleProductId: economyData.CollectibleProductId,
      collectiblesItemDetails: {
        CollectibleLowestResalePrice: economyData.CollectiblesItemDetails.CollectibleLowestResalePrice,
        CollectibleLowestAvailableResaleProductId: economyData.CollectiblesItemDetails.CollectibleLowestAvailableResaleProductId,
        CollectibleLowestAvailableResaleItemInstanceId: economyData.CollectiblesItemDetails.CollectibleLowestAvailableResaleItemInstanceId,
        CollectibleQuantityLimitPerUser: economyData.CollectiblesItemDetails.CollectibleQuantityLimitPerUser,
        IsForSale: economyData.CollectiblesItemDetails.IsForSale,
        TotalQuantity: economyData.CollectiblesItemDetails.TotalQuantity,
        IsLimited: economyData.CollectiblesItemDetails.IsLimited,
      },
      creator: {
        Id: economyData.Creator.Id,
        Name: economyData.Creator.Name,
        CreatorType: economyData.Creator.CreatorType,
        CreatorTargetId: economyData.Creator.CreatorTargetId,
        HasVerifiedBadge: economyData.Creator.HasVerifiedBadge,
      },
      itemInstances: validInstances,
    };
  } catch {
    return null;
  }
};

export { getAssetInfo, getResellData };