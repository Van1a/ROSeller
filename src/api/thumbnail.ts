import axios from "axios";
import { delay } from "../misc/helper.js";
import { devmodelog } from "../misc/logger.js";
import { type ThumbnailResponse } from "../types/api.js";

const getAssetThumbnail = async (
  target: string,
  id: number,
  size: string,
  isCircular: boolean
): Promise<ThumbnailResponse | null> => {
  try {
    const url =
      target === "asset"
        ? `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&returnPolicy=PlaceHolder&size=${size}&format=Png&isCircular=${isCircular}`
        : `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=${size}&format=Png&isCircular=${isCircular}`;

    const thumbnail = await axios.get<ThumbnailResponse>(url);

    devmodelog(`[getAssetThumbnail] target: ${target} id: ${id}`);

    return thumbnail.status === 200 ? thumbnail.data : null;
  } catch (err: any) {
    const status = err?.response?.status;

    if (status === 429) {
      await delay(60000, "Retrying thumbnail");
      return getAssetThumbnail(target, id, size, isCircular);
    }

    return null;
  }
};

export { getAssetThumbnail };