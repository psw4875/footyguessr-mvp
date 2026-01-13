# ⚽ FootyGuessr

> 실시간 축구 경기 추측 게임 (GeoGuessr에서 영감을 받음)  
> **서비스:** [footyguessr.io](https://footyguessr.io) | **English:** [README.md](README.md)

---

## 🎯 프로젝트 소개

**FootyGuessr**는 한 장의 이미지를 보고 명장면 축구 경기를 맞추는 웹 게임입니다. 비전공자(경영학과)가 기획부터 배포까지 독립적으로 완성한 프로젝트로, 제품 개발의 전 과정을 경험하고 실사용자가 있는 서비스를 운영하고 있습니다.

**왜 만들었나요:**
- 축구에 대한 열정 + 인터랙티브 웹 게임에 대한 관심
- 아이디어부터 실제 서비스까지 혼자 구현할 수 있음을 증명하고 싶었습니다
- 현대적인 웹 개발을 배우면서 실제 UX 문제를 해결하고자 했습니다: 축구 퀴즈를 몰입감 있고 경쟁적인 경험으로 만들기

---

## ✨ 주요 기능

### 🎮 세 가지 게임 모드
- **60초 러시** — 적응형 난이도를 가진 싱글 타임어택 모드
- **데일리 챌린지** — 매일 고정된 문제로 글로벌 순위 경쟁
- **1v1 실시간 대전** — WebSocket 기반 실시간 매칭 멀티플레이

### 🏗️ 기술적 구현 포인트
- **Socket.IO**를 통한 실시간 양방향 통신
- PvP 게임플레이를 위한 확장 가능한 룸 기반 아키텍처
- **Chakra UI** 기반 반응형 UI, 모바일 최적화
- **Google Analytics 4** 연동으로 사용자 행동 분석
- 공유 최적화를 위한 동적 메타 태그 및 SEO 최적화

### 📊 제품 기획 관점
- 3주 만에 MVP를 구축하고 사용자 피드백 기반으로 반복 개선
- 공정한 점수 시스템 설계: 팀 정답 +5점, 스코어 정확 시 +10점
- 경쟁 모드에서 악용 방지를 위한 연결 끊김 처리 로직 구현
- 클럽 및 국가대표 경기를 포함한 100개 이상의 고품질 경기 이미지 큐레이션

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | Next.js, React, Chakra UI |
| **백엔드** | Node.js, Express, Socket.IO |
| **배포** | Vercel (프론트엔드), Google Cloud Run (백엔드) |
| **분석** | Google Analytics 4 |
| **데이터** | CSV 기반 문제 은행 (서버 시작 시 정규화) |

---

## 🚀 로컬 실행 방법

### 사전 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 레포지토리 클론
git clone https://github.com/yourusername/footyguessr-mvp.git
cd footyguessr-mvp

# 백엔드 의존성 설치
cd server
npm install

# 프론트엔드 의존성 설치
cd ../web
npm install
```

### 로컬 실행

**터미널 1 — 백엔드:**
```bash
cd server
npm start
# 서버가 http://localhost:3001 에서 실행됩니다
```

**터미널 2 — 프론트엔드:**
```bash
cd web
npm run dev
# 앱이 http://localhost:3000 에서 실행됩니다
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

---

## 📁 프로젝트 구조

```
footyguessr-mvp/
├── server/              # 백엔드 (Express + Socket.IO)
│   ├── index.js         # 메인 서버 로직
│   ├── lib/
│   │   └── roomStore.js # 인메모리 룸 관리
│   └── data/
│       └── questions.csv
├── web/                 # 프론트엔드 (Next.js)
│   ├── pages/           # 라우트
│   ├── components/      # React 컴포넌트
│   ├── engine/          # 게임 로직 (점수 계산, 적응형 난이도)
│   └── lib/
│       └── socket.js    # Socket.IO 클라이언트 싱글톤
└── tools/               # 빌드 스크립트 및 유틸리티
```

---

## 🎓 배운 점

**컴퓨터공학 전공 없이 경영학을 전공한 개발자**로서 이 프로젝트를 통해 배운 것들:

- **풀스택 개발**: 프론트엔드/백엔드 시스템 구축 및 연결
- **실시간 시스템**: WebSocket 아키텍처, 상태 관리, 동기화 문제 해결
- **제품 관리**: 기능 우선순위 설정, 엣지 케이스 처리, 피드백 기반 개선
- **배포 및 DevOps**: CI/CD 파이프라인, 환경 변수, 프로덕션 디버깅
- **사용자 중심 설계**: 경쟁의 공정성과 UX 명확성 사이의 균형 찾기

---

## 📈 현재 상태

- ✅ [footyguessr.io](https://footyguessr.io)에서 라이브 서비스 중
- ✅ 100개 이상의 큐레이션된 경기 문제
- ✅ 모바일 반응형 디자인
- ✅ 사용자 행동 인사이트를 위한 분석 추적
- 🔄 사용자 피드백 기반 지속적 개선 중

---

## 📝 라이선스

Proprietary. All rights reserved.

---

## 👤 만든 사람

⚽과 코드에 대한 열정으로 만든 비전공자 개발자의 프로젝트  
**포트폴리오 프로젝트** — 제품 사고, 기술적 실행력, 그리고 end-to-end 오너십을 보여줍니다.