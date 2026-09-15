import { normalizeAnalyzedPlace, type NormalizedAnalyzedPlace } from "./analyzed-place.ts";

export const DRAFT_KEY = "sple-place-draft-v1";
export interface SaveCandidate extends NormalizedAnalyzedPlace {
  request_id: string;
  saved: boolean;
}
export interface PlaceDraft {
  text: string;
  places: SaveCandidate[];
  userId: string | null;
  updatedAt: number;
}

export function readDraft(raw: string | null, now = Date.now()): PlaceDraft | null {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || typeof value.text !== "string" || value.text.length > 10_000 ||
        !Array.isArray(value.places) || value.places.length > 50 ||
        typeof value.updatedAt !== "number" || now - value.updatedAt > 86_400_000 ||
        (value.userId !== null && typeof value.userId !== "string")) return null;
    const places: SaveCandidate[] = [];
    for (const item of value.places) {
      if (!item || typeof item.request_id !== "string" ||
          !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(item.request_id)) return null;
      const normalized = normalizeAnalyzedPlace(item);
      if (!normalized) return null;
      places.push({ ...normalized, request_id: item.request_id,
        saved: item.saved === true, selected: item.saved !== true && item.selected === true });
    }
    return { text: value.text, places, userId: value.userId, updatedAt: value.updatedAt };
  } catch {
    return null;
  }
}

export function applySaveResults(places: SaveCandidate[], successfulIds: Set<string>): SaveCandidate[] {
  return places.map(place => successfulIds.has(place.request_id)
    ? { ...place, saved: true, selected: false } : place);
}
