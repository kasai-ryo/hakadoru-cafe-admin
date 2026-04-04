import type {
  Cafe,
  CafeFormPayload,
  CrowdLevel,
  CrowdMatrix,
  ImageCategoryKey,
} from "@/app/types/cafe";

const ALLOWED_SERVICE_VALUES = new Set([
  "pet_ok",
  "terrace",
  "takeout",
  "window_seat",
]);

function normalizeServices(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const toServiceKey = (value: string): string | null => {
    const normalized = value.trim().replace(/\s+/g, "");
    switch (normalized) {
      case "ペットOK":
      case "pet_ok":
        return "pet_ok";
      case "テラス席あり":
      case "テラス席":
      case "terrace":
        return "terrace";
      case "テイクアウト":
      case "takeout":
        return "takeout";
      case "窓際席あり":
      case "窓際席":
      case "window_seat":
        return "window_seat";
      default:
        return null;
    }
  };
  const mapped: string[] = values
    .map((value) => (typeof value === "string" ? toServiceKey(value) : null))
    .filter((value): value is string => value !== null && ALLOWED_SERVICE_VALUES.has(value));
  return Array.from(new Set(mapped));
}

type CafeImageRow = {
  id?: string;
  cafe_id: string;
  image_url: string;
  image_type: ImageCategoryKey;
  display_order: number | null;
  caption: string | null;
};

type CafeTableRow = {
  id: string;
  name: string;
  facility_type: Cafe["facilityType"];
  prefecture: string;
  postal_code: string;
  address_line1: string;
  address_line2: string | null;
  address_line3: string | null;
  address: string;
  access: string | null;
  nearest_station: string | null;
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
  private_booths: boolean;
  smoking: Cafe["smoking"];
  alcohol: Cafe["alcohol"];
  main_menu: string | null;
  services: string[] | null;
  payment_methods: string[] | null;
  recommended_work: string[];
  crowd_levels: Partial<Record<string, CrowdLevel>> | null;
  ambience_casual: number;
  ambience_modern: number;
  ambassador_comment: string | null;
  website: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  first_request_account_id: string | null;
  instagram_post_url_1: string | null;
  instagram_post_url_2: string | null;
  instagram_post_url_3: string | null;
  smoking_note: string | null;
  equipment_note: string | null;
  latitude: number | null;
  longitude: number | null;
  approval_status: string;
  deleted_at?: string | null;
  updated_at: string;
  cafe_images?: CafeImageRow[] | null;
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
    area: inferAreaLabel(payload.addressLine1, payload.prefecture),
    prefecture: payload.prefecture,
    postalCode: payload.postalCode,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    addressLine3: payload.addressLine3,
    address: combinedAddress,
    access: payload.access,
    nearestStation: payload.nearestStation,
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
    hasPrivateBooths: payload.hasPrivateBooths,
    smoking: payload.smoking,
    alcohol: payload.alcohol,
    mainMenu: payload.mainMenu,
    services: normalizeServices(payload.services),
    paymentMethods: payload.paymentMethods,
    recommendedWorkStyles: payload.recommendedWorkStyles,
    crowdMatrix: payload.crowdMatrix,
    ambienceCasual: payload.ambienceCasual,
    ambienceModern: payload.ambienceModern,
    ambassadorComment: payload.ambassadorComment,
    website: payload.website,
    instagramUrl: payload.instagramUrl,
    tiktokUrl: payload.tiktokUrl,
    firstRequestAccountId: payload.firstRequestAccountId || base?.firstRequestAccountId || null,
    instagramPostUrl1: payload.instagramPostUrl1,
    instagramPostUrl2: payload.instagramPostUrl2,
    instagramPostUrl3: payload.instagramPostUrl3,
    smokingNote: payload.smokingNote,
    equipmentNote: payload.equipmentNote,
    latitude: payload.latitude ?? base?.latitude ?? null,
    longitude: payload.longitude ?? base?.longitude ?? null,
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
    imageCaptions: (() => {
      const captions: Partial<Record<ImageCategoryKey, string>> = {
        ...base?.imageCaptions,
      };
      (Object.keys(images) as ImageCategoryKey[]).forEach((key) => {
        const caption = images[key]?.caption;
        if (typeof caption === "string") {
          captions[key] = caption;
        }
      });
      return captions;
    })(),
    approval_status: base?.approval_status ?? "pending",
    deleted_at: base?.deleted_at ?? null,
    updated_at: now,
  };
}

type CafeTableInsert = Omit<
  CafeTableRow,
  "id" | "updated_at" | "cafe_images"
>;

export function buildCafeTableInsert(payload: CafeFormPayload): CafeTableInsert {
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
    prefecture: payload.prefecture,
    postal_code: payload.postalCode,
    address_line1: payload.addressLine1,
    address_line2: payload.addressLine2 || null,
    address_line3: payload.addressLine3 || null,
    address,
    access: payload.access || null,
    nearest_station: payload.nearestStation || null,
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
    private_booths: payload.hasPrivateBooths,
    smoking: payload.smoking,
    alcohol: payload.alcohol,
    main_menu: payload.mainMenu || null,
    services: normalizeServices(payload.services),
    payment_methods: payload.paymentMethods,
    recommended_work: payload.recommendedWorkStyles,
    crowd_levels: payload.crowdMatrix,
    ambience_casual: payload.ambienceCasual,
    ambience_modern: payload.ambienceModern,
    ambassador_comment: payload.ambassadorComment || null,
    website: payload.website || null,
    instagram_url: payload.instagramUrl || null,
    tiktok_url: payload.tiktokUrl || null,
    first_request_account_id: payload.firstRequestAccountId || null,
    instagram_post_url_1: payload.instagramPostUrl1 || null,
    instagram_post_url_2: payload.instagramPostUrl2 || null,
    instagram_post_url_3: payload.instagramPostUrl3 || null,
    smoking_note: payload.smokingNote || null,
    equipment_note: payload.equipmentNote || null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    approval_status: "pending",
    // deleted_at columnはDB側のデフォルトに任せる
  };
}

function inferAreaLabel(
  addressLine1: string,
  prefecture: string,
): string {
  const normalizedAddress = (addressLine1 || "").trim();
  if (normalizedAddress.length > 0) {
    return normalizedAddress;
  }
  return (prefecture || "").trim() || "未設定";
}

export function mapCafeRowToCafe(
  row: CafeTableRow,
  overrideImages?: CafeImageRow[],
): Cafe {
  const imageRows = overrideImages ?? row.cafe_images ?? [];
  const { pathMap, captionMap, otherList } = buildImageMaps(imageRows);

  return {
    id: row.id,
    name: row.name,
    facilityType: row.facility_type,
    area: inferAreaLabel(row.address_line1, row.prefecture),
    prefecture: row.prefecture,
    postalCode: row.postal_code,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 ?? "",
    addressLine3: row.address_line3 ?? "",
    address: row.address,
    access: row.access ?? "",
    nearestStation: row.nearest_station ?? "",
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
    hasPrivateBooths: row.private_booths,
    smoking: row.smoking,
    alcohol: row.alcohol,
    mainMenu: row.main_menu ?? "",
    services: normalizeServices(row.services),
    paymentMethods: row.payment_methods ?? [],
    recommendedWorkStyles: row.recommended_work ?? [],
    crowdMatrix: normalizeCrowdMatrix(row.crowd_levels),
    ambienceCasual: row.ambience_casual,
    ambienceModern: row.ambience_modern,
    ambassadorComment: row.ambassador_comment ?? "",
    website: row.website ?? "",
    instagramUrl: row.instagram_url ?? "",
    tiktokUrl: row.tiktok_url ?? "",
    firstRequestAccountId: row.first_request_account_id ?? null,
    instagramPostUrl1: row.instagram_post_url_1 ?? "",
    instagramPostUrl2: row.instagram_post_url_2 ?? "",
    instagramPostUrl3: row.instagram_post_url_3 ?? "",
    smokingNote: row.smoking_note ?? "",
    equipmentNote: row.equipment_note ?? "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    imageMainPath: pathMap.main ?? "",
    imageExteriorPath: pathMap.exterior ?? "",
    imageInteriorPath: pathMap.interior ?? "",
    imagePowerPath: pathMap.power ?? "",
    imageDrinkPath: pathMap.drink ?? "",
    imageFoodPath: pathMap.food ?? undefined,
    imageOtherPaths: otherList,
    imageCaptions: captionMap,
    approval_status: row.approval_status as Cafe["approval_status"],
    deleted_at: "deleted_at" in row ? row.deleted_at ?? null : null,
    updated_at: row.updated_at,
  };
}

const DEFAULT_CROWD_LEVEL: CrowdLevel = "normal";

function createDefaultCrowdMatrix(): CrowdMatrix {
  return {
    weekday0608: DEFAULT_CROWD_LEVEL,
    weekday0810: DEFAULT_CROWD_LEVEL,
    weekday1012: DEFAULT_CROWD_LEVEL,
    weekday1214: DEFAULT_CROWD_LEVEL,
    weekday1416: DEFAULT_CROWD_LEVEL,
    weekday1618: DEFAULT_CROWD_LEVEL,
    weekday1820: DEFAULT_CROWD_LEVEL,
    weekday2022: DEFAULT_CROWD_LEVEL,
    weekday2224: DEFAULT_CROWD_LEVEL,
    weekend0608: DEFAULT_CROWD_LEVEL,
    weekend0810: DEFAULT_CROWD_LEVEL,
    weekend1012: DEFAULT_CROWD_LEVEL,
    weekend1214: DEFAULT_CROWD_LEVEL,
    weekend1416: DEFAULT_CROWD_LEVEL,
    weekend1618: DEFAULT_CROWD_LEVEL,
    weekend1820: DEFAULT_CROWD_LEVEL,
    weekend2022: DEFAULT_CROWD_LEVEL,
    weekend2224: DEFAULT_CROWD_LEVEL,
  };
}

function normalizeCrowdMatrix(
  raw: Partial<Record<string, CrowdLevel>> | null | undefined,
): CrowdMatrix {
  const base = createDefaultCrowdMatrix();
  if (!raw) return base;

  const next: CrowdMatrix = { ...base };
  (Object.keys(base) as Array<keyof CrowdMatrix>).forEach((key) => {
    const value = raw[key];
    if (value) {
      next[key] = value;
    }
  });

  return next;
}

function buildImageMaps(imageRows?: CafeImageRow[] | null) {
  const safeRows = Array.isArray(imageRows) ? imageRows : [];
  const pathMap: Partial<Record<ImageCategoryKey, string>> = {};
  const captionMap: Partial<Record<ImageCategoryKey, string>> = {};
  const sorted = [...safeRows].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  sorted.forEach((row) => {
    if (!row?.image_type || !row.image_url) {
      return;
    }
    const key = row.image_type as ImageCategoryKey;
    pathMap[key] = row.image_url;
    if (row.caption) {
      captionMap[key] = row.caption;
    }
  });

  const otherList: string[] = [];
  for (let i = 1; i <= 10; i += 1) {
    const key = `other${i}` as ImageCategoryKey;
    if (pathMap[key]) {
      otherList.push(pathMap[key]!);
    }
  }

  return {
    pathMap,
    captionMap,
    otherList,
  };
}
