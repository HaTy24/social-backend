export interface GameDepositData {
  refcode:string;
  txnid: string;
  userusdtwallet: string;
  amttoinvest: number;
}

export interface GameWithdrawData {
  refcode:string;
  userusdtwallet: string;
  wdamt: number;
}

export interface PaginationData {
  page: number;
  limit: number;
  sort?: string;
}
