import { User } from '@prisma/client';
import {
  MyUserProfile,
  PublicUserProfile,
  REGIONS,
  Region,
} from '@tcg/shared';

function normaliseRegion(raw: string): Region {
  return (REGIONS as readonly string[]).includes(raw) ? (raw as Region) : 'NA-East';
}

export function toMyProfile(user: User): MyUserProfile {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    region: normaliseRegion(user.region),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    email: user.email,
    discordId: user.discordId,
    locale: user.locale,
  };
}

export function toPublicProfile(user: User): PublicUserProfile {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    region: normaliseRegion(user.region),
    createdAt: user.createdAt.toISOString(),
  };
}
