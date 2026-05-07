import axios from "axios";
import { config } from "./configuration.js";
import { verifyWebhook } from "./api/webhook/hook.js";
import { error, success, warning, info, devmodelog } from "./misc/logger.js";
import { input, close } from "./misc/input.js";
import { execSync } from "child_process"

import { retrieveUser } from "./api/auth.js";
import { getInventory } from "./api/inventory.js";
import { retrieveInventory, retrieveOnmarket } from "./misc/file.js";
import { getResellData } from "./api/asset.js";
import { resellItem } from "./api/resell.js";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const version = async (): Promise<void> => {
  const retrieveVersion = await axios.get<string>(
    "https://raw.githubusercontent.com/Van1a/ROSeller/refs/heads/main/version/version.txt"
  )

  const retrievePatchlist = await axios.get<string>(
    "https://raw.githubusercontent.com/Van1a/ROSeller/refs/heads/main/version/patch.txt"
  )

  if (config.version !== retrieveVersion.data.trim()) {
    console.log("Note: backup your config before updating")

    const res = (await input("New Version detected (Y/P/N): ")).toLowerCase()

    if (res === "y") {
      try {
        execSync("git stash push -u -m 'auto-update' && git pull && git stash pop || true")
      } catch {
        console.log("Git not installed or failed")
      }
    } else if (res === "p") {
      console.log(retrievePatchlist.data)
      await version()
    } else {
      console.log("Continuing with older version")
    }

    return
  }

  console.log("Continuing now")
}

const start = async (): Promise<boolean> => {
  await version()
  if (config.developer.skip_comfirmation) {
    devmodelog("Skipped");
    await getInventory();
    await sellDefault();
    return true;
  }

  info("Initializing client configuration...");
  await sleep(800);

  info("Checking if cookie is valid...........");
  await retrieveUser();

  info("Running system checks: WebSocket module...");
  await sleep(600);
  warning("skipped (disabled by configuration)");
  await sleep(500);

  info("_________________________________________________-");
  info("Validating webhook endpoints...");
  await sleep(700);

  if (config.webhook.onsale.enable) {
    if (!config.webhook.onsale.webhookUrl) {
      error("On-sale webhook is enabled but no URL is configured.");
      return false;
    }

    const ok = await verifyWebhook(
      config.webhook.onsale.webhookUrl,
      "Successfully configured. We verified this webhook and it is valid. You will receive updates in this channel.",
    );

    if (ok) success("Onsale webhook is valid");
    if (!ok) {
      error("On-sale webhook is not valid. Please double-check the URL.");
      return false;
    }
  }

  if (config.webhook.onSold.enable) {
    if (!config.webhook.onSold.webhookUrl) {
      error("On-sold webhook is enabled but no URL is configured.");
      return false;
    }

    const ok = await verifyWebhook(
      config.webhook.onSold.webhookUrl,
      "Successfully configured. We verified this webhook and it is valid. You will receive updates about your sales.",
    );

    if (ok) success("On-sold webhook is valid");
    if (!ok) {
      error("On-sold webhook is not valid. Please double-check the URL.");
      return false;
    }
  }

  success("Webhook channels verified and active.");
  await sleep(800);

  info("_________________________________________________-");
  info("Loading autosale configuration...");
  await sleep(700);

  if (config.autosaleConfiguration.enable) {
    success("Autosale system enabled.");
    await sleep(500);

    if (!config.autosaleConfiguration.default_price_no_competition) {
      error("Critical error: default price is not configured.");
      return false;
    }

    info(
      `Fallback price set to ${config.autosaleConfiguration.default_price_no_competition}`,
    );
    await sleep(600);

    if (config.autosaleConfiguration.skip_serial.length > 0) {
      info(
        `Protected serials: ${config.autosaleConfiguration.skip_serial.join(", ")}`,
      );
    } else {
      warning("No protected serials configured.");
    }

    await sleep(600);

    info("Evaluating pricing strategy...");
    await sleep(500);

    if (config.autosaleConfiguration.price_cut.enable) {
      success(
        `Price cut active: ${config.autosaleConfiguration.price_cut.percentage}% applied`,
      );
    } else {
      warning("Price cut disabled");
    }

    await sleep(600);
  }

  info("_________________________________________________-");
  success("Startup completed successfully.");
  await getInventory();
  await sellDefault();
  return true;
};

const sellDefault = async (): Promise<void> => {
  try {
    const inventory = (await retrieveInventory()).data;
    const onmarket = await retrieveOnmarket();

    const seen = new Set<number>();

    for (const item of inventory) {
      if (seen.has(item.assetId)) continue;
      seen.add(item.assetId);

      if (
        config.autosaleConfiguration.skip_on_sale &&
        onmarket.some(
          (x) =>
            x.itemInstances[0]?.collectibleInstanceId ===
            item.collectibleItemInstanceId,
        )
      ) {
        console.log(
          `[SKIP] Already on market Name${item.assetName} ${item.assetId}`,
        );
        continue;
      }

      const itemData = await getResellData(item.assetId);
      if (!itemData?.itemInstances?.length) continue;

      for (const instance of itemData.itemInstances) {
        await resellItem(
          true,
          instance.collectibleProductId,
          itemData.collectibleItemId,
          instance.collectibleInstanceId,
          instance.serialNumber,
          itemData,
        );
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const autoseller = async (): Promise<void> => {
  console.clear();
  const started = await start();
  if (!started) return;
};

export { start, autoseller };
