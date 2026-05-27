# Map Marker Differentiation and Place Detail Enrichment Plan

> Date: 2026-05-27
> Product: Sple
> Scope: 지도 마커 차별화, 마커 클릭 상세 정보, AI 분석 결과와 네이버 공식 검색 데이터 연결

## Goal

현재 지도에서 `현재 위치 마커`와 `맛집/장소 마커`가 동일한 기본 마커로 표시되어 사용자가 구분하기 어렵다. 이를 다음 상태로 개선한다.

1. 현재 위치와 저장된 장소 마커를 시각적으로 명확히 구분한다.
2. 장소 마커를 누르면 어떤 매장인지 즉시 확인할 수 있게 한다.
3. AI가 분석한 요약, 카테고리, 주소와 함께 네이버 공식 검색 API로 확인한 장소 데이터를 함께 보여준다.
4. 이미지는 선택 기능으로 분리한다. 구현 난이도, 저작권, 품질 문제가 크면 MVP에서는 제외한다.

## Current Understanding

### Current Product Direction

`docs/CURRENT_PRODUCT_UNDERSTANDING.md` 기준으로 Sple은 Instagram 맛집 글이나 장소 텍스트를 붙여넣으면 AI가 장소 후보를 추출하고, 사용자가 저장한 장소를 지도와 리스트로 관리하는 개인 핫플 지도 서비스다.

### Current Map Behavior

Relevant files:

- `frontend/src/components/Map.tsx`
- `frontend/src/lib/naver-geocoding.ts`
- `frontend/src/app/api/places/route.ts`
- `src/main.py`
- `src/database.py`

`Map.tsx`는 다음 흐름으로 동작한다.

- 로그인된 사용자의 저장 장소를 `/api/places`에서 가져온다.
- 좌표가 있으면 바로 마커를 생성한다.
- 주소만 있고 좌표가 없으면 `geocodeAddress`로 좌표를 복구한다.
- 현재 위치는 `navigator.geolocation`으로 가져온다.
- 현재 위치 마커와 장소 마커 모두 `new maps.Marker({ position, map, title })` 기본 마커를 사용한다.

현재 문제:

- 현재 위치와 장소 마커가 같은 생김새다.
- 장소 마커 클릭 이벤트가 없다.
- AI 분석 요약은 저장 데이터에 있으나 지도 화면에서 충분히 노출되지 않는다.
- 네이버 플레이스 기반 실제 매장 데이터는 아직 저장/조회 구조가 없다.

## External API Decision

### Use Official Naver Search Local API First

네이버 플레이스 상세 페이지를 크롤링하거나 비공식 API를 사용하는 방식은 운영 서비스에서 위험하다. MVP에서는 공식 `Naver Search API - Local`을 사용한다.

Local Search API로 기대할 수 있는 데이터:

- `title`
- `link`
- `category`
- `description`
- `telephone`
- `address`
- `roadAddress`
- `mapx`
- `mapy`

주의:

- Local Search API의 `mapx`, `mapy`는 지도 마커용 위도/경도와 동일하게 쓰지 않는다.
- 마커 위치는 기존 Naver Geocoding 결과인 `latitude`, `longitude`를 계속 기준으로 한다.
- 네이버 Local Search 응답에는 공식적으로 매장 이미지가 포함되지 않는다.

### Optional Image Strategy

이미지가 꼭 필요하면 별도 2단계로 진행한다.

Option A:

- `Naver Search API - Image`를 사용해 `장소명 + 주소`로 대표 이미지를 검색한다.
- `thumbnail`, `link`를 저장한다.
- 이미지 품질과 정확도가 항상 보장되지 않으므로 "참고 이미지" 수준으로 표시한다.

Option B:

- 이미지 기능은 MVP에서 제외한다.
- 대신 네이버 플레이스 링크를 제공해 사용자가 원본 페이지에서 사진을 확인하게 한다.

Recommended:

- MVP에서는 이미지 제외.
- 마커 구분, 클릭 상세, 네이버 Local metadata 연결을 먼저 안정화한다.

## UX Direction

### Marker Differentiation

권장 디자인:

- 현재 위치: 파란색 원형 dot + 반투명 pulse ring
- 맛집/장소: 주황색 pin marker + 흰색 중심점 + shadow
- 선택된 맛집/장소: 주황색 marker를 더 크게 표시하거나 진한 테두리 추가

왜 이 방식이 좋은가:

- 현재 위치는 "내가 있는 점"에 가깝기 때문에 dot 계열이 자연스럽다.
- 저장 장소는 지도 위 목적지이므로 pin 형태가 더 직관적이다.
- 모바일 지도에서 label을 항상 노출하면 복잡해지므로, 기본 상태에서는 마커만 보여주고 선택 시 상세 패널을 띄운다.

### Marker Click Detail

마커를 누르면 지도 하단에 모바일 bottom sheet 형태의 상세 패널을 표시한다.

패널 내용:

- 장소명
- 주소
- AI 분석 요약
- AI 카테고리
- 네이버 검색 기준 매장명
- 네이버 카테고리
- 네이버 도로명 주소
- 전화번호가 있으면 전화번호
- 네이버 플레이스/검색 링크
- 데이터 불일치 안내

권장 UX:

- 마커 클릭 즉시 저장된 AI 분석 데이터를 먼저 표시한다.
- 네이버 Local metadata가 없으면 패널 안에서 "네이버 데이터 확인 중" 상태를 보여준다.
- 조회가 끝나면 패널 내용을 갱신한다.
- 네이버 데이터가 없으면 "네이버 검색 결과를 찾지 못했어요"로 표시하되, AI 분석 데이터는 유지한다.

## Data Model

### Database Migration

Create migration:

- `migrations/2026-05-27_places_naver_metadata.sql`

Add columns to `places`.

```sql
alter table places
  add column if not exists naver_place_title text,
  add column if not exists naver_place_url text,
  add column if not exists naver_category text,
  add column if not exists naver_description text,
  add column if not exists naver_telephone text,
  add column if not exists naver_address text,
  add column if not exists naver_road_address text,
  add column if not exists naver_mapx text,
  add column if not exists naver_mapy text,
  add column if not exists naver_match_status text,
  add column if not exists naver_enriched_at timestamptz;

create index if not exists idx_places_user_naver_enriched_at
  on places(user_id, naver_enriched_at);
```

Optional image fields, only if image phase is selected:

```sql
alter table places
  add column if not exists naver_image_url text,
  add column if not exists naver_image_source_url text,
  add column if not exists naver_image_checked_at timestamptz;
```

### SQLAlchemy Model

Modify `src/database.py`.

Add nullable columns to `Place`.

```python
naver_place_title = Column(Text, nullable=True)
naver_place_url = Column(Text, nullable=True)
naver_category = Column(Text, nullable=True)
naver_description = Column(Text, nullable=True)
naver_telephone = Column(Text, nullable=True)
naver_address = Column(Text, nullable=True)
naver_road_address = Column(Text, nullable=True)
naver_mapx = Column(Text, nullable=True)
naver_mapy = Column(Text, nullable=True)
naver_match_status = Column(String(32), nullable=True)
naver_enriched_at = Column(DateTime(timezone=True), nullable=True)
```

## Backend Design

### Environment Variables

Add separate variables for Naver Search API.

Do not reuse the Naver Maps client id unless it is intentionally the same application credential.

Required:

- `NAVER_SEARCH_CLIENT_ID`
- `NAVER_SEARCH_CLIENT_SECRET`

Existing map/geocoding variables remain separate:

- `NEXT_PUBLIC_NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

### Naver Local Search Service

Create:

- `src/naver_place_search.py`

Responsibilities:

- Build a search query from `place.name` and `place.address`.
- Call Naver Local Search API.
- Strip HTML tags from `title` and `category`.
- Select the best candidate.
- Return a normalized metadata object.
- Fail gracefully when keys are missing or API returns no result.

Recommended matching rules:

1. Normalize place name and candidate title.
2. Prefer candidate whose title contains the AI-extracted place name.
3. If address exists, prefer candidate whose road address or address contains district/neighborhood tokens.
4. If no confident match, return the first result with `naver_match_status = "low_confidence"`.
5. If no result, return `naver_match_status = "not_found"`.

Core implementation shape:

```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import html
import os
import re
from typing import Any

import requests


LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json"


@dataclass
class NaverPlaceMetadata:
    title: str | None
    url: str | None
    category: str | None
    description: str | None
    telephone: str | None
    address: str | None
    road_address: str | None
    mapx: str | None
    mapy: str | None
    match_status: str
    enriched_at: datetime


def _strip_tags(value: str | None) -> str | None:
    if not value:
        return None
    without_tags = re.sub(r"<[^>]+>", "", value)
    return html.unescape(without_tags).strip() or None


def _normalize(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^0-9a-zA-Z가-힣]", "", value).lower()


def search_naver_local_place(name: str, address: str | None = None) -> NaverPlaceMetadata:
    client_id = os.getenv("NAVER_SEARCH_CLIENT_ID")
    client_secret = os.getenv("NAVER_SEARCH_CLIENT_SECRET")
    if not client_id or not client_secret:
        return NaverPlaceMetadata(
            title=None,
            url=None,
            category=None,
            description=None,
            telephone=None,
            address=None,
            road_address=None,
            mapx=None,
            mapy=None,
            match_status="missing_credentials",
            enriched_at=datetime.now(timezone.utc),
        )

    query = " ".join(part for part in [name, address] if part).strip()
    response = requests.get(
        LOCAL_SEARCH_URL,
        params={"query": query, "display": 5, "sort": "random"},
        headers={
            "X-Naver-Client-Id": client_id,
            "X-Naver-Client-Secret": client_secret,
        },
        timeout=5,
    )
    response.raise_for_status()

    items: list[dict[str, Any]] = response.json().get("items", [])
    if not items:
        return NaverPlaceMetadata(
            title=None,
            url=None,
            category=None,
            description=None,
            telephone=None,
            address=None,
            road_address=None,
            mapx=None,
            mapy=None,
            match_status="not_found",
            enriched_at=datetime.now(timezone.utc),
        )

    normalized_name = _normalize(name)
    selected = items[0]
    status = "low_confidence"

    for item in items:
        title = _strip_tags(item.get("title"))
        if normalized_name and normalized_name in _normalize(title):
            selected = item
            status = "matched"
            break

    return NaverPlaceMetadata(
        title=_strip_tags(selected.get("title")),
        url=selected.get("link") or None,
        category=_strip_tags(selected.get("category")),
        description=_strip_tags(selected.get("description")),
        telephone=selected.get("telephone") or None,
        address=selected.get("address") or None,
        road_address=selected.get("roadAddress") or None,
        mapx=str(selected.get("mapx")) if selected.get("mapx") else None,
        mapy=str(selected.get("mapy")) if selected.get("mapy") else None,
        match_status=status,
        enriched_at=datetime.now(timezone.utc),
    )
```

### Backend Endpoint

Modify:

- `src/main.py`

Add endpoint:

- `POST /api/places/{place_id}/enrich`

Expected request:

```json
{
  "user_id": "google-oauth-user-id"
}
```

Expected response:

```json
{
  "id": 1,
  "name": "덮밥장사장",
  "address": "서울 ...",
  "summary": "...",
  "naver_place_title": "덮밥장사장 ...",
  "naver_place_url": "https://...",
  "naver_category": "음식점>일식",
  "naver_telephone": "02-...",
  "naver_road_address": "서울 ...",
  "naver_match_status": "matched",
  "naver_enriched_at": "2026-05-27T00:00:00Z"
}
```

Endpoint behavior:

1. Load place by `id`.
2. Check `place.user_id == request.user_id`.
3. If already enriched recently, return stored data unless forced.
4. Call `search_naver_local_place(place.name, place.address)`.
5. Save result to `places`.
6. Return `serialize_place(place)`.

Implementation shape:

```python
class PlaceEnrichRequest(BaseModel):
    user_id: str
    force: bool = False


@app.post("/api/places/{place_id}/enrich")
def enrich_place_api(place_id: int, payload: PlaceEnrichRequest, db: Session = Depends(get_db)):
    place = db.query(Place).filter(Place.id == place_id).first()
    if place is None or str(place.user_id) != payload.user_id:
        raise HTTPException(status_code=404, detail="Place not found")

    if place.naver_enriched_at and not payload.force:
        return serialize_place(place)

    metadata = search_naver_local_place(place.name, place.address)
    place.naver_place_title = metadata.title
    place.naver_place_url = metadata.url
    place.naver_category = metadata.category
    place.naver_description = metadata.description
    place.naver_telephone = metadata.telephone
    place.naver_address = metadata.address
    place.naver_road_address = metadata.road_address
    place.naver_mapx = metadata.mapx
    place.naver_mapy = metadata.mapy
    place.naver_match_status = metadata.match_status
    place.naver_enriched_at = metadata.enriched_at
    db.commit()
    db.refresh(place)
    return serialize_place(place)
```

### Serialization

Modify `serialize_place` in `src/main.py` to include:

```python
"naver_place_title": place.naver_place_title,
"naver_place_url": place.naver_place_url,
"naver_category": place.naver_category,
"naver_description": place.naver_description,
"naver_telephone": place.naver_telephone,
"naver_address": place.naver_address,
"naver_road_address": place.naver_road_address,
"naver_match_status": place.naver_match_status,
"naver_enriched_at": place.naver_enriched_at.isoformat() if place.naver_enriched_at else None,
```

## Frontend Design

### Next API Route

Create:

- `frontend/src/app/api/places/enrich/route.ts`

Purpose:

- Read the current NextAuth session.
- Require login.
- Forward request to backend with `user_id`.
- Hide backend API key from the browser.

Request:

```ts
await fetch("/api/places/enrich", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: place.id }),
});
```

Route shape:

```ts
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { id, force = false } = await request.json();
  if (!id) {
    return NextResponse.json({ detail: "Place id is required" }, { status: 400 });
  }

  const response = await fetch(apiUrl(`/api/places/${id}/enrich`), {
    method: "POST",
    headers: backendHeaders(),
    body: JSON.stringify({ user_id: userId, force }),
  });

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload, { status: response.status });
}
```

Use the existing helper patterns in `frontend/src/app/api/places/route.ts` rather than duplicating env handling if helper functions already exist there.

### Marker Style Helper

Create:

- `frontend/src/lib/map-marker-styles.ts`

Responsibilities:

- Return HTML marker content strings.
- Keep map marker visual design out of `Map.tsx`.
- Avoid new icon libraries.

Functions:

```ts
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
```

Add marker CSS to `frontend/src/app/globals.css` using existing Sple tokens.

```css
.sple-user-location-marker {
  position: relative;
  width: 28px;
  height: 28px;
}

.sple-user-location-marker__pulse {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.22);
  animation: sple-location-pulse 1.8s ease-out infinite;
}

.sple-user-location-marker__dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  border: 3px solid white;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.24);
  transform: translate(-50%, -50%);
}

.sple-place-marker {
  position: relative;
  width: 34px;
  height: 42px;
  transform: translateY(-8px);
}

.sple-place-marker__pin {
  position: absolute;
  left: 50%;
  top: 0;
  width: 28px;
  height: 28px;
  border: 3px solid white;
  border-radius: 50% 50% 50% 0;
  background: #f97316;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
  transform: translateX(-50%) rotate(-45deg);
}

.sple-place-marker__center {
  position: absolute;
  left: 50%;
  top: 8px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: white;
  transform: translateX(-50%);
}

.sple-place-marker--selected .sple-place-marker__pin {
  background: #ea580c;
  box-shadow: 0 10px 24px rgba(234, 88, 12, 0.38);
}

@keyframes sple-location-pulse {
  0% {
    opacity: 0.7;
    transform: scale(0.7);
  }
  100% {
    opacity: 0;
    transform: scale(1.7);
  }
}
```

### Map Type Extensions

Modify inline types in `frontend/src/components/Map.tsx`, or move them to:

- `frontend/src/lib/naver-map-types.ts`

Needed additions:

```ts
interface NaverPoint {
  x: number;
  y: number;
}

interface NaverInfoWindow {
  open(map: NaverMap, marker?: NaverMarker): void;
  close(): void;
  setContent(content: string): void;
}

interface NaverMapsApi {
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Point: new (x: number, y: number) => NaverPoint;
  Map: new (element: HTMLElement, options: NaverMapOptions) => NaverMap;
  Marker: new (options: {
    position: NaverLatLng;
    map?: NaverMap;
    title?: string;
    icon?: {
      content: string;
      anchor?: NaverPoint;
    };
    zIndex?: number;
  }) => NaverMarker;
  Event: {
    addListener(target: unknown, eventName: string, listener: () => void): unknown;
    removeListener(listener: unknown): void;
  };
}
```

If bottom sheet is selected instead of native InfoWindow, `NaverInfoWindow` is optional.

### Place Type

Extend `MapPlace` in `frontend/src/components/Map.tsx`.

```ts
interface MapPlace {
  id: number;
  name: string;
  address?: string | null;
  category?: string | null;
  summary?: string | null;
  rating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  geocoding_status?: string | null;
  naver_place_title?: string | null;
  naver_place_url?: string | null;
  naver_category?: string | null;
  naver_description?: string | null;
  naver_telephone?: string | null;
  naver_address?: string | null;
  naver_road_address?: string | null;
  naver_match_status?: string | null;
  naver_enriched_at?: string | null;
}
```

### Place Detail Sheet

Create:

- `frontend/src/components/PlaceDetailSheet.tsx`

Responsibilities:

- Render selected place details.
- Display AI data and Naver data separately.
- Show loading/error states for enrichment.
- Provide close button.
- Provide external link to Naver.

Props:

```ts
interface PlaceDetailSheetProps {
  place: MapPlace | null;
  isLoadingNaver: boolean;
  naverError: string | null;
  onClose: () => void;
}
```

UI content:

- Header: place name
- Small badge: AI 분석 / 네이버 확인됨 / 네이버 결과 없음
- Address
- AI summary
- Naver category and road address
- Phone button if exists
- Naver link button if exists

Use `lucide-react` icons for buttons only, for example:

- `X`
- `ExternalLink`
- `Phone`
- `MapPin`

### Map Interaction

Modify `frontend/src/components/Map.tsx`.

Add state:

```ts
const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
const [isLoadingNaver, setIsLoadingNaver] = useState(false);
const [naverError, setNaverError] = useState<string | null>(null);
```

Add enrichment function:

```ts
const enrichPlace = useCallback(async (place: MapPlace) => {
  if (place.naver_enriched_at || place.naver_match_status) {
    return place;
  }

  setIsLoadingNaver(true);
  setNaverError(null);

  try {
    const response = await fetch("/api/places/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: place.id }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.detail || "네이버 장소 정보를 불러오지 못했습니다.");
    }

    setPlaces((current) =>
      current.map((item) => (item.id === place.id ? { ...item, ...payload } : item)),
    );
    setSelectedPlace((current) =>
      current?.id === place.id ? { ...current, ...payload } : current,
    );

    return payload as MapPlace;
  } catch (error) {
    setNaverError(error instanceof Error ? error.message : "네이버 장소 정보를 불러오지 못했습니다.");
    return place;
  } finally {
    setIsLoadingNaver(false);
  }
}, []);
```

When creating place marker:

```ts
const marker = new maps.Marker({
  position,
  map,
  title: place.name,
  icon: {
    content: createPlaceMarkerHtml({ selected: selectedPlace?.id === place.id }),
    anchor: new maps.Point(17, 42),
  },
  zIndex: selectedPlace?.id === place.id ? 120 : 80,
});

maps.Event.addListener(marker, "click", () => {
  setSelectedPlace(place);
  void enrichPlace(place);
});
```

When creating current location marker:

```ts
userMarkerRef.current = new maps.Marker({
  position: new maps.LatLng(userLocation.latitude, userLocation.longitude),
  map,
  title: "현재 위치",
  icon: {
    content: createUserLocationMarkerHtml(),
    anchor: new maps.Point(14, 14),
  },
  zIndex: 100,
});
```

Important:

- Marker refs need listener cleanup if Naver listener handles are stored.
- If selected marker styling depends on `selectedPlace`, marker recreation currently happens inside the marker effect. Keep dependencies tight to avoid excessive redraws.

## Implementation Tasks

### Phase 1: Marker UX

- [ ] Add `frontend/src/lib/map-marker-styles.ts`.
- [ ] Add marker CSS to `frontend/src/app/globals.css`.
- [ ] Extend Naver map types in `Map.tsx` or create `frontend/src/lib/naver-map-types.ts`.
- [ ] Change current location marker to custom blue dot marker.
- [ ] Change saved place marker to custom orange pin marker.
- [ ] Add marker click handler.
- [ ] Add selected marker visual state.
- [ ] Verify current location and saved places are visually different on mobile viewport.

### Phase 2: Detail Panel

- [ ] Create `frontend/src/components/PlaceDetailSheet.tsx`.
- [ ] Extend `MapPlace` with AI summary/category/rating and Naver metadata fields.
- [ ] Show selected place details on marker click.
- [ ] Show AI summary and address immediately.
- [ ] Add close button and mobile-safe bottom spacing above bottom navigation.
- [ ] Add empty/failure states that distinguish "AI saved data exists" from "Naver metadata unavailable".

### Phase 3: Naver Local Metadata Backend

- [ ] Add migration `migrations/2026-05-27_places_naver_metadata.sql`.
- [ ] Add Naver metadata columns to `src/database.py`.
- [ ] Create `src/naver_place_search.py`.
- [ ] Add `PlaceEnrichRequest` to `src/main.py`.
- [ ] Add `POST /api/places/{place_id}/enrich`.
- [ ] Extend `serialize_place`.
- [ ] Ensure ownership check uses `user_id`.
- [ ] Add timeout and graceful error handling for Naver API failures.

### Phase 4: Frontend API Bridge

- [ ] Create `frontend/src/app/api/places/enrich/route.ts`.
- [ ] Reuse existing backend URL/API key helper pattern.
- [ ] Require authenticated session.
- [ ] Send backend `user_id` server-side.
- [ ] Return backend response shape directly to the client.

### Phase 5: Optional Image

- [ ] Decide whether to enable image search after Phase 1-4 are stable.
- [ ] If enabled, add `NAVER_IMAGE_SEARCH_CLIENT_ID` / `NAVER_IMAGE_SEARCH_CLIENT_SECRET` or reuse `NAVER_SEARCH_*` if the same Naver Search API app supports both.
- [ ] Add image fields to migration.
- [ ] Add image search helper using Naver Image Search API.
- [ ] Display image only when result is high-confidence enough.
- [ ] Add source link or attribution-friendly UI.

## Tests

### Backend Unit Tests

Create:

- `tests/test_naver_place_search.py`

Cases:

- [ ] Missing credentials returns `missing_credentials`.
- [ ] Empty API result returns `not_found`.
- [ ] HTML tags in `title` and `category` are stripped.
- [ ] Candidate whose normalized title contains place name is selected.
- [ ] API timeout or HTTP error is surfaced as controlled failure in endpoint.

Example:

```python
def test_search_naver_local_place_strips_html(monkeypatch):
    monkeypatch.setenv("NAVER_SEARCH_CLIENT_ID", "client")
    monkeypatch.setenv("NAVER_SEARCH_CLIENT_SECRET", "secret")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "items": [
                    {
                        "title": "<b>덮밥장사장</b>",
                        "link": "https://example.com",
                        "category": "음식점&gt;일식",
                        "description": "",
                        "telephone": "02-0000-0000",
                        "address": "서울 ...",
                        "roadAddress": "서울 ...",
                        "mapx": "1",
                        "mapy": "2",
                    }
                ]
            }

    monkeypatch.setattr("src.naver_place_search.requests.get", lambda *args, **kwargs: FakeResponse())

    result = search_naver_local_place("덮밥장사장", "서울")

    assert result.title == "덮밥장사장"
    assert result.category == "음식점>일식"
    assert result.match_status == "matched"
```

### Backend API Tests

Add to existing backend API tests:

- [ ] `POST /api/places/{id}/enrich` returns 404 for another user.
- [ ] It stores Naver metadata for owned place.
- [ ] It returns existing metadata when already enriched and `force=false`.
- [ ] It refreshes metadata when `force=true`.

### Frontend Tests

Create:

- `frontend/tests/map-marker-styles.test.mts`

Cases:

- [ ] User marker HTML includes user marker class.
- [ ] Place marker HTML includes place marker class.
- [ ] Selected place marker includes selected class.

Add component-level test if the repo already has React component test setup:

- [ ] `PlaceDetailSheet` renders AI summary.
- [ ] It renders Naver link when `naver_place_url` exists.
- [ ] It shows loading state while Naver metadata is being fetched.

### Playwright / Browser Verification

Manual verification after implementation:

- [ ] Open deployed or local app on mobile viewport.
- [ ] Log in.
- [ ] Save or use existing place with coordinates.
- [ ] Confirm current location marker is blue dot/pulse.
- [ ] Confirm saved place marker is orange pin.
- [ ] Tap a place marker.
- [ ] Confirm bottom sheet opens.
- [ ] Confirm AI summary appears immediately.
- [ ] Confirm Naver metadata loads or graceful unavailable message appears.
- [ ] Confirm bottom nav is not covered in an unusable way.
- [ ] Confirm list tab still shows saved places.
- [ ] Confirm map markers still appear after refresh.

## Deployment Checklist

### Supabase

- [ ] Run migration in Supabase SQL editor.
- [ ] Confirm `places` table has new nullable Naver metadata columns.
- [ ] RLS policies do not need to change if access remains through backend service API.

### AWS Backend

- [ ] Add `NAVER_SEARCH_CLIENT_ID`.
- [ ] Add `NAVER_SEARCH_CLIENT_SECRET`.
- [ ] Confirm backend health endpoint remains 200 after deploy.
- [ ] Confirm backend can reach `https://openapi.naver.com`.

### GitHub Actions

- [ ] Add backend env vars to GitHub Secrets if deployment writes them to AWS.
- [ ] Re-run deployment workflow.
- [ ] Confirm no Node.js action deprecation is blocking deployment. Existing Node 20 warning is not the main blocker unless action starts failing.

### Vercel Frontend

- [ ] No Naver Search secret is exposed to Vercel client.
- [ ] `BACKEND_API_URL` and `BACKEND_API_KEY` remain configured.
- [ ] Redeploy frontend after Next API route changes.

## Risks and Tradeoffs

### Naver Local Search Accuracy

AI가 추출한 장소명이 지점명 없이 넓게 잡히면 Local Search가 다른 지점을 반환할 수 있다.

Mitigation:

- Query with `name + address`.
- Display low-confidence state if exact match is uncertain.
- Keep AI-extracted address visible so the user can compare.

### Image Reliability

Image Search result may be unrelated, copyrighted, or unstable.

Mitigation:

- Do not include image in MVP.
- If included later, show small thumbnail only with source link.
- Cache only URL metadata, not downloaded image files.

### Marker Performance

Every selected marker state change may recreate markers.

Mitigation:

- Current place count is likely small enough for MVP.
- If collections grow, switch to marker instance update rather than full recreation.

### API Secret Confusion

Naver Maps NCP keys and Naver Search API keys are different products.

Mitigation:

- Use explicit env names: `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`.
- Document this in README or deployment notes.

## Recommended Execution Order

1. Implement marker differentiation first.
2. Implement bottom sheet with existing AI data only.
3. Add backend Naver Local enrichment.
4. Add frontend API bridge and lazy enrichment on marker click.
5. Verify with Playwright/browser on mobile viewport.
6. Decide separately whether image search is worth adding.

## Acceptance Criteria

- [ ] 현재 위치 마커와 저장 장소 마커가 첫눈에 구분된다.
- [ ] 장소 마커를 누르면 장소명과 주소가 표시된다.
- [ ] AI 분석 요약이 지도 상세 패널에 표시된다.
- [ ] 네이버 Local Search 데이터가 있으면 카테고리, 도로명 주소, 전화번호, 링크가 표시된다.
- [ ] 네이버 데이터 조회 실패가 저장 장소 표시 실패로 이어지지 않는다.
- [ ] 이미지가 없어도 핵심 기능이 완성된다.
- [ ] 모든 신규 secret은 서버 측에서만 사용된다.

## References

- Naver Maps JavaScript API marker customization: https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Marker.html
- Naver Maps JavaScript API info window: https://navermaps.github.io/maps.js.ncp/docs/tutorial-3-InfoWindow.html
- Naver Search API local: https://developers.naver.com/docs/serviceapi/search/local/local.md
- Naver Search API image: https://developers.naver.com/docs/serviceapi/search/image/image.md

