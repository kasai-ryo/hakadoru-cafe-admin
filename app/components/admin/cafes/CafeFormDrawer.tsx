"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
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

const REGULAR_HOLIDAY_OPTIONS = [
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
  "日曜日",
];

const SERVICE_OPTIONS = [
  "テラス席あり",
  "個室ブース",
  "24h営業",
  "モニター貸出あり",
  "窓際席あり",
  "ペットOK",
  "充電器貸出あり",
  "ブランケット貸出あり",
];

const PAYMENT_OPTIONS = ["現金", "クレカ", "QR決済", "交通系IC"];

const CUSTOMER_TYPES = [
  "学生",
  "会社員",
  "フリーランス",
  "ファミリー",
  "観光客",
  "女子会",
  "カップル",
];

const RECOMMENDED_WORK_OPTIONS = [
  "PC作業",
  "読書",
  "勉強",
  "打合せ",
];

const SUPABASE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const SUPABASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "cafeimages";
const CREATE_DRAFT_KEY = "admin-cafe-form-draft";
const EDIT_DRAFT_PREFIX = "admin-cafe-form-edit-";

const REQUIRED_FIELD_LABELS: Record<
  keyof Pick<
    CafeFormPayload,
    "name" | "area" | "prefecture" | "postalCode" | "addressLine1"
  >,
  string
> = {
  name: "店舗名",
  area: "エリア",
  prefecture: "都道府県",
  postalCode: "郵便番号",
  addressLine1: "住所1",
};

type SerializedImageUpload = {
  id: string;
  storagePath: string | null;
  caption: string;
};

type SerializedFormState = Omit<CafeFormPayload, "images"> & {
  images: Record<ImageCategoryKey, SerializedImageUpload | null>;
};

const CROWD_OPTIONS: { label: string; value: CrowdLevel }[] = [
  { label: "空いている", value: "empty" },
  { label: "普通", value: "normal" },
  { label: "混雑", value: "crowded" },
  { label: "不明", value: "unknown" }
];

const CROWD_DEFINITIONS = {
  empty: "空いている：席の50%以上が空いている状態。",
  normal: "普通：席の半分程度が埋まっており、待たずに座れる状態。",
  crowded: "混雑：満席に近く、入店待ちや席確保が難しい状態。",
};

const CROWD_SLOTS: Array<{ key: keyof CrowdMatrix; label: string }> = [
  { key: "weekdayMorning", label: "平日 朝" },
  { key: "weekdayAfternoon", label: "平日 昼" },
  { key: "weekdayEvening", label: "平日 夜" },
  { key: "weekendMorning", label: "休日 朝" },
  { key: "weekendAfternoon", label: "休日 昼" },
  { key: "weekendEvening", label: "休日 夜" },
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
      required: true,
      note: "※サムネイルに利用されます",
    },
    { key: "exterior", label: "外観", required: true },
    { key: "interior", label: "内観", required: true },
    { key: "power", label: "電源席", required: true, note: "※電源タップが見えるような画像を登録してください", },
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
  weekdayMorning: "normal",
  weekdayAfternoon: "normal",
  weekdayEvening: "normal",
  weekendMorning: "normal",
  weekendAfternoon: "normal",
  weekendEvening: "normal",
});

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
  bringOwnFood: "allowed",
  alcohol: "unavailable",
  services: [],
  paymentMethods: [],
  customerTypes: [],
  recommendedWorkStyles: [],
  crowdMatrix: createEmptyCrowdMatrix(),
  ambienceCasual: 3,
  ambienceModern: 3,
  ambassadorComment: "",
  website: "",
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
  services: cafe.services,
  paymentMethods: cafe.paymentMethods,
  customerTypes: cafe.customerTypes,
  recommendedWorkStyles: cafe.recommendedWorkStyles ?? [],
  crowdMatrix: cafe.crowdMatrix,
  ambienceCasual: cafe.ambienceCasual,
  ambienceModern: cafe.ambienceModern,
  ambassadorComment: cafe.ambassadorComment,
  website: cafe.website,
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
    id: crypto.randomUUID(),
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
    images: { ...base.images },
  };
  IMAGE_CATEGORIES.forEach(({ key }) => {
    const entry = serialized.images[key];
    if (!entry || !entry.storagePath) {
      next.images[key] = null;
    } else {
      next.images[key] = {
        id: entry.id ?? crypto.randomUUID(),
        storagePath: entry.storagePath,
        previewUrl: buildPublicImageUrl(entry.storagePath),
        caption: entry.caption ?? "",
        fileBase64: null,
      };
    }
  });
  return next;
}

function getDraftStorageKey(editingCafe: Cafe | null) {
  return editingCafe ? `${EDIT_DRAFT_PREFIX}${editingCafe.id}` : CREATE_DRAFT_KEY;
}

function saveDraft(
  state: CafeFormPayload,
  editingCafe: Cafe | null,
  isOpen: boolean,
) {
  if (typeof window === "undefined") return;
  if (!isOpen) return;
  const key = getDraftStorageKey(editingCafe);
  const serialized = serializeFormState(state);
  try {
    window.localStorage.setItem(key, JSON.stringify(serialized));
  } catch (error) {
    console.error("[CafeFormDrawer] Failed to save draft", error);
  }
}

function loadDraft(editingCafe: Cafe | null): CafeFormPayload | null {
  if (typeof window === "undefined") return null;
  const key = getDraftStorageKey(editingCafe);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SerializedFormState;
    return deserializeFormState(parsed);
  } catch (error) {
    console.error("[CafeFormDrawer] Failed to parse draft", error);
    return null;
  }
}

function clearDraft(editingCafe: Cafe | null) {
  if (typeof window === "undefined") return;
  const key = getDraftStorageKey(editingCafe);
  window.localStorage.removeItem(key);
}

function buildPublicImageUrl(path: string) {
  if (!SUPABASE_PUBLIC_URL) {
    return null;
  }
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${path}`;
}

function scrollToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function CafeFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  editingCafe,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CafeFormPayload) => Promise<void>;
  editingCafe: Cafe | null;
}) {
  const [formState, setFormState] = useState<CafeFormPayload>(
    createEmptyForm(),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [postalLookupFeedback, setPostalLookupFeedback] =
    useState<PostalLookupFeedback>(null);
  const [isPostalLookupLoading, setIsPostalLookupLoading] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (editingCafe) {
      const draft = loadDraft(editingCafe);
      if (draft) {
        setFormState(draft);
      } else {
        setFormState(mapCafeToFormPayload(editingCafe));
      }
    } else {
      const draft = loadDraft(null);
      setFormState(draft ?? createEmptyForm());
    }
    setCurrentStep(0);
    setError("");
    setPostalLookupFeedback(null);
    setIsPostalLookupLoading(false);
  }, [isOpen, editingCafe]);

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
    saveDraft(formState, editingCafe, isOpen);
  }, [formState, editingCafe, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, isOpen]);

  const handleChange = <K extends keyof CafeFormPayload>(
    key: K,
    value: CafeFormPayload[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleChipToggle = (
    key:
      | "services"
      | "paymentMethods"
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

  const handleImageFile = (category: ImageCategoryKey, file: File) => {
    const prev = formState.images[category];
    if (prev?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(prev.previewUrl);
    }
    const storagePath = generateStoragePath(
      formState.name,
      category,
      file.name,
    );
    const previewUrl = URL.createObjectURL(file);
    const baseEntry: ImageUpload = {
      id: prev?.id ?? crypto.randomUUID(),
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
    reader.readAsDataURL(file);
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
    setCurrentStep(step);
  };

  const handleBasicNext = () => {
    setError("");
    setCurrentStep(1);
    scrollToTop();
  };

  const handleImageNext = async () => {
    const requiredFields: Array<keyof CafeFormPayload> = [
      "name",
      "area",
      "prefecture",
      "postalCode",
      "addressLine1",
    ];
    const missing = requiredFields.filter((key) => !formState[key]);
    if (missing.length > 0) {
      const messages = missing.map(
        (key) => `${REQUIRED_FIELD_LABELS[key]}は必須入力です`,
      );
      setError(messages.join("\n"));
      setCurrentStep(0);
      scrollToTop();
      return;
    }
    const missingImages = IMAGE_CATEGORIES.filter(
      (category) => category.required && !formState.images[category.key],
    );
    if (missingImages.length > 0) {
      const imageMessages = missingImages.map(
        (category) => `${category.label}は必須入力です`,
      );
      setError(imageMessages.join("\n"));
      scrollToTop();
      return;
    }
    setError("");
    setIsSubmitting(true);
    const payloadToSubmit = { ...formState };
    console.log("[CafeFormDrawer] Submitting payload", payloadToSubmit);
    try {
      await onSubmit(payloadToSubmit);
      clearDraft(editingCafe);
      setCurrentStep(2);
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
    clearDraft(editingCafe);
    setFormState(createEmptyForm());
    setCurrentStep(0);
    setError("");
    setPostalLookupFeedback(null);
    setIsSubmitting(false);
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
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-5xl transform bg-white shadow-2xl transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
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

          <div className="flex-1 overflow-y-auto px-6 py-6">
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
            {currentStep === 0 && (
              <div className="flex justify-between">
                <button
                  type="button"
                  className="text-sm text-gray-500 underline"
                  onClick={onClose}
                >
                  キャンセル
                </button>
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
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  onClick={() => setCurrentStep(0)}
                >
                  情報入力に戻る
                </button>
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
      | "paymentMethods"
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
            required
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
      </Section>

      <Section title="住所情報">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <TextField
              label="郵便番号"
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
            label="Wi-Fi あり"
            checked={formState.wifi}
            onChange={(checked) => onChange("wifi", checked)}
          />
          <ToggleField
            label="個別ブースあり"
            checked={formState.hasPrivateBooths}
            onChange={(checked) => onChange("hasPrivateBooths", checked)}
          />
          <ToggleField
            label="会議室あり"
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
            label="電源状況"
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
              { label: "全席禁煙", value: "no_smoking" },
              { label: "分煙", value: "separated" },
              { label: "電子タバコ可", value: "e_cigarette" },
              { label: "喫煙可", value: "allowed" },
              { label: "不明", value: "unknown" },
            ]}
            value={formState.smoking}
            onChange={(value) =>
              onChange("smoking", value as CafeFormPayload["smoking"])
            }
          />
          <SelectField
            label="飲食物持込"
            required
            options={[
              { label: "可能", value: "allowed" },
              { label: "不可", value: "not_allowed" },
              { label: "飲み物のみ可", value: "drinks_only" },
              { label: "不明", value: "unknown" },
            ]}
            value={formState.bringOwnFood}
            onChange={(value) =>
              onChange(
                "bringOwnFood",
                value as CafeFormPayload["bringOwnFood"],
              )
            }
          />
          <SelectField
            label="アルコール提供"
            required
            options={[
              { label: "あり", value: "available" },
              { label: "夜のみあり", value: "night_only" },
              { label: "なし", value: "unavailable" },
              { label: "不明", value: "unknown" },
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
      </Section>

      <Section title="料金・雰囲気・客層">
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
        <ChipSelect
          label="支払い方法"
          options={PAYMENT_OPTIONS}
          values={formState.paymentMethods}
          onToggle={(value) => onChipToggle("paymentMethods", value)}
        />
        <ChipSelect
          label="客層"
          options={CUSTOMER_TYPES}
          values={formState.customerTypes}
          onToggle={(value) => onChipToggle("customerTypes", value)}
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
          写真を差し替える
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
            <dt className="text-gray-500">Wi-Fi / 電源</dt>
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
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
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
  options: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-1 text-xs ${isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                }`}
            >
              {option}
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
          <label key={day} className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={value.includes(day)}
              onChange={() => onToggle(day)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            {day}
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
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {CROWD_SLOTS.map((slot) => (
          <SelectField
            key={slot.key}
            label={slot.label}
            options={CROWD_OPTIONS}
            value={crowdMatrix[slot.key]}
            onChange={(value) =>
              onChange(slot.key, value as CrowdLevel)
            }
          />
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
