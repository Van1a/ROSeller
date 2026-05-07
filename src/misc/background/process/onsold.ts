import { config } from "../../../configuration.js"
import { getSaleReport } from "../../../api/transaction.js"
import { updateOnSold } from "../../../api/webhook/hook.js"
import { getAssetThumbnail } from "../../../api/thumbnail.js"
import { devmodelog, error } from "../../../misc/logger.js"

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

;(async () => {
  if (config.webhook.onSold.enable !== true) {
    devmodelog("[onSold] > disabled in config")
    return
  }

  let cache: any = null

  devmodelog("[onSold] > watcher started")

  while (true) {
    try {
      const sale = await getSaleReport()

      if (!sale || !sale.length) {
        devmodelog("[onSold] > no sales data")
        await delay(config.webhook.onSold.ms)
        continue
      }

      if (!cache) {
        cache = sale
        devmodelog(`[onSold] > cache initialized (${sale.length} items)`)
      } else {
        const latest = sale[0]
        const cachedLatest = cache[0]

        if (latest?.idHash !== cachedLatest?.idHash) {
          devmodelog(`[onSold] > new sale detected: ${latest?.details.name}`)

          const icon = await getAssetThumbnail(
            "asset",
            latest?.details.id ?? 0,
            "420x420",
            false
          )

          await updateOnSold(
            latest?.details.name ?? "",
            latest?.details.id ?? 0,
            icon?.data?.[0]?.imageUrl ?? "",
            latest?.currency.amount ?? 0
          )

          devmodelog(`[onSold] > webhook sent for ${latest?.details.name}`)

          cache = sale
        } else {
          devmodelog("[onSold] > no new sale")
        }
      }
    } catch (err: any) {
      error(`[onSold] > ${err?.message || err}`)
    }

    await delay(2000)
  }
})()