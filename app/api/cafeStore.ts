import { mockCafes } from "@/app/components/admin/cafes/mockData";
import { changePayloadToCafe } from "@/app/api/cafes";
import type { Cafe, CafeFormPayload } from "@/app/types/cafe";

let cafes: Cafe[] = [...mockCafes];

export function listCafes() {
  return cafes;
}

export function createCafe(payload: CafeFormPayload) {
  const cafe = {
    ...changePayloadToCafe(payload),
    approval_status: "approved" as const,
  };
  cafes = [cafe, ...cafes];
  return cafe;
}

export function resetCafeStore(next?: Cafe[]) {
  cafes = next ? [...next] : [...mockCafes];
}
