# Lab 3 · 강사 주도 수업

Lab 1·2는 혼자 하는 정적 실습입니다. Lab 3은 **GitHub Pages 프런트엔드 + Azure Functions HTTP API + Azure Table Storage**를 사용합니다. 강사와 수강생이 서로 다른 PC·브라우저에서도 같은 수업 상태를 봅니다. 프런트엔드만 열거나 `file://`로 열어서는 수업 기능이 작동하지 않습니다.

`config.js`는 확인된 Function host `https://func-handson-lab3-0ed6.azurewebsites.net`에 연결하도록 설정되어 있습니다. API 코드가 배포되기 전이나 저장소에 접근할 수 없으면 연결 오류를 표시합니다. 이 설정 자체가 배포 완료를 뜻하지 않습니다.

새 환경에서 `apiBase`를 비워 두면 **수업 서버 미설정** 안내와 비활성화된 입장 화면을 표시합니다. 가짜 수업이나 브라우저끼리만 공유하는 대체 저장소를 만들지 않습니다.

## 수업 사용법

1. 강사는 **새 수업 만들기**에 서버 운영자가 발급한 수업 생성 비밀을 입력합니다. Azure 운영자는 Portal → 해당 Function App → 설정 → 환경 변수의 `LAB3_ADMIN_KEY` 값을 확인해 입력할 수 있습니다. 생성 후에는 해당 수업 전용 강사 복구 키로 접근합니다. 생성 비밀은 브라우저에 저장하지 않습니다.
2. 수업의 12자리 코드를 공유합니다. 수강생은 코드와 닉네임으로 입장합니다. 처음에는 모든 구간이 닫혀 있습니다.
3. 강사가 **3-1 입장 열기**를 누릅니다. 수강생이 **실습 시작 · 3-1 입장**을 누르면 실습이 시작됩니다.
4. 구간 안의 활동을 순서대로 완료하면 **완료 · 강사 개방 대기**가 됩니다. 강사는 현재 단계, 활동 완료 수, 구간별 완료 인원을 확인합니다. 접속하거나 화면을 열기만 한 것은 완료가 아닙니다.
5. 강사가 **3-2 입장 열기**를 누르면 3-1을 완료한 사람에게만 다음 구간 버튼이 나타납니다. 자동 이동이나 전원 완료 시 자동 개방은 없습니다.

| 구간 | 재사용하는 Lab 2 콘텐츠 |
|---|---|
| 3-1 | 소개, 에이전트 만들기, 이름, 지침과 체크포인트 |
| 3-2 | 공개 웹 사이트, URL, 문서 파일 지식 |
| 3-3 | 설정, 인사말 |
| 3-4 | 미리 보기, 질문 2개, 추론·인용·크레딧 확인 |
| 3-5 | 범위 제한 편집, 실제 결과 비교, 체크포인트 |
| 3-6 | 서술 정리, 마무리 퀴즈, 결과 확인 |

**입장 닫기**는 해당 구간의 신규 입장만 막습니다. 이미 입장한 사람의 실습을 중단하거나 기록을 취소하지 않습니다. 늦은 수강생에게는 필요한 이전 구간을 다시 열어 주세요. 입장한 구간은 다시 볼 수 있으며 복습은 서버 진도를 되돌리지 않습니다. 수업당 최대 200명입니다.

## 새로고침·기기 변경·연결 끊김

- 닉네임은 표시 이름일 뿐 인증 정보가 아닙니다. 같은 닉네임으로 새로 입장하면 다른 참가자가 됩니다. 개인별 난수 자격 증명을 API 주소별 `localStorage`에 저장하여 같은 브라우저의 새로고침을 복구합니다.
- **내 복구 정보**의 수업 코드와 개인 복구 키로 다른 기기에서 같은 기록을 복구합니다. 강사 키는 수업 제어 권한을 가집니다. URL이나 QR에 키를 넣지 않으며 공유하지 마세요. 공용 PC에서는 수업 후 **이 브라우저에서 나가기**를 누르세요. 서버 기록은 남습니다.
- API에 확인된 활동만 진행합니다. 저장 중 연결이 끊기면 실습 입력을 잠그고 **완료 저장 대기**를 표시합니다. 재연결 또는 **다시 연결**로 같은 완료 요청을 재시도합니다. 응답만 유실된 경우에도 활동을 두 번 완료하지 않습니다.
- 새로고침하면 마지막 서버 체크포인트에서 복구합니다. 연결이 끊긴 동안 완료했다고 가정하거나 다음 구간을 열지 않습니다. 개방 변경 실패 시 성공 표시를 하지 않고 최신 서버 상태를 다시 확인합니다.
- 퀴즈 선택·서술 답안·힌트 사용·시청 기록을 API에 보내지 않습니다. 답안은 실습 프레임 메모리에만 있어 새로고침하면 이미 완료한 예측의 비교 문구가 없거나 현재 답안을 다시 입력해야 할 수 있습니다. 영상 시청 기록은 재사용 콘텐츠의 브라우저 로컬 기록입니다. 영상 매번 보기는 Lab 3에서 기본 ON이고 설정은 `lab3.force`에 보관합니다. 강제 시청 중 로드 실패는 건너뛰거나 완료로 처리하지 않습니다.

## 구현과 데이터

- `index.html`, `app.js`, `style.css`, `config.js`: 정적 Pages 화면, 역할별 화면, 2초 HTTP polling.
- `shared/curriculum.js`: 사람이 부르는 3-1~3-6 경계와 활동 순서. 원본 Lab 2에 없는 단계나 순서 변경은 즉시 오류를 냅니다.
- `activity.js`: Lab 2 활동 엔진 어댑터. 같은 origin에서 `../lab2/index.html`을 읽어 base URL을 지정한 프레임 문서로 구성하고, 해당 구간의 원본 데이터만 공급합니다. 원본 파일·스크린샷·동영상은 복제하거나 수정하지 않습니다. 원본 전역 함수 `goStep`, `completeAction`, `guideAction`, `renderClip`과 DOM 계약을 사용하므로 Lab 2 엔진 변경 시 브라우저 테스트를 함께 실행하세요.
- `backend/`: Functions v4 Node HTTP 앱. **Node 24 LTS** 배포 기준이며 로컬 Node 26에서도 테스트할 수 있습니다. 호스팅 플랫폼 외 추가 빌드 프레임워크는 없습니다.
- Table `PartitionKey`는 수업 코드, `RowKey=room`에는 개방 상태·강사 키 해시·revision·인원수, `RowKey=student:<난수 ID>`에는 닉네임·개인 키 해시·입장 구간·연속 활동 cursor·마지막 연결 시각을 저장합니다. 원문 인증 키는 저장하지 않습니다.
- 입장·완료·개방 변경은 room ETag와 학생 행의 **같은 partition 원자적 transaction**으로 처리합니다. 닫기와 입장이 겹치거나 Functions가 여러 인스턴스로 확장되어도 메모리 잠금에 의존하지 않습니다. ETag 충돌을 제한적으로 재시도하고 끝내 실패하면 오류를 반환합니다.
- 서버는 인증, 수업 격리, 선행 완료, 구간 입장, 활동 순서를 검증합니다. 정적 교육 콘텐츠 자체는 공개이며 DRM이나 시험 감독 기능이 아닙니다. 활동 완료는 클라이언트가 보낸 순차 완료 신호로, 이해도 평가·치팅 방지를 보증하지 않습니다.
- `lastSeen`은 수강생의 성공적인 상태 조회 때 최대 10초 간격으로 저장합니다. 강사 화면의 **최근 연결**은 20초 이내의 신호이지 정확한 실시간 접속/퇴장 판정이 아닙니다.

### API

모든 응답은 `Cache-Control: no-store`입니다. 인증 키는 `Authorization: Bearer ...`로만 전달합니다. 오류 응답에는 한국어 `error`와 추적용 `requestId`가 있습니다. 서버 로그는 요청 본문이나 인증 키를 기록하지 않습니다.

| 메서드 / 경로 | 권한 / 기능 |
|---|---|
| `GET /api/health` | Table 연결·존재 확인 |
| `POST /api/classrooms` `{title}` | 서버 생성 비밀 → 수업 및 전용 강사 자격 증명 |
| `POST /api/join` `{code,nickname}` | 수업 코드 → 새 수강생 자격 증명 |
| `GET /api/classrooms/:code` | 강사: 명단·인원수 / 수강생: 본인 상태만 |
| `PUT /api/classrooms/:code/gates/:portion` `{open}` | 해당 수업 강사만 열기/닫기 |
| `POST /api/classrooms/:code/enter` `{portionId}` | 본인 선행 완료 + 열린 구간 입장 |
| `POST /api/classrooms/:code/progress` `{portionId,stepId,actionIndex}` | 입장한 현재 활동 완료, 과거 요청은 멱등 처리 |

## Azure 배포 (운영자가 실행)

실제 리소스 생성, RBAC, 앱 설정, 공개 배포는 별도 승인된 운영 작업입니다. 아래 명령은 예시이며 이 코드가 리소스를 자동 생성하지 않습니다.

### 1. Storage와 Functions 준비

- Azure Functions **Node 24**, 프로그래밍 모델 v4, HTTPS Only를 사용합니다. Flex Consumption에서 실행할 수 있으며 별도 WebSocket/SSE 서버가 필요 없습니다.
- Storage 계정에 **`Lab3Classrooms` Table을 사전 생성**합니다. 런타임은 Table을 자동 생성하지 않습니다. Storage 삭제 방지·보존·정리·백업 정책은 운영자가 설정해야 합니다. 학생 정보는 공개 GitHub 파일이나 Pages에 저장하지 않습니다.
- Function App 시스템 할당 관리형 ID에 해당 Storage 계정 또는 Table 범위의 **Storage Table Data Contributor** 역할을 부여합니다. 역할 전파 후 `/api/health`를 확인합니다.
- Function 호스트 자체의 `AzureWebJobsStorage`/배포 저장소는 Azure의 일반 Functions 구성에 따라 별도로 준비합니다. 아래 설정은 **수업 데이터 저장소** 계약입니다.

| 앱 설정 | 값 |
|---|---|
| `LAB3_TABLE_ENDPOINT` | `https://<storage-account>.table.core.windows.net` |
| `LAB3_TABLE_NAME` | `Lab3Classrooms` |
| `LAB3_ALLOWED_ORIGINS` | `https://lanslote.github.io` (경로나 끝 `/` 없이 정확한 origin; 여러 개는 쉼표 구분) |
| `LAB3_ADMIN_KEY` | 운영자가 생성한 최소 32자 난수 비밀. App Settings/Key Vault에만 저장 |
| `FUNCTIONS_WORKER_RUNTIME` | `node` (해당 호스팅 옵션에서 요구하는 경우) |

Azure에서는 `LAB3_TABLE_CONNECTION_STRING`을 설정하지 마세요. 코드는 관리형 ID의 `DefaultAzureCredential`을 사용하며 **실제 Storage 연결 문자열을 받지 않습니다**. 로컬 Azurite의 공개 개발 연결 문자열만 허용합니다.

CORS는 앱 코드가 허용 origin과 `Authorization, Content-Type` 헤더를 확인합니다. Azure 플랫폼 CORS를 별도로 켠 경우에도 같은 Pages origin을 허용하세요. credentials/cookies나 wildcard origin은 사용하지 않습니다. HTTP trigger의 `authLevel`은 `anonymous`지만 수업 API의 실제 권한은 전용 Bearer 자격 증명이 검증합니다. Function 키·Storage 키·관리 비밀을 Pages에 넣지 마세요.

### 2. 패키징 및 배포

저장소 루트의 PowerShell에서:

```powershell
npm ci --prefix .\lab3\backend
npm run check --prefix .\lab3\backend
npm test --prefix .\lab3\backend
npm run test:browser --prefix .\lab3\backend
npm run predeploy --prefix .\lab3\backend
Set-Location .\lab3\backend
func azure functionapp publish <function-app-name> --subscription <approved-subscription-id>
```

`predeploy`는 원본 `lab2/lab-data.js`와 `shared/curriculum.js`를 배포 디렉터리 내부의 무시된 `content/`에 복사합니다. **이 단계를 생략하지 마세요.** Functions 배포 루트는 `lab3/backend/`이며 `host.json`, `package*.json`, `src/`, 생성된 `content/`가 필요합니다. 프로덕션 의존성만 설치하는 ZIP/CI 배포라면 `npm ci --omit=dev`를 사용하고 Functions Node 24 빌드 설정을 맞추세요. 개발 의존성인 Azurite와 Playwright는 운영에 필요 없습니다. CI에서 파일을 선택해 패키징할 때 `content/`를 누락하지 마세요.

`func`는 Azure Functions Core Tools v4입니다. 이 저장소가 CLI를 자동 설치하거나 Azure 로그인·권한 부여·리소스 생성을 수행하지는 않습니다.

### 배포 인증과 Flex Consumption의 403 대응

배포 대상 구독을 항상 명시하세요. `func azure functionapp ...`에는 `--subscription <approved-subscription-id>`, 모든 `az ...` 명령에도 같은 `--subscription`을 지정합니다. 기본 구독/다른 테넌트의 토큰에 의존하지 않습니다. Core Tools의 구독 지정과 표준 입력 토큰 옵션은 [공식 참조](https://learn.microsoft.com/azure/azure-functions/functions-core-tools-reference#func-azure-functionapp)를 참고하세요.

SCM Basic 인증이 비활성화된 앱에서 `az functionapp deployment source config-zip`이 403을 반환해도 **Basic 인증을 켜서 우회하지 마세요**. 먼저 승인된 구독·테넌트와 배포 권한을 확인합니다. 올바른 배포 권한이 있는 Flex 앱은 Entra Bearer 인증으로 SCM의 One Deploy `POST /api/publish?remoteBuild=false`에 준비된 production ZIP을 전송할 수 있습니다. 이 경로에서도 배포 권한을 우회하지 않습니다.

아래 예시는 이미 승인된 앱에 코드만 배포합니다. ZIP 루트에는 `host.json`, `src/`, `content/`, `package*.json`과 `npm ci --omit=dev`로 설치한 production `node_modules/`가 있어야 합니다. `remoteBuild=false`이므로 의존성 없는 소스 ZIP만 보내면 안 됩니다.

```powershell
$subscription = '<approved-subscription-id>'
$app = '<function-app-name>'
$zip = '<absolute-path-to-production.zip>'
$accessToken = az account get-access-token --subscription $subscription --resource https://management.azure.com/ --query accessToken -o tsv
if ($LASTEXITCODE -ne 0 -or -not $accessToken) { throw 'Entra 배포 토큰을 얻지 못했습니다.' }
try {
  $result = Invoke-WebRequest -Method Post `
    -Uri "https://$app.scm.azurewebsites.net/api/publish?remoteBuild=false" `
    -Headers @{ Authorization = "Bearer $accessToken" } `
    -ContentType 'application/zip' -InFile $zip
  Write-Output "배포 요청 HTTP $($result.StatusCode) — 아직 배포 완료를 뜻하지 않습니다."
} finally {
  $accessToken = $null
}
```

토큰은 메모리 변수로만 전달하고 화면, 파일, 채팅, 로그에 출력하지 마세요. 요청 헤더를 노출하는 verbose/debug 로깅을 사용하지 않습니다. `202 Accepted`는 요청 접수일 뿐입니다. Azure의 배포 상태가 성공인지와 `/api/health`의 실제 저장소 접근까지 확인한 다음 Pages를 공개 연결하세요. 관리 비밀이나 앱 설정 전체를 로그로 덤프하지 않습니다.

### 3. Pages 연결

배포된 API의 다음 요청이 성공하는지 확인합니다:

```powershell
Invoke-RestMethod https://<actual-function-host>/api/health
```

검증된 **공개 API origin만** `lab3/config.js`에 넣습니다:

```javascript
window.LAB3_CONFIG = { apiBase: 'https://<actual-function-host>' };
```

`/api`를 덧붙이지 않습니다. 루트 경로의 Pages를 게시하면 `/lab3/`가 같은 배포에서 제공됩니다. Lab 1·2 URL은 바꾸지 않습니다. API 배포와 Pages 갱신 후 실제 서로 다른 브라우저/기기에서 수업 생성 → 입장 → 완료 대기 → 강사 개방 → 수강생 직접 다음 입장을 확인하세요.

## 로컬 실행과 테스트

프로덕션 저장소로 대체되는 인메모리 모드는 없습니다. 테스트의 인메모리 구현은 테스트 파일에만 있습니다. API/저장소 테스트는 임시 디렉터리와 임의 포트에서 Azurite를 자동 실행하고 종료합니다. 실제 Table SDK transaction 및 에뮬레이터 재시작 후 디스크 복구를 검증합니다.

```powershell
npm ci --prefix .\lab3\backend
npm test --prefix .\lab3\backend
npm run test:browser --prefix .\lab3\backend
```

브라우저 테스트는 설치된 Edge의 독립 context들을 기본 사용합니다. Chromium을 사용할 때는 Playwright 브라우저를 설치하고 `$env:LAB3_BROWSER_CHANNEL='chromium'`을 지정하세요. 테스트는 정적 프런트엔드와 API를 다른 임의 포트에서 실행하여 CORS도 확인합니다.

직접 개발할 때는 별도 터미널에서 `npx azurite --location .\.azurite`를 실행합니다. 전체 Functions 호스트는 `local.settings.example.json`을 `local.settings.json`으로 복사하고 생성 비밀을 바꾼 뒤 `npm start`로 실행합니다. `local.settings.json`은 커밋하지 않습니다. 해당 파일의 `AzureWebJobsStorage` 외 수업용 Table도 미리 생성해야 합니다.

Core Tools 없이 HTTP API만 실행하려면:

```powershell
$env:LAB3_TABLE_CONNECTION_STRING = 'UseDevelopmentStorage=true'
$env:LAB3_ALLOWED_ORIGINS = 'http://127.0.0.1:8080'
$env:LAB3_ADMIN_KEY = '<local-random-secret-at-least-32-characters>'
npm run dev --prefix .\lab3\backend
```

저장소를 `http://127.0.0.1:8080`에서 정적으로 제공하고 개발용 `config.js`에 `http://127.0.0.1:7071`을 지정합니다. 개발 주소/비밀을 공개 배포에 남기지 마세요.

운영 최소 보안은 소규모 강사 주도 수업을 위한 공유 생성 비밀·수업별 난수 키입니다. 조직 SSO, 계정별 감사, 보존 자동화, API rate limiting/WAF는 포함하지 않습니다. 분실한 개인 키를 닉네임만으로 재발급하지 않으며, 키를 잃으면 새 참가자로 입장해야 합니다. 공개 운영의 트래픽·보존·비밀 회전 정책은 운영자가 관리해야 합니다.
