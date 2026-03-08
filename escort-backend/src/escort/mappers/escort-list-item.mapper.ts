import { EscortProfile } from 'database/entities/escort-profile.entity';
import { EscortPicture } from 'database/entities/escort-picture.entity';
import { EscortReview } from 'database/entities/escort-review.entity';

type EscortListProfile = EscortProfile & {
  pictures?: EscortPicture[];
  reviews?: EscortReview[];
};

export function mapEscortListItem(profile: EscortListProfile) {
  const isVip = !!profile.vipUntil && new Date(profile.vipUntil) > new Date();

  const profilePicture =
    profile.pictures?.find((picture) => picture.isProfilePicture) ??
    profile.pictures?.[0] ??
    null;

  const reviewsCount = profile.reviews?.length ?? 0;

  const averageRating = reviewsCount
    ? Number(
        (
          profile.reviews!.reduce((sum, review) => sum + review.rating, 0) /
          reviewsCount
        ).toFixed(1),
      )
    : 0;

  return {
    id: profile.id,
    username: profile.username,
    city: profile.city,
    ethnicity: profile.ethnicity,
    gender: profile.gender,
    viewCount: profile.viewCount,
    isVerified: profile.isVerified,
    isVip,
    vipUntil: profile.vipUntil ?? null,
    averageRating,
    reviewsCount,
    profilePicture: profilePicture
      ? {
          id: profilePicture.id,
          picturePath: profilePicture.picturePath,
        }
      : null,
  };
}