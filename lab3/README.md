# Lab 3 · 강사 주도 수업

Lab 1·2는 혼자 하는 정적 실습입니다. Lab 3은 **GitHub Pages 프런트엔드 + Azure Functions HTTP API + Azure Table Storage**를 사용합니다. 강사와 수강생이 서로 다른 PC·브라우저에서도 같은 수업 상태를 봅니다. 프런트엔드만 열거나 `file://`로 열어서는 수업 기능이 작동하지 않습니다.

`config.js`는 확인된 Function host `https://func-handson-lab3-0ed6.azurewebsites.net`에 연결하도록 설정되어 있습니다. API 코드가 배포되기 전이나 저장소에 접근할 수 없으면 연결 오류를 표시합니다. 이 설정 자체가 배포 완료를 뜻하지 않습니다.

새 환경에서 `apiBase`를 비워 두면 **수업 서버 미설정** 안내와 비활성화된 입장 화면을 표시합니다. 가짜 수업이나 브라우저끼리만 공유하는 대체 저장소를 만들지 않습니다.

## 수업 사용법

| 대상 | 공개 주소 | 기능 |
|---|---|---|
| 수강생 | https://lanslote.github.io/handson-lab-clickthrough/lab3/ | 오픈된 수업 선택·닉네임 입장, 마지막 진도 선택·실습 |
| 강사 | https://lanslote.github.io/handson-lab-clickthrough/lab3/instructor.html | 한 번 로그인, 수업 목록·생성·선택, 명단·진도, 구간 열기/닫기 |

1. 강사는 **강사 전용 주소**에서 **강사 비밀키**(기존 강사 비밀번호)를 한 번 입력합니다. Azure 운영자는 해당 Function App의 환경 변수 `LAB3_ADMIN_KEY` 값을 확인할 수 있습니다. 최소 8자를 지원하며 긴 난수 암호를 권장합니다. 원문은 저장하지 않고 HTTPS 로그인 요청에만 사용합니다.
2. **강사 관리 홈**에서 새 수업을 만들거나 최근 생성순 목록에서 기존 수업을 선택합니다. 운영 중 **수업 목록으로**를 눌러 다른 수업을 선택할 수 있습니다. 같은 공통 비밀키로 로그인한 강사들은 이 사이트의 모든 수업과 운영 권한을 공유합니다. 개인별 계정·SSO 모델은 아닙니다.
3. 관리 홈의 수업 카드 또는 운영 화면에서 **수업 오픈**을 누릅니다. 학생은 `/lab3/`의 공개 목록에서 수업을 선택하고 닉네임만 입력합니다. 수업 코드·개별 초대 링크·QR을 공유하지 않습니다. 신규·기존 수업 모두 기본 입장 상태는 종료이며, 강사가 명시적으로 오픈한 수업만 공개 목록에 표시됩니다.
4. 강사가 **3-1 입장 열기**를 누릅니다. 수강생이 **실습 시작 · 3-1 입장**을 누르면 실습이 시작됩니다.
5. 구간 안의 활동을 순서대로 완료하면 **완료 · 강사 개방 대기**가 됩니다. 강사는 현재 단계, 활동 완료 수, 구간별 완료 인원을 확인합니다. 접속하거나 화면을 열기만 한 것은 완료가 아닙니다.
6. 다음 구간 버튼은 닫혀 있을 때 **강사 오픈 대기 중**으로 회색 비활성 상태를 표시합니다. 강사가 **3-2 입장 열기**를 누르면 3-1을 완료한 사람의 버튼이 활성화됩니다. 선행 구간 미완료·연결 오류·저장 대기는 별도 문구로 구분하며, 자동 이동이나 전원 완료 시 자동 개방은 없습니다.

| 구간 | 재사용하는 Lab 2 콘텐츠 |
|---|---|
| 3-1 | 소개, 에이전트 만들기, 이름, 지침과 체크포인트 |
| 3-2 | 공개 웹 사이트, URL, 문서 파일 지식 |
| 3-3 | 설정, 인사말 |
| 3-4 | 미리 보기, 질문 2개, 추론·인용·크레딧 확인 |
| 3-5 | 범위 제한 편집, 실제 결과 비교, 체크포인트 |
| 3-6 | 서술 정리, 마무리 퀴즈, 결과 확인 |

**입장 닫기**는 해당 구간의 신규 입장만 막습니다. 이미 입장한 사람의 실습을 중단하거나 기록을 취소하지 않습니다. 늦은 수강생에게는 필요한 이전 구간을 다시 열어 주세요. 입장한 구간은 다시 볼 수 있으며 복습은 서버 진도를 되돌리지 않습니다. 수업당 최대 200명입니다.

**수업 종료**는 수업을 공개 목록에서 내리고 새 참가자의 가입만 막습니다. 기존 참가자의 실습·구간 입장·진도·새로고침·처음부터 다시 하기는 유지하며 3-x 구간 설정도 자동으로 닫거나 바꾸지 않습니다. 수업 오픈/종료와 3-x 구간 개방은 서로 다른 제어입니다.

## 수강생 화면

첫 입장 화면은 오픈된 수업 선택·닉네임·입장 버튼만 있는 작은 단일 폼입니다. 공개 목록은 약 5초마다 갱신하고 선택을 유지하며 다른 수업을 자동 선택하지 않습니다. 읽는 중·열린 수업 없음·연결 실패·선택한 수업의 종료를 명시합니다. 종료/가입 경쟁은 서버도 검증하여 가입을 거절하고 가짜 진도나 다른 수업 입장으로 대체하지 않습니다.

실습 중에는 상단의 현재 3-x 구간·활동 완료 수·진행/대기 상태와 화면 안의 실제 스크린샷·단계 가이드에 집중합니다. 닫힌 다음 구간의 CTA는 **3-x · 강사 오픈 대기 중**으로 표시되는 실제 `disabled` 버튼이며, 선행 완료와 강사 개방이 확인되면 같은 버튼이 활성화됩니다. 마지막 구간 이후에는 존재하지 않는 다음 구간을 표시하지 않습니다.

**메뉴**에 입장한 구간 복습, 현재 진도로 돌아가기, 영상 매번 보기(기본 ON), 테마, 수업 나가기를 모았습니다. 수강생의 수동 복구 키 입력·복구 정보 표시는 제공하지 않습니다. 메뉴는 키보드/터치로 열고 Escape 또는 바깥 클릭으로 닫을 수 있습니다. 정상 연결일 때 기술적인 polling 띠를 숨기지만, 연결 끊김·저장 대기·미설정·실패는 현재 화면에 표시하고 확인되지 않은 완료/입장을 진행하지 않습니다.

Lab 3 프레임의 별도 브랜드·테마·주소 표시줄은 `activity.css`로만 숨깁니다. 원본 Lab 1·2는 변경하지 않으며 퀴즈, 오답 설명, 비교, 편집, 팝업 영상과 가이드의 진행 동작은 유지합니다. 넓은 화면에서는 실습과 오른쪽 가이드가 남은 높이를 채우고, 좁은 화면에서는 스크린샷 다음에 가이드가 세로로 이어집니다.

Lab 3의 학생·강사 화면과 프레임은 기존 cp 테마 변수를 유지하면서 `--cp-surface`, `--cp-surface-soft`, `--cp-text` 중심의 중립 톤을 사용합니다. Light는 흰색·회색, Dark는 기존 짙은 회색·밝은 텍스트이며 성공·실패 의미 색은 유지합니다. 실제 캡처 이미지와 MP4 콘텐츠, Lab 1·2 스타일은 바꾸지 않습니다.

### 안내 영상

영상 팝업은 **영상 보기**를 누를 때만 재생합니다. 정상 속도(1.0x)로 끝까지 시청하면 마지막 화면과 **시청 완료** 안내가 남고, 사용자가 **실습 시작**을 눌러야 팝업이 닫힙니다. 재생·정지·팝업 표시만으로 시청 완료나 실습 진도를 기록하지 않습니다. 영상 시작/종료 확인 버튼은 실습 활동 완료 수에 포함하지 않습니다.

강제 시청에서는 앞으로 감기와 건너뛰기가 없고, Escape·배경 클릭으로 시청/종료 확인을 건너뛰지 않습니다. 오류가 나면 다시 불러오기를 표시하며 완료 처리하지 않습니다. 시청 완료 후 다시 보기와, 이미 본 영상에 대한 매번 보기 OFF 정책은 유지합니다. 다시 보기 팝업도 수동 재생·종료 확인을 사용하며 기존 다시 보기의 건너뛰기는 허용합니다. 실제 MP4와 Lab 2 플레이어는 변경하지 않습니다.

## 새로고침·기기 변경·연결 끊김

- 관리 세션은 서버가 생성한 32바이트 난수 자격 증명이며 **로그인부터 8시간** 동안 유효합니다. 수업 생성·목록·조회·개방 요청마다 서버가 해시와 만료를 확인합니다. 새로고침이 만료 시간을 연장하지 않습니다.
- 관리 자격 증명과 선택한 수업 코드는 API별 `sessionStorage`에만 저장합니다. 같은 탭을 새로고침하면 유효한 세션으로 복구하며, 탭을 닫거나 새 기기에서는 다시 로그인합니다. `LAB3_ADMIN_KEY` 원문은 `localStorage`나 `sessionStorage`에 저장하지 않고 운영 요청에도 반복 전송하지 않습니다.
- **관리 로그아웃**은 서버 세션을 폐기하고 로그인 화면으로 돌아갑니다. 연결 오류로 폐기를 확인하지 못하면 성공으로 처리하지 않고 다시 시도하도록 안내합니다. 서버가 만료·무효를 반환하면 관리 내용을 숨기고 **비밀키 재로그인** 상태를 표시하며, 네트워크 끊김과 구분합니다. 설정 비밀키를 변경하고 worker에 반영하면 이전 관리 세션도 무효가 됩니다.
- 닉네임은 표시 이름일 뿐 인증 정보가 아닙니다. 개인별 난수 자격 증명을 API 주소와 역할별 `localStorage`에 저장합니다. 학생의 새 페이지 로드·새로고침에서는 **마지막 참여 한 건**을 서버에서 확인한 다음 **이어서 하기 / 처음부터 하기**를 묻습니다. 닉네임별 조회·다른 기기 기록 검색은 하지 않습니다.
- **이어서 하기**는 서버의 마지막 체크포인트를 복원합니다. **처음부터 하기**는 같은 참가자 ID·닉네임·수업 등록을 유지하고 **내 완료 진도만 서버에서 초기화**합니다. 강사 완료 집계에도 반영되며 다른 학생·수업 개방 설정은 바꾸지 않습니다. 초기화 후 닫힌 첫 구간을 임의로 열지 않고 기존 입장 조건을 따릅니다. 복습 메뉴는 초기화와 달리 완료 기록을 유지합니다.
- 복원 선택은 새 페이지 로드에서만 나타나며 진행 중 polling·재연결 때 반복하지 않습니다. 저장 기록 조회가 실패하면 오류와 재시도를 표시하고 신규 참여나 진도 0으로 대체하지 않습니다. 학생 메뉴에서 **수업에서 나가기**를 누르면 이 브라우저의 마지막 학생 참여를 비우고 신규 입장 화면으로 돌아갑니다. 서버 참가자 기록과 다른 역할의 기록은 그대로 남습니다.
- 마지막 참여 수업이 종료되어 공개 목록에 없어도 기존 참가자 자격 증명으로 서버 진도를 조회하고 이어서/처음부터 선택을 제공합니다. 공개 목록의 유무를 이유로 기존 기록을 삭제하거나 새 참가자를 만들지 않습니다.
- 복원 선택 버튼은 HTML 초기 상태부터 비활성화되어 있으며 서버 조회가 끝나고 정상 연결이 확인된 뒤에만 누를 수 있습니다.
- 기존 수업별 강사 키와 학생 키, 이미 만든 수업은 유지합니다. 강사 로그인 화면의 **이전 수업별 강사 키로 관리** 호환 경로에서는 해당 수업만 관리할 수 있습니다. 저장된 이전 강사 키는 명시적으로 계속하기를 눌러 사용하며, 전체 목록·새 수업 생성 권한으로 승격하지 않습니다. 관리 로그아웃·만료는 기존 강사/학생 복구 기록을 삭제하지 않습니다.
- 이전 공용 페이지의 `lab3.session:<API origin>` 기록은 해당 역할의 새 키(`:teacher` 또는 `:student`)로 안전하게 옮깁니다. 같은 역할에 다른 기록이 이미 있다면 덮어쓰거나 이전 기록을 지우지 않습니다. 강사의 호환 복구 경로와 기존 API 자격 증명은 유지하지만, 학생 화면의 수동 복구 UI는 제거했습니다.
- API에 확인된 활동만 진행합니다. 저장 중 연결이 끊기면 실습 입력을 잠그고 **완료 저장 대기**를 표시합니다. 재연결 또는 **다시 연결**로 같은 완료 요청을 재시도합니다. 응답만 유실된 경우에도 활동을 두 번 완료하지 않습니다.
- 연결이 끊긴 동안 완료했다고 가정하거나 다음 구간을 열지 않습니다. 개방 변경 실패 시 성공 표시를 하지 않고 최신 서버 상태를 다시 확인합니다.
- 퀴즈 선택·서술 답안·힌트 사용·시청 기록을 API에 보내지 않습니다. 답안은 실습 프레임 메모리에만 있어 새로고침하면 이미 완료한 예측의 비교 문구가 없거나 현재 답안을 다시 입력해야 할 수 있습니다. 영상 시청 기록은 재사용 콘텐츠의 브라우저 로컬 기록입니다. 영상 매번 보기는 Lab 3에서 기본 ON이고 설정은 `lab3.force`에 보관합니다. 강제 시청 중 로드 실패는 건너뛰거나 완료로 처리하지 않습니다.

## 구현과 데이터

- `index.html`: 수강생 입장·실습 화면. `instructor.html`: 최초 로그인 → 관리 홈 → 수업 운영 화면. 두 페이지는 `app.js`, `style.css`, `config.js`를 공유하며 2초 HTTP polling을 사용합니다. 페이지 역할은 화면 선택용일 뿐 권한이 아니며, 실제 권한은 서버가 검증합니다.
- `shared/curriculum.js`: 사람이 부르는 3-1~3-6 경계와 활동 순서. 원본 Lab 2에 없는 단계나 순서 변경은 즉시 오류를 냅니다.
- `activity.js`: Lab 2 활동 엔진 어댑터. 같은 origin에서 `../lab2/index.html`을 읽어 base URL을 지정한 프레임 문서로 구성하고, 해당 구간의 원본 데이터만 공급합니다. 원본 파일·스크린샷·동영상은 복제하거나 수정하지 않습니다. 원본 전역 함수 `goStep`, `completeAction`, `guideAction`, `renderClip`과 DOM 계약을 사용하므로 Lab 2 엔진 변경 시 브라우저 테스트를 함께 실행하세요.
- `backend/`: Functions v4 Node HTTP 앱. **Node 24 LTS** 배포 기준이며 로컬 Node 26에서도 테스트할 수 있습니다. 호스팅 플랫폼 외 추가 빌드 프레임워크는 없습니다.
- Table `PartitionKey`는 수업 코드, `RowKey=room`에는 개방 상태·강사 키 해시·revision·인원수, `RowKey=student:<난수 ID>`에는 닉네임·개인 키 해시·입장 구간·연속 활동 cursor·마지막 연결 시각을 저장합니다. 원문 인증 키는 저장하지 않습니다.
- 수업 행의 `enrollmentOpen`은 새 가입/공개 목록만 제어하는 boolean이며 누락된 기존 행도 `false`로 취급합니다. 생성 시 `false`를 저장하며 기존 수업을 자동으로 오픈하거나 데이터 마이그레이션하지 않습니다. 신규 가입과 수업 종료는 같은 room ETag transaction으로 직렬화됩니다.
- 공개 목록은 `RowKey=room and enrollmentOpen=true`로 읽고 수업 ID·제목만 반환합니다. 참가자 이름·명단·진도·인증 키·관리 세션은 포함하지 않습니다. ID는 내부 선택 식별자이며 강사/학생 자격 증명과 다른 값입니다.
- 같은 Table의 `PartitionKey=admin`, `RowKey=session:<난수 ID>`에는 관리 세션의 해시·만료·설정 키 버전 해시만 보관합니다. 원문 비밀번호나 원문 세션 자격 증명은 저장하지 않습니다. 만료 행은 권한 검사에서 거절하며 자동 정리 기능은 포함하지 않습니다. 추가 Storage·RBAC·비밀 설정이 필요하지 않습니다.
- 수업 목록은 기존 수업을 포함하도록 `RowKey=room` 행을 전체 partition에서 조회하고 이름·코드·생성 시각만 반환합니다. 소규모 수업 운영을 위한 단순 Table 조회이며, 별도 검색 인덱스나 목록 캐시는 없습니다.
- 입장·완료·개방 변경은 room ETag와 학생 행의 **같은 partition 원자적 transaction**으로 처리합니다. 닫기와 입장이 겹치거나 Functions가 여러 인스턴스로 확장되어도 메모리 잠금에 의존하지 않습니다. ETag 충돌을 제한적으로 재시도하고 끝내 실패하면 오류를 반환합니다.
- 본인 초기화도 같은 transaction으로 처리하며 학생 행의 `epoch`를 증가시킵니다. 초기화 요청의 `operationId`를 보관하여 응답 유실 재시도가 새 진행을 다시 지우지 않게 합니다. 새 프런트의 입장·활동 요청은 시작 시의 epoch를 고정하여 보내고, reset 이전의 지연/재시도 요청은 409로 거절합니다. 초기화하지 않은 기존 참가자는 epoch 0의 구 API 계약을 그대로 사용할 수 있습니다.
- 서버는 인증, 수업 격리, 선행 완료, 구간 입장, 활동 순서를 검증합니다. 정적 교육 콘텐츠 자체는 공개이며 DRM이나 시험 감독 기능이 아닙니다. 활동 완료는 클라이언트가 보낸 순차 완료 신호로, 이해도 평가·치팅 방지를 보증하지 않습니다.
- `lastSeen`은 수강생의 성공적인 상태 조회 때 최대 10초 간격으로 저장합니다. 강사 화면의 **최근 연결**은 20초 이내의 신호이지 정확한 실시간 접속/퇴장 판정이 아닙니다.

### API

모든 응답은 `Cache-Control: no-store`입니다. 인증 키는 `Authorization: Bearer ...`로만 전달합니다. 오류 응답에는 한국어 `error`와 추적용 `requestId`가 있습니다. 서버 로그는 요청 본문이나 인증 키를 기록하지 않습니다.

| 메서드 / 경로 | 권한 / 기능 |
|---|---|
| `GET /api/health` | Table 연결·존재 확인 |
| `GET /api/classrooms/open` | 무인증 공개 목록 `{classrooms:[{id,title}]}`. 명시적으로 오픈된 수업만 |
| `POST /api/admin/login` `{}` | 최초 강사 비밀키 → `{session:{role:'admin',credential,expiresAt}}`, HTTP 201 |
| `GET /api/admin/session` | 관리 세션 유효성·만료 확인 |
| `GET /api/admin/classrooms` | 관리 세션 → `{classrooms:[{id,title,createdAt}]}` 최근 생성순 |
| `POST /api/admin/classrooms` `{title}` | 관리 세션 → `{classroom:{id,title,createdAt}}`, HTTP 201 |
| `POST /api/admin/logout` `{}` | 관리 세션 서버 폐기 |
| `POST /api/classrooms` `{title}` | 구 프런트 호환: 강사 비밀번호 → 수업 및 수업별 강사 자격 증명 |
| `POST /api/join` `{code,nickname}` | 수업 코드 → 새 수강생 자격 증명 |
| `GET /api/classrooms/:code` | 관리 세션 또는 해당 수업 강사: 명단·인원수 / 수강생: 본인 상태만 |
| `PUT /api/classrooms/:code/gates/:portion` `{open}` | 관리 세션 또는 해당 수업 강사만 열기/닫기 |
| `PUT /api/classrooms/:code/enrollment` `{open}` | 관리 세션 또는 해당 수업 강사만 수업 오픈/종료. 성공 시 기존 snapshot |
| `POST /api/classrooms/:code/enter` `{portionId,epoch}` | 본인 선행 완료 + 열린 구간 입장 |
| `POST /api/classrooms/:code/progress` `{portionId,stepId,actionIndex,epoch}` | 입장한 현재 활동 완료, 과거 요청은 멱등 처리 |
| `POST /api/classrooms/:code/reset` `{operationId,expectedEpoch}` | 본인 학생 키만 완료/입장 진도 초기화. ID·닉네임·gates 유지 |

최초 `POST /api/admin/login`의 인증 헤더에만 설정 비밀키를 넣습니다. 이후 요청은 반환된 `a_...` 관리 세션 credential을 같은 Bearer 형식으로 사용합니다. `s_...` 학생 키·`t_...` 수업별 강사 키·설정 비밀키 자체로는 관리 목록/생성 API를 사용할 수 없습니다. 유효하지 않거나 만료된 관리 세션은 401, 다른 종류의 키는 403입니다. 관리 세션으로 학생 활동을 완료할 수도 없습니다.

`POST /api/join`의 `{code,nickname}` 필드는 구 계약과 동일하지만, code는 화면에서 선택한 수업의 내부 ID이며 `enrollmentOpen=true`일 때만 새로운 참가자를 만듭니다. 종료/미오픈 수업은 423입니다. 기존 `s_` 참가자의 조회·입장·완료·초기화는 수업 종료와 독립적입니다. 관리자 목록 및 비공개 snapshot의 `classroom`에는 `enrollmentOpen` 상태를 추가합니다.

## Azure 배포 (운영자가 실행)

실제 리소스 생성, RBAC, 앱 설정, 공개 배포는 별도 승인된 운영 작업입니다. 아래 명령은 예시이며 이 코드가 리소스를 자동 생성하지 않습니다.

관리 홈 갱신은 **백엔드 먼저 → 프런트엔드 나중** 순서로 배포합니다. 새 백엔드는 기존 `/api/classrooms` 생성·기존 강사/학생 키 계약을 유지하므로 구 Pages 화면과 호환됩니다. 새 ZIP을 배포하고 `/api/admin/login`, 관리 목록/생성/로그아웃을 확인한 뒤 새 Pages 커밋을 게시하세요. 새 프런트만 먼저 게시하면 아직 없는 admin API 때문에 로그인할 수 없습니다.

학생의 처음부터 다시 시작 기능도 새 `/reset`·epoch 응답을 지원하는 **백엔드를 먼저 배포**한 뒤 Pages를 게시합니다. 초기화하지 않은 기존 참가자의 `enter`/`progress`에는 epoch 생략을 허용해 이전 프런트와 호환됩니다. 한 번 초기화한 참가자는 새 epoch를 명시해야 이전 요청과 혼동하지 않습니다. 같은 Table·관리형 ID·기존 강사 설정을 그대로 사용합니다.

수업 오픈/종료 갱신도 **새 백엔드 먼저 → Pages 나중**으로 배포합니다. 기존 관리자·수업별 강사·학생 자격 증명 계약은 유지하되, 종료된 수업의 새 가입을 거절하는 동작은 의도된 변경입니다. 새 공개 목록/가입/종료/기존 참가자 진행의 실환경 검증 후 새 Pages를 게시합니다. 기존 수업을 일괄 오픈하지 마세요. 추가 Azure 리소스·RBAC·비밀·외부 QR 서비스는 필요하지 않습니다.

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
| `LAB3_ADMIN_KEY` | 운영자가 설정한 최소 8자 강사 비밀번호. 32자 이상 난수 암호 권장. App Settings/Key Vault에만 저장 |
| `FUNCTIONS_WORKER_RUNTIME` | `node` (해당 호스팅 옵션에서 요구하는 경우) |

8자 이상 강사 비밀번호 지원에는 갱신된 `backend/src/service.js`의 배포가 필요합니다. 새 UI만 게시했다고 Azure 설정의 짧은 암호가 지원되는 것은 아닙니다. 새 백엔드는 기존의 긴 난수 암호도 그대로 받습니다. 실제 암호 설정·배포 후 확인은 운영자가 수행하세요.

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

`/api`를 덧붙이지 않습니다. 루트 경로의 Pages를 게시하면 `/lab3/`와 `/lab3/instructor.html`이 같은 배포에서 제공됩니다. Lab 1·2 URL은 바꾸지 않습니다. API 배포와 Pages 갱신 후 실제 서로 다른 브라우저/기기에서 별도 강사 화면의 수업 생성 → 별도 수강생 입장 → 완료 대기 → 강사 개방 → 수강생 직접 다음 입장을 확인하세요.

## 로컬 실행과 테스트

프로덕션 저장소로 대체되는 인메모리 모드는 없습니다. 테스트의 인메모리 구현은 테스트 파일에만 있습니다. API/저장소 테스트는 임시 디렉터리와 임의 포트에서 Azurite를 자동 실행하고 종료합니다. 실제 Table SDK transaction 및 에뮬레이터 재시작 후 디스크 복구를 검증합니다.

```powershell
npm ci --prefix .\lab3\backend
npm test --prefix .\lab3\backend
npm run test:browser --prefix .\lab3\backend
```

브라우저 테스트는 설치된 Edge의 독립 context들을 기본 사용합니다. Chromium을 사용할 때는 Playwright 브라우저를 설치하고 `$env:LAB3_BROWSER_CHANNEL='chromium'`을 지정하세요. 테스트는 정적 프런트엔드와 API를 다른 임의 포트에서 실행하여 CORS도 확인합니다.

직접 개발할 때는 별도 터미널에서 `npx azurite --location .\.azurite`를 실행합니다. 전체 Functions 호스트는 `local.settings.example.json`을 `local.settings.json`으로 복사하고 강사 비밀번호를 바꾼 뒤 `npm start`로 실행합니다. `local.settings.json`은 커밋하지 않습니다. 해당 파일의 `AzureWebJobsStorage` 외 수업용 Table도 미리 생성해야 합니다.

Core Tools 없이 HTTP API만 실행하려면:

```powershell
$env:LAB3_TABLE_CONNECTION_STRING = 'UseDevelopmentStorage=true'
$env:LAB3_ALLOWED_ORIGINS = 'http://127.0.0.1:8080'
$env:LAB3_ADMIN_KEY = '<local-random-secret-at-least-32-characters>'
npm run dev --prefix .\lab3\backend
```

저장소를 `http://127.0.0.1:8080`에서 정적으로 제공하고 개발용 `config.js`에 `http://127.0.0.1:7071`을 지정합니다. 개발 주소/비밀을 공개 배포에 남기지 마세요.

운영 최소 보안은 소규모 강사 주도 수업을 위한 공유 강사 비밀번호·수업별 난수 키입니다. 최소 8자를 지원하지만 짧거나 추측하기 쉬운 암호는 사전 대입·추측 위험이 큽니다. 긴 난수 암호를 권장하며 실제 운영 암호를 소스·테스트·문서·스크린샷에 넣지 마세요. 비밀번호 길이 완화는 수업별 강사·수강생 난수 자격 증명의 길이나 서버 권한 검증을 바꾸지 않습니다. 조직 SSO, 계정별 감사, 보존 자동화, API rate limiting/WAF는 포함하지 않습니다. 분실한 개인 키를 닉네임만으로 재발급하지 않으며, 키를 잃으면 새 참가자로 입장해야 합니다. 공개 운영의 트래픽·보존·비밀 회전 정책은 운영자가 관리해야 합니다.
