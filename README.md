# Discord.js TypeScript 티켓 시스템 템플릿

이 리포지토리는 Discord.js(v14)와 TypeScript로 만든 **1:1 문의 티켓 시스템** 템플릿입니다. 고객 지원, 외주 문의 등의 용도로 사용할 수 있으며, JSON 파일 기반 상태 관리와 Discord.js 내장 로컬라이제이션을 사용합니다.

## 주요 기능
- TypeScript 기반 구조
- **티켓 시스템**: 카테고리별 1:1 문의 채널 생성
- **JSON 기반 상태 관리**: 데이터베이스 없이 `ticket_system.json` 파일로 관리
- **Discord.js 내장 로컬라이제이션**: 한국어/영어 지원
- **자동 로그 저장**: 티켓 종료 시 대화 내용을 텍스트 파일로 저장
- 명령어(commands)와 이벤트(events) 분리
- 슬래시 커맨드 배포 스크립트(`src/deploy-commands.ts`)
- 환경 변수(.env) 사용 (`dotenv`)

## 티켓 시스템 기능

### 1. 티켓 설정 (`/ticket-setup`)
관리자가 티켓 시스템을 설정하는 명령어입니다.

**필수 옵션:**
- `panel-channel`: 문의하기 드롭다운을 표시할 채널
- `staff-role`: 모든 티켓을 관리할 스태프 역할
- `category-parent`: 티켓 채널이 생성될 카테고리
- `log-channel`: 종료된 티켓 로그를 보낼 채널

**동작:**
1. 설정값을 `ticket_system.json`에 저장
2. 패널 채널에 한국어 임베드 메시지와 드롭다운 메뉴 전송
3. 드롭다운 옵션: 일반 문의, 서버 신고/제보, 이벤트/파트너십

### 2. 티켓 생성 (드롭다운 선택)
사용자가 드롭다운에서 카테고리를 선택하면:

1. **스팸 방지**: 이미 활성 티켓이 있는지 확인
2. **비공개 채널 생성**: 선택한 카테고리명으로 채널 생성
3. **권한 설정**:
   - `@everyone`: 채널 보기 불가
   - 티켓 생성자: 채널 보기/메시지 전송 가능
   - 스태프 역할: 채널 보기/메시지 전송 가능
   - 봇: 모든 권한
4. **환영 메시지**: 티켓 정보와 "문의 종료" 버튼 전송

### 3. 티켓 종료
**두 가지 방법:**
- `/ticket close` 명령어
- "문의 종료" 버튼 클릭

**동작:**
1. "5초 뒤 티켓이 종료됩니다..." 메시지 표시
2. 채널의 모든 대화 내역을 가져와 텍스트 파일로 변환
3. 로그 채널에 임베드와 함께 텍스트 파일 전송
4. 5초 대기 후 티켓 채널 삭제
5. `ticket_system.json`에서 티켓 상태를 `active: false`로 변경

## 요구사항
- Node.js 18 이상 권장
- npm

## 빠른 시작

1. 리포지토리 복제

```bash
git clone <your-repo-url>
cd template-djs-boilerplate
```

2. 의존성 설치

```bash
npm install
```

3. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 만들고 다음 값을 채우세요:

```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
```

4. 개발 모드로 실행

```bash
npm run dev
```

5. 빌드 및 시작 (프로덕션)

```bash
npm run build
npm start
```

> package.json에 정의된 스크립트:

- `dev` : `tsx watch src/index.ts` (개발 중 빠른 재시작)
- `build`: `tsc -p tsconfig.json` (TypeScript 컴파일)
- `start`: `npm run build && node dist/index.js` (빌드 후 실행)

## 환경 변수
`src/config.ts`에서 사용되는 환경 변수는 다음과 같습니다:

- `DISCORD_TOKEN` - 봇 토큰
- `DISCORD_CLIENT_ID` - 애플리케이션(클라이언트) ID

필수 변수들이 설정되어 있지 않으면 실행 시 에러가 발생합니다.

## 프로젝트 구조

```
src/
  config.ts                    # dotenv로 환경변수 로드 및 검증
  deploy-commands.ts           # 슬래시 커맨드 등록 스크립트
  index.ts                     # 엔트리 포인트 (인터랙션 핸들러 포함)
  scheduler.ts                 # 스케줄러 예시
  commands/                    # 커맨드 정의 폴더
    index.ts                   # 커맨드 로더
    ping.ts                    # 핑 명령어
    ticket-setup.ts            # 티켓 시스템 설정 명령어
    ticket.ts                  # 티켓 관리 명령어 (close)
  events/                      # 이벤트 핸들러
    messageCreate.ts           # 메시지 생성 이벤트
    ticketInteractions.ts      # 티켓 드롭다운 인터랙션 핸들러
  utils/                       # 유틸리티
    ticketSystem.ts            # 티켓 시스템 데이터 관리자
ticket_system.json             # 티켓 시스템 데이터 파일 (자동 생성)
```

새 커맨드나 이벤트를 추가할 때는 기존 구조를 참고해 `commands`/`events`에 파일을 추가하면 됩니다.

## 슬래시 커맨드 배포

개발 시 TypeScript 파일을 직접 실행하려면 `tsx`를 사용합니다:

```bash
npx tsx src/deploy-commands.ts
```

프로덕션 환경에서는 먼저 빌드한 뒤 dist 파일을 실행하세요:

```bash
npm run build
node dist/deploy-commands.js
```

> 배포 스크립트는 Discord 애플리케이션에 커맨드를 등록합니다. GUILD 단위 배포/전역 배포 등 스크립트 내용을 확인해 필요에 맞게 조정하세요.

## 명령어·이벤트 추가 가이드

1. `src/commands` 폴더에 새 커맨드 파일을 추가합니다. 기존 `ping.ts` 또는 `ticket-setup.ts`를 참고하세요.
2. `src/commands/index.ts`에서 새 커맨드를 내보내도록 추가합니다.

## 티켓 시스템 사용 가이드

### 초기 설정
1. 봇을 Discord 서버에 초대합니다.
2. 다음 권한이 필요합니다:
   - 채널 관리 (Manage Channels)
   - 역할 관리 (Manage Roles)
   - 메시지 전송 (Send Messages)
   - 임베드 링크 (Embed Links)
   - 파일 첨부 (Attach Files)
3. `/ticket-setup` 명령어로 티켓 시스템을 설정합니다.

### 사용자 흐름
1. 사용자가 패널 채널에서 드롭다운 메뉴를 클릭
2. 문의 카테고리 선택 (일반 문의 / 서버 신고·제보 / 이벤트·파트너십)
3. 자동으로 비공개 티켓 채널 생성
4. 사용자와 스태프가 해당 채널에서 대화
5. 문의 완료 시 `/ticket close` 또는 버튼으로 티켓 종료
6. 대화 내역이 로그 채널에 자동 저장

### 데이터 관리
- 모든 티켓 데이터는 `ticket_system.json` 파일에 저장됩니다.
- 서버별로 독립적인 설정과 활성 티켓 목록을 관리합니다.
- 데이터베이스가 필요하지 않아 설정이 간단합니다.

## 출처(Attribution)

이 템플릿을 기반으로 한 프로젝트는 원저작자 표기(출처)를 남기면 됩니다. 예시 문구:

```
This project is based on dishostkr/template-djs-boilerplate (https://github.com/dishostkr/template-djs-boilerplate)
```

또는 한글 문구로:

```
이 프로젝트는 dishostkr/template-djs-boilerplate를 기반으로 합니다 (https://github.com/dishostkr/template-djs-boilerplate)
```

출처 표기를 하려면 README, 프로젝트 홈페이지, 혹은 배포 패키지의 적절한 위치에 위 문구를 포함시키면 됩니다.

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 리포지토리 루트의 `LICENSE` 파일을 확인하세요.

요약: 이 템플릿을 사용한 프로젝트는 원저작자 표기(출처)를 남기면 됩니다(MIT의 저작권 고지 유지).
