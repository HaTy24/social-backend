import { randomBytes } from 'crypto';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { Audit } from '@core/database/audit';

import { ENTITY_STATUS, SOCIAL_TYPE } from '@shared/constants';

export const DEFAULT_PROFILE_IMAGE_URL =
  'https://static.weknot.io/default_user.png';
export const DEFAULT_PROFILE_BANNER_URL =
  'https://static.weknot.io/default_background.jpeg';

export interface PublicUser {
  id: string;
  twitterScreenName: string;
  fullname: string;
  location: string;
  description: string;
  website: string;
  joinDate: string;
  walletAddress: string;
  profile_image_url: string;
  status: string;
  profile_banner_url: string;
  email: string;
  referral_code: string;
  accountType: string;
  socialType: string;
}

export interface PublicIntegrateUser {
  id: string;
  screenName: string;
  fullname: string;
  email: string;
}

export const extractPublicInfo = (user: User): PublicUser => {
  if (!user) return null;
  const joinDate = (typeof (user.createdAt) === 'object' ? user.createdAt.toISOString() : user.createdAt).substring(0, 10);
  const { id, twitterScreenName, fullname, location, description, website, walletAddress, profile_image_url, profile_banner_url, status, email, referral_code, accountType, socialType } = user;
  return { id, twitterScreenName, fullname, location, description, website, walletAddress, profile_image_url, profile_banner_url, joinDate, status, email, referral_code, accountType, socialType };
}

export const extractPublicIntegrateUser = (user: User): PublicIntegrateUser => {
  if (!user) return null;
  const { id, twitterScreenName, fullname, email } = user;
  return { id, screenName: twitterScreenName, fullname,  email, };
}

export const genReferralCode = () => randomBytes(5).toString('hex').toUpperCase();

export enum ACCOUNT_TYPE {
  NORMAL = 'normal',
  INVESTMENT = 'investment',
}

@Entity({ name: 'users' })
export class User extends Audit {
  public isSocialTypeEmail(): boolean {
    return this.socialType === SOCIAL_TYPE.EMAIL;
  }


  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'wallet_address',
    nullable: true,
    unique: true,
    transformer: { to: (v) => v?.toLowerCase(), from: (v) => v.toLowerCase() },
  })
  walletAddress: string;

  @Column({
    name: 'wallet_secret',
    nullable: true,
    unique: true,
  })
  walletSecret: string;

  @Column({
    nullable: false,
    default: ENTITY_STATUS.ACTIVE,
  })
  status: string;

  @Column({
    name: 'email',
    nullable: true,
    unique: true,
  })
  email: string;

  // google
  @Column({
    name: 'google_id',
    nullable: true,
    unique: true,
  })
  googleId: string;

  @Column({
    name: 'social_type',
    nullable: false,
    default: 'twitter',
  })
  socialType: string;

  // twitter
  @Column({
    name: 'social_id',
    nullable: true,
    unique: true,
  })
  twitterId: string;

  @Column({
    name: 'screen_name',
    nullable: true,
    unique: true,
  })
  twitterScreenName: string;

  @Column({
    name: 'fullname',
  })
  @Index()
  fullname: string;

  @Column({
    name: 'location',
    nullable: true,
  })
  location: string;

  @Column({
    name: 'description',
    nullable: true,
    type: 'text',
  })
  description: string;

  @Column({
    name: 'website',
    nullable: true,
  })
  website: string;

  @Column({
    name: 'profile_image_url',
    nullable: true,
  })
  profile_image_url: string;

  @Column({
    name: 'profile_banner_url',
    nullable: true,
  })
  profile_banner_url: string;

  @Column({
    name: 'is_voting',
    default: false,
  })
  is_voting: boolean;

  @Column({
    name: 'shared',
    default: 0,
  })
  shared: number;

  @Column({
    name: 'referral',
    nullable: true,
  })
  referral: string;

  @Column({
    name: 'referral_code',
    nullable: true,
    unique: true,
  })
  referral_code: string;

  @Column({
    name: 'pin_secret',
    nullable: true,
  })
  pinSecret: string;

  @Column({
    nullable: true,
  })
  password: string;

  @Column({
    name: 'is_verified_email',
    nullable: true,
  })
  isVerifiedEmail: boolean;

  @Index()
  @Column({
    nullable: true,
  })
  token: string;

  @Column({
    name: 'is_system_account',
    default: false,
  })
  isSystemAccount: boolean;

  @Column({
    name: 'account_type',
    default: ACCOUNT_TYPE.NORMAL,
  })
  accountType: string;

  @Index()
  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'metadata',
  })
  metadata: object;
}
