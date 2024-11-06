import { INTERACTION_ACTION } from '@business/interaction/interaction.model';
import { PublicUser } from '@business/user/user.entity';

import { POST_POLICY, POST_TYPE } from './post.model';

export interface WithInteraction {
  actions: INTERACTION_ACTION[];
}

export interface Conversation {
  post: {
    slug: string,
    text: string
  },
  reply: {
    slug: string,
    text: string
  }
}

export interface PostView extends WithInteraction {
  slug?: string;
  text?: string;
  media?: object[];
  type: POST_TYPE;
  policy?: POST_POLICY;
  likesCount: number;
  retweetCount: number;
  commentCount: number;
  createdAt: Date;
  canView?: boolean;
  metadata?: any;
  user: PublicUser & { 
    balance: string, 
    share: { 
      buyPrice: string, 
      sellPrice: string 
    }
  } & {
    imageUrl: string;
    username: string;
  };
}

export interface CommentView extends WithInteraction {
  text: string;
  media: string[];
}

export interface ViewPostData {
  slug: string;
  viewerId?: string;
}

export interface ViewPostsData {
  slugs: string[];
  viewerId?: string;
}
