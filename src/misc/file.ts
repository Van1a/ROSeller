import fs from "fs/promises";
import path from "path";
import type { ResellData, Client, CollectibleItem, InventoryFile } from "../types/api.js";
import { error, info, devmodelog } from "./logger.js";

const userPath = path.join(process.cwd(), "stored", "client.json");
const inventoryPath = path.join(process.cwd(), "stored", "inventory.json");
const onmarket = path.join(process.cwd(), "stored", "onmarket.json");

const retrieveOnmarket = async (): Promise<ResellData[]> => {
  try {
    devmodelog("[retrieveOnmarket] > reading file");

    const parsed = JSON.parse(
      await fs.readFile(onmarket, "utf-8").catch(() => "[]"),
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    error("[retrieveOnmarket] > failed to parse");
    return [];
  }
};

const appendOnmarket = async (
  item: ResellData,
  skip: boolean = false,
): Promise<void> => {
  try {
    devmodelog("[appendOnmarket] > appending item");

    const raw = await fs.readFile(onmarket, "utf-8").catch(() => "[]");

    const parsed: ResellData[] = Array.isArray(JSON.parse(raw))
      ? JSON.parse(raw)
      : [];

    parsed.push({
      ...item,
      skip,
    });

    await fs.writeFile(onmarket, JSON.stringify(parsed, null, 2));
  } catch (err) {
    error(`Failed to append onmarket: ${err}`);
  }
};

const removeFromInventory = async (item: any, skip: boolean): Promise<void> => {
  try {
    const instanceId = item.itemInstances[0].collectibleInstanceId;
    if (!instanceId) return;

    info(`${instanceId}`);
    devmodelog(`[removeFromInventory] > removing ${instanceId}`);

    const raw = await fs
      .readFile(inventoryPath, "utf-8")
      .catch(() => '{"data":[]}');

    const parsed = JSON.parse(raw);

    parsed.data = (parsed.data || []).filter(
      (inv: CollectibleItem) => inv.collectibleItemInstanceId !== instanceId,
    );

    parsed.ttl = Date.now();

    await appendOnmarket(item, skip);
    await fs.writeFile(inventoryPath, JSON.stringify(parsed, null, 2));
  } catch (err) {
    error(`Failed to remove from inventory: ${err}`);
  }
};

const retrieveInventory = async (): Promise<InventoryFile> => {
  try {
    devmodelog("[retrieveInventory] > loading inventory");

    const parsed = JSON.parse(await fs.readFile(inventoryPath, "utf-8"));

    return {
      data: Array.isArray(parsed.data) ? parsed.data : [],
      ttl: parsed.ttl ?? Date.now(),
    };
  } catch {
    devmodelog("[retrieveInventory] > creating default file");

    const def: InventoryFile = { data: [], ttl: Date.now() };
    await fs.writeFile(inventoryPath, JSON.stringify(def, null, 2));
    return def;
  }
};

const appendInventory = async (items: CollectibleItem[]): Promise<void> => {
  devmodelog(`[appendInventory] > adding ${items.length} items`);

  const raw = await retrieveInventory();

  raw.data.push(...items);
  raw.ttl = Date.now();

  await fs.writeFile(inventoryPath, JSON.stringify(raw, null, 2));
};

const retrieveUserFile = async (): Promise<Client> => {
  try {
    devmodelog("[retrieveUserFile] > reading user file");

    return JSON.parse(await fs.readFile(userPath, "utf-8"));
  } catch {
    devmodelog("[retrieveUserFile] > creating default user");

    const def: Client = {
      roblox: { name: "", userid: 0, displayName: "" },
      ttl: Date.now(),
    };

    await fs.writeFile(userPath, JSON.stringify(def, null, 2));
    return def;
  }
};

const updateUserFile = async (data: Client): Promise<void> => {
  devmodelog("[updateUserFile] > updating user");

  data.ttl = Date.now();
  await fs.writeFile(userPath, JSON.stringify(data, null, 2));
};

const verifyingTTL = async (type: "user" | "inventory"): Promise<boolean> => {
  const now = Date.now();
  const limit = 12 * 60 * 60 * 1000;

  if (type === "user") {
    const data = await retrieveUserFile();

    const ttl = typeof data?.ttl === "number" ? data.ttl : 0;
    const roblox = typeof data?.roblox === "string" ? data.roblox : "";

    const valid = ttl > 0 && now - ttl < limit && roblox.length > 0;

    devmodelog(`[verifyingTTL:user] > ${valid}`);
    return valid;
  }

  if (type === "inventory") {
    const data = await retrieveInventory();

    const valid =
      typeof data.ttl === "number" && now - data.ttl < limit;

    devmodelog(`[verifyingTTL:inventory] > ${valid}`);
    return valid;
  }

  return false;
};

export {
  retrieveUserFile,
  updateUserFile,
  retrieveInventory,
  appendInventory,
  appendOnmarket,
  retrieveOnmarket,
  removeFromInventory,
  verifyingTTL,
  type Client,
  type CollectibleItem,
  type InventoryFile,
};