import { config } from "../configuration.js"
import { info } from "./logger.js"

const delay = (ms: number, msg: string): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      info(msg)
      resolve()
    }, ms)
  })
}

const calculateDiscount = async (price: number): Promise<number> => {
  if (config.autosaleConfiguration.price_cut.enable) {
    const p = config.autosaleConfiguration.price_cut.percentage
    return Math.floor(price - (price * (p / 100)))
  }
  return price
}

export { delay, calculateDiscount }