import { type Config } from "./types/config.js";

const config: Config = {
  version: "1.0.4",
  websocket: {
    enable: false,
    message:
      "This function was not yet implemented. this will be used for gui (web based) interaction, IM THINKING IF I SHOULD MAKE THIS PAID CONSIDERING THE AMOUNT TIME I USED",
  },
  webhook: {
    onsale: {
      enable: true,
      webhookUrl: "https://discordapp.com/api/webhooks/",
      ping: {
        enable: false,
        discordUserId: 123,
      },
    },
    onSold: {
      enable: false,
      ms: 120000,
      webhookUrl: "https://discordapp.com/api/webhooks/",
      ping: {
        enable: false,
        discordUserId: 123,
      }
    },
  },
  autosaleConfiguration: {
    enable: true,
    default_price_no_competition: 10000,
    skip_on_sale: true,
    skip_on_sale_persist: true,
    skip_serial: [1, 2, 3],
    skip_assetId: [123 , 456],
    creator: {
      enable: true,
      skip_creator: [123, 456],
    },
    price_cut: {
      enable: true,
      percentage: 2,
    },
  },
  developer: {
    enable: false,
    skip_comfirmation: false,
    remove_latency_warning: true
  },
};

export { config };
