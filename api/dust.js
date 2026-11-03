// Vercel 서버리스 함수: 공공데이터포털 에어코리아 대기오염정보 중계 엔드포인트
export default async function handler(req, res) {
  // 브라우저 교차 출처 리소스 공유(CORS) 허용 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 허용할 HTTP 메서드 설정
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  // 허용할 헤더 유형 설정
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 프리플라이트 요청 시 즉시 200 반환 후 종료
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 주소 쿼리로 sido(시도 이름)를 받고 없으면 기본값 '서울'로 지정
  const sido = req.query?.sido || '서울';

  // 환경변수 AIRKOREA_KEY 에서 공공데이터포털 인증키 읽기 (코드에 직접 작성 금지)
  const rawKey = process.env.AIRKOREA_KEY;

  // 환경변수에 인증키가 설정되어 있지 않은 경우 에러 반환
  if (!rawKey || !rawKey.trim()) {
    return res.status(500).json({
      message: '서버 환경변수에 AIRKOREA_KEY가 설정되어 있지 않습니다.'
    });
  }

  // 환경변수의 encoding 키를 주소에 붙일 때 encodeURIComponent로 감싸기
  const serviceKey = encodeURIComponent(rawKey.trim());

  // 에어코리아 시도별 실시간 측정정보 조회 API 주소
  const baseUrl = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';

  // API 호출에 필요한 쿼리 파라미터 조합 (returnType=json, numOfRows=100, pageNo=1, ver=1.3)
  const queryParams = new URLSearchParams({
    returnType: 'json',
    numOfRows: '100',
    pageNo: '1',
    sidoName: sido,
    ver: '1.3'
  });

  // 최종 요청 주소 생성 (인코딩된 키와 파라미터 연결)
  const requestUrl = `${baseUrl}?serviceKey=${serviceKey}&${queryParams.toString()}`;

  try {
    // 공공데이터포털 서버로 비동기 GET 요청 전송
    const response = await fetch(requestUrl);

    // 응답 텍스트를 우선 추출하여 XML 형태의 에러인지 검사
    const responseText = await response.text();

    // 응답이 JSON이 아니라 XML 에러로 온 경우 한국어 안내 메시지 반환
    if (responseText.trim().startsWith('<')) {
      return res.status(400).json({
        message: '인증키 또는 요청값을 확인해주세요.'
      });
    }

    // 텍스트를 JSON 객체로 파싱
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // JSON 파싱 실패 시 에러 반환
      return res.status(500).json({
        message: '인증키 또는 요청값을 확인해주세요.'
      });
    }

    // 응답 본문 안의 resultCode 확인 (정상 코드는 '00' 또는 '0')
    const resultCode = data?.response?.header?.resultCode;
    // 응답 결과 메시지 확인
    const resultMsg = data?.response?.header?.resultMsg;

    // resultCode가 성공이 아닐 때 한국어 메시지로 알림
    if (resultCode !== '00' && resultCode !== '0') {
      return res.status(400).json({
        message: `대기오염정보 조회 실패 [코드: ${resultCode || '알 수 없음'}]: ${resultMsg || '인증키 또는 요청값을 확인해주세요.'}`
      });
    }

    // 성공 시 클라이언트에게 JSON 데이터 그대로 응답
    return res.status(200).json(data);

  } catch (error) {
    // 네트워크 장애 등 예외 발생 시 에러 응답
    return res.status(500).json({
      message: `서버 내부 오류가 발생했습니다: ${error.message}`
    });
  }
}

