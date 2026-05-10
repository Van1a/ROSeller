import axios from "axios";
import { config } from "../../configuration.js";
import { devmodelog } from "../../misc/logger.js";
import { delay } from "../../misc/helper.js";

const creatorEmbeder = async (
  creatorName: string,
  creatorType: string,
  creatorId: number,
): Promise<string> => {
  if (creatorType === "Group")
    return `[${creatorName}](https://www.roblox.com/communities/${creatorId})`;
  return `[${creatorName}](https://www.roblox.com/users/${creatorId}/profile)`;
};

const webhookUpdateOnsale = async (
  assetName: string,
  assetId: number,
  assetSerial: number,
  assetPrice: number,
  assetQuantity: number,
  creatorName: string,
  creatorId: number,
  creatorType: string,
  assetIcon: string,
): Promise<void> => {
  try {
    const send = await axios.post<void>(config.webhook.onsale.webhookUrl, {
      content: config.webhook.onsale.ping.enable
        ? `<@${config.webhook.onsale.ping.discordUserId}>`
        : "",
      allowed_mentions: {
        parse: ["users", "roles"],
      },
      embeds: [
        {
          title: assetName,
          description: `:sparkles: Item \`${assetName}\` \`${assetSerial}#\` have been listed on market`,
          url: `https://www.roblox.com/catalog/${assetId}`,
          color: 2400000,
          fields: [
            {
              name: "Price",
              value: assetPrice,
              inline: true,
            },
            {
              name: "Quantity",
              value: assetQuantity,
              inline: true,
            },
            {
              name: "Creator",
              value: await creatorEmbeder(creatorName, creatorType, creatorId),
              inline: true,
            },
          ],
          author: {
            name: `Listed on Market | ROSELLER ${config.version}`,
            url: "https://github.com/Van1a/ROSeller",
            icon_url:
              "https://media.tenor.com/CpeMRxkYB7IAAAAi/check-mark-check.gif",
          },
          footer: {
            text: "ROSeller",
            icon_url:
              "https://raw.githubusercontent.com/Van1a/roseller/refs/heads/main/asset/rosellerlogo.png",
          },
          image: { 
            url: "https://raw.githubusercontent.com/Van1a/roseller/refs/heads/main/asset/webhookstate.gif",
          },
          thumbnail: {
            url: assetIcon,
          },
          timestamp: new Date().toISOString(),
        },
      ],
      attachments: [],
    });

    if (send.status === 200) {
      console.log("Success");
    }
  } catch (err: any) {
    const status = err?.response?.status;

    if (status === 429) {
      console.log("[WEBHOOK ONSALE] - rate limit retrying again in 60 seconds");
      await delay(60000);
      return webhookUpdateOnsale(
        assetName,
        assetId,
        assetSerial,
        assetPrice,
        assetQuantity,
        creatorName,
        creatorId,
        creatorType,
        assetIcon,
      );
    }

    console.log(status);
  }
};

const webhookOnsold = async (
  assetId: number,
  assetName: string,
  assetPrice: number,
  assetIcon: string,
  purchaserName: string,
  purchaserId: number,
  purchaserType: string,
): Promise<void> => {
  try {
    await axios.post<void>(config.webhook.onSold.webhookUrl, {
      content: config.webhook.onsale.ping.enable
        ? `<@${config.webhook.onsale.ping.discordUserId}>`
        : "",
      allowed_mentions: {
        parse: ["users", "roles"],
      },
      embeds: [
        {
          title: assetName,
          description: `:sparkles: Item \`${assetName}\`  have been sold **!**`,
          url: `https://www.roblox.com/catalog/${assetId}`,
          color: 16574467,
          fields: [
            {
              name: "Price",
              value: assetPrice,
              inline: true,
            },
            {
              name: "Purchaser",
              value: await creatorEmbeder(
                purchaserName,
                purchaserType,
                purchaserId,
              ),
              inline: true,
            },
          ],
          author: {
            name: `SOLD |  ROSELLER ${config.version}`,
            url: "https://github.com/Van1a/ROSeller",
            icon_url:
              "https://media1.tenor.com/m/rMCYpRhzXYsAAAAC/spinning-crown.gif",
          },
          footer: {
            text: "ROSeller",
            icon_url:
              "https://raw.githubusercontent.com/Van1a/roseller/refs/heads/main/asset/rosellerlogo.png",
          },
          image: {
            url: "https://raw.githubusercontent.com/Van1a/roseller/refs/heads/main/asset/webhookstate.gif",
          },
          thumbnail: {
            url: assetIcon,
          },
          timestamp: new Date().toISOString(),
        },
      ],
      attachments: [],
    });
  } catch (err: any) {
    const status = err?.response?.status;

    if (status === 429) {
      console.log("[WEBHOOK ONSOLD] - rate limit retrying again in 60 seconds");
      await delay(60000);
      return webhookOnsold(
        assetId,
        assetName,
        assetPrice,
        assetIcon,
        purchaserName,
        purchaserId,
        purchaserType,
      );
    }

    console.log(status);
  }
};

const verifyWebhook = async (
  url: string,
  message: string,
): Promise<boolean> => {
  devmodelog(
    `[ verifyWebhook ] > received data\nURL: ${url}`,
  );
  try {

    const name = (await axios.get<{"name": string}>(url)).data.name ?? "webhook"
    
    await axios.post(url, {
      content: null,
      embeds: [
        {
          title: "Initialized Successfull",
          description: `We have succesfull verified that \`${name}\` is valid, ready to listen \`${message}\``,
          color: 1994750,
          author: {
            name: "VERIFIED | ROSELLER v 1.0.4",
            url: "https://github.com/Van1a/ROSeller",
            icon_url: "https://media.tenor.com/1ktJJbUielEAAAAi/opgamingmx.gif",
          },
          image: {
            url: "https://raw.githubusercontent.com/Van1a/roseller/refs/heads/main/asset/webhookBannerVerification.gif",
          },
        },
      ],
      attachments: [],
    });
    return true;
  } catch {
    return false;
  }
};

export { verifyWebhook, webhookUpdateOnsale, webhookOnsold };
