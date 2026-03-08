export enum EscortService {
  DINNER = 'DINNER',
  EVENT = 'EVENT',
  TRAVEL = 'TRAVEL',
  CITY_GUIDE = 'CITY_GUIDE',
  BUSINESS_EVENT = 'BUSINESS_EVENT',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum Ethnicity {
  EUROPEAN = 'EUROPEAN',
  ASIAN = 'ASIAN',
  LATIN = 'LATIN',
  MIDDLE_EASTERN = 'MIDDLE_EASTERN',
  MIXED = 'MIXED',
  OTHER = 'OTHER',
  // From scraped data (country codes)
  GE = 'GE', // Georgia
  UA = 'UA', // Ukraine
  RU = 'RU', // Russia
  TR = 'TR', // Turkey
  AZ = 'AZ', // Azerbaijan
}

export enum Language {
  EN = 'EN',
  KA = 'KA',
  RU = 'RU',
  ES = 'ES',
  FR = 'FR',
  TR = 'TR', // Türkçe
  UK = 'UK', // Українська (Ukrainian)
}

export enum ServiceLocation {
  IN_CALL = 'IN_CALL',
  OUT_CALL = 'OUT_CALL',
}

export enum UserRole {
  CLIENT = 'CLIENT',
  ESCORT = 'ESCORT',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}