import type {
  Cafe,
  CafeFormPayload,
  CrowdMatrix,
  ImageCategoryKey,
} from "@/app/types/cafe";

type CafeTableRow = {
  id: string;
  name: string;
  facility_type: Cafe["facilityType"];
  area: string;
  prefecture: string;
  postal_code: string;
  address_line1: string;
  address_line2: string | null;
  address_line3: string | null;
  address: string;
  access: string | null;
  phone: string | null;
  status: Cafe["status"];
  time_limit: string | null;
  hours_weekday_from: string | null;
  hours_weekday_to: string | null;
  hours_weekend_from: string | null;
  hours_weekend_to: string | null;
  hours_note: string | null;
  regular_holidays: string[];
  seats: number | null;
  wifi: boolean;
  outlet: Cafe["outlet"];
  lighting: Cafe["lighting"];
  meeting_room: boolean;
  allow_short_leave: boolean;
  private_booths: boolean;
  parking: boolean;
  smoking: Cafe["smoking"];
  coffee_price: number | null;
  bring_own_food: Cafe["bringOwnFood"];
  alcohol: Cafe["alcohol"];
  services: string[] | null;
  payment_methods: string[] | null;
  customer_types: string[] | null;
  recommended_work: string[];
  crowd_levels: CrowdMatrix;
  ambience_casual: number;
  ambience_modern: number;
  ambassador_comment: string | null;
  website: string | null;
  image_main_path: string;
  image_exterior_path: string;
  image_interior_path: string;
  image_power_path: string;
  image_drink_path: string;
  image_food_path: string | null;
  image_other_paths: string[];
  deleted_at?: string | null;
  updated_at: string;
};

export function changePayloadToCafe(
  payload: CafeFormPayload,
  base?: Cafe,
): Cafe {
  const now = new Date().toISOString();
  const combinedAddress = [
    payload.prefecture,
    payload.addressLine1,
    payload.addressLine2,
    payload.addressLine3,
  ]
    .filter(Boolean)
    .join("");

  const images = payload.images;

  return {
    id: base?.id ?? `draft-${globalThis.crypto.randomUUID()}`,
    name: payload.name,
    facilityType: payload.facilityType,
    area: payload.area,
    prefecture: payload.prefecture,
    postalCode: payload.postalCode,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    addressLine3: payload.addressLine3,
    address: combinedAddress,
    access: payload.access,
    phone: payload.phone,
    status: payload.status,
    timeLimit: payload.timeLimit,
    hoursWeekdayFrom: payload.hoursWeekdayFrom,
    hoursWeekdayTo: payload.hoursWeekdayTo,
    hoursWeekendFrom: payload.hoursWeekendFrom,
    hoursWeekendTo: payload.hoursWeekendTo,
    hoursNote: payload.hoursNote,
    regularHolidays: payload.regularHolidays,
    seats:
      typeof payload.seats === "number"
        ? payload.seats
        : Number(payload.seats) || 0,
    wifi: payload.wifi,
    outlet: payload.outlet,
    lighting: payload.lighting,
    meetingRoom: payload.meetingRoom,
    allowsShortLeave: payload.allowsShortLeave,
    hasPrivateBooths: payload.hasPrivateBooths,
    parking: payload.parking,
    smoking: payload.smoking,
    coffeePrice: payload.coffeePrice,
    bringOwnFood: payload.bringOwnFood,
    alcohol: payload.alcohol,
    services: payload.services,
    paymentMethods: payload.paymentMethods,
    customerTypes: payload.customerTypes,
    recommendedWorkStyles: payload.recommendedWorkStyles,
    crowdMatrix: payload.crowdMatrix,
    ambienceCasual: payload.ambienceCasual,
    ambienceModern: payload.ambienceModern,
    ambassadorComment: payload.ambassadorComment,
    website: payload.website,
    imageMainPath: images.main?.storagePath || base?.imageMainPath || "",
    imageExteriorPath:
      images.exterior?.storagePath || base?.imageExteriorPath || "",
    imageInteriorPath:
      images.interior?.storagePath || base?.imageInteriorPath || "",
    imagePowerPath:
      images.power?.storagePath || base?.imagePowerPath || "",
    imageDrinkPath:
      images.drink?.storagePath || base?.imageDrinkPath || "",
    imageFoodPath:
      images.food?.storagePath || base?.imageFoodPath || undefined,
    imageOtherPaths: (() => {
      const next: string[] = [];
      for (let i = 1; i <= 10; i += 1) {
        const key = `other${i}` as ImageCategoryKey;
        const path = images[key]?.storagePath;
        if (path) {
          next.push(path);
        }
      }
      return next;
    })(),
    deleted_at: base?.deleted_at ?? null,
    updated_at: now,
  };
}

export function buildCafeTableInsert(
  payload: CafeFormPayload,
): Omit<CafeTableRow, "id" | "updated_at"> {
  const seats =
    typeof payload.seats === "number"
      ? payload.seats
      : Number(payload.seats) || null;
  const address = [
    payload.prefecture,
    payload.addressLine1,
    payload.addressLine2,
    payload.addressLine3,
  ]
    .filter(Boolean)
    .join("");

  return {
    name: payload.name,
    facility_type: payload.facilityType,
    area: payload.area,
    prefecture: payload.prefecture,
    postal_code: payload.postalCode,
    address_line1: payload.addressLine1,
    address_line2: payload.addressLine2 || null,
    address_line3: payload.addressLine3 || null,
    address,
    access: payload.access || null,
    phone: payload.phone || null,
    status: payload.status,
    time_limit: payload.timeLimit || null,
    hours_weekday_from: payload.hoursWeekdayFrom || null,
    hours_weekday_to: payload.hoursWeekdayTo || null,
    hours_weekend_from: payload.hoursWeekendFrom || null,
    hours_weekend_to: payload.hoursWeekendTo || null,
    hours_note: payload.hoursNote || null,
    regular_holidays: payload.regularHolidays,
    seats,
    wifi: payload.wifi,
    outlet: payload.outlet,
    lighting: payload.lighting,
    meeting_room: payload.meetingRoom,
    allow_short_leave: payload.allowsShortLeave,
    private_booths: payload.hasPrivateBooths,
    parking: payload.parking,
    smoking: payload.smoking,
    coffee_price: payload.coffeePrice || null,
    bring_own_food: payload.bringOwnFood,
    alcohol: payload.alcohol,
    services: payload.services,
    payment_methods: payload.paymentMethods,
    customer_types: payload.customerTypes,
    recommended_work: payload.recommendedWorkStyles,
    crowd_levels: payload.crowdMatrix,
    ambience_casual: payload.ambienceCasual,
    ambience_modern: payload.ambienceModern,
    ambassador_comment: payload.ambassadorComment || null,
    website: payload.website || null,
    image_main_path: ensureImagePath(payload, "main"),
    image_exterior_path: ensureImagePath(payload, "exterior"),
    image_interior_path: ensureImagePath(payload, "interior"),
    image_power_path: ensureImagePath(payload, "power"),
    image_drink_path: ensureImagePath(payload, "drink"),
    image_food_path: payload.images.food?.storagePath ?? null,
    image_other_paths: collectOtherImagePaths(payload.images),
    // deleted_at columnはDB側のデフォルトに任せる
  };
}

export function mapCafeRowToCafe(row: CafeTableRow): Cafe {
  return {
    id: row.id,
    name: row.name,
    facilityType: row.facility_type,
    area: row.area,
    prefecture: row.prefecture,
    postalCode: row.postal_code,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 ?? "",
    addressLine3: row.address_line3 ?? "",
    address: row.address,
    access: row.access ?? "",
    phone: row.phone ?? "",
    status: row.status,
    timeLimit: row.time_limit ?? "",
    hoursWeekdayFrom: row.hours_weekday_from ?? "",
    hoursWeekdayTo: row.hours_weekday_to ?? "",
    hoursWeekendFrom: row.hours_weekend_from ?? "",
    hoursWeekendTo: row.hours_weekend_to ?? "",
    hoursNote: row.hours_note ?? "",
    regularHolidays: row.regular_holidays ?? [],
    seats: row.seats ?? 0,
    wifi: row.wifi,
    outlet: row.outlet,
    lighting: row.lighting,
    meetingRoom: row.meeting_room,
    allowsShortLeave: row.allow_short_leave,
    hasPrivateBooths: row.private_booths,
    parking: row.parking,
    smoking: row.smoking,
    coffeePrice: row.coffee_price ?? 0,
    bringOwnFood: row.bring_own_food,
    alcohol: row.alcohol,
    services: row.services ?? [],
    paymentMethods: row.payment_methods ?? [],
    customerTypes: row.customer_types ?? [],
    recommendedWorkStyles: row.recommended_work ?? [],
    crowdMatrix: row.crowd_levels,
    ambienceCasual: row.ambience_casual,
    ambienceModern: row.ambience_modern,
    ambassadorComment: row.ambassador_comment ?? "",
    website: row.website ?? "",
    imageMainPath: row.image_main_path,
    imageExteriorPath: row.image_exterior_path,
    imageInteriorPath: row.image_interior_path,
    imagePowerPath: row.image_power_path,
    imageDrinkPath: row.image_drink_path,
    imageFoodPath: row.image_food_path ?? undefined,
    imageOtherPaths: row.image_other_paths ?? [],
    deleted_at: "deleted_at" in row ? row.deleted_at ?? null : null,
    updated_at: row.updated_at,
  };
}

function ensureImagePath(
  payload: CafeFormPayload,
  key: ImageCategoryKey,
): string {
  const entry = payload.images[key];
  if (!entry?.storagePath) {
    throw new Error(`${key}画像のストレージパスが設定されていません`);
  }
  return entry.storagePath;
}

function collectOtherImagePaths(
  images: CafeFormPayload["images"],
): string[] {
  const paths: string[] = [];
  for (let i = 1; i <= 10; i += 1) {
    const key = `other${i}` as ImageCategoryKey;
    const storagePath = images[key]?.storagePath;
    if (storagePath) {
      paths.push(storagePath);
    }
  }
  return paths;
}
