import axios from "axios";
import { config } from "./configuration.js";
import { verifyWebhook } from "./api/webhook/hook.js";
import { error, success, warning, info, devmodelog } from "./misc/logger.js";
import { input, close } from "./misc/input.js";
import { execSync } from "child_process";

import { retrieveUser } from "./api/auth.js";
import { getInventory } from "./api/inventory.js";
import { retrieveInventory, retrieveOnmarket } from "./misc/file.js";
import { resellItem } from "./api/resell.js";

const version = async (): Promise<void> => {
  const retrieveVersion = await axios.get<string>(
    "https://raw.githubusercontent.com/Van1a/ROSeller/refs/heads/main/version/version.txt",
  );

  const retrievePatchlist = await axios.get<string>(
    "https://raw.githubusercontent.com/Van1a/ROSeller/refs/heads/main/version/patch.txt",
  );

  if (config.version !== retrieveVersion.data.trim()) {
    warning("A new version is available.");
    warning(
      "Updating may overwrite your configuration.ts, and stored — make a backup before proceeding.",
    );

    const res = (
      await input(
        `Update now? Type "Y" to update, "N" to skip, or "P" to view the patch notes first: `,
      )
    ).toLowerCase();

    if (res === "y") {
      try {
        info("Pulling latest changes...");
        execSync(
          "git stash push -u -m 'auto-update' && git pull && git stash pop || true",
        );
        success("Update complete. Please restart the program.");
      } catch {
        error("Update failed. Make sure Git is installed and accessible.");
      }
      process.exit(0);
    } else if (res === "p") {
      console.log(retrievePatchlist.data);
      await version();
    } else {
      warning(`Skipping update — running version ${config.version}.`);
    }

    return;
  }

  success(`Version ${retrieveVersion.data.trim()} is up to date.`);
};

const checkIsOnMarket = async (
  collectibleItemInstanceId: string,
): Promise<boolean> => {
  const market = await retrieveOnmarket();

  return market.some((v) =>
    v.itemInstances.some(
      (instance) =>
        instance.collectibleInstanceId === collectibleItemInstanceId,
    ),
  );
};

const sellDefault = async (): Promise<void> => {
  try {
    const inventory = await retrieveInventory();
    const seenInstanceIds = new Set<string>();

    const filtered = inventory.data.filter((item) => {
      if (seenInstanceIds.has(item.collectibleItemInstanceId)) return false;
      seenInstanceIds.add(item.collectibleItemInstanceId);
      return true;
    });

    info(`Processing ${filtered.length} item(s)...`);

    for (const item of filtered) {
      const label = `${item.assetName} #${item.serialNumber}`;

      if (
        config.autosaleConfiguration.skip_on_sale_persist &&
        (await checkIsOnMarket(item.collectibleItemInstanceId))
      ) {
        warning(
          `Skipped  ${label} — already on sale (skip_on_sale_persistent)`,
        );
        continue;
      }

      if (
        config.autosaleConfiguration.skip_assetId.some(
          (v) => v === item.assetId,
        )
      ) {
        warning(
          `Skipped  ${label} — asset ID is in the skip list (skip_assetId)`,
        );
        continue;
      }

      await resellItem(item.assetId, true, item.collectibleItemInstanceId);
    }

    success(`Done — processed ${filtered.length} item(s).`);
  } catch (err) {
    error("An error occurred while processing inventory:");
    console.error(err);
  }
};

const start = async (): Promise<boolean> => {
  await version();

  if (config.developer.skip_comfirmation) {
    devmodelog("Confirmation skipped (developer mode).");
    await getInventory();
    if (config.autosaleConfiguration.enable) {
      info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      success("Startup complete. Starting autosale...");
      info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      await sellDefault();
    } else {
      info(
        "Autosale is disabled, keeping session alive. You might need to watch your unsold item.",
      );
      setInterval(() => {}, 1 << 30);
    }
    return true;
  }

  info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  info("Validating session...");
  await retrieveUser();
  success("Cookie is valid.");

  info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  info("Checking webhook endpoints...");

  if (config.webhook.onsale.enable) {
    if (!config.webhook.onsale.webhookUrl) {
      error("On-sale webhook is enabled but no URL is configured.");
      return false;
    }

    const ok = await verifyWebhook(config.webhook.onsale.webhookUrl, "On-Sale");
    if (ok) success("On-sale webhook verified.");
    if (!ok) {
      error("On-sale webhook URL is invalid. Please check your configuration.");
      return false;
    }
  }

  if (config.webhook.onSold.enable) {
    if (!config.webhook.onSold.webhookUrl) {
      error("On-sold webhook is enabled but no URL is configured.");
      return false;
    }

    const ok = await verifyWebhook(config.webhook.onSold.webhookUrl, "On-Sold");
    if (ok) success("On-sold webhook verified.");
    if (!ok) {
      error("On-sold webhook URL is invalid. Please check your configuration.");
      return false;
    }
  }

  success("All webhooks are active.");

  info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  info("Loading autosale configuration...");

  if (config.autosaleConfiguration.enable) {
    success("Autosale is enabled.");

    if (!config.autosaleConfiguration.default_price_no_competition) {
      error(
        "No fallback price configured. Please set default_price_no_competition.",
      );
      return false;
    }

    info(
      `Fallback price:    ${config.autosaleConfiguration.default_price_no_competition}`,
    );

    if (config.autosaleConfiguration.skip_serial.length > 0) {
      info(
        `Protected serials: ${config.autosaleConfiguration.skip_serial.join(", ")}`,
      );
    } else {
      warning("No protected serials configured.");
    }

    if (config.autosaleConfiguration.price_cut.enable) {
      success(
        `Price cut active:  ${config.autosaleConfiguration.price_cut.percentage}% below market`,
      );
    } else {
      warning("Price cut is disabled.");
    }
  }

  info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  success("Startup complete. Starting autosale...");
  info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await getInventory();
  if (config.autosaleConfiguration.enable) {
    await sellDefault();
  } else {
    info(
      "Autosale is disabled, keeping session alive. You might need to watch your unsold item.",
    );
    setInterval(() => {}, 1 << 30);
  }
  return true;
};

const autoseller = async (): Promise<void> => {
  console.clear();
  const started = await start();
  if (!started) return;
};

export { start, autoseller, version };
