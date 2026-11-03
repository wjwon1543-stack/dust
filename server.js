// 로컬 테스트용 경량 개발 서버 (Vercel 서버리스 함수 및 정적 웹페이지 서빙)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 현재 디렉터리 경로 계산
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.local 파일이 존재하면 읽어서 환경변수에 등록
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

// MIME 타입 매핑 정의
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Vercel 서버리스 함수 모듈 동적 임포트
let dustHandler;
try {
  const dustModule = await import('./api/dust.js');
  dustHandler = dustModule.default;
} catch (e) {
  console.error('api/dust.js 로드 실패:', e);
}

// HTTP 서버 인스턴스 생성
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = parsedUrl.pathname;

  // /api/dust 엔드포인트 요청 처리 (Vercel 함수 실행)
  if (pathname === '/api/dust') {
    // Vercel 스타일 헬퍼 메서드 및 쿼리 객체 주입
    req.query = Object.fromEntries(parsedUrl.searchParams);
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };
    res.json = function(data) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(data));
      return this;
    };

    if (dustHandler) {
      return dustHandler(req, res);
    } else {
      res.status(500).json({ message: 'api/dust.js 핸들러를 찾을 수 없습니다.' });
      return;
    }
  }

  // 정적 파일 서빙 처리 (index.html, style.css, script.js 등)
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // 보안을 위한 상위 디렉터리 접근 방지
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  });
});

// 3000번 포트에서 서버 실행
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`[개발 서버 실행 성공]`);
  console.log(`웹 브라우저 접속 주소: http://localhost:${PORT}`);
  console.log(`API 테스트 주소: http://localhost:${PORT}/api/dust?sido=%EC%84%9C%EC%9A%B8`);
  console.log(`종료하려면 터미널에서 Ctrl + C 를 누르세요.`);
});

