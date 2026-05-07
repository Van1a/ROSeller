import "dotenv/config";
import axios from "axios";
import { delay } from "../misc/helper.js";
import { error, success, warning, devmodelog } from "../misc/logger.js";
import { type User, type CachedUser } from "../types/api.js";

class RobloxAPI {
  private cookie: string;
  private userCache: CachedUser | null = null;

  constructor() {
    this.cookie = process.env.ROBLOX_COOKIE || "";
    if (!this.cookie) throw new Error("ROBLOX_COOKIE not set");
  }

  private async getCSRF(): Promise<string> {
    try {
      const res = await axios.post(
        "https://auth.roblox.com/v2/logout",
        {},
        { headers: { Cookie: `.ROBLOSECURITY=${this.cookie}` } },
      );
      const token = res.headers["x-csrf-token"] || "";
      devmodelog(`[RobloxAPI] CSRF: ${token}`);
      return token;
    } catch (err: any) {
      const token = err?.response?.headers?.["x-csrf-token"] || "";
      devmodelog(`[RobloxAPI] CSRF from error: ${token}`);
      return token;
    }
  }

  async getUser(): Promise<User> {
    const now = Date.now();
    const cacheDuration = 12 * 60 * 60 * 1000; // 12 hours

    if (this.userCache && now - this.userCache.ttl < cacheDuration) {
      devmodelog("[RobloxAPI] Using cached user");
      return this.userCache.roblox;
    }

    try {
      const res = await axios.get<{
        id: number;
        name: string;
        displayName: string;
      }>("https://users.roblox.com/v1/users/authenticated", {
        headers: { Cookie: `.ROBLOSECURITY=${this.cookie}` },
      });

      if (res.status === 200) {
        this.userCache = { roblox: res.data, ttl: now };
        success(`Authenticated as ${res.data.name}`);
        return res.data;
      }
      throw new Error("Authentication failed");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) error("Invalid cookie");
      if (status === 429) {
        warning("Rate limited, retrying in 120s");
        await delay(120000, "Retrying authentication");
        return this.getUser();
      }
      throw err;
    }
  }

  async request<T>(
    method: "GET" | "POST" | "PATCH",
    url: string,
    data?: any,
    useCSRF: boolean = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Cookie: `.ROBLOSECURITY=${this.cookie}`,
    };

    if (useCSRF) {
      headers["X-CSRF-Token"] = await this.getCSRF();
    }

    try {
      const res = await axios.request<T>({
        method,
        url,
        data,
        headers,
        validateStatus: () => true,
      });

      devmodelog(`[RobloxAPI] ${method} ${url} -> ${res.status}`);

      if (res.status === 429) {
        warning(`Rate limited, retrying in 60s`);
        await delay(60000, "Retrying request");
        return this.request(method, url, data, useCSRF);
      }

      if (res.status >= 400) {
        throw new Error(`Request failed: ${res.status}`);
      }

      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 429) {
        warning(`Rate limited on ${url}, retrying in 60s`);
        await delay(60000, "Retrying request");
        return this.request(method, url, data, useCSRF);
      }
      throw err;
    }
  }
}

export const robloxAPI = new RobloxAPI();