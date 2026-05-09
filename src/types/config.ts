export interface Config {
  version: string;
  websocket: {
    enable: boolean;
    message: string;
  };
  webhook: {
    onsale: {
      enable: boolean;
      webhookUrl: string;
      ping: {
        enable: boolean;
        discordUserId: number;
      };
    };
    onSold: {
      enable: boolean;
      ms: number;
      webhookUrl: string;
      ping: {
        enable: boolean;
        discordUserId: number;
      };
    };
  };
  autosaleConfiguration: {
    enable: boolean;
    default_price_no_competition: number;
    skip_on_sale: boolean;
    skip_serial: number[];
    creator: {
      enable: boolean;
      skip_creator: number[];
    };
    price_cut: {
      enable: boolean;
      percentage: number;
    };
  };
  developer: {
    enable: boolean;
    skip_comfirmation: boolean;
  };
}