export type CafeStatus = "open" | "recently_opened" | "closed";
export type OutletAvailability = "all" | "most" | "half" | "some" | "none";
export type LightingType = "dark" | "normal" | "bright";

export interface Cafe {
  id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  access: string;
  status: CafeStatus;
  seats: number;
  seatType: string;
  wifi: boolean;
  wifiSpeed: string;
  outlet: OutletAvailability;
  lighting: LightingType;
  meetingRoom: boolean;
  parking: boolean;
  smoking: "no_smoking" | "separated" | "e_cigarette" | "allowed";
  coffeePrice: number;
  bringOwnFood: "allowed" | "not_allowed" | "drinks_only";
  alcohol: "available" | "night_only" | "unavailable";
  services: string[];
  paymentMethods: string[];
  crowdedness: "empty" | "normal" | "crowded";
  customerTypes: string[];
  ambienceCasual: number;
  ambienceModern: number;
  ambassadorComment: string;
  website: string;
  timeLimit?: string;
  hoursWeekday?: string;
  hoursWeekend?: string;
  imagePath?: string;
  latitude?: number;
  longitude?: number;
  deleted_at: string | null;
  updated_at: string;
}

export interface CafeFormPayload {
  name: string;
  area: string;
  address: string;
  phone: string;
  status: CafeStatus;
  wifi: boolean;
  outlet: OutletAvailability;
  crowdedness: "empty" | "normal" | "crowded";
  imagePath?: string;
  services: string[];
  paymentMethods: string[];
}
