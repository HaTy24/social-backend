import { SHARES_TRADE_TYPE } from '@shared/constants';

export interface TokenTransferData {
  tokenAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  serverSecret: string;
}

export interface FundsTransferData {
  fromAddress: string;
  toAddress: string;
  amount: string;
  serverSecret: string;
}

export interface ViewTradeHistoryData {
  address?: string;
  ownerAddress?: string;
  type?: SHARES_TRADE_TYPE;
}
export interface BuyShareData {
  quantity?: number;
  type?: string;
  price?: string;
  txFee?: string;
  userAddress: string;
  serverSecret: string;
  destinationAddress: string;
}

export interface SellShareData {
  quantity?: number;
  type?: string;
  price?: string;
  txFee?: string;
  userAddress: string;
  serverSecret: string;
  destinationAddress: string;
}
