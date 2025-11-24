export type CafeStatus = "open" | "recently_opened" | "closed";
export type FacilityType = "cafe" | "coworking" | "hybrid" | "other";
export type OutletAvailability = "all" | "most" | "half" | "some" | "none";
export type LightingType = "dark" | "normal" | "bright";
export type SmokingOption =
  | "no_smoking"
  | "separated"
  | "e_cigarette"
  | "allowed";
export type BringOwnFoodOption = "allowed" | "not_allowed" | "drinks_only";
export type AlcoholOption = "available" | "night_only" | "unavailable";
export type CrowdLevel = "empty" | "normal" | "crowded" | "unknown";

export interface CrowdMatrix {
  weekdayMorning: CrowdLevel;
  weekdayAfternoon: CrowdLevel;
  weekdayEvening: CrowdLevel;
  weekendMorning: CrowdLevel;
  weekendAfternoon: CrowdLevel;
  weekendEvening: CrowdLevel;
}

export type ImageCategoryKey =
  | "main"
  | "exterior"
  | "interior"
  | "power"
  | "drink"
  | "food"
  | "other1"
  | "other2"
  | "other3"
  | "other4"
  | "other5"
  | "other6"
  | "other7"
  | "other8"
  | "other9"
  | "other10";

export interface ImageUpload {
  id: string;
  storagePath: string;
  previewUrl: string | null;
  caption: string;
  fileBase64?: string | null;
}

export interface Cafe {
  id: string;
  name: string;
  facilityType: FacilityType;
  area: string;
  prefecture: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  address: string;
  access: string;
  phone: string;
  status: CafeStatus;
  timeLimit: string;
  hoursWeekdayFrom: string;
  hoursWeekdayTo: string;
  hoursWeekendFrom: string;
  hoursWeekendTo: string;
  hoursNote: string;
  regularHolidays: string[];
  seats: number;
  wifi: boolean;
  outlet: OutletAvailability;
  lighting: LightingType;
  meetingRoom: boolean;
  allowsShortLeave: boolean;
  hasPrivateBooths: boolean;
  parking: boolean;
  smoking: SmokingOption;
  coffeePrice: number;
  bringOwnFood: BringOwnFoodOption;
  alcohol: AlcoholOption;
  services: string[];
  paymentMethods: string[];
  customerTypes: string[];
  recommendedWorkStyles: string[];
  crowdMatrix: CrowdMatrix;
  ambienceCasual: number;
  ambienceModern: number;
  ambassadorComment: string;
  website: string;
  latitude: number | null;
  longitude: number | null;
  imageMainPath: string;
  imageExteriorPath: string;
  imageInteriorPath: string;
  imagePowerPath: string;
  imageDrinkPath: string;
  imageFoodPath?: string;
  imageOtherPaths: string[];
  imageCaptions: Partial<Record<ImageCategoryKey, string>>;
  deleted_at: string | null;
  updated_at: string;
}

export interface CafeFormPayload {
  name: string;
  facilityType: FacilityType;
  area: string;
  prefecture: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  access: string;
  phone: string;
  status: CafeStatus;
  timeLimit: string;
  hoursWeekdayFrom: string;
  hoursWeekdayTo: string;
  hoursWeekendFrom: string;
  hoursWeekendTo: string;
  hoursNote: string;
  regularHolidays: string[];
  seats: number | "";
  wifi: boolean;
  outlet: OutletAvailability;
  lighting: LightingType;
  meetingRoom: boolean;
  allowsShortLeave: boolean;
  hasPrivateBooths: boolean;
  parking: boolean;
  smoking: SmokingOption;
  coffeePrice: number;
  bringOwnFood: BringOwnFoodOption;
  alcohol: AlcoholOption;
  services: string[];
  paymentMethods: string[];
  customerTypes: string[];
  recommendedWorkStyles: string[];
  crowdMatrix: CrowdMatrix;
  ambienceCasual: number;
  ambienceModern: number;
  ambassadorComment: string;
  website: string;
  latitude: number | null;
  longitude: number | null;
  images: Record<ImageCategoryKey, ImageUpload | null>;
}
