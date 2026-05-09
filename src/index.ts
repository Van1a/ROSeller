import { getInventory } from "./api/inventory.js";
import { getInstanceInfo } from "./api/inventory.js";
import { getAssetInfo, getResellData } from "./api/asset.js";
import { resellItem, getCurrentPrice,wasAlreadyOnsale } from "./api/resell.js";
import { delay } from "./misc/helper.js";
import { webhookOnsold } from "./api/webhook/hook.js";
import { autoseller, version } from "./startup.js";
import "./misc/background/process/onsold.js";
import { close, input } from "./misc/input.js";
import axios from "axios";
import { robloxAPI } from "./api/roblox.js";
import { type InstanceResponse } from "./types/api.js";

(async (): Promise<void> => {
  console.log(await wasAlreadyOnsale("4365d84d-d723-4d40-b034-64548b6357d3"));
  //  await autoseller();
  // webhookOnsold(
  //   106107190558145,
  //   "Bunny Pin",
  //   120,
  //   "https://tr.rbxcdn.com/180DAY-0d5dfb7b73292bda82dd518404704f54/420/420/Hat/Webp/noFilter",
  //   "ROSeller",
  //   123,
  //   "User",
  // )
})();