import { robloxAPI } from "./roblox.js";
import {
  retrieveUserFile,
  updateUserFile,
  verifyingTTL,
} from "../misc/file.js";
import { delay } from "../misc/helper.js";
import { error, success, warning, info, devmodelog } from "../misc/logger.js";

type UserDetail = {
  id: number;
  name: string;
  displayName: string;
};

const retrieveCSRF = async (): Promise<string> => {
  return "";
};

const retrieveUser = async (): Promise<void> => {
  try {
    if (await verifyingTTL("user")) {
      info("Using cached user data");
      return;
    }

    const user = await robloxAPI.getUser();

    success(`Successfully logged in as ${user.name}`);

    await updateUserFile({
      roblox: {
        name: user.name,
        userid: user.id,
        displayName: user.displayName,
      },
      ttl: Date.now(),
    });
  } catch (err: any) {
    const status = err?.response?.status;

    if (status === 401) {
      error("Invalid cookie");
      return;
    }

    if (status === 429) {
      warning("Rate limit detected. Retrying in 120s");
      await delay(120000, "Retrying login");
      return retrieveUser();
    }
    error(`Request failed: ${status || err.message}`);
  }
};

export { retrieveCSRF, retrieveUser };