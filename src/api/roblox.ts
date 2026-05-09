import "dotenv/config";
import chalk from "chalk";
import axios from "axios";
import { error, success, info, warning, devmodelog } from "../misc/logger.js";
import { type User, type CachedUser } from "../types/api.js";

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

class RobloxAPI {
  private cookie: string;
  private userCache: CachedUser | null = null;

  constructor() {
    this.cookie = process.env.ROBLOX_COOKIE || "";
    if (!this.cookie) throw new Error("ROBLOX_COOKIE not set");
  }

  private startCountdown(seconds: number): void {
    let remaining = seconds;
    process.stdout.write(chalk.grey`Rate limited, retrying in ${remaining}s`);

    const interval = setInterval(() => {
      remaining--;
      process.stdout.write(`\r\x1b[KRate limited, retrying in ${remaining}s`);
      if (remaining <= 0) {
        clearInterval(interval);
        process.stdout.write("\n");
      }
    }, 1000);
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
    const cacheDuration = 12 * 60 * 60 * 1000;

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
        const resetIn = Number(err?.response?.headers?.["x-ratelimit-reset"] ?? 120);
        this.startCountdown(resetIn);
        await wait(resetIn * 1000);
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

    const start = Date.now();

    try {
      const res = await axios.request<T>({
        method,
        url,
        data,
        headers,
        validateStatus: () => true,
      });

      const latency = Date.now() - start;

      devmodelog(`[RobloxAPI] ${method} ${url} -> ${res.status} (${latency}ms)`);

      if (latency > 1000) {
        warning(`We detected your latency was high (${latency}ms). Expect the request to be slower than usual`);
      }

      if (res.status === 429) {
        const resetIn = Number(res.headers["x-ratelimit-reset"] ?? 60);
        this.startCountdown(resetIn);
        await wait(resetIn * 1000);
        return this.request(method, url, data, useCSRF);
      }

      if (res.status >= 400) {
        devmodelog(`Request failed: ${res.status} ${res.data}`)
        throw new Error(`Request failed: ${res.status}`);
      }

      return res.data;
    } catch (err: any) {
      const latency = Date.now() - start;
      warning(`[RobloxAPI] request failed after ${latency} ${err.response.data}ms`);
      throw err;
    }
  }
}

export const robloxAPI = new RobloxAPI();