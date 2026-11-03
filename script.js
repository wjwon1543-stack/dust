// Vercel 서버리스 함수 엔드포인트 상대 경로
const API_URL = '/api/dust';

// 시도 선택 드롭다운 요소 가져오기
const sidoSelect = document.getElementById('sidoSelect');

// 상단 대형 신호등 카드 요소 가져오기
const trafficLightCard = document.getElementById('trafficLightCard');

// 선택된 지역명을 표시할 텍스트 요소 가져오기
const selectedRegionName = document.getElementById('selectedRegionName');

// 신호등 대형 이모지 요소 가져오기 (🔵🟢🟠🔴)
const trafficEmoji = document.getElementById('trafficEmoji');

// 신호등 대형 상태 텍스트 요소 가져오기 (좋음/보통/나쁨/매우나쁨)
const trafficStatus = document.getElementById('trafficStatus');

// 평균 미세먼지 대형 수치 표시 요소 가져오기
const avgPm10Value = document.getElementById('avgPm10Value');

// 한 줄 안내 문구 요소 가져오기 (나쁨 이상 시 마스크 권고)
const actionTip = document.getElementById('actionTip');

// 최신 측정 시각 한국어 표시 요소 가져오기
const trafficTime = document.getElementById('trafficTime');

// 측정소 기준 정보 요약 텍스트 요소 가져오기
const trafficCount = document.getElementById('trafficCount');

// 로딩 및 에러 상태 메시지 박스 요소 가져오기
const statusMessage = document.getElementById('statusMessage');

// 측정소 카드들이 나열될 그리드 컨테이너 요소 가져오기
const stationGrid = document.getElementById('stationGrid');

// 미세먼지 수치가 정상적인 숫자인지 검사하는 함수 ("-" 또는 빈 값 제외)
function isValidDustNumber(value) {
  // 값이 null 또는 undefined 이거나 공백 또는 '-' 인 경우 제외
  if (!value || String(value).trim() === '' || String(value).trim() === '-') {
    return false;
  }
  // 숫자로 변환 가능한지 검사
  return !isNaN(Number(value));
}

// 화면에 보여줄 미세먼지/초미세먼지 텍스트 가공 함수
function formatDustDisplay(value) {
  // 수치가 유효하지 않은 경우 '측정 안 됨' 표시
  if (!isValidDustNumber(value)) {
    return '측정 안 됨';
  }
  // 정상 수치인 경우 단위(㎍/㎥)와 함께 반환
  return `${value} ㎍/㎥`;
}

// 측정 시각을 '2026년 10월 28일 16시 기준'처럼 한국어로 변환하는 함수
function formatKoreanDateTime(dataTimeString) {
  // 시간 데이터가 없거나 문자열이 아닌 경우 기본 안내 반환
  if (!dataTimeString || typeof dataTimeString !== 'string') {
    return '시간 정보 없음';
  }

  // YYYY-MM-DD HH:mm 형식 정규식 매칭
  const match = dataTimeString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (match) {
    const [, year, month, day, hour] = match;
    // 01월 -> 1월, 09시 -> 9시 형태로 10진수 변환
    return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일 ${parseInt(hour, 10)}시 기준`;
  }

  // 매칭되지 않을 경우 원본 뒤에 '기준' 추가
  return `${dataTimeString} 기준`;
}

// 개별 측정소 등급(pm10Grade)에 따른 이모지, 텍스트, 은은한 테두리/배경 클래스 반환
function getStationGradeInfo(grade) {
  // 문자열 정규화
  const cleanGrade = grade ? String(grade).trim() : '';

  // 1~4등급 분기
  switch (cleanGrade) {
    // 1등급: 파랑 (좋음)
    case '1':
      return { emoji: '🔵', label: '좋음', className: 'grade-good' };
    // 2등급: 초록 (보통)
    case '2':
      return { emoji: '🟢', label: '보통', className: 'grade-normal' };
    // 3등급: 주황 (나쁨)
    case '3':
      return { emoji: '🟠', label: '나쁨', className: 'grade-bad' };
    // 4등급: 빨강 (매우나쁨)
    case '4':
      return { emoji: '🔴', label: '매우나쁨', className: 'grade-very-bad' };
    // 등급 값이 비어있거나 기타 값인 경우: 회색 처리
    default:
      return { emoji: '⚪', label: '정보 없음', className: 'grade-unknown' };
  }
}

// 지역 평균 미세먼지 수치를 바탕으로 상단 '공기 신호등' 대표 상태 결정
function getTrafficLightState(average) {
  // 평균값이 유효하지 않은 경우
  if (average === null || isNaN(average)) {
    return {
      emoji: '⚪',
      status: '측정 안 됨',
      className: 'grade-unknown',
      tip: '현재 유효한 대기오염 측정 데이터가 없습니다.'
    };
  }

  // 0 ~ 30: 좋음 (🔵)
  if (average <= 30) {
    return {
      emoji: '🔵',
      status: '좋음',
      className: 'grade-good',
      tip: '공기가 쾌적해요! 환기하기 좋은 날입니다.'
    };
  }
  // 31 ~ 80: 보통 (🟢)
  if (average <= 80) {
    return {
      emoji: '🟢',
      status: '보통',
      className: 'grade-normal',
      tip: '무난한 공기질이에요. 일상적인 야외활동이 가능해요.'
    };
  }
  // 81 ~ 150: 나쁨 (🟠) -> 마스크 착용 권고
  if (average <= 150) {
    return {
      emoji: '🟠',
      status: '나쁨',
      className: 'grade-bad',
      tip: '외출 시 마스크를 챙기세요!'
    };
  }
  // 151 이상: 매우나쁨 (🔴) -> 마스크 착용 필수
  return {
    emoji: '🔴',
    status: '매우나쁨',
    className: 'grade-very-bad',
    tip: '외출 시 마스크를 챙기세요! (무리한 야외활동 자제)'
  };
}

// 선택된 시도의 실시간 대기오염 정보를 서버리스 API에 요청하는 함수
async function fetchAirQualityData(sidoName) {
  // 데이터를 불러오는 동안 상단 신호등을 로딩 상태로 변경
  trafficLightCard.className = 'traffic-light-card grade-loading';
  trafficEmoji.textContent = '⏳';
  trafficStatus.textContent = '불러오는 중...';
  avgPm10Value.textContent = '-';
  actionTip.textContent = '최신 대기오염 정보를 불러오는 중입니다...';
  trafficTime.textContent = '-';
  trafficCount.textContent = '측정소 집계 중';

  // 로딩 상태 메시지 박스 표시 ('불러오는 중...')
  statusMessage.style.display = 'block';
  statusMessage.textContent = '불러오는 중...';
  stationGrid.innerHTML = '';

  // Vercel 서버리스 함수 주소 생성 (/api/dust?sido=시도이름)
  const requestUrl = `${API_URL}?sido=${encodeURIComponent(sidoName)}`;

  try {
    // 서버리스 API로 GET 요청 전송
    const response = await fetch(requestUrl);

    // 응답 JSON 파싱
    const data = await response.json();

    // 서버 응답 상태 코드가 정상이 아닐 경우 에러 처리
    if (!response.ok) {
      throw new Error(data.message || `요청 실패 (HTTP ${response.status})`);
    }

    // API 응답 본문에서 측정소 목록(items) 추출
    const items = data?.response?.body?.items || [];

    // 받아온 데이터가 없거나 비어있는 경우
    if (!items || items.length === 0) {
      statusMessage.style.display = 'block';
      statusMessage.textContent = `${sidoName} 지역에 조회된 측정소 데이터가 없습니다.`;
      updateTrafficLight(null, 0, 0, null);
      return;
    }

    // 데이터 로딩 성공 시 상태 메시지 박스 숨김
    statusMessage.style.display = 'none';

    // 평균 수치 계산 및 상단 대형 '공기 신호등' 업데이트
    updateTrafficLightFromItems(items);

    // 각 측정소별 은은한 배경과 테두리의 카드 목록 렌더링
    renderStationCards(items);

  } catch (error) {
    // 오류 발생 시 콘솔 로그 및 사용자 에러 안내 표시
    console.error('대기오염 데이터 조회 오류:', error);
    statusMessage.style.display = 'block';
    statusMessage.textContent = `데이터를 불러오지 못했습니다: ${error.message}`;
    trafficLightCard.className = 'traffic-light-card grade-unknown';
    trafficEmoji.textContent = '⚠️';
    trafficStatus.textContent = '오류 발생';
    avgPm10Value.textContent = '-';
    actionTip.textContent = '데이터를 불러오는 중 오류가 발생했습니다.';
  }
}

// 전체 측정소 데이터를 분석하여 상단 대형 '공기 신호등' 갱신
function updateTrafficLightFromItems(items) {
  let sumPm10 = 0;
  let validCount = 0;
  let latestDataTime = null;

  // 전체 측정소 순회
  items.forEach((item) => {
    // 최신 측정 시각 저장
    if (!latestDataTime && item.dataTime) {
      latestDataTime = item.dataTime;
    }
    // "-" 제외 유효한 미세먼지 수치만 합산
    if (isValidDustNumber(item.pm10Value)) {
      sumPm10 += Number(item.pm10Value);
      validCount += 1;
    }
  });

  // 유효 측정소가 있을 경우 평균 계산
  const average = validCount > 0 ? Math.round(sumPm10 / validCount) : null;

  // 상단 공기 신호등 UI 반영
  updateTrafficLight(average, items.length, validCount, latestDataTime);
}

// 상단 대형 공기 신호등 화면 업데이트 로직
function updateTrafficLight(average, totalCount, validCount, latestDataTime) {
  // 신호등 상태 정보 결정
  const lightState = getTrafficLightState(average);

  // 카드 테마 클래스 교체 (grade-good, grade-normal, grade-bad, grade-very-bad)
  trafficLightCard.className = `traffic-light-card ${lightState.className}`;

  // 신호등 이모지 표시 (🔵🟢🟠🔴)
  trafficEmoji.textContent = lightState.emoji;

  // 대표 상태 텍스트 표시 (좋음 / 보통 / 나쁨 / 매우나쁨)
  trafficStatus.textContent = lightState.status;

  // 평균 미세먼지 대형 수치 표시
  avgPm10Value.textContent = average !== null ? average : '측정 안 됨';

  // 한 줄 안내 문구 (나쁨 이상이면 '외출 시 마스크를 챙기세요')
  actionTip.textContent = lightState.tip;

  // 한국어 측정 시각 표시 ('2026년 10월 28일 16시 기준')
  trafficTime.textContent = formatKoreanDateTime(latestDataTime);

  // 측정소 기준 정보 요약 표시
  trafficCount.textContent = `총 ${totalCount}개 측정소 중 ${validCount}개소 기준`;
}

// 각 측정소 카드 렌더링 함수 (테두리와 배경에 은은한 등급 색 반영)
function renderStationCards(items) {
  // 기존 카드 목록 초기화
  stationGrid.innerHTML = '';

  // 각 측정소 데이터를 순회하며 카드 생성
  items.forEach((item) => {
    // 측정소명
    const stationName = item.stationName || '알 수 없음';
    // 미세먼지 수치 ("-" 는 '측정 안 됨')
    const pm10Display = formatDustDisplay(item.pm10Value);
    // 초미세먼지 수치 ("-" 는 '측정 안 됨')
    const pm25Display = formatDustDisplay(item.pm25Value);
    // 한국어 변환 측정 시각
    const timeDisplay = formatKoreanDateTime(item.dataTime);
    // 등급 정보 및 은은한 테마 스타일 클래스
    const gradeInfo = getStationGradeInfo(item.pm10Grade);

    // 카드 article 요소 생성
    const card = document.createElement('article');
    // 등급별 은은한 배경과 테두리를 반영하는 클래스 추가
    card.className = `station-card ${gradeInfo.className}`;

    // 카드 내부 마크업 구성
    card.innerHTML = `
      <div class="card-header">
        <h3 class="station-name">${stationName}</h3>
        <span class="grade-badge">${gradeInfo.emoji} ${gradeInfo.label}</span>
      </div>
      <div class="card-body">
        <div class="data-row">
          <span class="data-label">미세먼지 (PM10)</span>
          <span class="data-value">${pm10Display}</span>
        </div>
        <div class="data-row">
          <span class="data-label">초미세먼지 (PM2.5)</span>
          <span class="data-value">${pm25Display}</span>
        </div>
      </div>
      <footer class="card-footer">
        <time>${timeDisplay}</time>
      </footer>
    `;

    // 그리드에 카드 추가
    stationGrid.appendChild(card);
  });
}

// 시도 선택 드롭다운 변경 시 이벤트
sidoSelect.addEventListener('change', (event) => {
  const selectedSido = event.target.value;
  // 선택된 지역명 갱신
  selectedRegionName.textContent = selectedSido;
  // 새 지역 데이터 요청
  fetchAirQualityData(selectedSido);
});

// 페이지 첫 로드 시 기본 시도(서울) 자동 요청
window.addEventListener('DOMContentLoaded', () => {
  fetchAirQualityData(sidoSelect.value);
});
