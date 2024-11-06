export interface LoginOrSignupResponse {
  balance: string;
  tokens: {
    access: {
      token: string;
      expires: string;
    };
    refresh: {
      token: string;
      expires: string;
    };
  };
  user: {
    _id: string;
    addon: string;
    fname: string;
    lname: string;
    myrefcode: string;
    email: string;
    isactive: boolean;
  };
}

export interface CreateSessionResponse {
  redirectUrl: string;
  accessToken: string;
}

export interface GetBalanceResponse {
  gameBalance: string;
}

export interface DepositSettingResponse {
  CompanyDepositWalletAddress: string;
  MinDepositAmount: number;
  MaxDepositAmount: number;
  DepositStatus: {
    InProcess: number;
    Credited: number;
    Rejected: number;
  };
  DepositType: {
    USDT_ERC20: number;
    USDT_BEP20: number;
    USDT_TRC: number;
  };
  DepositSortColumns: {
    addon: string;
    amttoinvest: string;
    statusid: string;
    actionedon: string;
  };
}

export interface DepositResponse {
  deposit: {
    txnid: string;
    userusdtwallet: string;
    amttoinvest: number;
    userid: string;
    usdtwallettodeposite: string;
    isactive: true;
    addon: string;
    updon: string;
    addby: string;
    statusid: number;
    typeid: number;
    refcode: string;
  };
}

export interface DepositHistoryResponse {
  docs: [
    {
      _id: string;
      userid: string;
      txnid: string;
      userusdtwallet: string;
      usdtwallettodeposite: string;
      amttoinvest: string;
      statusid: number;
      typeid: number;
      addby: string;
      addon: string;
      updon: string;
      actionedby: string;
      actionedon: string;
      remarks: string;
      refcode: string;
    },
  ];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number;
  nextPage: number;
}

export interface WithdrawSettingResponse {
  MinWithdrawAmount: number;
  MaxWithdrawAmount: number;
  WithdrawStatus: {
    InProcess: number;
    Approved: number;
    Completed: number;
    Rejected: number;
    Failed: number;
  };
  WithdrawSortColumns: {
    wdon: string;
    wdamt: string;
    statusid: string;
    actionedon: string;
  };
}

export interface WithdrawResponse {
  withdraw: {
    wdamt: number;
    userusdtwallet: string;
    txnfee: string;
    amttocredit: string;
    wdon: string;
    userid: string;
    email: string;
    isactive: boolean;
    addon: string;
    addby: string;
    statusid: number;
    refcode: string;
  };
  balance: string;
}

export interface WithdrawHistoryResponse {
  docs: [
    {
      _id: string;
      userid: string;
      userusdtwallet: string;
      wdamt: string;
      txnfee: string;
      amttocredit: string;
      wdon: string;
      txnid: string;
      statusid: number;
      addby: string;
      addon: string;
      refcode: string;
    },
  ];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number;
  nextPage: number;
}
