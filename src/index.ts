import { autoseller } from "./startup.js";
import { hasPriceHistory } from "./api/resell.js"
import "./misc/background/process/onsold.js"

(async (): Promise<void> => {
  // console.log(await hasPriceHistory(`b6b9a1ef-9e59-4f46-a749-6daa61ed1b52`))
  await autoseller()
})();