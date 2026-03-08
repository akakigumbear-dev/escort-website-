import { EscortProfile } from 'database/entities/escort-profile.entity';
import { EscortPrices } from 'database/entities/escort-price.entity';
import { EscortPicture } from 'database/entities/escort-picture.entity';
import { EscortReview } from 'database/entities/escort-review.entity';
import { ServiceLocation } from 'database/enums/enums';

export type EscortProfileWithRelations = EscortProfile & {
  prices?: EscortPrices[];
  pictures?: EscortPicture[];
  reviews?: EscortReview[];
};

export function mapEscortProfile(profile: EscortProfileWithRelations) {
  const inCall =
    profile.prices?.find(
      (price) => price.serviceLocation === ServiceLocation.IN_CALL,
    ) ?? null;

  const outCall =
    profile.prices?.find(
      (price) => price.serviceLocation === ServiceLocation.OUT_CALL,
    ) ?? null;

  const isVip = !!profile.vipUntil && new Date(profile.vipUntil) > new Date();

  const profilePicture =
    profile.pictures?.find((picture) => picture.isProfilePicture) ??
    profile.pictures?.[0] ??
    null;

  const pictures =
    profile.pictures?.map((picture) => ({
      id: picture.id,
      picturePath: picture.picturePath,
      isProfilePicture: picture.isProfilePicture,
      createdAt: picture.createdAt,
    })) ?? [];

  const reviews =
    profile.reviews?.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    })) ?? [];

  const reviewsCount = reviews.length;

  const averageRating = reviewsCount
    ? Number(
        (
          reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount
        ).toFixed(1),
      )
    : 0;

  return {
    id: profile.id,
    phoneNumber: profile.phoneNumber,
    username: profile.username,
    city: profile.city,
    address: profile.address,
    services: profile.services,
    height: profile.height,
    weight: profile.weight,
    age: profile.age,
    ethnicity: profile.ethnicity,
    gender: profile.gender,
    languages: profile.languages,
    viewCount: profile.viewCount,
    isVerified: profile.isVerified,
    isVip,
    vipUntil: profile.vipUntil ?? null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,

    profilePicture: profilePicture
      ? {
          id: profilePicture.id,
          picturePath: profilePicture.picturePath,
        }
      : null,

    pictures,

    reviews,
    reviewsCount,
    averageRating,

    prices: {
      inCall: inCall
        ? {
            id: inCall.id,
            price30min: inCall.price30min,
            price1hour: inCall.price1hour,
            priceWholeNight: inCall.priceWholeNight,
            serviceLocation: inCall.serviceLocation,
          }
        : null,
      outCall: outCall
        ? {
            id: outCall.id,
            price30min: outCall.price30min,
            price1hour: outCall.price1hour,
            priceWholeNight: outCall.priceWholeNight,
            serviceLocation: outCall.serviceLocation,
          }
        : null,
    },
  };
}