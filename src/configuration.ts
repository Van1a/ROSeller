import { type Config } from "./types/config.js";

const config: Config = {
  version: "1.0.2",
  websocket: {
    enable: false,
    message:
      "This function was not yet implemented. this will be used for gui (web based) interaction, IM THINKING IF I SHOULD MAKE THIS PAID CONSIDERING THE AMOUNT TIME I USED",
  },
  webhook: {
    onsale: {
      enable: true,
      webhookUrl: "https://discordapp.com/api/webhooks/1499738719807213650/LuYykVzUbX8yY7Anh-wf9LI4s_vWhirX67KshBZ9eZvHXWWZ9l5NHbTiQCz_Q09aQBG2",
      ping: {
        enable: true,
        discordUserId: 728972494253326369,
      },
    },
    onSold: {
      enable: true,
      ms: 120000,
      webhookUrl: "https://discordapp.com/api/webhooks/1499738719807213650/LuYykVzUbX8yY7Anh-wf9LI4s_vWhirX67KshBZ9eZvHXWWZ9l5NHbTiQCz_Q09aQBG2",
      ping: {
        enable: false,
        discordUserId: 728972494253326369,
      }
    },
  },
  autosaleConfiguration: {
    enable: true,
    default_price_no_competition: 10000,
    skip_on_sale: true,
    skip_serial: [1, 2, 3],
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
    enable: true,
    skip_comfirmation: false,
  },
};

export { config };
