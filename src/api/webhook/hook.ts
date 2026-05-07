import axios from "axios";
import { config } from "../../configuration.js";
import { buildEmbed } from "./embedBuilder.js";
import { error, devmodelog } from "../../misc/logger.js";

const verifyWebhook = async (
  url: string,
  message: string,
): Promise<boolean> => {
  devmodelog(`[ verifyWebhook ] > received data\nURL: ${url}\nMESSAGE:${message}`)
  try {
    await axios.post(url, {
      embeds: [
        {
          title: "Webhook Verification",
          description: message,
          color: 0x00ff00,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
};

const updateOnSale = async (
  itemName: string,
  itemId: number,
  itemIcon: string,
  itemSerial: number,
  itemPrice: number,
): Promise<void> => {
  try {
    const payload = buildEmbed("onsale", {
      itemName,
      itemId,
      itemIcon,
      itemSerial,
      itemPrice,
    });
    if (config.webhook.onsale.enable === false) return;
    const res = await axios.post(config.webhook.onsale.webhookUrl, payload);
    devmodelog(`[updateOnSale] > ${res.status} ${itemName} serial: ${itemSerial}#`);
  } catch (err: any) {
    error(JSON.stringify(err.response?.data ?? "Webhook update failed"));
  }
};

const updateOnSold = async (
  itemName: string,
  itemId: number,
  itemIcon: string,
  itemPrice: number,
): Promise<void> => {
  try {
    const payload = buildEmbed("onsold", {
      itemName,
      itemId,
      itemIcon,
      itemPrice,
    });

    if (config.webhook.onSold.enable === false) return;

    const res = await axios.post(config.webhook.onSold.webhookUrl, payload);

    devmodelog(`[updateOnSold] > ${res.status} ${itemName}`);
  } catch (err: any) {
    error(JSON.stringify(err.response?.data ?? "Webhook update failed"));
  }
};

export { updateOnSale, verifyWebhook, updateOnSold };
