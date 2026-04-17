// Sple App - Client Side Logic

let map;
let markers = []; // 마커 객체들을 저장할 배열 [{id, overlay}]
let savedPlaces = []; // 추가된 장소 데이터를 저장할 배열
let ps; // 카카오 장소 검색 서비스 객체
let selectedPlace = null; // 현재 선택된 장소

// 1. 초기화 함수 (에러 방어적 구조)
function initMap() {
    try {
        const container = document.getElementById('map');
        if (!container) return;

        // 중심 좌표: 서울 시청
        const options = {
            center: new kakao.maps.LatLng(37.5665, 126.9780),
            level: 3
        };

        if (typeof kakao !== 'undefined' && kakao.maps) {
            map = new kakao.maps.Map(container, options);
            
            // 장소 검색 서비스 객체 초기화
            if (kakao.maps.services) {
                ps = new kakao.maps.services.Places();
            }
            console.log("카카오 맵 초기화 성공");
        } else {
            console.warn("kakao 객체가 존재하지 않습니다.");
        }
    } catch (e) {
        console.warn("지도 API 로드 실패 (무시하고 다른 UI 기능은 유지):", e);
    }

    // 페이지 로드 후 공유된 URL이 있는지 확인하여 자동 분석 시작
    checkSharedUrl();
}

// 2. 내비게이션 탭 전환 및 섹션 제어
function switchTab(tabId) {
    console.log(`Tab switched to: ${tabId}`);
    
    // 1) 하단 내비게이션 활성 상태 표시
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active-nav');
        const label = item.querySelector('.label-text');
        if (label && label.innerText.toLowerCase().replace(/\s/g, '') === tabId.toLowerCase().replace(/\s/g, '')) {
            item.classList.add('active-nav');
        }
    });

    // 2) 실제 화면 섹션 전환
    const sections = ['section-explore', 'section-saved', 'section-aiguide', 'section-profile'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === `section-${tabId.toLowerCase()}`) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });

    // 3) 탭별 특수 동작 (바텀 시트 등 제어)
    if (tabId === 'explore') {
        // 지도로 돌아왔을 때 바텀 시트 복구 또는 닫기
        const sheet = document.getElementById('bottom-sheet');
        if (sheet && sheet.classList.contains('sheet-expanded')) {
            toggleBottomSheet(true);
        }
    } else {
        // 탐색(지도) 외의 탭에서는 바텀 시트를 숨김
        toggleBottomSheet(false);
    }
}
window.switchTab = switchTab; // 글로벌 노출

// URL 파라미터 확인 및 자동 실행
function checkSharedUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');
    
    if (sharedUrl && sharedUrl.includes("instagram.com")) {
        console.log("공유된 URL 감지됨, 자동 분석 시작:", sharedUrl);
        toggleModal(true);
        const inputEl = document.getElementById('url-input');
        if (inputEl) inputEl.value = sharedUrl;
        setTimeout(() => {
            const submitBtn = document.getElementById('submit-url');
            if (submitBtn) submitBtn.click();
            // 분석 시작 후 주소창에서 url 파라미터 제거
            window.history.replaceState({}, document.title, "/");
        }, 500);
    }
}

// 바텀 시트 상태 토글 함수
function toggleBottomSheet(expand = null) {
    const sheet = document.getElementById('bottom-sheet');
    if (!sheet) return;

    if (expand === true) {
        sheet.classList.remove('sheet-collapsed');
        sheet.classList.add('sheet-expanded');
    } else if (expand === false) {
        sheet.classList.remove('sheet-expanded');
        sheet.classList.add('sheet-collapsed');
    } else {
        sheet.classList.toggle('sheet-collapsed');
        sheet.classList.toggle('sheet-expanded');
    }
}

// 모달 제어 함수
function toggleModal(show = true) {
    const modal = document.getElementById('add-place-modal');
    if (!modal) return;
    
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        const inputEl = document.getElementById('url-input');
        if (inputEl) inputEl.value = ''; // 입력창 초기화
    }
}

// 키워드로 장소 검색 및 마커 추가
function searchAndAddPlace(placeData) {
    if (!ps) {
        console.warn("장소 검색 서비스가 로드되지 않았습니다. (API 에러 등)");
        // 검색 API 없이도 장소를 저장할 수 있도록 처리
        const finalPlaceFallback = {
            id: Date.now(),
            name: placeData.name || "이름 없음",
            address: placeData.address || "주소 없음",
            lat: 37.5665, // 기본값 (서울 시청)
            lng: 126.9780, // 기본값
            category: placeData.description || "핫플",
            url: "#",
            description: placeData.description || ""
        };
        savedPlaces.push(finalPlaceFallback);
        showDetailView(finalPlaceFallback);
        updateSavedListView(); // Saved 탭 UI 업데이트
        return;
    }

    const searchQuery = placeData.address || placeData.name;
    console.log(`장소 검색 시작: ${searchQuery}`);
    
    // 키워드로 장소 검색
    ps.keywordSearch(searchQuery, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
            const place = data[0];
            const finalPlace = {
                id: Date.now(),
                name: placeData.name || place.place_name,
                address: place.road_address_name || place.address_name,
                lat: place.y,
                lng: place.x,
                category: place.category_group_name || "핫플",
                url: place.place_url,
                description: placeData.description || ""
            };
            
            console.log("검색 결과 확인:", finalPlace);
            addMarkerOnMap(finalPlace);
            savedPlaces.push(finalPlace);
            showDetailView(finalPlace); // 추가 시 즉시 상세 보기
            updateSavedListView(); // Saved 탭 UI 업데이트
        } else {
            console.warn("카카오 장소 검색 실패, AI 데이터 기반으로 마커 생성 시도");
            const geocoder = new kakao.maps.services.Geocoder();
            geocoder.addressSearch(placeData.address, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    const finalPlace = {
                        id: Date.now(),
                        name: placeData.name,
                        address: placeData.address,
                        lat: result[0].y,
                        lng: result[0].x,
                        category: "핫플",
                        url: "#",
                        description: placeData.description
                    };
                    addMarkerOnMap(finalPlace);
                    savedPlaces.push(finalPlace);
                    showDetailView(finalPlace);
                    updateSavedListView();
                } else {
                    alert("해당 장소의 위치를 지도에서 찾을 수 없습니다. 리스트에만 추가됩니다.");
                    const fallbackPlace = {
                        id: Date.now(),
                        name: placeData.name,
                        address: placeData.address,
                        lat: null,
                        lng: null,
                        category: "핫플",
                        url: "#",
                        description: placeData.description
                    };
                    savedPlaces.push(fallbackPlace);
                    showDetailView(fallbackPlace);
                    updateSavedListView();
                }
            });
        }
    });
}

// 지도에 마커 추가
function addMarkerOnMap(place) {
    if (!map || !place.lat || !place.lng) return;

    const position = new kakao.maps.LatLng(place.lat, place.lng);
    // 마커 클릭 시 상세 정보를 보여주기 위해 onclick 이벤트 삽입
    const content = `
        <div class="custom-marker group" onclick="window.showDetailViewByID(${place.id})">
            <div class="w-11 h-11 bg-white rounded-full shadow-2xl flex items-center justify-center border-none group-hover:scale-110 transition-transform">
                <div class="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <img src="/static/icons/app-icon-512.png" class="w-7 h-7 rounded-lg" alt="marker">
                </div>
            </div>
            <div class="marker-shadow"></div>
        </div>
    `;
    const customOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 1
    });
    customOverlay.setMap(map);
    markers.push({ id: place.id, overlay: customOverlay });
    
    map.setCenter(position);
    map.setLevel(3);
}

// ID로 장소 찾아 상세보기 (전역 스코프에 노출)
window.showDetailViewByID = function(id) {
    const place = savedPlaces.find(p => p.id === id);
    if (place) {
        // 지도가 숨겨져 있다면 보여줌
        switchTab('explore');
        showDetailView(place);
    }
};

// 상세 정보 뷰 렌더링 (바텀 시트)
function showDetailView(place) {
    selectedPlace = place;
    const contentArea = document.getElementById('sheet-body');
    if (!contentArea) return;

    // 카테고리 태그 단순화
    const shortCategory = (place.category || '').split('>').pop().trim();

    contentArea.innerHTML = `
        <div class="w-full">
            <button onclick="showListView()" class="flex items-center gap-2 text-on-surface-variant/40 mb-6 hover:text-primary transition-colors group">
                <span class="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                <span class="text-xs font-bold uppercase tracking-[0.2em] label-text">Return to List</span>
            </button>
            
            <div class="flex justify-between items-start w-full mb-4">
                <div class="max-w-[80%]">
                    <h2 class="text-4xl font-headline font-black tracking-tight text-on-surface leading-tight">${place.name}</h2>
                    <span class="inline-block mt-2 text-primary text-xs font-bold uppercase tracking-widest label-text">${shortCategory}</span>
                </div>
                <button class="w-12 h-12 flex items-center justify-center recessed-area hover:bg-primary/10 transition-colors group rounded-full">
                    <img src="/static/icons/nav-saved.png" class="w-8 h-8 opacity-40 group-hover:opacity-100 transition-all" alt="save">
                </button>
            </div>
            
            <div class="flex items-center gap-2 mb-6 text-on-surface-variant/60 font-medium label-text">
                <span class="material-symbols-outlined text-xl">location_on</span>
                <span class="text-sm">${place.address}</span>
            </div>
            
            ${place.description ? `
                <div class="recessed-area p-6 mb-8 rounded-[24px]">
                    <p class="text-on-surface text-[15px] leading-relaxed opacity-90 font-medium italic">"${place.description}"</p>
                </div>
            ` : ''}
            
            <div class="mt-4 w-full flex gap-4">
                <a href="${place.url}" target="_blank" class="flex-grow bg-primary text-white py-5 rounded-[24px] font-bold shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform text-lg shadow-primary/20">
                    <span class="material-symbols-outlined text-2xl">near_me</span>
                    길찾기 시작
                </a>
                <button class="w-16 h-16 bg-surface-container-highest text-on-surface rounded-[24px] flex items-center justify-center active:scale-95 transition-transform">
                    <span class="material-symbols-outlined text-2xl">share</span>
                </button>
            </div>
        </div>
    `;
    toggleBottomSheet(true);
}

// 바텀 시트의 리스트 뷰 렌더링 (전역 스코프 노출)
window.showListView = function() {
    selectedPlace = null;
    const contentArea = document.getElementById('sheet-body');
    if (!contentArea) return;

    if (savedPlaces.length === 0) {
        contentArea.innerHTML = `
            <h2 class="text-4xl font-headline font-black tracking-tight text-on-surface mb-5 leading-[1.1] max-w-xs">나만의 지도가<br/>숨을 쉽니다</h2>
            <p class="text-on-surface-variant font-body text-lg leading-relaxed max-w-sm opacity-80">
                파편화된 인스타그램 맛집 정보를<br/>
                하나의 유연한 지도로 연결해 보세요.
            </p>
        `;
        return;
    }

    let listHtml = `
        <div class="w-full">
            <h3 class="text-2xl font-headline font-black mb-6 flex items-baseline gap-2">
                Collected <span class="text-primary text-3xl">${savedPlaces.length}</span>
            </h3>
            <div class="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
    `;

    savedPlaces.forEach(place => {
        listHtml += `
            <div onclick="window.showDetailViewByID(${place.id})" class="flex items-center gap-5 p-5 bg-surface-container-lowest rounded-[24px] border border-slate-100 hover:border-primary/30 transition-all cursor-pointer group shadow-sm">
                <div class="w-14 h-14 rounded-full bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <span class="material-symbols-outlined">${place.category && place.category.includes('카페') ? 'local_cafe' : 'restaurant'}</span>
                </div>
                <div class="flex-grow min-w-0">
                    <h4 class="font-bold text-lg text-on-surface tracking-tight truncate">${place.name}</h4>
                    <p class="text-sm text-on-surface-variant opacity-60 truncate label-text">${place.address}</p>
                </div>
                <span class="material-symbols-outlined text-on-surface/20 group-hover:text-primary transition-colors">arrow_forward_ios</span>
            </div>
        `;
    });

    listHtml += `</div></div>`;
    contentArea.innerHTML = listHtml;
};

// Saved 섹션(두 번째 탭)의 장소 목록 업데이트
function updateSavedListView() {
    const listContainer = document.getElementById('saved-list');
    if (!listContainer) return;

    if (savedPlaces.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 opacity-30">
                <span class="material-symbols-outlined text-6xl mb-4">bookmark_border</span>
                <p class="font-bold">아직 저장된 장소가 없습니다.</p>
            </div>
        `;
        return;
    }

    let listHtml = '';
    savedPlaces.forEach(place => {
        listHtml += `
            <div onclick="window.showDetailViewByID(${place.id})" class="flex items-center gap-5 p-5 bg-white rounded-[24px] shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <div class="w-14 h-14 rounded-full bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <span class="material-symbols-outlined">${place.category && place.category.includes('카페') ? 'local_cafe' : 'restaurant'}</span>
                </div>
                <div class="flex-grow min-w-0">
                    <h4 class="font-bold text-lg text-on-surface tracking-tight truncate">${place.name}</h4>
                    <p class="text-sm text-on-surface-variant opacity-60 truncate label-text">${place.address}</p>
                </div>
                <span class="material-symbols-outlined text-on-surface/20 group-hover:text-primary transition-colors">arrow_forward_ios</span>
            </div>
        `;
    });
    listContainer.innerHTML = listHtml;
}

// DOM Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // 바텀 시트 토글 로직
    const handle = document.getElementById('sheet-handle');
    const sheetContent = document.getElementById('sheet-content'); // 헤더/핸들 영역
    
    const toggleHandler = () => {
        const sheet = document.getElementById('bottom-sheet');
        if (!sheet) return;
        if (sheet.classList.contains('sheet-collapsed')) {
            toggleBottomSheet(true);
            if (!selectedPlace) window.showListView();
        } else {
            toggleBottomSheet(false);
        }
    };

    if (handle) handle.addEventListener('click', toggleHandler);
    if (sheetContent) {
        // sheet-content 내 클릭 시(버튼이나 카드 제외) 토글
        sheetContent.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.surface-card') || e.target.closest('a')) return;
            // 리스트 안의 항목 클릭 시 바텀시트 안 닫히게 처리
            if (e.target.closest('[onclick]')) return;
            toggleHandler();
        });
    }

    // 모달 여닫기
    const addBtn = document.getElementById('add-btn');
    if (addBtn) addBtn.addEventListener('click', () => toggleModal(true));

    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => toggleModal(false));

    // URL 제출 및 AI 분석 요청
    const submitBtn = document.getElementById('submit-url');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const inputValue = document.getElementById('url-input').value;
            if (!inputValue || inputValue.trim().length < 5) {
                alert("본문 내용을 충분히 입력해 주세요.");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>AI 분석 중...</span>
                </div>
            `;

            try {
                const response = await fetch('/api/add-place', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: inputValue })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => null);
                    const errMsg = errData ? (errData.detail || errData.message) : response.statusText;
                    throw new Error(`서버 에러 (${response.status}): ${errMsg}`);
                }

                const result = await response.json();
                
                if (result.status === 'success') {
                    toggleModal(false);
                    const tooltip = document.getElementById('guide-tooltip');
                    if (tooltip) tooltip.style.display = 'none';
                    
                    searchAndAddPlace(result.data);
                } else {
                    alert(result.message || "장소 정보를 찾지 못했습니다.");
                }
            } catch (error) {
                console.error("추가 실패:", error);
                alert(`처리 실패: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <span class="material-symbols-outlined text-xl">auto_awesome</span>
                    <span class="font-bold">AI로 장소 분석하기</span>
                `;
            }
        });
    }
});

// 초기화
window.onload = initMap;
