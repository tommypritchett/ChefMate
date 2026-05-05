// Barrel re-export — all grocery price logic lives in ./grocery/
export type { StorePrice, PriceResult } from './grocery/mock-prices';
export { STORES, round, getPricesForItem, getPricesForList } from './grocery/mock-prices';

export type { KrogerLocation, KrogerProductResult } from './grocery/kroger-api';
export {
  getBannerInfo,
  getKrogerPrices,
  enrichWithKrogerPrices,
  findNearestKrogerLocationCached,
  searchKrogerProducts,
  recordPriceHistory,
  getPriceHistory,
  calculateTrend,
  getKrogerSaleItems,
  GOAL_BOOST_KEYWORDS,
  goalBoostScore,
  parseSizeToOz,
  priceValueBonus,
  getKrogerAuthUrl,
  exchangeKrogerAuthCode,
  refreshKrogerUserToken,
  addToKrogerCart,
} from './grocery/kroger-api';

export type { StoreDistance } from './grocery/store-locations';
export { getNearestStores, scoreStores } from './grocery/store-locations';
