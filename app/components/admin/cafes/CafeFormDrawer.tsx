"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import areas from "@/app/data/areas.json";
import prefectures from "@/app/data/prefectures.json";
import type {
  Cafe,
  CafeFormPayload,
  CrowdLevel,
  CrowdMatrix,
  FacilityType,
  ImageCategoryKey,
  ImageUpload,
} from "@/app/types/cafe";

const FACILITY_OPTIONS: { label: string; value: FacilityType }[] = [
  { label: "カフェ", value: "cafe" },
  { label: "コワーキングスペース", value: "coworking" },
  { label: "カフェ＋コワーキング", value: "hybrid" },
  { label: "その他", value: "other" },
];

const REGULAR_HOLIDAY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "月曜日", value: "monday" },
  { label: "火曜日", value: "tuesday" },
  { label: "水曜日", value: "wednesday" },
  { label: "木曜日", value: "thursday" },
  { label: "金曜日", value: "friday" },
  { label: "土曜日", value: "saturday" },
  { label: "日曜日", value: "sunday" },
];

const SERVICE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "ペットOK", value: "pet_ok" },
  { label: "テラス席あり", value: "terrace" },
  { label: "テイクアウト", value: "takeout" },
  { label: "窓際席あり", value: "window_seat" },
];

const RECOMMENDED_WORK_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "PC作業", value: "pc_work" },
  { label: "読書", value: "reading" },
  { label: "勉強", value: "study" },
  { label: "打合せ", value: "meeting" },
];

const SUPABASE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const SUPABASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "cafeimages";
const IMAGE_MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_IMAGE_MAX_UPLOAD_MB ?? "5");
const MAX_IMAGE_UPLOAD_BYTES =
  Number.isFinite(IMAGE_MAX_UPLOAD_MB) && IMAGE_MAX_UPLOAD_MB > 0
    ? IMAGE_MAX_UPLOAD_MB * 1024 * 1024
    : 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2048;
const MIN_IMAGE_DIMENSION = 640;
const MIN_JPEG_QUALITY = 0.55;

function generateClientId() {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }
  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoRef.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function parseMultiValueText(raw: string): string[] {
  const values = raw
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(values));
}

const REQUIRED_FIELD_LABELS: Record<
  keyof Pick<
    CafeFormPayload,
    "name" | "prefecture" | "postalCode" | "addressLine1" | "nearestStation"
  >,
  string
> = {
  name: "店舗名",
  prefecture: "都道府県",
  postalCode: "郵便番号",
  addressLine1: "住所1",
  nearestStation: "最寄駅",
};

type SerializedImageUpload = {
  id: string;
  storagePath: string | null;
  caption: string;
};

type SerializedFormState = Omit<CafeFormPayload, "images"> & {
  images: Record<ImageCategoryKey, SerializedImageUpload | null>;
};

type DraftSnapshotItem = {
  id: string;
  savedAt: string;
  editingCafeId: string | null;
  editingCafeName: string | null;
  cafeName: string;
  payload: SerializedFormState;
};

const CROWD_OPTIONS: { label: string; value: CrowdLevel }[] = [
  { label: "空いてる", value: "empty" },
  { label: "普通", value: "normal" },
  { label: "混雑", value: "crowded" },
  { label: "待ち", value: "unknown" },
  { label: "営業時間外", value: "closed" },
];

const CROWD_DEFINITIONS = {
  empty: "空いてる：席に余裕がある状態。",
  normal: "普通：席の半分程度が埋まっており、待たずに座れる状態。",
  crowded: "混雑：満席に近く、入店待ちや席確保が難しい状態。",
  unknown: "待ち：満席で着席まで待機が発生する状態（値は unknown として保存）。",
  closed: "営業時間外：その時間帯は営業していない状態。",
};

const CROWD_DAY_SECTIONS: Array<{
  label: string;
  value: "weekday" | "weekend";
}> = [
  { label: "平日", value: "weekday" },
  { label: "休日", value: "weekend" },
];

const CROWD_TIME_ROWS: Array<{
  label: string;
  weekdayKey: keyof CrowdMatrix;
  weekendKey: keyof CrowdMatrix;
}> = [
  {
    label: "06:00-08:00",
    weekdayKey: "weekday0608",
    weekendKey: "weekend0608",
  },
  {
    label: "08:00-10:00",
    weekdayKey: "weekday0810",
    weekendKey: "weekend0810",
  },
  {
    label: "10:00-12:00",
    weekdayKey: "weekday1012",
    weekendKey: "weekend1012",
  },
  {
    label: "12:00-14:00",
    weekdayKey: "weekday1214",
    weekendKey: "weekend1214",
  },
  {
    label: "14:00-16:00",
    weekdayKey: "weekday1416",
    weekendKey: "weekend1416",
  },
  {
    label: "16:00-18:00",
    weekdayKey: "weekday1618",
    weekendKey: "weekend1618",
  },
  {
    label: "18:00-20:00",
    weekdayKey: "weekday1820",
    weekendKey: "weekend1820",
  },
  {
    label: "20:00-22:00",
    weekdayKey: "weekday2022",
    weekendKey: "weekend2022",
  },
  {
    label: "22:00-24:00",
    weekdayKey: "weekday2224",
    weekendKey: "weekend2224",
  },
];

const IMAGE_CATEGORIES: Array<{
  key: ImageCategoryKey;
  label: string;
  required: boolean;
  note?: string;
}> = [
    {
      key: "main",
      label: "メイン画像",
      required: false,
      note: "※サムネイルに利用されます",
    },
    { key: "exterior", label: "外観", required: false },
    { key: "interior", label: "内観", required: false },
    { key: "power", label: "電源席", required: false, note: "※電源タップが見えるような画像を登録してください", },
    { key: "drink", label: "ドリンク", required: false },
    { key: "food", label: "フード", required: false },
    { key: "other1", label: "その他1", required: false },
    { key: "other2", label: "その他2", required: false },
    { key: "other3", label: "その他3", required: false },
    { key: "other4", label: "その他4", required: false },
    { key: "other5", label: "その他5", required: false },
    { key: "other6", label: "その他6", required: false },
    { key: "other7", label: "その他7", required: false },
    { key: "other8", label: "その他8", required: false },
    { key: "other9", label: "その他9", required: false },
    { key: "other10", label: "その他10", required: false },
  ];

const createEmptyCrowdMatrix = (): CrowdMatrix => ({
  weekday0608: "normal",
  weekday0810: "normal",
  weekday1012: "normal",
  weekday1214: "normal",
  weekday1416: "normal",
  weekday1618: "normal",
  weekday1820: "normal",
  weekday2022: "normal",
  weekday2224: "normal",
  weekend0608: "normal",
  weekend0810: "normal",
  weekend1012: "normal",
  weekend1214: "normal",
  weekend1416: "normal",
  weekend1618: "normal",
  weekend1820: "normal",
  weekend2022: "normal",
  weekend2224: "normal",
});

function normalizeCrowdMatrix(
  raw?: Partial<Record<string, CrowdLevel>> | null,
): CrowdMatrix {
  const base = createEmptyCrowdMatrix();
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

const createEmptyImages = (): Record<
  ImageCategoryKey,
  ImageUpload | null
> => ({
  main: null,
  exterior: null,
  interior: null,
  power: null,
  drink: null,
  food: null,
  other1: null,
  other2: null,
  other3: null,
  other4: null,
  other5: null,
  other6: null,
  other7: null,
  other8: null,
  other9: null,
  other10: null,
});

type PostalLookupFeedback =
  | {
    type: "success" | "error";
    message: string;
  }
  | null;

type DraftSaveFeedback =
  | {
    type: "success" | "error";
    message: string;
  }
  | null;

const createEmptyForm = (): CafeFormPayload => ({
  name: "",
  facilityType: "cafe",
  area: "",
  prefecture: "東京都",
  postalCode: "",
  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
  access: "",
  nearestStation: "",
  phone: "",
  status: "open",
  timeLimit: "",
  hoursWeekdayFrom: "",
  hoursWeekdayTo: "",
  hoursWeekendFrom: "",
  hoursWeekendTo: "",
  hoursNote: "",
  regularHolidays: [],
  seats: "",
  wifi: true,
  outlet: "all",
  lighting: "normal",
  meetingRoom: false,
  allowsShortLeave: false,
  hasPrivateBooths: false,
  parking: false,
  smoking: "no_smoking",
  coffeePrice: 0,
  bringOwnFood: "not_allowed",
  alcohol: "unavailable",
  mainMenu: "",
  services: [],
  paymentMethods: [],
  customerTypes: [],
  recommendedWorkStyles: [],
  crowdMatrix: createEmptyCrowdMatrix(),
  ambienceCasual: 3,
  ambienceModern: 3,
  ambassadorComment: "",
  website: "",
  instagramUrl: "",
  tiktokUrl: "",
  smokingNote: "",
  equipmentNote: "",
  latitude: null,
  longitude: null,
  images: createEmptyImages(),
});

const mapCafeToFormPayload = (cafe: Cafe): CafeFormPayload => ({
  name: cafe.name,
  facilityType: cafe.facilityType,
  area: cafe.area,
  prefecture: cafe.prefecture,
  postalCode: cafe.postalCode,
  addressLine1: cafe.addressLine1,
  addressLine2: cafe.addressLine2,
  addressLine3: cafe.addressLine3,
  access: cafe.access,
  nearestStation: cafe.nearestStation,
  phone: cafe.phone,
  status: cafe.status,
  timeLimit: cafe.timeLimit,
  hoursWeekdayFrom: cafe.hoursWeekdayFrom,
  hoursWeekdayTo: cafe.hoursWeekdayTo,
  hoursWeekendFrom: cafe.hoursWeekendFrom,
  hoursWeekendTo: cafe.hoursWeekendTo,
  hoursNote: cafe.hoursNote,
  regularHolidays: cafe.regularHolidays,
  seats: cafe.seats,
  wifi: cafe.wifi,
  outlet: cafe.outlet,
  lighting: cafe.lighting,
  meetingRoom: cafe.meetingRoom,
  allowsShortLeave: cafe.allowsShortLeave,
  hasPrivateBooths: cafe.hasPrivateBooths,
  parking: cafe.parking,
  smoking: cafe.smoking,
  coffeePrice: cafe.coffeePrice,
  bringOwnFood: cafe.bringOwnFood,
  alcohol: cafe.alcohol,
  mainMenu: cafe.mainMenu,
  services: cafe.services,
  paymentMethods: cafe.paymentMethods,
  customerTypes: cafe.customerTypes,
  recommendedWorkStyles: cafe.recommendedWorkStyles ?? [],
  crowdMatrix: normalizeCrowdMatrix(cafe.crowdMatrix),
  ambienceCasual: cafe.ambienceCasual,
  ambienceModern: cafe.ambienceModern,
  ambassadorComment: cafe.ambassadorComment,
  website: cafe.website,
  instagramUrl: cafe.instagramUrl,
  tiktokUrl: cafe.tiktokUrl,
  smokingNote: cafe.smokingNote,
  equipmentNote: cafe.equipmentNote,
  latitude: cafe.latitude,
  longitude: cafe.longitude,
  images: {
    main: createImageState(cafe.imageMainPath, cafe.imageCaptions.main),
    exterior: createImageState(
      cafe.imageExteriorPath,
      cafe.imageCaptions.exterior,
    ),
    interior: createImageState(
      cafe.imageInteriorPath,
      cafe.imageCaptions.interior,
    ),
    power: createImageState(cafe.imagePowerPath, cafe.imageCaptions.power),
    drink: createImageState(cafe.imageDrinkPath, cafe.imageCaptions.drink),
    food: createImageState(cafe.imageFoodPath, cafe.imageCaptions.food),
    other1: createImageState(
      cafe.imageOtherPaths[0],
      cafe.imageCaptions.other1,
    ),
    other2: createImageState(
      cafe.imageOtherPaths[1],
      cafe.imageCaptions.other2,
    ),
    other3: createImageState(
      cafe.imageOtherPaths[2],
      cafe.imageCaptions.other3,
    ),
    other4: createImageState(
      cafe.imageOtherPaths[3],
      cafe.imageCaptions.other4,
    ),
    other5: createImageState(
      cafe.imageOtherPaths[4],
      cafe.imageCaptions.other5,
    ),
    other6: createImageState(
      cafe.imageOtherPaths[5],
      cafe.imageCaptions.other6,
    ),
    other7: createImageState(
      cafe.imageOtherPaths[6],
      cafe.imageCaptions.other7,
    ),
    other8: createImageState(
      cafe.imageOtherPaths[7],
      cafe.imageCaptions.other8,
    ),
    other9: createImageState(
      cafe.imageOtherPaths[8],
      cafe.imageCaptions.other9,
    ),
    other10: createImageState(
      cafe.imageOtherPaths[9],
      cafe.imageCaptions.other10,
    ),
  },
});

function createImageState(path?: string | null, caption?: string | null): ImageUpload | null {
  if (!path) return null;
  const previewUrl = buildPublicImageUrl(path);
  return {
    id: generateClientId(),
    storagePath: path,
    previewUrl,
    caption: caption ?? "",
    fileBase64: null,
  };
}

function serializeFormState(state: CafeFormPayload): SerializedFormState {
  const images = {} as SerializedFormState["images"];
  IMAGE_CATEGORIES.forEach(({ key }) => {
    const entry = state.images[key];
    if (!entry) {
      images[key] = null;
    } else {
      images[key] = {
        id: entry.id,
        storagePath: entry.storagePath ?? null,
        caption: entry.caption ?? "",
      };
    }
  });
  const { images: _omitImages, ...rest } = state;
  return {
    ...rest,
    images,
  };
}

function deserializeFormState(serialized: SerializedFormState): CafeFormPayload {
  const base = createEmptyForm();
  const next: CafeFormPayload = {
    ...base,
    ...serialized,
    crowdMatrix: normalizeCrowdMatrix(serialized.crowdMatrix),
    images: { ...base.images },
  };
  next.bringOwnFood =
    next.bringOwnFood === "allowed" ||
      next.bringOwnFood === "not_allowed" ||
      next.bringOwnFood === "drinks_only"
      ? next.bringOwnFood
      : base.bringOwnFood;
  IMAGE_CATEGORIES.forEach(({ key }) => {
    const entry = serialized.images[key];
    if (!entry || !entry.storagePath) {
      next.images[key] = null;
    } else {
      next.images[key] = {
        id: entry.id ?? generateClientId(),
        storagePath: entry.storagePath,
        previewUrl: buildPublicImageUrl(entry.storagePath),
        caption: entry.caption ?? "",
        fileBase64: null,
      };
    }
  });
  return next;
}

async function fetchDraftSnapshots(
  editingCafe: Cafe | null,
): Promise<DraftSnapshotItem[]> {
  const params = new URLSearchParams();
  if (editingCafe?.id) {
    params.set("cafeId", editingCafe.id);
  }
  const response = await fetch(`/api/cafe-drafts?${params.toString()}`, {
    cache: "no-store",
  });
  const data = (await response.json()) as {
    data?: DraftSnapshotItem[];
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message ?? "一時保存一覧の取得に失敗しました。");
  }
  return Array.isArray(data.data) ? data.data : [];
}

async function fetchDraftSnapshotById(
  snapshotId: string,
): Promise<DraftSnapshotItem> {
  const response = await fetch(`/api/cafe-drafts/${snapshotId}`, {
    cache: "no-store",
  });
  const data = (await response.json()) as {
    data?: DraftSnapshotItem;
    message?: string;
  };
  if (!response.ok || !data.data) {
    throw new Error(data.message ?? "一時保存の取得に失敗しました。");
  }
  return data.data;
}

async function createDraftSnapshot(
  state: CafeFormPayload,
  editingCafe: Cafe | null,
  draftId?: string | null,
): Promise<{ id: string; savedAt: string }> {
  const response = await fetch("/api/cafe-drafts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      draftId: draftId ?? null,
      editingCafeId: editingCafe?.id ?? null,
      editingCafeName: editingCafe?.name ?? null,
      cafeName: state.name || editingCafe?.name || "",
      payload: serializeFormState(state),
    }),
  });
  const data = (await response.json()) as {
    message?: string;
    data?: { id: string; savedAt: string };
  };
  if (!response.ok) {
    throw new Error(data.message ?? "一時保存に失敗しました。");
  }
  if (!data.data?.id) {
    throw new Error("一時保存レスポンスの解析に失敗しました。");
  }
  return data.data;
}

async function uploadDraftImages(
  state: CafeFormPayload,
): Promise<CafeFormPayload> {
  const hasPendingImage = IMAGE_CATEGORIES.some((category) =>
    Boolean(state.images[category.key]?.fileBase64),
  );
  if (!hasPendingImage) {
    return state;
  }

  const response = await fetch("/api/cafe-drafts/upload-images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: state }),
  });
  const data = (await response.json()) as {
    imageUpdates?: Partial<
      Record<
        ImageCategoryKey,
        {
          id: string;
          storagePath: string | null;
          caption: string;
          fileBase64: null;
        } | null
      >
    >;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message ?? "下書き画像のアップロードに失敗しました。");
  }

  const nextImages = { ...state.images };
  IMAGE_CATEGORIES.forEach(({ key }) => {
    const update = data.imageUpdates?.[key];
    if (update === undefined) return;
    const current = nextImages[key];
    if (!update) {
      nextImages[key] = null;
      return;
    }
    nextImages[key] = current
      ? {
          ...current,
          id: update.id ?? current.id,
          storagePath: update.storagePath ?? current.storagePath,
          caption: update.caption ?? current.caption,
          fileBase64: null,
        }
      : null;
  });

  return {
    ...state,
    images: nextImages,
  };
}

async function removeDraftSnapshot(snapshotId: string) {
  const response = await fetch(`/api/cafe-drafts/${snapshotId}`, {
    method: "DELETE",
  });
  const data = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? "一時保存の削除に失敗しました。");
  }
}

function formatDraftSnapshotTime(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

function buildPublicImageUrl(path: string) {
  if (!SUPABASE_PUBLIC_URL) {
    return null;
  }
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${path}`;
}

export function CafeFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  editingCafe,
  initialDraftSnapshotId,
  layout = "drawer",
  showDraftSnapshotList = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CafeFormPayload) => Promise<void>;
  editingCafe: Cafe | null;
  initialDraftSnapshotId?: string | null;
  layout?: "drawer" | "page";
  showDraftSnapshotList?: boolean;
}) {
  const [formState, setFormState] = useState<CafeFormPayload>(
    createEmptyForm(),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [postalLookupFeedback, setPostalLookupFeedback] =
    useState<PostalLookupFeedback>(null);
  const [draftSaveFeedback, setDraftSaveFeedback] =
    useState<DraftSaveFeedback>(null);
  const [draftSnapshots, setDraftSnapshots] = useState<DraftSnapshotItem[]>([]);
  const [activeDraftSnapshotId, setActiveDraftSnapshotId] = useState<string | null>(null);
  const [isDraftSnapshotLoading, setIsDraftSnapshotLoading] = useState(false);
  const [isDraftSnapshotSaving, setIsDraftSnapshotSaving] = useState(false);
  const [isPostalLookupLoading, setIsPostalLookupLoading] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollDrawerToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (editingCafe) {
      setFormState(mapCafeToFormPayload(editingCafe));
    } else {
      setFormState(createEmptyForm());
    }
    setCurrentStep(0);
    setError("");
    setPostalLookupFeedback(null);
    setDraftSaveFeedback(null);
    setDraftSnapshots([]);
    setActiveDraftSnapshotId(initialDraftSnapshotId ?? null);
    setIsPostalLookupLoading(false);
  }, [isOpen, editingCafe, initialDraftSnapshotId]);

  useEffect(() => {
    if (
      formState.facilityType !== "coworking" &&
      formState.allowsShortLeave
    ) {
      setFormState((prev) => ({ ...prev, allowsShortLeave: false }));
    }
  }, [formState.facilityType, formState.allowsShortLeave]);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    const urls = IMAGE_CATEGORIES.map(
      (category) => formState.images[category.key]?.previewUrl,
    );
    urls.forEach((url) => {
      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
  }, [isOpen, formState.images]);

  useEffect(() => {
    if (!showDraftSnapshotList) return;
    if (!isOpen) return;
    let cancelled = false;
    const run = async () => {
      setIsDraftSnapshotLoading(true);
      try {
        const items = await fetchDraftSnapshots(editingCafe);
        if (!cancelled) {
          setDraftSnapshots(items);
        }
      } catch (error) {
        console.error("[CafeFormDrawer] Failed to fetch draft snapshots", error);
        if (!cancelled) {
          setDraftSaveFeedback({
            type: "error",
            message:
              (error as { message?: string }).message ??
              "一時保存一覧の取得に失敗しました。",
          });
        }
      } finally {
        if (!cancelled) {
          setIsDraftSnapshotLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, editingCafe, showDraftSnapshotList]);

  useEffect(() => {
    if (!isOpen || !initialDraftSnapshotId) return;
    let cancelled = false;
    const run = async () => {
      try {
        const snapshot = await fetchDraftSnapshotById(initialDraftSnapshotId);
        if (cancelled) return;
        setFormState(deserializeFormState(snapshot.payload));
        setActiveDraftSnapshotId(snapshot.id);
        setDraftSaveFeedback({
          type: "success",
          message: `一時保存を復元しました（${formatDraftSnapshotTime(snapshot.savedAt)}）`,
        });
        setError("");
        setPostalLookupFeedback(null);
      } catch (loadError) {
        console.error("[CafeFormDrawer] Failed to load initial draft snapshot", loadError);
        if (!cancelled) {
          setDraftSaveFeedback({
            type: "error",
            message:
              (loadError as { message?: string }).message ??
              "一時保存の復元に失敗しました。",
          });
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialDraftSnapshotId]);

  const refreshDraftSnapshots = async () => {
    const items = await fetchDraftSnapshots(editingCafe);
    setDraftSnapshots(items);
  };

  const handleDraftSave = async () => {
    setIsDraftSnapshotSaving(true);
    try {
      const stateForSave = await uploadDraftImages(formState);
      if (stateForSave !== formState) {
        setFormState(stateForSave);
      }
      const saved = await createDraftSnapshot(
        stateForSave,
        editingCafe,
        activeDraftSnapshotId,
      );
      setActiveDraftSnapshotId(saved.id);
      const now = new Date();
      const hh = `${now.getHours()}`.padStart(2, "0");
      const mm = `${now.getMinutes()}`.padStart(2, "0");
      setDraftSaveFeedback({
        type: "success",
        message: `一時保存しました（${hh}:${mm}）`,
      });
      await refreshDraftSnapshots();
    } catch (error) {
      console.error("[CafeFormDrawer] Failed to save draft manually", error);
      setDraftSaveFeedback({
        type: "error",
        message:
          (error as { message?: string }).message ??
          "一時保存に失敗しました。時間をおいて再度お試しください。",
      });
    } finally {
      setIsDraftSnapshotSaving(false);
    }
  };

  const jumpToStep = (step: number) => {
    setCurrentStep(step);
    scrollDrawerToTop();
  };

  const handleChange = <K extends keyof CafeFormPayload>(
    key: K,
    value: CafeFormPayload[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleChipToggle = (
    key:
      | "services"
      | "customerTypes"
      | "recommendedWorkStyles",
    value: string,
  ) => {
    setFormState((prev) => {
      const current = new Set(prev[key]);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [key]: Array.from(current) };
    });
  };

  const handleHolidayToggle = (day: string) => {
    setFormState((prev) => {
      const current = new Set(prev.regularHolidays);
      if (current.has(day)) {
        current.delete(day);
      } else {
        current.add(day);
      }
      return { ...prev, regularHolidays: Array.from(current) };
    });
  };

  const handleCrowdChange = (slot: keyof CrowdMatrix, value: CrowdLevel) => {
    setFormState((prev) => ({
      ...prev,
      crowdMatrix: { ...prev.crowdMatrix, [slot]: value },
    }));
  };

  const updateImage = (
    category: ImageCategoryKey,
    updater: ImageUpload | null,
  ) => {
    setFormState((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [category]: updater,
      },
    }));
  };

  const handleImageFile = async (category: ImageCategoryKey, file: File) => {
    let normalizedFile = file;
    try {
      normalizedFile = await convertHeicToJpegIfNeeded(file);
    } catch (error) {
      console.error("[CafeFormDrawer] Failed to convert HEIC image", error);
      setError(
        "HEIC画像の変換に失敗しました。このHEIC形式はブラウザ/変換ライブラリで未対応の可能性があります。iPhone設定を『互換性優先』に変更するか、JPEG/PNG/WebP形式でアップロードしてください。",
      );
      return;
    }
    try {
      normalizedFile = await compressImageForUpload(normalizedFile);
    } catch (error) {
      console.error("[CafeFormDrawer] Failed to compress image", error);
      setError(
        (error as { message?: string }).message ??
          `画像サイズの調整に失敗しました。画像を小さくして再度アップロードしてください（上限: ${IMAGE_MAX_UPLOAD_MB}MB）。`,
      );
      return;
    }

    const prev = formState.images[category];
    if (prev?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(prev.previewUrl);
    }
    const storagePath = generateStoragePath(
      formState.name,
      category,
      normalizedFile.name,
    );
    const previewUrl = URL.createObjectURL(normalizedFile);
    const baseEntry: ImageUpload = {
      id: prev?.id ?? generateClientId(),
      storagePath,
      previewUrl,
      caption: prev?.caption ?? "",
      fileBase64: null,
    };
    updateImage(category, baseEntry);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        console.error("画像の読み込みに失敗しました。");
        return;
      }
      setFormState((prevState) => {
        const current = prevState.images[category];
        if (!current) {
          return prevState;
        }
        return {
          ...prevState,
          images: {
            ...prevState.images,
            [category]: { ...current, fileBase64: reader.result },
          },
        };
      });
    };
    reader.onerror = () => {
      console.error("画像の読み込みに失敗しました。");
    };
    reader.readAsDataURL(normalizedFile);
  };

  const handleImageCaption = (category: ImageCategoryKey, caption: string) => {
    const prev = formState.images[category];
    if (!prev) return;
    updateImage(category, { ...prev, caption });
  };

  const handleImageClear = (category: ImageCategoryKey) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("この画像を削除しますか？");
      if (!confirmed) {
        return;
      }
    }
    const prev = formState.images[category];
    if (prev?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(prev.previewUrl);
    }
    updateImage(category, null);
  };

  const handleStepChange = (step: number) => {
    if (step >= 2) return;
    setError("");
    jumpToStep(step);
  };

  const handleBasicNext = () => {
    setError("");
    jumpToStep(1);
  };

  const handleImageNext = async () => {
    const requiredFields: Array<keyof typeof REQUIRED_FIELD_LABELS> = [
      "name",
      "prefecture",
      "postalCode",
      "addressLine1",
      "nearestStation",
    ];
    const missing = requiredFields.filter((key) => !formState[key]);
    if (missing.length > 0) {
      const messages = missing.map(
        (key) => `${REQUIRED_FIELD_LABELS[key]}は必須入力です`,
      );
      setError(messages.join("\n"));
      jumpToStep(0);
      return;
    }
    setError("");
    setIsSubmitting(true);
    const payloadToSubmit = { ...formState };
    console.log("[CafeFormDrawer] Submitting payload", payloadToSubmit);
    try {
      await onSubmit(payloadToSubmit);
      if (activeDraftSnapshotId) {
        try {
          await removeDraftSnapshot(activeDraftSnapshotId);
          setActiveDraftSnapshotId(null);
          if (showDraftSnapshotList) {
            await refreshDraftSnapshots();
          }
        } catch (cleanupError) {
          console.error(
            "[CafeFormDrawer] Failed to cleanup draft snapshot after submit",
            cleanupError,
          );
        }
      }
      jumpToStep(2);
    } catch (submitError) {
      console.error("[CafeFormDrawer] Failed to submit form", submitError);
      const message =
        (submitError as { message?: string }).message ??
        "登録処理でエラーが発生しました。時間をおいて再度お試しください。";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setFormState(createEmptyForm());
    setActiveDraftSnapshotId(null);
    jumpToStep(0);
    setError("");
    setPostalLookupFeedback(null);
    setDraftSaveFeedback(null);
    setIsSubmitting(false);
  };

  const handleDraftSnapshotLoad = (snapshot: DraftSnapshotItem) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("現在の入力内容を上書きして、一時保存を復元しますか？")
    ) {
      return;
    }
    setFormState(deserializeFormState(snapshot.payload));
    setActiveDraftSnapshotId(snapshot.id);
    setDraftSaveFeedback({
      type: "success",
      message: `一時保存を復元しました（${formatDraftSnapshotTime(snapshot.savedAt)}）`,
    });
    setError("");
    setPostalLookupFeedback(null);
  };

  const handleDraftSnapshotDelete = async (snapshotId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("この一時保存を削除しますか？")
    ) {
      return;
    }
    try {
      await removeDraftSnapshot(snapshotId);
      if (snapshotId === activeDraftSnapshotId) {
        setActiveDraftSnapshotId(null);
      }
      await refreshDraftSnapshots();
      setDraftSaveFeedback({
        type: "success",
        message: "一時保存を削除しました。",
      });
    } catch (error) {
      console.error("[CafeFormDrawer] Failed to delete draft snapshot", error);
      setDraftSaveFeedback({
        type: "error",
        message:
          (error as { message?: string }).message ??
          "一時保存の削除に失敗しました。",
      });
    }
  };

  const stepLabels = useMemo(
    () => [
      "情報入力",
      "画像登録",
      editingCafe ? "更新完了" : "登録完了",
    ],
    [editingCafe],
  );

  const handlePostalLookup = async () => {
    const normalized = formState.postalCode.replace(/[^\d]/g, "");
    if (normalized.length !== 7) {
      setPostalLookupFeedback({
        type: "error",
        message: "郵便番号はハイフンなしの7桁で入力してください。",
      });
      return;
    }
    setIsPostalLookupLoading(true);
    setPostalLookupFeedback(null);
    try {
      const response = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${normalized}`,
      );
      const data = await response.json();
      if (data.status !== 200 || !data.results?.length) {
        setPostalLookupFeedback({
          type: "error",
          message: "住所情報を取得できませんでした。手入力してください。",
        });
        return;
      }
      const result = data.results[0];
      setFormState((prev) => ({
        ...prev,
        prefecture: result.address1 || prev.prefecture,
        addressLine1: result.address2 || prev.addressLine1,
        addressLine2: result.address3 || prev.addressLine2,
      }));
      setPostalLookupFeedback({
        type: "success",
        message: "郵便番号から住所を自動入力しました。",
      });
    } catch (lookupError) {
      setPostalLookupFeedback({
        type: "error",
        message: "住所検索中にエラーが発生しました。時間をおいて再度お試しください。",
      });
      console.error(lookupError);
    } finally {
      setIsPostalLookupLoading(false);
    }
  };

  return (
    <>
      {layout === "drawer" && (
        <div
          className={`fixed inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={
          layout === "page"
            ? "relative mx-auto h-full w-full max-w-none bg-white"
            : `fixed right-0 top-0 z-40 h-full w-full max-w-5xl transform bg-white shadow-2xl transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"
            }`
        }
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  カフェフォーム
                </p>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {editingCafe ? "カフェ情報の更新" : "新規カフェ登録"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                × 閉じる
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {stepLabels.map((label, index) => (
                <StepIndicator
                  key={label}
                  label={label}
                  index={index}
                  current={currentStep}
                  onSelect={handleStepChange}
                />
              ))}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6" ref={contentRef}>
            {showDraftSnapshotList && currentStep !== 2 && (isDraftSnapshotLoading || draftSnapshots.length > 0) && (
              <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">一時保存一覧</h3>
                    <p className="text-xs text-gray-600">
                      {editingCafe
                        ? "この店舗の一時保存を復元できます"
                        : "新規登録の一時保存を復元できます"}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-600">
                    {draftSnapshots.length}件
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {isDraftSnapshotLoading && (
                    <p className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs text-gray-600">
                      一時保存一覧を読み込み中...
                    </p>
                  )}
                  {draftSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {snapshot.cafeName || "店舗名未入力"}
                        </p>
                        <p className="text-xs text-gray-500">
                          保存日時: {formatDraftSnapshotTime(snapshot.savedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                          onClick={() => handleDraftSnapshotLoad(snapshot)}
                        >
                          復元
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => void handleDraftSnapshotDelete(snapshot.id)}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {currentStep === 0 && (
              <InfoStep
                formState={formState}
                onChange={handleChange}
                onChipToggle={handleChipToggle}
                onHolidayToggle={handleHolidayToggle}
                onCrowdChange={handleCrowdChange}
                onPostalLookup={handlePostalLookup}
                postalLookupFeedback={postalLookupFeedback}
                postalLookupLoading={isPostalLookupLoading}
              />
            )}

            {currentStep === 1 && (
              <ImageStep
                formState={formState}
                onFile={handleImageFile}
                onCaption={handleImageCaption}
                onClear={handleImageClear}
              />
            )}

            {currentStep === 2 && (
              <CompletionStep
                formState={formState}
                editing={Boolean(editingCafe)}
              />
            )}

            {error && (
              <p className="mt-6 whitespace-pre-line text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>

          <footer className="border-t border-gray-200 px-6 py-4">
            {draftSaveFeedback && currentStep !== 2 && (
              <p
                className={`mb-3 text-xs ${draftSaveFeedback.type === "success"
                    ? "text-emerald-600"
                    : "text-red-600"
                  }`}
                role="status"
              >
                {draftSaveFeedback.message}
              </p>
            )}
            {currentStep === 0 && (
              <div className="flex justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-sm text-gray-500 underline"
                    onClick={onClose}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    onClick={() => void handleDraftSave()}
                    disabled={isDraftSnapshotSaving}
                  >
                    {isDraftSnapshotSaving ? "一時保存中..." : "一時保存"}
                  </button>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                  onClick={handleBasicNext}
                >
                  次へ（画像登録）
                </button>
              </div>
            )}

            {currentStep === 1 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    onClick={() => jumpToStep(0)}
                  >
                    情報入力に戻る
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    onClick={() => void handleDraftSave()}
                    disabled={isSubmitting || isDraftSnapshotSaving}
                  >
                    {isDraftSnapshotSaving ? "一時保存中..." : "一時保存"}
                  </button>
                </div>
                <button
                  type="button"
                  className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${isSubmitting
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-primary hover:bg-primary-dark"
                    }`}
                  onClick={handleImageNext}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? editingCafe
                      ? "更新中..."
                      : "登録中..."
                    : editingCafe
                      ? "更新する"
                      : "登録する"}
                </button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  onClick={handleRestart}
                >
                  もう一度登録する
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                  onClick={onClose}
                >
                  一覧へ戻る
                </button>
              </div>
            )}
          </footer>
        </div>
      </aside>
    </>
  );
}

function InfoStep({
  formState,
  onChange,
  onChipToggle,
  onHolidayToggle,
  onCrowdChange,
  onPostalLookup,
  postalLookupFeedback,
  postalLookupLoading,
}: {
  formState: CafeFormPayload;
  onChange: <K extends keyof CafeFormPayload>(
    key: K,
    value: CafeFormPayload[K],
  ) => void;
  onChipToggle: (
    key:
      | "services"
      | "customerTypes"
      | "recommendedWorkStyles",
    value: string,
  ) => void;
  onHolidayToggle: (day: string) => void;
  onCrowdChange: (slot: keyof CrowdMatrix, value: CrowdLevel) => void;
  onPostalLookup: () => void;
  postalLookupFeedback: PostalLookupFeedback;
  postalLookupLoading: boolean;
}) {
  return (
    <div className="space-y-8">
      <Section title="基本情報">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="店舗名"
            required
            value={formState.name}
            onChange={(value) => onChange("name", value)}
          />
          <SelectField
            label="施設タイプ"
            required
            options={FACILITY_OPTIONS}
            value={formState.facilityType}
            onChange={(value) =>
              onChange("facilityType", value as FacilityType)
            }
          />
          <SelectField
            label="エリア"
            options={areas}
            value={formState.area}
            placeholder="エリアを選択"
            onChange={(value) => onChange("area", value)}
          />
          <SelectField
            label="都道府県"
            options={prefectures}
            value={formState.prefecture}
            placeholder="都道府県を選択"
            required
            onChange={(value) => onChange("prefecture", value)}
          />
          <TextField
            label="電話番号"
            value={formState.phone}
            placeholder="例: 03-1234-5678"
            onChange={(value) => onChange("phone", value)}
          />
          <SelectField
            label="ステータス"
            required
            options={[
              { label: "開店", value: "open" },
              { label: "閉店", value: "closed" },
            ]}
            value={formState.status}
            onChange={(value) =>
              onChange("status", value as CafeFormPayload["status"])
            }
          />
        </div>
        {formState.facilityType === "coworking" && (
          <ToggleField
            label="途中離席（外出）可"
            checked={formState.allowsShortLeave}
            onChange={(checked) => onChange("allowsShortLeave", checked)}
          />
        )}
        <TextField
          label="公式サイト"
          value={formState.website}
          placeholder="https://example.com"
          onChange={(value) => onChange("website", value)}
        />
        <TextField
          label="Instagram URL"
          value={formState.instagramUrl}
          placeholder="https://instagram.com/..."
          onChange={(value) => onChange("instagramUrl", value)}
        />
        <TextField
          label="TikTok URL"
          value={formState.tiktokUrl}
          placeholder="https://tiktok.com/@..."
          onChange={(value) => onChange("tiktokUrl", value)}
        />
      </Section>

      <Section title="住所情報">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <TextField
              label="郵便番号"
              required
              placeholder="例: 103-0027"
              value={formState.postalCode}
              onChange={(value) => onChange("postalCode", value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onPostalLookup}
                disabled={postalLookupLoading}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {postalLookupLoading
                  ? "住所を検索中..."
                  : "郵便番号から住所を自動入力"}
              </button>
            </div>
            {postalLookupFeedback && (
              <p
                className={`text-xs ${postalLookupFeedback.type === "success"
                  ? "text-emerald-600"
                  : "text-red-500"
                  }`}
              >
                {postalLookupFeedback.message}
              </p>
            )}
          </div>
          <TextField
            label="住所1（市区）"
            required
            placeholder="例: 品川区"
            value={formState.addressLine1}
            onChange={(value) => onChange("addressLine1", value)}
          />
          <TextField
            label="住所2（町村番地）"
            required
            placeholder="例: 笹塚 1-1-1"
            value={formState.addressLine2}
            onChange={(value) => onChange("addressLine2", value)}
          />
        </div>
        <TextField
          label="住所3（建物名・フロア等）"
          placeholder="例: ハカドルビル5F"
          value={formState.addressLine3}
          onChange={(value) => onChange("addressLine3", value)}
        />
        <TextAreaField
          label="アクセス情報"
          value={formState.access}
          placeholder="最寄駅や徒歩時間を入力"
          rows={4}
          onChange={(value) => onChange("access", value)}
        />
        <TextField
          label="最寄駅"
          required
          value={formState.nearestStation}
          placeholder="例: 渋谷駅"
          onChange={(value) => onChange("nearestStation", value)}
        />
      </Section>

      <Section title="営業情報">
        <div className="grid gap-4 md:grid-cols-2">
          <TimeRangeField
            label="営業時間（平日）"
            from={formState.hoursWeekdayFrom}
            to={formState.hoursWeekdayTo}
            onChange={(value) => {
              onChange("hoursWeekdayFrom", value.from);
              onChange("hoursWeekdayTo", value.to);
            }}
          />
          <TimeRangeField
            label="営業時間（休日）"
            from={formState.hoursWeekendFrom}
            to={formState.hoursWeekendTo}
            onChange={(value) => {
              onChange("hoursWeekendFrom", value.from);
              onChange("hoursWeekendTo", value.to);
            }}
          />
        </div>
        <TextField
          label="利用時間制限"
          value={formState.timeLimit}
          placeholder="例: 2時間制 / 制限なし"
          onChange={(value) => onChange("timeLimit", value)}
        />
        <HolidaySelect
          value={formState.regularHolidays}
          onToggle={onHolidayToggle}
        />
        <TextAreaField
          label="営業時間補足"
          value={formState.hoursNote}
          rows={2}
          placeholder="例: 祝日は10:00～18:00で営業"
          onChange={(value) => onChange("hoursNote", value)}
        />
      </Section>

      <Section title="設備・環境">
        <div className="grid gap-4 md:grid-cols-4">
          <NumberField
            label="席数"
            value={formState.seats}
            onChange={(value) => onChange("seats", value)}
            allowEmpty
          />
          <ToggleField
            label="Wi-Fi"
            checked={formState.wifi}
            onChange={(checked) => onChange("wifi", checked)}
          />
          <ToggleField
            label="個別ブース"
            checked={formState.hasPrivateBooths}
            onChange={(checked) => onChange("hasPrivateBooths", checked)}
          />
          <ToggleField
            label="会議室"
            checked={formState.meetingRoom}
            onChange={(checked) => onChange("meetingRoom", checked)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ToggleField
            label="駐車場あり"
            checked={formState.parking}
            onChange={(checked) => onChange("parking", checked)}
          />
          <SelectField
            label="電源席の割合"
            required
            options={[
              { label: "全席", value: "all" },
              { label: "8割", value: "most" },
              { label: "半分", value: "half" },
              { label: "一部", value: "some" },
              { label: "なし", value: "none" },
            ]}
            value={formState.outlet}
            onChange={(value) =>
              onChange("outlet", value as CafeFormPayload["outlet"])
            }
          />
          <SelectField
            label="照明"
            options={[
              { label: "暗め", value: "dark" },
              { label: "普通", value: "normal" },
              { label: "明るめ", value: "bright" },
            ]}
            value={formState.lighting}
            onChange={(value) =>
              onChange("lighting", value as CafeFormPayload["lighting"])
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="禁煙・喫煙"
            required
            options={[
              { label: "禁煙", value: "no_smoking" },
              { label: "喫煙可能", value: "allowed" },
            ]}
            value={formState.smoking}
            onChange={(value) =>
              onChange("smoking", value as CafeFormPayload["smoking"])
            }
          />
          <TextAreaField
            label="喫煙補足"
            value={formState.smokingNote}
            rows={2}
            placeholder="例: テラス席のみ喫煙可能"
            onChange={(value) => onChange("smokingNote", value)}
          />
          <SelectField
            label="アルコール提供"
            required
            options={[
              { label: "あり（昼・夜両方）", value: "available" },
              { label: "夜のみあり", value: "night_only" },
              { label: "なし", value: "unavailable" },
            ]}
            value={formState.alcohol}
            onChange={(value) =>
              onChange("alcohol", value as CafeFormPayload["alcohol"])
            }
          />
        </div>
        <ChipSelect
          label="サービス"
          options={SERVICE_OPTIONS}
          values={formState.services}
          onToggle={(value) => onChipToggle("services", value)}
        />
        <ChipSelect
          label="適した作業"
          options={RECOMMENDED_WORK_OPTIONS}
          values={formState.recommendedWorkStyles}
          onToggle={(value) => onChipToggle("recommendedWorkStyles", value)}
        />
        <TextAreaField
          label="設備補足"
          value={formState.equipmentNote}
          rows={3}
          placeholder="設備に関する補足情報（1000文字まで）"
          maxLength={1000}
          onChange={(value) => onChange("equipmentNote", value)}
        />
      </Section>

      <Section title="料金・雰囲気">
        <NumberField
          label="コーヒー1杯の値段（円）"
          value={formState.coffeePrice}
          onChange={(value) =>
            onChange(
              "coffeePrice",
              typeof value === "number" ? value : 0,
            )
          }
        />
        <TextAreaField
          label="支払い方法"
          value={formState.paymentMethods.join(", ")}
          rows={2}
          placeholder="例: 現金, クレジットカード, QR決済, 交通系IC"
          onChange={(value) => onChange("paymentMethods", parseMultiValueText(value))}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SliderField
            label="雰囲気（カジュアル ↔ フォーマル）"
            value={formState.ambienceCasual}
            onChange={(value) => onChange("ambienceCasual", value)}
          />
          <SliderField
            label="雰囲気（レトロ ↔ モダン）"
            value={formState.ambienceModern}
            onChange={(value) => onChange("ambienceModern", value)}
          />
        </div>
        <TextAreaField
          label="アンバサダーコメント"
          value={formState.ambassadorComment}
          placeholder="おすすめポイントや注意点を記載"
          rows={5}
          onChange={(value) => onChange("ambassadorComment", value)}
        />
        <TextAreaField
          label="主要メニュー"
          value={formState.mainMenu}
          placeholder="人気メニューや価格帯など（1000文字まで）"
          rows={4}
          maxLength={1000}
          onChange={(value) => onChange("mainMenu", value)}
        />
      </Section>

      <Section title="混雑状況">
        <CrowdMatrixField
          crowdMatrix={formState.crowdMatrix}
          onChange={onCrowdChange}
        />
      </Section>
    </div>
  );
}

function ImageStep({
  formState,
  onFile,
  onCaption,
  onClear,
}: {
  formState: CafeFormPayload;
  onFile: (category: ImageCategoryKey, file: File) => void;
  onCaption: (category: ImageCategoryKey, caption: string) => void;
  onClear: (category: ImageCategoryKey) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl bg-gray-50 px-4 py-5 text-sm text-gray-600">
        <h3 className="text-base font-semibold text-gray-900">画像登録</h3>
        <p>
          画像は追加と差し替えのみ行うことができます。特定画像の削除をご希望の場合は、
          <a
            href="#"
            className="text-primary underline decoration-dotted underline-offset-4"
          >
            お問い合わせフォーム
          </a>
          よりご連絡ください。
        </p>
        <p className="text-xs text-gray-500">※画像最小サイズ：800 × 600</p>
        <p className="text-xs text-gray-500">
          ※アップロード可能形式：JPEG / PNG / WebP、ファイルサイズは5MB以下
        </p>
        <p className="text-xs text-gray-500">
          ※画像は任意です。未登録のまま保存して、あとから追加できます
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {IMAGE_CATEGORIES.map((category) => (
          <ImageUploadCard
            key={category.key}
            label={category.label}
            required={category.required}
            note={category.note}
            entry={formState.images[category.key]}
            onFile={(file) => onFile(category.key, file)}
            onCaption={(caption) => onCaption(category.key, caption)}
            onClear={() => onClear(category.key)}
          />
        ))}
      </div>
    </div>
  );
}

function ImageUploadCard({
  label,
  required,
  note,
  entry,
  onFile,
  onCaption,
  onClear,
}: {
  label: string;
  required?: boolean;
  note?: string;
  entry: ImageUpload | null;
  onFile: (file: File) => void;
  onCaption: (caption: string) => void;
  onClear?: () => void;
}) {
  const inputId = `${label}-input`;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
          {note && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              {note}
            </span>
          )}
        </p>
        {onClear && (
          <button
            type="button"
            className={`text-xs ${entry
              ? "text-gray-500 underline"
              : "cursor-not-allowed text-gray-300"
              }`}
            onClick={() => entry && onClear()}
            disabled={!entry}
          >
            クリア
          </button>
        )}
      </div>
      <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-50">
        {entry?.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.previewUrl}
            alt={`${label} preview`}
            className="h-full w-full object-cover"
          />
        ) : entry?.storagePath ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            既存画像: {entry.storagePath}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            プレビューが表示されます
          </div>
        )}
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
          }
          event.target.value = "";
        }}
      />
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <label
          htmlFor={inputId}
          className="flex-1 cursor-pointer rounded-full bg-gray-900 px-5 py-2 text-center text-sm font-semibold text-white hover:bg-gray-800"
        >
          {entry ? "写真を差し替える" : "写真をアップロード"}
        </label>
        <input
          type="text"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          placeholder="キャプション"
          value={entry?.caption ?? ""}
          disabled={!entry}
          onChange={(event) => onCaption(event.target.value)}
        />
      </div>
    </div>
  );
}

function CompletionStep({
  formState,
  editing,
}: {
  formState: CafeFormPayload;
  editing: boolean;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        ✓
      </div>
      <div>
        <h3 className="text-2xl font-semibold text-gray-900">
          {editing ? "カフェ情報を更新しました" : "カフェを登録しました"}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          入力内容は保存済みです。必要に応じて続けて登録するか、一覧に戻って内容を確認してください。
        </p>
      </div>
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-gray-50 p-4 text-left text-sm text-gray-700">
        <p className="font-medium text-gray-900">{formState.name}</p>
        <p className="text-gray-500">
          {formState.prefecture}
          {formState.addressLine1}
          {formState.addressLine2}
          {formState.addressLine3}
        </p>
        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-gray-500">ステータス</dt>
            <dd className="font-medium">{formState.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Wi-Fi / 電源席</dt>
            <dd className="font-medium">
              {formState.wifi ? "あり" : "なし"} / {formState.outlet}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">メイン画像</dt>
            <dd className="truncate font-medium">
              {formState.images.main?.storagePath || "未設定"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  required,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  rows = 3,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {typeof maxLength === "number" && (
        <span className="mt-1 block text-right text-xs text-gray-500">
          {value.length}/{maxLength}
        </span>
      )}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  allowEmpty = false,
}: {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  allowEmpty?: boolean;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (allowEmpty && raw === "") {
      onChange("");
      return;
    }
    if (raw === "") {
      onChange(0);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onChange(parsed);
    }
  };
  const displayValue = allowEmpty && value === "" ? "" : value;

  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type="number"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  required,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string | { label: string; value: string }>;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const normalized = options.map((option) =>
    typeof option === "string"
      ? { label: option, value: option }
      : option,
  );
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">{placeholder ?? "選択してください"}</option>
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
      {label}
    </label>
  );
}

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}：{value}
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full"
      />
    </label>
  );
}

function ChipSelect({
  label,
  values,
  options,
  onToggle,
}: {
  label: string;
  values: string[];
  options: Array<{ label: string; value: string }>;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`rounded-full border px-3 py-1 text-xs ${isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HolidaySelect({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (day: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">定休日</p>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700">
        {REGULAR_HOLIDAY_OPTIONS.map((day) => (
          <label key={day.value} className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={value.includes(day.value)}
              onChange={() => onToggle(day.value)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            {day.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function TimeRangeField({
  label,
  from,
  to,
  onChange,
}: {
  label: string;
  from: string;
  to: string;
  onChange: (value: { from: string; to: string }) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="time"
          step={900}
          value={from}
          onChange={(event) => onChange({ from: event.target.value, to })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-gray-500">〜</span>
        <input
          type="time"
          step={900}
          value={to}
          onChange={(event) => onChange({ from, to: event.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

function CrowdMatrixField({
  crowdMatrix,
  onChange,
}: {
  crowdMatrix: CrowdMatrix;
  onChange: (slot: keyof CrowdMatrix, value: CrowdLevel) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
        <p>{CROWD_DEFINITIONS.empty}</p>
        <p>{CROWD_DEFINITIONS.normal}</p>
        <p>{CROWD_DEFINITIONS.crowded}</p>
        <p>{CROWD_DEFINITIONS.unknown}</p>
        <p>{CROWD_DEFINITIONS.closed}</p>
      </div>

      <div className="space-y-4">
        {CROWD_DAY_SECTIONS.map((section) => (
          <div
            key={section.value}
            className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3"
          >
            <h4 className="text-sm font-semibold text-gray-900">{section.label}</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] table-fixed text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      時間帯
                    </th>
                    {CROWD_OPTIONS.map((option) => (
                      <th
                        key={option.value}
                        className="px-1 py-2 text-center font-semibold text-gray-700"
                      >
                        {option.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CROWD_TIME_ROWS.map((row, rowIndex) => {
                    const slotKey =
                      section.value === "weekday" ? row.weekdayKey : row.weekendKey;

                    return (
                      <tr
                        key={`${section.value}-${row.label}`}
                        className={`border-b border-gray-100 last:border-b-0 ${
                          rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        <td className="px-3 py-3 font-medium text-gray-900">
                          {row.label}
                        </td>
                        {CROWD_OPTIONS.map((option) => {
                          const isSelected = crowdMatrix[slotKey] === option.value;
                          return (
                            <td key={option.value} className="px-1 py-1 text-center">
                              <button
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={`${section.label} ${row.label} ${option.label}`}
                                onClick={() => onChange(slotKey, option.value)}
                                className={`w-full rounded-lg border px-2 py-2 text-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                                  isSelected
                                    ? "border-primary bg-primary text-white"
                                    : "border-gray-200 text-gray-600 hover:bg-gray-100"
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`mx-auto block h-4 w-4 rounded-full border transition-colors ${
                                    isSelected
                                      ? "border-white bg-white"
                                      : "border-current bg-transparent"
                                  }`}
                                />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIndicator({
  label,
  index,
  current,
  onSelect,
}: {
  label: string;
  index: number;
  current: number;
  onSelect?: (step: number) => void;
}) {
  const isActive = current === index;
  const isCompleted = current > index;
  const isClickable = typeof onSelect === "function" && index < 2 && current !== 2;
  const handleClick = () => {
    if (isClickable && onSelect) {
      onSelect(index);
    }
  };
  return (
    <div
      className={`flex flex-1 items-center gap-2 text-xs font-medium ${isClickable ? "cursor-pointer" : "cursor-default"
        }`}
      onClick={handleClick}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${isCompleted
          ? "bg-primary text-white"
          : isActive
            ? "border-2 border-primary text-primary"
            : "border border-gray-300 text-gray-400"
          }`}
      >
        {index + 1}
      </div>
      <span
        className={`text-sm ${isActive ? "text-gray-900" : "text-gray-500"
          }`}
      >
        {label}
      </span>
      {index < 2 && (
        <div className="flex-1 border-t border-dashed border-gray-200" />
      )}
    </div>
  );
}

function formatTimestamp(date: Date) {
  const y = date.getFullYear().toString();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  const second = `${date.getSeconds()}`.padStart(2, "0");
  return `${y}${m}${d}${hour}${minute}${second}`;
}

function generateStoragePath(
  _cafeName: string,
  category: string,
  originalName: string,
) {
  const ext = originalName.split(".").pop() ?? "jpg";
  const timestamp = formatTimestamp(new Date());
  return `cafes/${timestamp}/${category}-${Date.now()}.${ext}`;
}

function isHeicOrHeifFile(file: File) {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  return (
    mimeType.includes("heic") ||
    mimeType.includes("heif") ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif")
  );
}

async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  let width = originalWidth;
  let height = originalHeight;

  const longestEdge = Math.max(width, height);
  let scale = longestEdge > MAX_IMAGE_DIMENSION
    ? MAX_IMAGE_DIMENSION / longestEdge
    : 1;
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    const sizeBasedScale = Math.sqrt(MAX_IMAGE_UPLOAD_BYTES / file.size) * 0.95;
    scale = Math.min(scale, sizeBasedScale);
  }
  if (scale < 1) {
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  let quality = 0.9;
  let blob = await renderJpegBlob(image, width, height, quality);
  while (blob.size > MAX_IMAGE_UPLOAD_BYTES && quality > MIN_JPEG_QUALITY) {
    quality -= 0.08;
    blob = await renderJpegBlob(image, width, height, quality);
  }

  while (
    blob.size > MAX_IMAGE_UPLOAD_BYTES &&
    width > MIN_IMAGE_DIMENSION &&
    height > MIN_IMAGE_DIMENSION
  ) {
    width = Math.max(MIN_IMAGE_DIMENSION, Math.round(width * 0.85));
    height = Math.max(MIN_IMAGE_DIMENSION, Math.round(height * 0.85));
    quality = 0.82;
    blob = await renderJpegBlob(image, width, height, quality);
    while (blob.size > MAX_IMAGE_UPLOAD_BYTES && quality > MIN_JPEG_QUALITY) {
      quality -= 0.08;
      blob = await renderJpegBlob(image, width, height, quality);
    }
  }

  if (blob.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error(
      `画像サイズが上限（${IMAGE_MAX_UPLOAD_MB}MB）を超えています。より小さい画像をアップロードしてください。`,
    );
  }

  if (blob.size >= file.size && width === originalWidth && height === originalHeight) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function renderJpegBlob(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return await canvasToBlob(canvas, "image/jpeg", quality);
}

async function convertHeicToJpegIfNeeded(file: File): Promise<File> {
  const heicDetected = await detectHeicFile(file);
  if (!heicDetected) {
    return file;
  }

  const jpegBlob = await convertHeicBlobToJpeg(file);

  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([jpegBlob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function detectHeicFile(file: File): Promise<boolean> {
  if (isHeicOrHeifFile(file)) {
    return true;
  }
  try {
    const mod = await import("heic-to");
    const isHeic = mod?.isHeic as
      | ((target: Blob) => Promise<boolean>)
      | undefined;
    if (typeof isHeic === "function") {
      return await isHeic(file);
    }
  } catch {
    // ignore and treat as non-HEIC
  }
  return false;
}

async function convertHeicBlobToJpeg(file: File): Promise<Blob> {
  // First, try heic-to (primary converter).
  try {
    const mod = await import("heic-to");
    const heicTo = mod?.heicTo as
      | ((params: {
          blob: Blob;
          type: string;
          quality?: number;
        }) => Promise<Blob>)
      | undefined;
    if (typeof heicTo === "function") {
      const converted = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.92,
      });
      if (
        converted &&
        typeof converted === "object" &&
        "size" in converted &&
        "type" in converted &&
        typeof (converted as Blob).arrayBuffer === "function"
      ) {
        return converted as Blob;
      }
      throw new Error("heic-to returned an unsupported result");
    }
    throw new Error("heic-to module did not export heicTo");
  } catch (error) {
    console.error("[CafeFormDrawer] heic-to conversion failed", error);
  }

  // Second, try heic2any.
  try {
    const mod = await import("heic2any");
    const heic2any = (mod?.default ?? mod) as (params: {
        blob: Blob;
        toType: string;
        quality?: number;
      }) => Promise<Blob | Blob[]>;
    if (typeof heic2any === "function") {
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      });
      const first = Array.isArray(converted) ? converted[0] : converted;
      // Some bundlers/environments may return a Blob-like object where
      // `instanceof Blob` is unreliable. Accept by shape as well.
      if (
        first &&
        typeof first === "object" &&
        "size" in first &&
        "type" in first &&
        typeof (first as Blob).arrayBuffer === "function"
      ) {
        return first as Blob;
      }
      throw new Error("heic2any returned an unsupported result");
    }
    throw new Error("heic2any module did not export a function");
  } catch (error) {
    console.error("[CafeFormDrawer] heic2any conversion failed", error);
  }

  // Final fallback: this only works on browsers that can decode HEIC natively.
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }
  context.drawImage(image, 0, 0);

  return await canvasToBlob(canvas, "image/jpeg", 0.92);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Invalid file reader result"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "Image decode failed (HEIC is likely unsupported by this browser)",
        ),
      );
    image.src = src;
  });
}
