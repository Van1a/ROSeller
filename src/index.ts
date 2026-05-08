import { getInventory } from "./api/inventory.js";
import { getInstanceInfo } from "./api/inventory.js";
import { getAssetInfo, getResellData } from "./api/asset.js";
import { resellItem, getCurrentPrice } from "./api/resell.js";
import { updateOnSale } from "./api/webhook/hook.js";
import { delay } from "./misc/helper.js";

import { autoseller, version } from "./startup.js";
import "./misc/background/process/onsold.js";
import { close, input } from "./misc/input.js";
import axios from "axios";

(async (): Promise<void> => {
  await autoseller();
})();
