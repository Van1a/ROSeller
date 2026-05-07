import { robloxAPI } from "./roblox.js";
import { devmodelog } from "../misc/logger.js";
import { type SalesResponse } from "../types/api.js";

const getSaleReport = async (): Promise<SalesResponse["data"] | null> => {
  try {
    const user = await robloxAPI.getUser();

    const data = await robloxAPI.request<SalesResponse>(
      "GET",
      `https://economy.roblox.com/v2/users/${user.id}/transactions?limit=10&cursor=&transactionType=Sale`
    );
    devmodelog(`[getSaleReport] ${data.data.length} transactions`);
    return data.data;
  } catch (err: any) {
    return null;
  }
};

export { getSaleReport };
