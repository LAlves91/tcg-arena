import { z } from 'zod';
import {
  createFriendBodySchema,
  friendshipDtoSchema,
  friendsListResponseSchema,
  myUserProfileSchema,
  publicUserProfileSchema,
  updateFriendBodySchema,
  updateMeBodySchema,
} from './schemas';

export type PublicUserProfile = z.infer<typeof publicUserProfileSchema>;
export type MyUserProfile = z.infer<typeof myUserProfileSchema>;
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;
export type CreateFriendBody = z.infer<typeof createFriendBodySchema>;
export type UpdateFriendBody = z.infer<typeof updateFriendBodySchema>;
export type FriendshipDto = z.infer<typeof friendshipDtoSchema>;
export type FriendsListResponse = z.infer<typeof friendsListResponseSchema>;
