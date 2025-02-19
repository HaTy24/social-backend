export enum ResponseCode {
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONFLICT = 'CONFLICT',

  SELF_REFERRAL_IS_NOT_ALLOWED = 'SELF_REFERRAL_IS_NOT_ALLOWED',
  TWITTER_INVALID_CREDENTIAL = 'TWITTER_INVALID_CREDENTIAL',
  TWITTER_USER_NOT_FOUND = 'TWITTER_USER_NOT_FOUND',
  TWITTER_ALREADY_LINKED_TO_OTHER_ACCOUNT = 'TWITTER_ALREADY_LINKED_TO_OTHER_ACCOUNT',
  GOOGLE_INVALID_CREDENTIAL = 'GOOGLE_INVALID_CREDENTIAL',
  GOOGLE_ALREADY_LINKED_TO_OTHER_ACCOUNT = 'GOOGLE_ALREADY_LINKED_TO_OTHER_ACCOUNT',
}

export interface HttpResponse<T = any> {
  success: boolean;
  data?: T;
  code?: ResponseCode;
  message?: string;
}
