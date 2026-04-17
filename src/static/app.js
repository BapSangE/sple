document.addEventListener('DOMContentLoaded', () => {
    const mapContainer = document.getElementById('map');
    
    if (typeof kakao !== 'undefined' && kakao.maps) {
        const options = {
            center: new kakao.maps.LatLng(37.5665, 126.9780),
            level: 3
        };
        const map = new kakao.maps.Map(mapContainer, options);
    } else {
        console.error('Kakao Map API is not loaded.');
        mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #868E96; margin-top: 40vh;">카카오 지도 API 키가 필요합니다.</div>';
    }

    const bottomSheet = document.getElementById('bottom-sheet');
    const handleBar = document.querySelector('.handle-bar');
    let isExpanded = false;

    handleBar.addEventListener('click', () => {
        if (isExpanded) {
            bottomSheet.style.height = '20vh';
        } else {
            bottomSheet.style.height = '60vh';
        }
        isExpanded = !isExpanded;
    });

    const addBtn = document.getElementById('add-btn');
    const tooltip = document.getElementById('guide-tooltip');

    addBtn.addEventListener('click', () => {
        tooltip.style.display = 'none';
        const url = prompt('인스타그램 링크를 입력하세요:');
        if (url) {
            alert('[MVP 테스트] 입력된 URL: ' + url + '\\n추후 백엔드로 전송됩니다.');
        }
    });
});
