import { readIncomingPacket } from '@skyblock-server/protocol';

export type ClientEvents = {
  debug(type: 'log' | 'warn' | 'error' | 'debug', ...data: any[]): void;
  message(msg: ReturnType<typeof readIncomingPacket>): void;
};

export enum CloseCodes {
  INVALID_MESSAGE = 4000,
  HEARTBEAT_FAILED = 4001,
  INVALID_IDENTIFY = 4002,
  RESUME_FAILED = 4003,
}

export interface AuctionFetchOptions {
  /** The Search Query for Auctions */
  query: string;

  /** The Order for Sorting the Auctions */
  order: AuctionSortOrder;

  /** The Index of the First Auction you want to Fetch */
  start: number;
  /** The Amount of Auctions to Fetch */
  amount: number;

  /** The Auction House Category */
  category: AuctionCategory;
  /** The Item Rarity */
  rarity: ItemRarity;
  /** The Auction Type */
  type: 'any' | 'auction' | 'bin';
}

export const AuctionCategories = ['weapon', 'armor', 'accessories', 'consumables', 'blocks', 'misc'] as const;
export type AuctionCategory = (typeof AuctionCategories)[number];

export const ItemRarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'DIVINE', 'SPECIAL', 'VERY_SPECIAL'] as const;
export type ItemRarity = (typeof ItemRarities)[number];

export const AuctionSortOrders = ['high_price', 'low_price', 'end_near', 'end_far', 'random'] as const;
export type AuctionSortOrder = (typeof AuctionSortOrders)[number];
