import path from "path"

type EmbedType = "onsale" | "onsold" | "error" | "cooldown"

interface BaseItem {
  itemName: string
  itemId: number
  itemIcon: string
}

interface SaleItem extends BaseItem {
  itemSerial: number
  itemPrice: number
}

const LOGO_URL =
  "https://raw.githubusercontent.com/Van1a/roseller/main/asset/rosellerlogo.png"

const GITHUB_URL = "https://github.com/Van1a/roseller"

const getColor = (type: EmbedType, price?: number): number => {
  const p = price ?? 0

  if (type === "error") return 15548997
  if (type === "cooldown") return 16776960
  if (type === "onsold") return 65280

  if (p >= 10000) return 16711680
  if (p >= 5000) return 16753920
  if (p >= 1000) return 65280

  return 7281802
}

const buildEmbed = (
  type: EmbedType,
  data?: Partial<SaleItem>,
  message?: string
) => {
  const embed: any = {
    title: "",
    description: "",
    color: getColor(type, data?.itemPrice),
    url: data?.itemId
      ? `https://www.roblox.com/catalog/${data.itemId}`
      : undefined,
    author: {
      name: "ROSeller ",
      icon_url: LOGO_URL,
      url: GITHUB_URL
    },
    timestamp: new Date().toISOString(),
    thumbnail: {
      url: data?.itemIcon ?? ""
    }
  }

  switch (type) {
    case "onsale":
      embed.title = data?.itemName ?? "Unknown Item"
      embed.description =
        `📢 Item is now live on the marketplace\n\n` +
        `**Price**: ${data?.itemPrice}\n` +
        `**Serial**: #${data?.itemSerial}`
      break

    case "onsold":
      embed.title = data?.itemName ?? "Unknown Item"
      embed.description =
        `✅ Item sold successfully\n\n` +
        `**Price**: ${data?.itemPrice}\n` +
        `**Serial**: #${data?.itemSerial}`
      break

    case "error":
      embed.title = "System Error"
      embed.description = message ?? "An unexpected error occurred"
      break

    case "cooldown":
      embed.title = "Cooldown Active"
      embed.description = message ?? "Please wait before retrying"
      break
  }

  return {
    content: null,
    embeds: [embed],
    attachments: [],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            label: "View Project",
            style: 5,
            url: GITHUB_URL
          }
        ]
      }
    ]
  }
}

export { buildEmbed }