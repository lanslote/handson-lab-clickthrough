/* Lab content: Agent Academy · Recruit NextGen · Mission 04 (Korean UI captured from a real Copilot Studio tenant).
   Coordinates are in the 1280x800 screenshot space: box = [x, y, width, height].
   Besides click/input steps, the lab mixes in learning gates so it cannot be finished by clicking blindly:
   predict (guess before you see), check (checkpoint question), edit (change the instructions yourself),
   compare (look at real before/after results), reflect (write it in your own words). */
(() => {
  const NAME = 'Contoso IT Concierge';
  const INSTR = [
    '당신은 직원이 일반적인 IT 문제를 해결하고 사용 가능한 기기를 찾도록 돕는 IT 헬프데스크 도우미입니다. 정중하고 간결하며 도움이 되는 태도를 유지하세요.',
    '추가된 지식 소스를 공식 안내의 주요 출처로 사용하세요.',
    '단계를 지어내지 마세요. 공식 안내를 확인할 수 없으면 그렇게 밝히고, 안전한 진단, 다음 단계 또는 에스컬레이션을 제안하세요.',
    '',
    '문제 해결:',
    '- 세부 정보(목표, 증상/오류, 앱, 기기)가 부족하면 핵심 질문을 하나만 하세요.',
    '- 먼저 안전한 진단과 빠른 해결책(재시작, 연결 확인, 로그인, 서비스 상태)을 시도하세요.',
    '- 짧고 실행 가능한 번호 매긴 단계별 지침을 제공하세요.',
    '- 문제가 해결되지 않으면 1~2가지 대체 문제 해결 방법을 제안하세요.',
    '- 2~3가지 방법을 시도한 후에도 해결되지 않으면 에스컬레이션을 권장하고, 증상, 오류 메시지, 영향받는 기기 또는 애플리케이션, 이미 시도한 문제 해결 단계를 포함한 간결한 티켓 요약을 제공하세요.',
    '- 관련 지원 링크가 있으면 포함하고, URL은 제공된 그대로 유지하세요.',
    '',
    '기기 요청:',
    '- 필요한 기기 유형을 물어보세요.',
    '- 사용 가능한 지식 소스와 제공된 데이터를 활용해 선택지를 안내하세요.',
    '',
    '보안 및 규정 준수:',
    '- 비밀번호, 일회용 암호(OTP) 등 민감한 자격 증명은 절대 요청하지 마세요.',
    '- 보안 통제, 인증 또는 회사 정책을 우회해 달라는 요청은 거절하세요.',
    '',
    '범위 제한:',
    '- IT 문제 해결, 기기 안내, 승인된 지식 소스로 답할 수 있는 질문에 관한 IT 헬프데스크 요청만 지원하세요.',
    '- 이 범위를 벗어난 요청에는 응답하지 마세요.'
  ].join('\n');
  const INSTR_NO_SCOPE = INSTR.split('\n\n범위 제한:')[0];
  const URL1 = 'https://support.microsoft.com';
  const URL2 = 'https://learn.microsoft.com/troubleshoot';
  const FILE = 'Contoso_Guest_WiFi_Connection_Guide.docx';
  const GREETING = 'Contoso IT Concierge에 오신 것을 환영합니다. 기술적인 문제가 있으시거나 기기를 찾고 계신가요? 알맞은 해결 방법이나 다음 단계를 안내해 드릴게요. 무엇을 도와드릴까요?';
  const Q1 = '내 Surface의 보증 상태는 어떻게 확인하나요?';
  const Q2 = '게스트 Wi-Fi에는 어떻게 연결하나요? 사용 시간 제한도 알려 주세요.';
  const QCODE = '파이썬으로 리스트를 정렬하는 코드를 작성해 주세요.';

  const ORIGIN = 'https://microsoft.github.io/agent-academy/recruit-nextgen/04-build-a-custom-agent/';
  const B = 'copilotstudio.microsoft.com/environments/contoso-dev';
  const norm = s => String(s).replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
  const eq = exp => v => norm(v) === norm(exp);
  const click = (img, box, label, extra) => Object.assign({ kind: 'click', img, box, label }, extra);
  const input = (img, box, label, value, extra) => Object.assign({ kind: 'input', img, box, label, value, ok: eq(value) }, extra);
  const quiz = o => Object.assign({ kind: 'quiz' }, o);

  window.LAB = {
    title: 'Agent Academy',
    subtitle: 'Recruit NextGen · Mission 04',
    width: 1280, height: 800,
    origin: ORIGIN,
    creditsNote: { q1: 27.93, total: 53.72 },
    challenge: {
      title: '실제 환경 도전 과제',
      items: [
        '지침의 역할과 범위 제한을 <b>HR 휴가 규정 도우미</b>로 바꿔 보세요.',
        '범위 밖 질문 1개와 경계 질문 1개를 보내 응답이 어떻게 달라지는지 확인하세요.',
        '응답의 <b>인용과 추론 과정</b>을 열어 근거가 맞는지 점검하세요.'
      ]
    },
    transferModel: '예) 역할을 "HR 휴가 규정 도우미"로 바꾸고, 범위 제한을 "휴가·근태 규정 질문만"으로 좁힌다. 지식 소스는 IT 문서 대신 HR 규정 문서(SharePoint/파일)로 교체하고, 급여·개인정보 같은 민감한 요청은 거절한다는 보안 규칙은 그대로 둔다.',
    steps: [
      {
        id: 'intro', section: '시작', title: 'Contoso IT Concierge 만들기', url: B + '/home', img: 's01-home.png', manual: true, nextLabel: '실습 시작 →',
        body: [
          { t: 'p', html: '직원의 IT 문제 해결과 기기 요청을 돕는 <b>Contoso IT Concierge</b> 에이전트를 GitHub Copilot 하니스로 만듭니다.' },
          { t: 'ul', items: ['에이전트 이름과 지침(안내) 설정', '지식 소스 2종 연결 (공개 웹 사이트, 파일)', '인사말 설정', '미리 보기 테스트와 <b>범위 제한 실험</b>'] },
          { t: 'note', tone: 'credit', html: '🧪 왼쪽은 <b>실제 Copilot Studio를 한국어 UI로 캡처한 화면</b>입니다. 테넌트, 라이선스, Copilot Credits 없이 같은 순서로 따라 할 수 있습니다.' },
          { t: 'note', html: '클릭만으로는 끝나지 않게 만들었습니다. 중간에 <b>🔮 예측</b>, <b>🧠 체크포인트</b>, <b>🧪 직접 고쳐 보기</b>가 나오고, 마지막에는 <b>한 줄 답안</b>을 씁니다.' },
          { t: 'note', html: '막히면 <b>힌트</b>를 먼저 보세요. 힌트를 확인하면 <b>대신 해주기</b>가 열립니다. 사용 횟수는 완료 화면에 기록됩니다.' },
          { t: 'note', html: '원본 실습의 SharePoint 단계는 별도 사이트가 필요해 이 랩에서는 제외했습니다.' }
        ]
      },
      {
        id: 'create', section: '1. 에이전트 만들기', title: '에이전트 카드 선택', url: B + '/home', anchor: '#_4-1-create-a-new-agent-with-the-github-copilot-harness',
        body: [
          { t: 'p', html: 'Copilot Studio <b>홈</b>에서 <b>에이전트</b> 카드(<b>GitHub Copilot</b> 배지)를 선택합니다.' },
          { t: 'note', html: '<b>GitHub Copilot 하니스</b>는 대화 경로를 직접 그리는 대신, 자연어 지침과 목표 중심으로 동작하는 방식입니다.' }
        ],
        actions: [click('s01-home.png', [408, 330, 229.3, 267], '에이전트 카드 클릭')]
      },
      {
        id: 'rename', section: '1. 에이전트 만들기', title: '에이전트 이름 바꾸기', url: B + '/agents/new', anchor: '#_4-1-create-a-new-agent-with-the-github-copilot-harness',
        body: [
          { t: 'p', html: '이름 입력란에 아래 이름을 입력합니다.' },
          { t: 'copy', label: '에이전트 이름', text: NAME }
        ],
        actions: [input('s02-name.png', [401, 125, 430, 42], '이름 입력란에 입력', NAME)]
      },
      {
        id: 'instructions', section: '1. 에이전트 만들기', title: '안내(지침) 붙여넣기', url: B + '/agents/new', anchor: '#_4-1-create-a-new-agent-with-the-github-copilot-harness',
        body: [
          { t: 'p', html: '아래 지침을 복사해 <b>안내</b> 편집기에 붙여넣습니다. 에이전트가 <b>안전하고, 회사 규칙을 따르고, 승인된 IT 지원 업무에만 집중</b>하도록 만드는 장치이니 내용을 꼼꼼히 읽어보세요.' },
          { t: 'copy', label: '안내(지침)', text: INSTR, pre: true }
        ],
        actions: [
          input('s03-instructions.png', [280, 276, 552, 260], '안내 편집기에 붙여넣기', INSTR, {
            multiline: true,
            ok: v => { const n = norm(v); return n.includes('IT 헬프데스크 도우미') && n.includes('응답하지 마세요') && n.length > norm(INSTR).length * 0.9; }
          }),
          quiz({
            id: 'c1', mode: 'check', img: 's03-instructions.png', label: '체크포인트: 범위를 막는 문장은?',
            q: '방금 붙여넣은 지침 중, <b>업무 범위를 벗어난 요청에 응답하지 않도록</b> 막는 문장은 어느 것일까요?',
            options: ['추가된 지식 소스를 공식 안내의 주요 출처로 사용하세요.', '비밀번호, 일회용 암호(OTP) 등 민감한 자격 증명은 절대 요청하지 마세요.', '이 범위를 벗어난 요청에는 응답하지 마세요.', '먼저 안전한 진단과 빠른 해결책을 시도하세요.'],
            answer: 2,
            why: { 0: '지식 소스를 어떻게 쓸지에 관한 규칙이에요.', 1: '보안 규칙이에요. 업무 범위와는 다른 문제입니다.', 3: '문제 해결 순서에 관한 규칙이에요.' },
            hint: "'범위'라는 단어가 들어간 문장을 찾아보세요.",
            explain: '이 문장이 속한 <b>\'범위 제한\'</b> 섹션이 에이전트의 업무 경계를 정합니다. 뒤에서 이 문장을 직접 지워 보는 실험을 합니다.'
          })
        ]
      },
      {
        id: 'k-public', section: '2. 지식 추가', title: '공개 웹 사이트 지식 준비', url: B + '/agents/new', anchor: '#_4-2-add-knowledge',
        body: [
          { t: 'p', html: '에이전트가 믿을 수 있는 <b>정보 출처</b>를 연결합니다. <b>지식</b> 옆 <b>+</b>를 누르고 <b>공개 웹 사이트</b>를 선택합니다.' },
          { t: 'p', html: '기본값은 <b>모든 웹 사이트 검색</b>입니다. 우리가 지정한 사이트만 참조하도록 이 토글을 <b>끕니다</b>.' }
        ],
        actions: [
          click('s04-knowledge-add.png', [877, 367, 382, 46], '지식 추가(+) 클릭'),
          click('s05-knowledge-picker.png', [265, 465, 367.5, 58], "'공개 웹 사이트' 선택"),
          click('s06-toggle-off.png', [952, 151, 56, 36], "'모든 웹 사이트 검색' 토글 끄기")
        ]
      },
      {
        id: 'k-urls', section: '2. 지식 추가', title: '공개 웹 사이트 2개 추가', url: B + '/agents/new', anchor: '#_4-2-add-knowledge',
        body: [
          { t: 'p', html: '아래 링크를 하나씩 입력하고 <b>추가</b>를 누릅니다. 두 개를 추가한 뒤 <b>에이전트에 추가</b>를 선택하세요.' },
          { t: 'copy', label: '링크 #1', text: URL1 },
          { t: 'copy', label: '링크 #2', text: URL2 }
        ],
        actions: [
          input('s07-url1.png', [266, 246, 635, 30], '링크 #1 입력', URL1),
          click('s08-url1-add.png', [912, 245, 96, 32], "'추가' 클릭"),
          input('s09-url2.png', [266, 246, 635, 30], '링크 #2 입력', URL2),
          click('s10-url2-add.png', [912, 245, 96, 32], "'추가' 클릭"),
          click('s11-web-commit.png', [791.1, 681, 119.9, 32], "'에이전트에 추가' 클릭")
        ]
      },
      {
        id: 'k-file', section: '2. 지식 추가', title: '문서 파일 업로드', url: B + '/agents/contoso-it-concierge', anchor: '#_4-2-add-knowledge',
        body: [
          { t: 'p', html: '이번에는 문서를 에이전트에 직접 올립니다. <b>끌어서 놓거나 클릭하여 업로드</b>를 누르고, 탐색기에서 아래 파일을 선택하세요.' },
          { t: 'copy', label: '업로드할 파일', text: FILE },
          { t: 'note', html: '텍스트 기반 파일만 지원되고, 파일은 Dataverse에 안전하게 저장됩니다.' }
        ],
        actions: [
          click('s12-knowledge-add2.png', [877, 367, 382, 46], '지식 추가(+) 클릭'),
          click('s13-picker-upload.png', [265, 219, 743, 174], "'끌어서 놓거나 클릭하여 업로드' 클릭"),
          { kind: 'filepick', img: 's13-picker-upload.png', label: '탐색기에서 ' + FILE + ' 선택 후 열기', file: FILE, hint: '목록에는 다른 파일도 있어요. 이름이 정확히 같은 파일을 고르세요.' },
          click('s14-file-commit.png', [791.1, 681, 119.9, 32], "'에이전트에 추가' 클릭")
        ]
      },
      {
        id: 'settings', section: '3. 설정 확인', title: '에이전트 설정 열기', url: B + '/agents/contoso-it-concierge', anchor: '#_4-3-review-agent-settings',
        body: [
          { t: 'p', html: '테스트 전에 설정을 확인합니다. 상단 <b>⋯(옵션 더 보기)</b>에서 <b>설정</b>을 엽니다.' },
          { t: 'p', html: '<b>에이전트 세부 정보</b> 탭의 <b>솔루션</b> 필드에는 이 에이전트가 속한 솔루션이 표시됩니다.' }
        ],
        actions: [
          click('s15-more-menu.png', [916, 13.5, 32, 32], '⋯(옵션 더 보기) 클릭'),
          click('s16-menu-settings.png', [921, 51, 128, 32], "'설정' 선택")
        ]
      },
      {
        id: 'greeting', section: '3. 설정 확인', title: '인사말 바꾸기', url: B + '/agents/contoso-it-concierge', anchor: '#_4-3-review-agent-settings',
        body: [
          { t: 'p', html: '<b>인사말 및 프롬프트</b> 탭에서 사용자가 대화를 시작할 때 처음 보이는 인사말을 바꿉니다.' },
          { t: 'copy', label: '인사말 메시지', text: GREETING },
          { t: 'p', html: '<b>완료</b>를 누르면 설정 창이 닫힙니다.' },
          { t: 'note', html: '이 UI는 변경 내용을 자동 저장합니다. 별도로 저장 버튼을 누르지 않아도 됩니다.' }
        ],
        actions: [
          click('s17-settings-details.png', [257, 356, 228, 48], "'인사말 및 프롬프트' 탭 클릭"),
          input('s18-greeting.png', [535, 342, 470, 52], '인사말 메시지 입력', GREETING, { ok: v => norm(v).includes(norm(GREETING)) }),
          click('s19-greeting-done.png', [919, 685, 96, 32], "'완료' 클릭")
        ]
      },
      {
        id: 'preview', section: '4. 에이전트 테스트', title: '미리 보기 열기', url: B + '/agents/contoso-it-concierge', anchor: '#_4-4-test-agent',
        body: [
          { t: 'p', html: '<b>미리 보기</b> 탭에서 방금 바꾼 인사말이 보이는지 확인합니다.' },
          { t: 'note', tone: 'credit', html: '💰 <b>빌드 탭의 수동 설정은 크레딧을 쓰지 않지만, 미리 보기 대화는 실제 사용자 대화와 같은 런타임 요금</b>이 청구됩니다. 화면 상단의 <b>크레딧 카운터</b>로 확인할 수 있습니다.' }
        ],
        actions: [click('s21-preview-tab.png', [636.7, 13.5, 79.3, 32], "'미리 보기' 탭 클릭")]
      },
      {
        id: 'q1', section: '4. 에이전트 테스트', title: '공개 웹 사이트 지식 테스트', url: B + '/agents/contoso-it-concierge/preview', anchor: '#_4-4-test-agent', credits: 27.93,
        body: [
          { t: 'p', html: '공개 웹 사이트(외부) 지식 소스를 확인하는 질문을 보냅니다. 보내기 전에 먼저 <b>결과를 예측</b>해 보세요.' },
          { t: 'copy', label: '질문 #1', text: Q1 },
          { t: 'note', tone: 'warn', html: '화면의 응답은 <b>실제 에이전트가 생성한 결과</b>입니다. 직접 실행하면 문장은 매번 조금씩 달라질 수 있습니다.' }
        ],
        actions: [
          quiz({
            id: 'p1', mode: 'predict', img: 's21-preview-tab.png', label: '예측: 어떤 지식을 쓸까?',
            q: '"내 Surface의 보증 상태는 어떻게 확인하나요?"라고 물으면, 에이전트는 어떤 지식을 사용할까요?',
            options: ['공개 웹 사이트만 사용한다', '업로드한 Wi-Fi 가이드 문서만 사용한다', '웹 검색과 지식 검색을 함께 실행하고, 관련 있는 출처만 근거로 쓴다', '지식 없이 모델이 아는 내용으로만 답한다'],
            answer: 2, near: [0],
            explain: '실제 추론 과정에서 에이전트는 <b>웹 검색과 지식 검색을 병렬로 실행</b>한 뒤, 업로드한 파일은 Wi-Fi 가이드라 관련이 없다고 판단해 <b>웹 결과만 근거</b>로 삼았습니다.'
          }),
          input('s22-q1-input.png', [449, 671.4, 668, 27.2], '채팅 입력란에 질문 입력', Q1),
          click('s23-q1-send.png', [1097, 669, 32, 32], "'보내기' 클릭 또는 Enter", { enter: true, wait: { img: 's24-q1-thinking.png', ms: 2600 } })
        ]
      },
      {
        id: 'q1-review', section: '4. 에이전트 테스트', title: '추론 과정과 인용 확인', url: B + '/agents/contoso-it-concierge/preview', anchor: '#_4-4-test-agent',
        body: [
          { t: 'predictResult', id: 'p1' },
          { t: 'p', html: '<b>Ran 2 events in parallel</b>을 펼치면 <b>web_search</b>와 <b>지식 검색</b>이 함께 실행된 것을 볼 수 있습니다. 아래로 내려가 <b>인용</b>도 확인하세요.' }
        ],
        actions: [
          click('s26-q1-top.png', [376.5, 282, 768, 20], "'Ran 2 events in parallel' 펼치기"),
          click('s27-q1-events-open.png', [746, 579, 44, 44], "'맨 아래로 스크롤' 클릭"),
          click('s28-q1-bottom.png', [377, 526, 283, 25], '첫 번째 인용 클릭', { toast: '실제 환경에서는 출처 문서가 새 탭에서 열립니다.' }),
          quiz({
            id: 'c2', mode: 'check', img: 's28-q1-bottom.png', label: '체크포인트: 왜 문서 인용이 없을까?',
            q: '응답 하단 <b>인용</b>에 <b>Wi-Fi 가이드 문서가 없는 이유</b>는 무엇일까요?',
            options: ['문서 업로드가 실패했기 때문', '질문과 관련이 없다고 판단해 근거로 쓰지 않았기 때문', '인용에는 웹 사이트만 표시되기 때문', '에이전트가 .docx 파일을 읽을 수 없기 때문'],
            answer: 1,
            why: { 0: '업로드가 실패했다면 지식 목록에 파일이 보이지 않았을 거예요.', 2: '두 번째 질문에서는 문서가 근거로 쓰입니다.', 3: '뒤에서 에이전트가 .docx를 읽어 답하는 장면을 보게 됩니다.' },
            hint: '펼쳐 본 추론 과정에 힌트가 있어요. 업로드한 파일에 대해 무엇이라고 했나요?',
            explain: '추론 과정에 "The uploaded files are WiFi guides, unrelated"라고 나옵니다. 검색은 했지만 <b>근거로 쓰지 않은 것</b>이지 실패가 아닙니다.'
          })
        ]
      },
      {
        id: 'q2', section: '4. 에이전트 테스트', title: '업로드한 문서 지식 테스트', url: B + '/agents/contoso-it-concierge/preview', anchor: '#_4-4-test-agent', credits: 25.79,
        body: [
          { t: 'p', html: '이번에는 <b>업로드한 Wi-Fi 가이드 문서</b>가 근거가 되는 질문입니다. 먼저 예측해 보세요.' },
          { t: 'copy', label: '질문 #2', text: Q2 }
        ],
        actions: [
          quiz({
            id: 'p2', mode: 'predict', img: 's28-q1-bottom.png', label: '예측: 비밀번호는 어떻게 안내할까?',
            q: '게스트 Wi-Fi 연결 방법을 물으면, 에이전트는 <b>비밀번호</b>를 어떻게 안내할까요?',
            options: ['문서에 적힌 비밀번호를 그대로 알려 준다', '문서에는 비밀번호가 없고, IT 팀에 요청하라고 안내한다', '보안 정책상 답변 자체를 거부한다', '임의의 비밀번호를 만들어 알려 준다'],
            answer: 1,
            explain: '원본 문서가 <b>"IT 팀에 사용자 이름과 비밀번호를 요청"</b>하라고 안내하고, 지침의 보안 규칙도 함께 작동해 <b>대화에 비밀번호를 입력하지 말라</b>는 주의까지 덧붙였습니다.'
          }),
          input('s30-q2-input.png', [449, 671.4, 668, 27.2], '채팅 입력란에 질문 입력', Q2),
          click('s31-q2-send.png', [1097, 669, 32, 32], "'보내기' 클릭 또는 Enter", { enter: true, wait: { img: 's32-q2-thinking.png', ms: 2600 } })
        ]
      },
      {
        id: 'q2-review', section: '4. 에이전트 테스트', title: '응답과 크레딧 사용량 확인', url: B + '/agents/contoso-it-concierge/preview', anchor: '#_4-4-test-agent',
        body: [
          { t: 'predictResult', id: 'p2' },
          { t: 'p', html: '에이전트가 <b>문서 분석 스킬</b>로 파일을 읽었습니다. 상단 크레딧 카운터 옆 <b>ⓘ</b>를 눌러 예상 사용량의 의미를 확인하세요.' },
          { t: 'note', html: '예상 사용량은 계획 목적의 값이고, 실제 사용량은 <b>모니터</b> 탭에서 확인합니다.' }
        ],
        actions: [
          click('s33-q2-response.png', [591.5, 98, 24, 24], 'ⓘ(예상 사용량) 클릭'),
          quiz({
            id: 'c3', mode: 'check', img: 's36-credit-info-open.png', label: '체크포인트: 비밀번호를 안 알려준 이유',
            q: '에이전트가 비밀번호를 직접 알려주지 않고 <b>"IT 팀에 요청하라"</b>고 한 가장 알맞은 이유는?',
            options: ['모델이 무작위로 그렇게 답했다', '원본 문서가 그렇게 안내하고, 지침의 보안 규칙도 있다', '미리 보기에서는 비밀번호를 보여 줄 수 없다', '인터넷 연결이 끊겼다'],
            answer: 1,
            why: { 0: '우연이 아니라, 문서 내용과 지침이 함께 만든 결과예요.', 2: '미리 보기에는 그런 제한이 없어요.', 3: '응답은 정상적으로 생성되었어요.' },
            hint: '응답은 두 가지를 근거로 합니다. 하나는 문서, 다른 하나는 지침의 어떤 섹션일까요?',
            explain: '<b>문서(근거)</b>와 <b>지침의 보안 규칙(행동 규칙)</b>이 함께 응답을 만들었습니다. 지식은 "무엇을 아는가", 지침은 "어떻게 행동하는가"를 정합니다.'
          })
        ]
      },
      {
        id: 'whatif-edit', section: '5. 실험: 범위 제한', title: '범위 제한을 지우면?', url: B + '/agents/contoso-it-concierge', anchor: '#_4-1-create-a-new-agent-with-the-github-copilot-harness',
        body: [
          { t: 'p', html: '앞에서 본 <b>범위 제한</b> 섹션은 정말 필요할까요? 같은 에이전트에서 이 섹션만 지우고 <b>같은 질문</b>을 보낸 결과를 실제로 실행해 두었습니다.' },
          { t: 'copy', label: '실험에 쓴 질문', text: QCODE },
          { t: 'p', html: '먼저 결과를 예측하고, 지침에서 해당 섹션을 <b>직접 지워</b> 보세요.' }
        ],
        actions: [
          quiz({
            id: 'p3', mode: 'predict', img: 's15-more-menu.png', label: '예측: 범위 제한이 없으면?',
            q: '지침에서 <b>\'범위 제한\' 섹션을 지운 뒤</b> "파이썬으로 리스트를 정렬하는 코드를 작성해 주세요."라고 요청하면 에이전트는?',
            options: ['여전히 정중하게 거절한다', '코드를 작성해 준다', '오류가 발생한다', 'IT 헬프데스크 문서에서 관련 내용을 찾아 인용한다'],
            answer: 1,
            explain: '범위 제한이 없으면 <b>"도움이 되는 것"</b>이 우선되어 IT와 가까운 일반 요청에는 답했습니다.'
          }),
          {
            kind: 'edit', img: 's15-more-menu.png', label: "지침에서 '범위 제한' 섹션 지우기", text: INSTR, value: INSTR_NO_SCOPE,
            hint: "맨 아래 '범위 제한:'으로 시작하는 마지막 세 줄(빈 줄 포함)을 지우세요. 다른 섹션은 그대로 두어야 해요.",
            check: v => {
              if (!/보안 및 규정 준수/.test(v) || !/문제 해결:/.test(v)) return { ok: false, msg: "너무 많이 지웠어요. 다른 섹션은 그대로 두고 '범위 제한' 섹션만 지우세요." };
              if (/범위 제한|벗어난 요청/.test(v)) return { ok: false, msg: "아직 '범위 제한' 섹션이 남아 있어요. 마지막 줄들을 찾아 지워 보세요." };
              return { ok: true };
            }
          }
        ]
      },
      {
        id: 'whatif-compare', section: '5. 실험: 범위 제한', title: '실제 실행 결과 비교', url: B + '/agents/contoso-it-concierge/preview', anchor: '#_4-4-test-agent',
        body: [
          { t: 'predictResult', id: 'p3' },
          { t: 'p', html: '아래 세 화면은 <b>실제로 실행한 결과</b>입니다. 탭을 눌러 모두 확인하세요. 이미지를 클릭하면 크게 볼 수 있습니다.' }
        ],
        actions: [
          {
            kind: 'compare', label: '세 가지 실행 결과 모두 확인하기',
            imgs: [
              { src: 's42-code-a-with-scope.png', tab: 'A · 범위 제한 있음', cap: '요청: 파이썬 정렬 코드 작성 → 정중히 거절' },
              { src: 's43-code-b-without-scope.png', tab: 'B · 범위 제한 없음', cap: '같은 요청 → 코드를 작성해 줌' },
              { src: 's41-lunch-b-without-scope.png', tab: 'C · 번외: 점심 메뉴', cap: '범위 제한이 없어도 "점심 메뉴 추천"은 거절' }
            ]
          },
          quiz({
            id: 'c4', mode: 'check', img: 's41-lunch-b-without-scope.png', label: '체크포인트: 점심 메뉴는 왜 거절했을까?',
            q: '범위 제한을 지웠는데도 <b>"점심 메뉴 추천"은 거절</b>했습니다. 가장 알맞은 이유는?',
            options: ['지식 소스에 점심 정보가 없어서', "첫 줄의 역할 정의('IT 헬프데스크 도우미')만으로도 명백한 범위 밖이라고 판단해서", '미리 보기는 일반 질문을 막기 때문에', '저장이 덜 되어 이전 지침이 남아 있었기 때문'],
            answer: 1,
            why: { 0: '추론 과정에는 지식 검색 얘기가 없고, "IT 헬프데스크 범위를 벗어난다"고 판단했어요.', 2: '같은 미리 보기에서 코드는 답해 줬어요.', 3: '저장은 확인했고, 코드 질문 결과가 달라진 것이 증거예요.' },
            hint: '추론 과정 첫 문장을 보세요. 무엇을 기준으로 범위 밖이라고 했나요?',
            explain: '<b>명백히 무관한 요청</b>은 역할 정의만으로 걸러졌고, <b>IT와 비슷한 경계 요청</b>(코드 작성)은 범위 제한 문장이 있어야 막혔습니다. 경계를 문장으로 <b>명시</b>해야 하는 이유입니다.'
          })
        ]
      },
      {
        id: 'transfer', section: '6. 정리', title: '내 말로 정리하기', url: B + '/agents/contoso-it-concierge', img: 's15-more-menu.png',
        body: [
          { t: 'p', html: '배운 것을 다른 상황에 적용해 봅니다. 정답은 없고, 자신의 말로 쓰는 것이 중요합니다.' }
        ],
        actions: [
          {
            kind: 'reflect', id: 'r1', img: 's15-more-menu.png', label: '한 줄 이상으로 답안 쓰기', minLen: 20,
            q: '이 에이전트를 <b>"HR 휴가 규정 도우미"</b>로 바꾼다면, <b>지침과 지식에서 무엇을 어떻게 바꾸겠어요?</b>',
            placeholder: '예) 역할은 ..., 범위 제한은 ..., 지식 소스는 ...',
            rubric: [
              { label: '역할', re: /역할|도우미|페르소나|이름/ },
              { label: '범위 제한', re: /범위|제한|거절|벗어/ },
              { label: '지식 소스', re: /지식|문서|SharePoint|파일|웹|규정/ },
              { label: '보안 규칙', re: /보안|개인정보|민감|급여|금지/ }
            ]
          }
        ]
      },
      {
        id: 'final-quiz', section: '6. 정리', title: '마무리 퀴즈', url: B + '/agents/contoso-it-concierge', img: 's36-credit-info-open.png',
        body: [{ t: 'p', html: '핵심 개념 세 가지를 확인합니다.' }],
        actions: [
          quiz({
            id: 'f1', mode: 'check', img: 's36-credit-info-open.png', label: '퀴즈 1/3: 크레딧',
            q: '다음 중 <b>Copilot Credits를 소모</b>하는 작업은?',
            options: ['빌드 탭에서 지침 수정', '지식 소스 추가', '미리 보기에서 질문 보내기', '에이전트 이름 변경'], answer: 2,
            why: { 0: '빌드 탭의 수동 설정은 크레딧을 쓰지 않아요.', 1: '빌드 탭의 수동 설정은 크레딧을 쓰지 않아요.', 3: '이름 변경도 수동 설정이에요.' },
            hint: '화면 상단 크레딧 카운터가 올라간 순간을 떠올려 보세요.',
            explain: '<b>미리 보기 대화</b>는 실제 사용자 대화와 같은 런타임 요금이 청구됩니다.'
          }),
          quiz({
            id: 'f2', mode: 'check', img: 's36-credit-info-open.png', label: '퀴즈 2/3: 웹 검색 끄기',
            q: "<b>'모든 웹 사이트 검색'을 끈 이유</b>는 무엇일까요?",
            options: ['응답 속도를 높이기 위해', '지정한 사이트만 근거로 삼도록 범위를 제한하려고', '크레딧을 아끼려고', '파일 업로드를 가능하게 하려고'], answer: 1,
            why: { 0: '속도가 목적은 아니에요.', 2: '크레딧 절감이 목적은 아니에요.', 3: '파일 업로드와는 관계가 없어요.' },
            hint: '"우리가 지정한 사이트만"이라는 표현을 떠올려 보세요.',
            explain: '신뢰할 수 있는 출처만 근거로 삼게 해서 <b>응답의 신뢰도</b>를 관리합니다.'
          }),
          quiz({
            id: 'f3', mode: 'check', img: 's36-credit-info-open.png', label: '퀴즈 3/3: 근거 확인',
            q: '응답이 믿을 만한지 확인하는 <b>가장 직접적인 방법</b>은?',
            options: ['응답이 길고 자세한지 본다', '인용과 추론 과정을 열어 근거를 확인한다', '같은 질문을 여러 번 보내 본다', '에이전트에게 정말 맞냐고 되묻는다'], answer: 1,
            why: { 0: '길이는 정확성을 보장하지 않아요.', 2: '일관성은 보지만 근거는 알 수 없어요.', 3: '에이전트의 자기 평가는 근거가 아니에요.' },
            hint: '이 랩에서 두 번 펼쳐 본 영역이에요.',
            explain: '<b>인용</b>과 <b>추론 과정</b>이 근거를 보여 줍니다. 앞의 체크포인트에서 그렇게 해서 답을 찾았습니다.'
          })
        ]
      },
      {
        id: 'review', section: '마무리', title: '결과 확인', url: B + '/agents/contoso-it-concierge/preview', img: 's36-credit-info-open.png', manual: true, final: true, nextLabel: '미션 완료 ✓',
        body: [
          { t: 'p', html: '에이전트를 만들고, 지침과 지식으로 근거 기반 응답을 확인했고, <b>범위 제한이 왜 필요한지 직접 실험</b>해 보았습니다.' },
          { t: 'note', html: '다음 미션에서는 이 에이전트에 <b>도구</b>를 붙여 데이터 연동으로 확장합니다.' }
        ]
      }
    ]
  };

  // Short explainer clips (Remotion) and one-line "why" notes, attached to steps by id.
  const CLIPS = {
    intro: ['videos/intro.mp4', 37, '이 랩 사용 방법'],
    create: ['videos/clip-harness.mp4', 15, 'GitHub Copilot 하니스 에이전트'],
    instructions: ['videos/clip-instructions.mp4', 15, '안내(지침)'],
    'k-public': ['videos/clip-knowledge-web.mp4', 15, '공개 웹 사이트 지식'],
    'k-file': ['videos/clip-knowledge-file.mp4', 15, '문서 파일 지식'],
    preview: ['videos/clip-preview.mp4', 15, '미리 보기와 크레딧'],
    'q1-review': ['videos/clip-evidence.mp4', 15, '추론 과정과 인용'],
    'whatif-edit': ['videos/clip-scope.mp4', 15, '범위 제한 실험']
  };
  const WHY = {
    rename: '이름은 사용자가 보는 에이전트의 얼굴이에요. 이후 인사말과 지침에도 이 이름을 씁니다.',
    'k-urls': '허용할 사이트를 정확히 지정해야 에이전트가 그 사이트만 근거로 삼아요.',
    settings: '사용자가 처음 보는 인사말 같은 항목은 설정 창에서 바꿀 수 있어요.',
    greeting: '첫 문장이 에이전트가 무엇을 도와주는지 알려 줘서, 첫 질문을 쉽게 만들어요.',
    q1: '지식 소스가 실제로 연결되어 답에 쓰이는지 직접 시험해 보는 단계예요.',
    q2: '내부 문서가 근거로 쓰이는지 확인하려고, 문서에만 있는 내용을 물어봐요.',
    'q2-review': '크레딧 카운터를 보며 테스트 비용을 감각으로 익혀요.',
    'whatif-compare': '같은 질문의 결과를 나란히 보면 지침 한 줄의 효과가 분명해져요.',
    transfer: '배운 것을 다른 상황에 옮겨 보면 이해가 오래 남아요.',
    'final-quiz': '핵심 개념을 한 번 더 꺼내 보며 기억을 단단하게 해요.'
  };
  window.LAB.steps.forEach(s => {
    if (CLIPS[s.id]) s.video = { src: CLIPS[s.id][0], sec: CLIPS[s.id][1], title: CLIPS[s.id][2] };
    if (WHY[s.id]) s.why = WHY[s.id];
  });
})();
