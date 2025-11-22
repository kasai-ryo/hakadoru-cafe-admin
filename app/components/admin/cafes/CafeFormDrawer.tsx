"use client";

import { useEffect, useState } from "react";
import type { Cafe, CafeFormPayload } from "@/app/types/cafe";

interface CafeFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CafeFormPayload) => void;
  editingCafe: Cafe | null;
}

const defaultServices = [
  "テラス席あり",
  "個室ブース",
  "24h営業",
  "モニター貸出あり",
  "おかわり割引",
];

const defaultPayments = ["現金", "クレカ", "QR決済", "交通系IC"];

const emptyForm: CafeFormPayload = {
  name: "",
  area: "",
  address: "",
  phone: "",
  status: "open",
  wifi: true,
  outlet: "all",
  crowdedness: "normal",
  imagePath: "",
  services: [],
  paymentMethods: [],
};

export function CafeFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  editingCafe,
}: CafeFormDrawerProps) {
  const [formState, setFormState] = useState<CafeFormPayload>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingCafe) {
      setFormState({
        name: editingCafe.name,
        area: editingCafe.area,
        address: editingCafe.address,
        phone: editingCafe.phone,
        status: editingCafe.status,
        wifi: editingCafe.wifi,
        outlet: editingCafe.outlet,
        crowdedness: editingCafe.crowdedness,
        imagePath: editingCafe.imagePath ?? "",
        services: editingCafe.services,
        paymentMethods: editingCafe.paymentMethods,
      });
    } else {
      setFormState(emptyForm);
    }
  }, [editingCafe]);

  const handleChange = <K extends keyof CafeFormPayload>(
    key: K,
    value: CafeFormPayload[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSelection = (key: "services" | "paymentMethods", value: string) => {
    setFormState((prev) => {
      const currentSet = new Set(prev[key]);
      if (currentSet.has(value)) {
        currentSet.delete(value);
      } else {
        currentSet.add(value);
      }
      return { ...prev, [key]: Array.from(currentSet) };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name || !formState.area || !formState.address || !formState.phone) {
      setError("店舗名・エリア・住所・電話番号は必須です。");
      return;
    }
    setError("");
    onSubmit(formState);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-xl transform bg-white shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
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
          </header>

          <form
            className="flex-1 overflow-y-auto px-6 py-6"
            onSubmit={handleSubmit}
          >
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500">基本情報</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="店舗名"
                  required
                  value={formState.name}
                  onChange={(value) => handleChange("name", value)}
                />
                <Field
                  label="エリア"
                  required
                  value={formState.area}
                  onChange={(value) => handleChange("area", value)}
                />
              </div>
              <Field
                label="住所"
                required
                value={formState.address}
                onChange={(value) => handleChange("address", value)}
              />
              <Field
                label="電話番号"
                required
                placeholder="03-1234-5678"
                value={formState.phone}
                onChange={(value) => handleChange("phone", value)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="ステータス"
                  value={formState.status}
                  onChange={(value) =>
                    handleChange("status", value as Cafe["status"])
                  }
                  options={[
                    { value: "open", label: "開店" },
                    { value: "recently_opened", label: "最近オープン" },
                    { value: "closed", label: "閉店" },
                  ]}
                />
                <SelectField
                  label="混雑度"
                  value={formState.crowdedness}
                  onChange={(value) =>
                    handleChange(
                      "crowdedness",
                      value as CafeFormPayload["crowdedness"],
                    )
                  }
                  options={[
                    { value: "empty", label: "空いている" },
                    { value: "normal", label: "普通" },
                    { value: "crowded", label: "混んでいる" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formState.wifi}
                    onChange={(event) =>
                      handleChange("wifi", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Wi-Fi あり
                </label>
                <SelectField
                  label="電源"
                  value={formState.outlet}
                  onChange={(value) =>
                    handleChange(
                      "outlet",
                      value as CafeFormPayload["outlet"],
                    )
                  }
                  options={[
                    { value: "all", label: "全席" },
                    { value: "most", label: "8割" },
                    { value: "half", label: "半分" },
                    { value: "some", label: "一部" },
                    { value: "none", label: "なし" },
                  ]}
                />
              </div>
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500">
                画像・サービス
              </h3>
              <Field
                label="画像パス (Supabase Storage)"
                placeholder="cafes/cafe-xxx/main.jpg"
                value={formState.imagePath ?? ""}
                onChange={(value) => handleChange("imagePath", value)}
              />

              <div>
                <p className="text-sm font-medium text-gray-700">サービス</p>
                <ChipGroup
                  values={formState.services}
                  options={defaultServices}
                  onToggle={(value) => toggleSelection("services", value)}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  支払い方法
                </p>
                <ChipGroup
                  values={formState.paymentMethods}
                  options={defaultPayments}
                  onToggle={(value) => toggleSelection("paymentMethods", value)}
                />
              </div>
            </section>

            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                {editingCafe ? "更新する" : "登録する"}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}

interface FieldProps {
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

function Field({ label, value, onChange, required, placeholder }: FieldProps) {
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

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ChipGroupProps {
  values: string[];
  options: string[];
  onToggle: (value: string) => void;
}

function ChipGroup({ values, options, onToggle }: ChipGroupProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = values.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1 text-xs ${
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
