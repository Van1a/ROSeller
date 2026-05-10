----

<p align="center">
<img height="488" width=1520" src="https://raw.githubusercontent.com/Van1a/ROSeller/main/asset/texticon.png"> </img>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Van1a/vsblox/refs/heads/main/Images/ROSeller1-ezgif.com-speed.gif" width="920"/>
</p>





<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.4-red?style=flat-square" />
  <img src="https://img.shields.io/badge/license-BSL--1.0-464646?style=flat-square" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Android-333333?style=flat-square" />
</p>

---

## Overview

RoSeller automates the full lifecycle of listing Roblox collectible limited items for resale. It scans your inventory, fetches current market data, calculates the optimal listing price, and submits the listing  no manual interaction needed.

Written entirely in TypeScript with an async-first design. Configuration is done once through a single file, and the tool handles the rest continuously in the background.

> **Terms of Service Notice:** RoSeller may violate Roblox's Terms of Service depending on how it is used. By using this software you accept full responsibility for your account and any consequences that may arise. The author assumes no liability.

> **License:** This project is licensed under the **Business Source License (BSL)**. You may view and run the code locally. Modification, redistribution, sublicensing, or commercial use is strictly prohibited. Publishing this code under a different name is a license violation.

Below is what it looks like when running the code. Sorry for the low quality.

## Running
This shows what running the code looks like. It may be outdated since we keep updating it, but this video was recorded when it was still on Flat version 1.0.0.

![Running](https://raw.githubusercontent.com/Van1a/ROSeller/main/asset/starting.gif)

## Reselling

![Running](https://raw.githubusercontent.com/Van1a/ROSeller/main/asset/reselling.gif)


## Webhook Overview
![Running](https://raw.githubusercontent.com/Van1a/ROSeller/main/asset/on-sale.png)
![Running](https://raw.githubusercontent.com/Van1a/ROSeller/main/asset/on-sold.png)
![Running](https://raw.githubusercontent.com/Van1a/ROSeller/main/asset/webhookVerified.png)



---

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Configuration](#configuration)
  - [Webhook](#webhook)
  - [Auto Sale](#auto-sale)
  - [Developer Mode](#developer-mode)
  - [Full Config File](#full-config-file)
- [Installation](#installation)
  - [Windows](#windows)
  - [Mobile  Termux](#mobile--termux)
- [Running the App](#running-the-app)
- [Running with .bat](#bat)
- [Support](#support)

---

## How It Works

1. **Inventory scan**  Fetches all collectible items currently in your Roblox inventory.
2. **Market lookup**  For each item, retrieves active listings, price history, and the current price floor.
3. **Price calculation**  Determines a listing price based on your configured strategy (undercut by percentage, or fallback to a default when no competition exists).
4. **Listing submission**  Submits the resell request to Roblox with the calculated price and instance data.
5. **Sale detection**  A background polling loop compares snapshots to detect when an item has been purchased, then fires a webhook notification.

Items with serials listed in `skip_serial` are excluded before any listing is attempted. Items that fail resellability checks are skipped and logged.

---

## Features

| Feature | Description |
|---|---|
| **Async-first architecture** | Nearly all operations are non-blocking. Multiple items are processed concurrently where safe, reducing overall run time. |
| **Per-instance selling** | Correctly handles inventories with multiple copies of the same item  each instance is listed individually using its own unique `collectibleInstanceId`. |
| **TTL caching** | Inventory and auth data are cached locally with a 12-hour TTL. Stale cache is refreshed automatically before each run. |
| **Price floor enforcement** | The tool checks the verified price floor via the Roblox API and will not list below it, preventing rejected listings. |
| **Serial protection** | Specific serial numbers can be excluded globally via `skip_serial` so valuable low serials are never auto-listed. |
| **JSON data storage** | All persisted state lives in `stored/` as plain JSON files. No database or extra tooling needed to inspect or edit stored data. |
| **Color-coded logging** | Output is separated into `success`, `info`, `warning`, and `error` categories, each with a distinct color for easy reading. |
| **Pre-run validation** | Configuration values are validated at startup. Misconfigured fields cause an early, descriptive error rather than a silent failure mid-run. |
| **Minimal dependencies** | Third-party packages are kept to a minimum. Installation is straightforward on both desktop and mobile environments. |

---

## Configuration

All settings live in [`src/configuration.ts`](https://github.com/Van1a/roseller/blob/main/src/configuration.ts). Your Roblox session cookie is stored separately in a `.env` file at the project root and is never referenced inside the config file.

---

### Webhook

The `webhook` block contains two independent sub-objects: `onsale` and `onSold`. Each can be enabled or disabled independently and points to its own Discord webhook URL.

#### `onsale`

Fires when an item is **successfully listed** on the marketplace. The notification includes the item name, serial number, and listing price.

| Field | Type | Description |
|---|---|---|
| `enable` | `boolean` | Turns this event on or off. |
| `webhookUrl` | `string` | Your Discord webhook URL. |
| `ping.enable` | `boolean`| Enable Ping User |
|`ping.discordUserId`|`number`| Ping the User by UserId|

- example
```json
{
  "onSold": {
    "enable": true,
    "ms": 120000,
    "webhookUrl": "https://discordapp.com/api/webhooks/Van1a/Roseller-Webhook-Example",
    "ping": {
      "enable": true,
      "discordUserId": 123456789210
    }
  }
}
```

#### `onSold`

Fires when a buyer **purchases** a listed item. Roblox has no native sale event, so this works by polling  taking a snapshot of active listings at a set interval and comparing it to the previous snapshot to detect removals.


| Field | Type | Description |
|---|---|---|
| `enable` | `boolean` | Turns this event on or off. |
| `webhookUrl` | `string` | Your Discord webhook URL. |
| `ms` | `number` | How often (in milliseconds) to poll for sale changes. |
| `ping.enable` | `boolean`| Enable Ping User |
|`ping.discordUserId`|`number`| Ping the User by UserId|
> **Recommended polling interval:** `120000` (2 minutes). Values below `10000` will generate excessive API traffic, trigger rate limits, and can interrupt active selling.

- example
```json
{
  "onSold": {
    "enable": true,
    "ms": 120000,
    "webhookUrl": "https://discordapp.com/api/webhooks/Van1a/Roseller-Webhook-Example",
    "ping": {
      "enable": true,
      "discordUserId": 123456789210
    }
  }
}
```

**See the embed example in [Webhook Overview](#webhook-overview)**

---

### Auto Sale

Controls item listing behavior and price strategy.
| Field | Type | Description |
|---|---|---|
| `enable` | `boolean` | Master toggle for the auto-selling system. When `false`, no listings are submitted. |
| `default_price_no_competition` | `number` | Price used when no other sellers exist for an item. Applies to rare or low-supply items where undercutting isn't possible. |
| `skip_on_sale` | `boolean` | This uses a simple algorithm to check whether an item was already on sale. However, it does not store any data, so it is volatile. If a reset happens, it will make another API request to verify the item again — making it a perfect fit for `skip_on_sale_persist`. |
| `skip_on_sale_persist` | `boolean` | `skip_on_sale_persist`: similar to [skip_on_sale](#skip_on_sale), but this is a [**PERSIST**](https://www.google.com/search?q=persist+meaning+in+programming&sca_esv=827c5b7b45126b9a&biw=1707&bih=820&ei=x0j_aaWRDcrt1e8P4aW_kQo&oq=persist+meaning+in+prog&gs_lp=Egxnd3Mtd2l6LXNlcnAiF3BlcnNpc3QgbWVhbmluZyBpbiBwcm9nKgIIADIFEAAYgAQyCxAAGIAEGIoFGIYDMgsQABiABBiKBRiGAzIIEAAYgAQYogQyBRAAGO8FMgUQABjvBUjML1CqA1j-IHADeAGQAQCYAXugAd4HqgEDNC42uAEByAEA-AEBmAINoALFCsICChAAGEcY1gQYsAPCAg0QABiABBiKBRhDGLADwgIKEAAYgAQYigUYQ8ICDxAAGIAEGIoFGEMY-QEYRsICKRAAGIAEGIoFGEMY-QEYRhiXBRiMBRjdBBhGGPkBGPQDGPUDGPYD2AEBwgIGEAAYFhgewgIIEAAYFhgeGArCAgUQIRigAcICBRAhGJ8FwgILEAAYgAQYigUYkQKYAwCIBgGQBgq6BgYIARABGBOSBwM0LjmgB4ZMsgcDMS45uAeKCsIHCTItMi42LjQuMcgHtAKACAE&sclient=gws-wiz-serp) version. This is useful if your stored inventory.json is accidentally deleted, as it prevents further API calls to check whether the item was already on sale. |
| `skip_assetId` | `number[]` | Skip the asset ID. |
| `skip_serial` | `number[]` | Array of serial numbers to exclude from auto-listing. These items are detected and skipped before any API calls are made. |
| `creator.enable` | `boolean` | Skip the item owned by that creator. |
| `creator.skip_creator` | `number[]` | List of creator Id's. |
| `price_cut.enable` | `boolean` | Enables undercut pricing. When `false`, items are listed at the price floor. |
| `price_cut.percentage` | `number` | The percentage subtracted from the current lowest competitor price to determine your listing price. |

#### Price Calculation Example

With a lowest competitor price of `105` and `percentage` set to `1`:

```
Competitor floor  →  105
Reduction (1%)    →  1.05
Your list price   →  103.95
```

If the calculated price falls below the verified Roblox price floor, the floor value is used instead.

* Example
```json
autosaleConfiguration: {
  enable: true,
  default_price_no_competition: 1000,
  skip_on_sale: true,
  skip_on_sale_persist: true,
  skip_serial: [2, 6, 1],
  skip_assetId: [524523643, 4235235, 12232435],
  creator: {
    enable: true,
    skip_creator: [134311, 2654622],
  },
  price_cut: {
    enable: true,
    percentage: 5,
  },
},
```

---

### Developer Mode

Enables verbose debug output across all internal functions. Logs include raw API responses, resolved parameters, and step-by-step execution trace.

| Field | Type | Description |
|---|---|---|
| `developer.enable` | `boolean` | Activates debug logging. Should be `false` during normal use. |
| `developer.skip_comfirmation`| `boolean`| skip the comfirmation. Enable this when you know everything is valid. |
|`remove_latency_warning`|`boolean`|Latency output can sometimes be annoying, so you can disable the logging here.|
> When submitting a bug report, set this to `true` first and include a screenshot of the terminal output. Bug reports without logs cannot be diagnosed.

* example
```json
developer: {
    enable: false,
    skip_comfirmation: false,
    remove_latency_warning: false
},
```


---

### Full Config File

```ts
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
      webhookUrl: "https://discord.com/api/webhooks/EXAMPLE/EXAMPLE",
      ping: {
        enable: true,
        discordUserId: 000000000000000000,
      },
    },
    onSold: {
      enable: true,
      ms: 120000,
      webhookUrl: "https://discord.com/api/webhooks/EXAMPLE/EXAMPLE",
      ping: {
        enable: false,
        discordUserId: 000000000000000000,
      }
    },
  },
  autosaleConfiguration: {
    enable: true,
    default_price_no_competition: 10000,
    skip_on_sale: true,
    skip_on_sale_persist: true,
    skip_serial: [1, 2, 3],
    skip_assetId: [0, 0, 0, 0],
    creator: {
      enable: true,
      skip_creator: [0, 0],
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
```

---

## Installation

### Windows

#### Step 1  Install Node.js

Download the LTS release from [nodejs.org](https://nodejs.org) and run the installer. After installation, verify it worked:

```bash
node -v
npm -v
```

Both commands should return a version number. If you see "command not found", the installer may not have updated your PATH  try reopening the terminal or re-running the installer.

---

#### Step 2  Install Git

Download from [git-scm.com](https://git-scm.com), then verify:

```bash
git --version
```

Clone the repository and enter the project folder:

```bash
git clone https://github.com/Van1a/roseller.git
cd roseller
```

---

#### Step 3  Install dependencies and TypeScript

```bash
npm install
npm install -g typescript
```

`npm install` pulls the project's required packages. The global TypeScript install makes the `tsc` compiler available from anywhere in the terminal.

---

### Mobile  Termux

Termux runs a Linux-like environment on Android. Install it through **F-Droid only**  the Play Store version is outdated and will cause package errors.

> **Download:** [f-droid.org/en/packages/com.termux](https://f-droid.org/en/packages/com.termux/)

---

#### Step 1  Update packages

```bash
pkg update && pkg upgrade -y
```

---

#### Step 2  Install Git and Node.js

```bash
pkg install git nodejs -y
```

Verify each component:

```bash
git --version
node -v
npm -v
```

---

#### Step 3  Clone and install

```bash
git clone https://github.com/Van1a/roseller.git
cd roseller
npm install
npm install -g typescript
```

---

## Running the App

The steps are the same on Windows and Termux.

---

### Step 1  Set your Roblox cookie

To set up the cookie in Termux, note that `.env` files are hidden by default. So even if you run `ls`, it won’t show up in the directory listing.

However, you can still open or create it directly using:

```bash
nano .env
```

This lets you edit the file normally, even though it’s hidden.

If you want to see hidden files in the folder, you can use:

```bash
ls -a
```

That will display `.env` and any other hidden files.

```env
ROBLOX_COOKIE=your_cookie_value_here
```

The `.roblosecurity` cookie authenticates all API requests. It is bound to your session and should be treated like a password  do not share it or commit it to a public repository. If your IP changes or the session resets, the cookie will stop working and will need to be replaced.

---

### Step 2  Compile TypeScript

From inside the `roseller` folder:

```bash
tsc
```

This compiles all `.ts` source files into JavaScript and writes the output to `dist/`. A successful compile produces no output. Any errors are printed to the console with file and line references.

---

### Step 3  Start the application

```bash
npm start
```

The terminal will display startup validation, cache status, and a live log of all selling activity. Errors and skipped items are clearly labeled.

---

### BAT
A `.bat` file is a Windows **batch script** used to automatically run a sequence of command-line instructions in Command Prompt. Instead of typing commands one by one, you put them in a text file with a `.bat` extension, and Windows executes them in order when you run the file. It’s commonly used to automate repetitive tasks like starting programs, running builds, or launching servers.

Use this batch command after completing all the steps — this single-line script will automatically compile and run your code for you.


---

## Termux

`.bat` files are not supported on mobile devices because they rely on the Windows Command Prompt (`cmd`) to run. However, with certain packages, you can still use them by installing tools like `bat` using:

```bash
pkg install bat
```

Then run it by using this

```bash
run.bat
```

---

## Windows

```bash
start run.bat
```

---


## Support

Join the Discord for bug reports, setup help, and project updates.

<a href="https://discord.gg/7t4j478wG6">
  <img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
</a>

When reporting a bug, enable developer mode and attach a full screenshot of the terminal output. Reports without logs will be deprioritized  the logs are required to identify the issue.

**What the server is for:**
- Bug reports with debug logs attached
- Setup and installation questions
- Project updates and release notes
- Feature suggestions