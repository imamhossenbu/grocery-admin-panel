/** Active products at or below this stock count are "low stock". */
export const LOW_STOCK_THRESHOLD = 10;

/** Store-wide delivery rule (kept in sync with place_order in schema.sql). */
export const FREE_DELIVERY_FROM = 1000;
export const DELIVERY_FEE = 60;

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export const STORE_TIMEZONE = 'Asia/Dhaka';
