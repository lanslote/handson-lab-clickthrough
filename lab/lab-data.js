/* Lab content: Agent Academy · Recruit NextGen · Mission 04 (Korean UI captured from a real Copilot Studio tenant).
   Coordinates are in the 1280x800 screenshot space: box = [x, y, width, height]. */
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
  const URL1 = 'https://support.microsoft.com';
  const URL2 = 'https://learn.microsoft.com/troubleshoot';
  const FILE = 'Contoso_Guest_WiFi_Connection_Guide.docx';
  const GREETING = 'Contoso IT Concierge에 오신 것을 환영합니다. 기술적인 문제가 있으시거나 기기를 찾고 계신가요? 알맞은 해결 방법이나 다음 단계를 안내해 드릴게요. 무엇을 도와드릴까요?';
  const Q1 = '내 Surface의 보증 상태는 어떻게 확인하나요?';
  const Q2 = '게스트 Wi-Fi에는 어떻게 연결하나요? 사용 시간 제한도 알려 주세요.';

  const ORIGIN = 'https://microsoft.github.io/agent-academy/recruit-nextgen/04-build-a-custom-agent/';
  const B = 'copilotstudio.microsoft.com/environments/contoso-dev';
  const norm = s => String(s).replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
  const eq = exp => v => norm(v) === norm(exp);
  const click = (img, box, label, extra) => Object.assign({ kind: 'click', img, box, label }, extra);
  const input = (img, box, label, value, extra) => Object.assign({ kind: 'input', img, box, label, value, ok: eq(value) }, extra);

  window.LAB = {
    title: 'Agent Academy',
    subtitle: 'Recruit NextGen · Mission 04',
    width: 1280, height: 800,
    origin: ORIGIN,
    creditsNote: { q1: 27.93, total: 53.72 },
    steps: [
      {
        id: 'intro', section: '시작', title: 'Contoso IT Concierge 만들기', url: B + '/home', img: 's01-home.png', manual: true, nextLabel: '실습 시작 →',
        body: [
          { t: 'p', html: '직원의 IT 문제 해결과 기기 요청을 돕는 <b>Contoso IT Concierge</b> 에이전트를 GitHub Copilot 하니스로 만듭니다.' },
          { t: 'ul', items: ['에이전트 이름과 지침(안내) 설정', '지식 소스 2종 연결 (공개 웹 사이트, 파일)', '인사말 설정', '미리 보기에서 기준선 테스트 2회'] },
          { t: 'note', tone: 'credit', html: '🧪 왼쪽은 <b>실제 Copilot Studio를 한국어 UI로 캡처한 화면</b>입니다. 테넌트, 라이선스, Copilot Credits 없이 같은 순서로 따라 할 수 있습니다.' },
          { t: 'note', html: '원본 실습의 SharePoint 단계는 별도 사이트가 필요해 이 랩에서는 제외했습니다.' },
          { t: 'p', html: '<b>깜박이는 표시</b>를 따라 클릭하세요. 막히면 <b>힌트</b>나 <b>대신 해주기</b>를 쓰면 됩니다.' }
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
          { t: 'copy', label: '안내(지침)', text: INSTR, pre: true },
          { t: 'note', html: '<b>범위 제한</b> 섹션이 업무 범위를 벗어난 요청을 거절하게 만듭니다.' }
        ],
        actions: [input('s03-instructions.png', [280, 276, 552, 260], '안내 편집기에 붙여넣기', INSTR, {
          multiline: true,
          ok: v => { const n = norm(v); return n.includes('IT 헬프데스크 도우미') && n.includes('응답하지 마세요') && n.length > norm(INSTR).length * 0.9; }
        })]
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
          { t: 'p', html: '공개 웹 사이트(외부) 지식 소스를 확인하는 질문을 보냅니다.' },
          { t: 'copy', label: '질문 #1', text: Q1 },
          { t: 'note', tone: 'warn', html: '화면의 응답은 <b>실제 에이전트가 생성한 결과</b>입니다. 직접 실행하면 문장은 매번 조금씩 달라질 수 있습니다.' }
        ],
        actions: [
          input('s22-q1-input.png', [449, 671.4, 668, 27.2], '채팅 입력란에 질문 입력', Q1),
          click('s23-q1-send.png', [1097, 669, 32, 32], "'보내기' 클릭 또는 Enter", { enter: true, wait: { img: 's24-q1-thinking.png', ms: 2600 } })
        ]
      },
      {
        id: 'q1-review', section: '4. 에이전트 테스트', title: '추론 과정과 인용 확인', url: B + '/agents/contoso-it-concierge/preview', anchor: '#_4-4-test-agent',
        body: [
          { t: 'p', html: '에이전트가 어떻게 답을 만들었는지 확인합니다. <b>Ran 2 events in parallel</b>을 펼치면 <b>web_search</b>와 <b>지식 검색</b>이 함께 실행된 것을 볼 수 있습니다.' },
          { t: 'p', html: '아래로 내려가 <b>인용</b>에서 응답의 근거가 된 문서를 확인하세요.' }
        ],
        actions: [
          click('s26-q1-top.png', [376.5, 282, 768, 20], "'Ran 2 events in parallel' 펼치기"),
          click('s27-q1-events-open.png', [746, 579, 44, 44], "'맨 아래로 스크롤' 클릭"),
          click('s28-q1-bottom.png', [377, 526, 283, 25], '첫 번째 인용 클릭', { toast: '실제 환경에서는 출처 문서가 새 탭에서 열립니다.' })
        ]
      },
      {
        id: 'q2', section: '4. 에이전트 테스트', title: '업로드한 문서 지식 테스트', url: B + '/agents/contoso-it-concierge/preview', anchor: '#_4-4-test-agent', credits: 25.79,
        body: [
          { t: 'p', html: '이번에는 <b>업로드한 Wi-Fi 가이드 문서</b>가 근거가 되는 질문입니다.' },
          { t: 'copy', label: '질문 #2', text: Q2 }
        ],
        actions: [
          input('s30-q2-input.png', [449, 671.4, 668, 27.2], '채팅 입력란에 질문 입력', Q2),
          click('s31-q2-send.png', [1097, 669, 32, 32], "'보내기' 클릭 또는 Enter", { enter: true, wait: { img: 's32-q2-thinking.png', ms: 2600 } })
        ]
      },
      {
        id: 'q2-review', section: '4. 에이전트 테스트', title: '응답과 크레딧 사용량 확인', url: B + '/agents/contoso-it-concierge/preview', anchor: '#_4-4-test-agent',
        body: [
          { t: 'p', html: '에이전트가 <b>문서 분석 스킬</b>로 파일을 읽고, 비밀번호는 직접 알려주지 않고 <b>IT 팀에 요청하라고 안내</b>합니다. 지침의 보안 규칙이 지켜지고 있습니다.' },
          { t: 'p', html: '상단 크레딧 카운터 옆 <b>ⓘ</b>를 눌러 예상 사용량의 의미를 확인합니다.' },
          { t: 'note', html: '예상 사용량은 계획 목적의 값이고, 실제 사용량은 <b>모니터</b> 탭에서 확인합니다.' }
        ],
        actions: [click('s33-q2-response.png', [591.5, 98, 24, 24], 'ⓘ(예상 사용량) 클릭')]
      },
      {
        id: 'review', section: '마무리', title: '결과 확인', url: B + '/agents/contoso-it-concierge/preview', img: 's36-credit-info-open.png', manual: true, final: true, nextLabel: '미션 완료 ✓',
        body: [
          { t: 'p', html: '에이전트를 만들고, 지침과 지식으로 근거 기반 응답을 확인했습니다.' },
          { t: 'note', html: '다음 미션에서는 이 에이전트에 <b>도구</b>를 붙여 데이터 연동으로 확장합니다.' }
        ]
      }
    ]
  };
})();
