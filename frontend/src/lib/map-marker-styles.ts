export function createUserLocationMarkerHtml() {
  return `
    <div class="sple-user-location-marker" aria-label="현재 위치">
      <span class="sple-user-location-marker__pulse"></span>
      <span class="sple-user-location-marker__dot"></span>
    </div>
  `;
}

export function createPlaceMarkerHtml({ selected = false }: { selected?: boolean } = {}) {
  const selectedClass = selected ? " sple-place-marker--selected" : "";

  return `
    <div class="sple-place-marker${selectedClass}" aria-label="저장한 장소">
      <span class="sple-place-marker__pin"></span>
      <span class="sple-place-marker__center"></span>
    </div>
  `;
}
