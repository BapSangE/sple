export interface AnalyzedPlaceInput {
  name?: string | null;
  address?: string | null;
  category?: string | null;
  summary?: string | null;
}

export interface NormalizedAnalyzedPlace {
  name: string;
  address?: string;
  category?: string;
  summary?: string;
  selected: boolean;
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function normalizeAnalyzedPlace(
  place: AnalyzedPlaceInput,
): NormalizedAnalyzedPlace | null {
  const name = normalizeOptionalText(place.name);
  if (!name) return null;

  return {
    name,
    address: normalizeOptionalText(place.address),
    category: normalizeOptionalText(place.category),
    summary: normalizeOptionalText(place.summary),
    selected: true,
  };
}
