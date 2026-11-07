import { curriculumFor } from './shared/curriculum.js';

const curriculum = curriculumFor(window.LAB);
const $ = selector => document.querySelector(selector);
const pageRole = document.body.dataset.pageRole;
if (!['teacher', 'student'].includes(pageRole)) throw new Error('수업 화면 역할 설정이 올바르지 않습니다.');
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const labels = {
  not_started: '시작 대기', working: '실습 중', waiting: '완료 · 강사 개방 대기',
  ready: '완료 · 다음 구간 입장 가능', finished: '모든 구간 완료'
};
let apiBase = '', storageKey = '', session = null, snapshot = null, connected = false;
let polling = false, pollTimer, pendingRetry = null, saving = false, gateSaving = false;
let mountedPortion = null, frameGeneration = 0, activitySource;

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function message(text = '') {
  $('#message').textContent = text; $('#message').hidden = !text;
}

function connection() {
  const bar = $('#connection');
  bar.dataset.state = connected ? 'online' : 'offline';
  bar.replaceChildren(document.createTextNode(
    saving ? (connected ? '활동 완료를 서버에 저장 중…' : '연결 끊김 · 완료 저장 대기. 저장되기 전에는 진행하지 않습니다.') :
      connected ? '서버 연결됨 · 약 2초마다 진도 동기화' : '서버 연결 끊김 · 마지막 확인 상태입니다. 구간 개방과 완료를 확정할 수 없습니다.'
  ));
  if (!connected || saving) {
    const retry = document.createElement('button');
    retry.type = 'button'; retry.textContent = '다시 연결';
    retry.onclick = () => { pendingRetry?.(); void poll(); };
    bar.append(retry);
  }
  if ($('#next-portion')) $('#next-portion').disabled = !connected || saving;
  document.querySelectorAll('[data-gate]').forEach(button => { button.disabled = !connected || gateSaving; });
}

async function request(path, { method = 'GET', body, token = session?.credential } = {}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(apiBase + path, {
      method, signal: controller.signal, cache: 'no-store', credentials: 'omit',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch (error) {
    throw new RequestError(0, `서버에 연결하지 못했습니다 (${error.name}). 주소와 네트워크를 확인하세요.`);
  } finally { clearTimeout(timer); }
  let data;
  try { data = await response.json(); }
  catch { throw new RequestError(502, '서버가 JSON 응답을 반환하지 않았습니다. API 주소를 확인하세요.'); }
  if (!response.ok) throw new RequestError(response.status, data.error || `서버 오류 (${response.status})`);
  return data;
}

function storeSession(value) {
  session = value;
  try {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
  } catch (error) { message(`브라우저 저장소를 사용할 수 없습니다 (${error.name}). 새로고침 전에 개인 복구 키를 보관하세요.`); }
}

function assertPageRole(role) {
  if (role !== pageRole) {
    throw new RequestError(403, role === 'teacher'
      ? '강사 복구 키입니다. 위의 강사 화면 링크에서 복구하세요. 기존 참여 기록은 변경하지 않았습니다.'
      : '수강생 복구 키입니다. 위의 수강생 입장 링크에서 복구하세요. 기존 관리 기록은 변경하지 않았습니다.');
  }
}

function apply(data) {
  if (!data.classroom || !['teacher', 'student'].includes(data.role)) throw new Error('서버 수업 응답 형식이 다릅니다.');
  assertPageRole(data.role);
  if (snapshot && data.classroom.revision < snapshot.classroom.revision) return;
  snapshot = data; connected = true;
  render(); connection();
}

async function poll() {
  if (!session || polling) return;
  const expected = session;
  polling = true; clearTimeout(pollTimer);
  try {
    const data = await request(`/api/classrooms/${session.classroomId}`);
    if (expected !== session) return;
    apply(data);
    pendingRetry?.();
  } catch (error) {
    if (expected !== session) return;
    if (error.status === 403) {
      session = null; connected = true; message(error.message); connection(); return;
    }
    connected = false; connection();
    if (error.status === 401 || error.status === 404) message(error.message + ' 내 복구 정보를 확인하거나 브라우저에서 나간 뒤 다시 입장하세요.');
    else if (!snapshot) message(error.message);
  } finally {
    polling = false;
    if (session) pollTimer = setTimeout(poll, 2000);
  }
}

async function login(newSession) {
  assertPageRole(newSession.role);
  frameGeneration++; mountedPortion = null; snapshot = null;
  storeSession(newSession); message(); await poll();
}

function render() {
  $('#entry').hidden = true; $('#classroom').hidden = false;
  const teacher = snapshot.role === 'teacher', room = snapshot.classroom;
  $('#role').textContent = teacher ? '강사 관리 화면' : `수강생 · ${snapshot.participant.nickname}`;
  $('#class-title').textContent = room.title;
  $('#recovery-code').value = room.id; $('#recovery-key').value = session.credential;
  if (teacher) renderTeacher(); else renderLearner();
}

function renderTeacher() {
  const room = snapshot.classroom, participants = snapshot.participants;
  const learnerUrl = new URL('./', location.href).href;
  $('#learner-url').href = learnerUrl; $('#learner-url').textContent = learnerUrl;
  $('#join-code').textContent = room.id; $('#roster-count').textContent = `${participants.length}명 입장`;
  $('#gates').innerHTML = room.portions.map(portion => `<article class="card gate ${portion.open ? 'open' : ''}">
    <h3>${portion.id} · ${escape(portion.title)}</h3><span class="badge">${portion.open ? '입장 열림' : '입장 닫힘'}</span>
    <p><b>${portion.completedCount} / ${participants.length}명 완료</b></p>
    <button data-gate="${portion.id}" data-open="${!portion.open}" ${gateSaving ? 'disabled' : ''}>${portion.open ? '입장 닫기' : '입장 열기'}</button>
  </article>`).join('');
  $('#roster').innerHTML = participants.length ? participants.map(student => `<tr data-student="${student.id}">
    <td>${escape(student.nickname)} <small class="muted">(${student.id.slice(0, 4)})</small></td>
    <td>${student.activePortionId || '미입장'} · ${escape(student.current?.title || '시작 전')}<br>
      <small class="muted">${student.current ? `활동 ${student.current.actionIndex} / ${student.current.actionCount} 완료` : ''}</small></td>
    <td>${labels[student.state]}</td><td>${escape(student.completedPortions.join(', ') || '없음')}</td>
    <td>${snapshot.serverTime - student.lastSeen < 20000 ? '최근 연결' : '연결 확인 필요'}</td>
  </tr>`).join('') : '<tr><td colspan="5">아직 입장한 수강생이 없습니다.</td></tr>';
  document.querySelectorAll('[data-gate]').forEach(button => {
    button.onclick = async () => {
      gateSaving = true; connection(); message();
      try {
        apply(await request(`/api/classrooms/${room.id}/gates/${button.dataset.gate}`, {
          method: 'PUT', body: { open: button.dataset.open === 'true' }
        }));
      } catch (error) {
        if (!error.status || error.status >= 500) connected = false;
        message(`개방 변경을 확인하지 못했습니다. ${error.message} 최신 상태를 다시 확인하세요.`);
      } finally { gateSaving = false; renderTeacher(); connection(); }
    };
  });
}

function renderLearner() {
  const student = snapshot.participant, activeIndex = curriculum.findIndex(portion => portion.id === student.activePortionId);
  const active = curriculum[activeIndex], next = curriculum[activeIndex + 1];
  const completed = active && student.completedPortions.includes(active.id);
  const nextOpen = next && snapshot.classroom.portions.find(portion => portion.id === next.id).open;
  $('#learner-status').innerHTML = `<b>${active ? active.id + ' · ' + escape(active.title) : '강사의 시작 안내를 기다리세요'}</b>
    <p>${labels[student.state]}${student.current ? ' — ' + escape(student.current.title) : ''}</p>
    ${completed ? `<span>${active.id}의 모든 활동이 완료되었습니다. ${next ? (nextOpen ? '아래 버튼을 눌러 다음 구간에 입장하세요.' : '다음 구간이 열릴 때까지 기다리세요.') : '수고하셨습니다.'}</span>` : ''}`;
  const nextButton = $('#next-portion');
  nextButton.hidden = !next || !nextOpen || (active && !completed);
  nextButton.textContent = next ? `${active ? '다음 구간' : '실습 시작'} · ${next.id} 입장 →` : '';
  nextButton.dataset.portion = next?.id || '';
  const previousSelection = $('#review').value;
  $('#review').innerHTML = curriculum.filter((_, index) => index <= activeIndex).map(portion =>
    `<option value="${portion.id}">${portion.id} · ${escape(portion.title)}</option>`).join('');
  $('#review').value = previousSelection || active?.id || '';
  $('#review').disabled = activeIndex < 0 || saving; $('#current').disabled = activeIndex < 0 || saving;
  if (active && !mountedPortion) void openActivity(active.id, false);
}

async function openActivity(portionId, review) {
  const portion = curriculum.find(portion => portion.id === portionId);
  const activeIndex = curriculum.findIndex(portion => portion.id === snapshot.participant.activePortionId);
  if (!portion || curriculum.indexOf(portion) > activeIndex) return;
  const generation = ++frameGeneration;
  mountedPortion = portionId;
  $('#activity').hidden = true; $('#activity-error').hidden = true;
  try {
    activitySource ||= fetch(new URL('../lab2/index.html', location.href), { cache: 'no-cache' }).then(response => {
      if (!response.ok) throw new Error(`Lab 2 콘텐츠를 불러오지 못했습니다 (${response.status}).`);
      return response.text();
    }).catch(error => { activitySource = null; throw error; });
    const html = await activitySource;
    if (generation !== frameGeneration) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const labData = doc.querySelector('script[src="lab-data.js"]');
    if (!labData || !doc.querySelector('#guide') || !doc.querySelector('#shot-wrap')) throw new Error('Lab 2 재사용 계약이 변경되었습니다.');
    const base = doc.createElement('base'); base.href = new URL('../lab2/', location.href).href; doc.head.prepend(base);
    const position = review ? portion.start : snapshot.participant.cursor;
    const currentStep = portion.steps.find(step => position < step.start + step.count);
    const config = {
      portionId, stepIds: portion.steps.map(step => step.id),
      stepId: currentStep?.id, actionIndex: currentStep ? position - currentStep.start : 0,
      completed: !currentStep, generation
    };
    const bootstrap = doc.createElement('script');
    bootstrap.textContent = `
      window.LAB3_ACTIVITY = ${JSON.stringify(config)};
      window.addEventListener('error', event => {
        if (event instanceof ErrorEvent || ['SCRIPT', 'LINK'].includes(event.target?.tagName)) {
          parent.lab3Bridge.failure(window.LAB3_ACTIVITY.generation,
            new Error(event.message || '실습 엔진 파일을 불러오지 못했습니다.'));
        }
      }, { capture: true });
      window.LAB.steps = window.LAB.steps.filter(step => window.LAB3_ACTIVITY.stepIds.includes(step.id));
      window.LAB3_ACTIVITY.initialVideo = window.LAB.steps[0].video;
      delete window.LAB.steps[0].video;
    `;
    labData.after(bootstrap);
    const adapter = doc.createElement('script'); adapter.src = new URL('activity.js', location.href).href;
    doc.body.append(adapter);
    $('#activity').srcdoc = '<!doctype html>' + doc.documentElement.outerHTML;
  } catch (error) {
    if (generation !== frameGeneration) return;
    mountedPortion = null;
    $('#activity-error').textContent = `${error.message} 현재 진도로 돌아가기를 눌러 다시 시도하세요.`;
    $('#activity-error').hidden = false;
  }
}

window.lab3Bridge = {
  ready(generation) { if (generation === frameGeneration) $('#activity').hidden = false; },
  sectionDone(generation) { if (generation === frameGeneration) renderLearner(); },
  async complete(generation, coordinate) {
    if (generation !== frameGeneration || snapshot?.role !== 'student') throw new Error('실습 세션이 바뀌었습니다.');
    const expected = session;
    saving = true; connection(); $('#review').disabled = true; $('#current').disabled = true;
    try {
      for (;;) {
        try {
          const result = await request(`/api/classrooms/${expected.classroomId}/progress`, { method: 'POST', body: coordinate, token: expected.credential });
          if (expected !== session) throw new Error('실습 세션이 바뀌었습니다.');
          apply(result); return;
        } catch (error) {
          if (!(error instanceof RequestError) || (error.status > 0 && error.status < 500)) throw error;
          connected = false; connection();
          await new Promise(resolve => { pendingRetry = resolve; });
          pendingRetry = null;
          if (expected !== session) throw new Error('실습 세션이 바뀌었습니다.');
        }
      }
    } finally { saving = false; pendingRetry = null; renderLearner(); connection(); }
  },
  failure(generation, error) {
    if (generation !== frameGeneration) return;
    $('#activity-error').textContent = `실습을 계속할 수 없습니다: ${error.message} 현재 진도로 돌아가 서버 기록을 복구하세요.`;
    $('#activity-error').hidden = false;
  }
};

function formAction(selector, action) {
  const formElement = $(selector);
  if (!formElement) return;
  formElement.onsubmit = async event => {
    event.preventDefault(); message();
    const form = event.currentTarget, button = form.querySelector('button');
    button.disabled = true;
    try { await action(new FormData(form)); }
    catch (error) { message(error.message); }
    finally { button.disabled = false; }
  };
}

formAction('#join', async data => login((await request('/api/join', {
  method: 'POST', token: null, body: { code: data.get('code'), nickname: data.get('nickname') }
})).session));
formAction('#create', async data => {
  const result = await request('/api/classrooms', { method: 'POST', token: data.get('admin'), body: { title: data.get('title') } });
  $('#create [name=admin]').value = ''; await login(result.session);
});
formAction('#restore', async data => {
  const restored = { classroomId: data.get('code').trim().toUpperCase(), credential: data.get('credential').trim() };
  const result = await request(`/api/classrooms/${encodeURIComponent(restored.classroomId)}`, { token: restored.credential });
  $('#restore [name=credential]').value = '';
  assertPageRole(result.role);
  await login({ ...restored, role: result.role });
});
if (pageRole === 'student') {
  $('#next-portion').onclick = async () => {
    const button = $('#next-portion'); button.disabled = true; message();
    try {
      const result = await request(`/api/classrooms/${session.classroomId}/enter`, { method: 'POST', body: { portionId: button.dataset.portion } });
      mountedPortion = null; apply(result);
    } catch (error) {
      if (!error.status || error.status >= 500) connected = false;
      message(error.message);
    } finally { connection(); }
  };
  $('#review').onchange = () => { if (!saving) void openActivity($('#review').value, true); };
  $('#current').onclick = () => { if (!saving) void openActivity(snapshot.participant.activePortionId, false); };
}
$('#show-key').onclick = () => { $('#recovery-key').type = $('#recovery-key').type === 'password' ? 'text' : 'password'; };
$('#leave').onclick = () => {
  if (saving) { message('완료 기록이 저장 중입니다. 연결 복구 후 나가세요.'); return; }
  storeSession(null); snapshot = null; mountedPortion = null; frameGeneration++; clearTimeout(pollTimer);
  if ($('#activity')) $('#activity').srcdoc = '';
  $('#classroom').hidden = true; $('#entry').hidden = false;
  $('#recovery-key').value = ''; $('#recovery-key').type = 'password'; message();
};
$('#theme').onclick = () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  $('#activity')?.contentDocument?.documentElement.setAttribute('data-theme', theme);
};
window.addEventListener('online', () => { pendingRetry?.(); void poll(); });
window.addEventListener('offline', () => { connected = false; connection(); });

async function initialize() {
  const configured = window.LAB3_CONFIG?.apiBase?.trim();
  if (!configured) {
    $('#connection').textContent = '수업 서버 미설정 · 운영자가 lab3/config.js에 API 주소를 연결해야 합니다. Lab 1·2는 그대로 이용할 수 있습니다.';
    document.querySelectorAll('form button, form input').forEach(element => { element.disabled = true; });
    return;
  }
  try {
    const url = new URL(configured);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
      throw new Error('API 주소는 HTTPS origin만 지정하세요 (로컬 개발은 localhost HTTP 가능).');
    }
    apiBase = url.origin;
    const legacyKey = `lab3.session:${apiBase}`;
    storageKey = `${legacyKey}:${pageRole}`;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (/^[A-F0-9]{12}$/.test(parsed.classroomId) && typeof parsed.credential === 'string' &&
          ['teacher', 'student'].includes(parsed.role)) {
        const targetKey = `${legacyKey}:${parsed.role}`;
        const target = localStorage.getItem(targetKey);
        if (!target) localStorage.setItem(targetKey, legacy);
        if (!target || target === legacy) localStorage.removeItem(legacyKey);
        else if (parsed.role === pageRole) message('이전 공용 화면에 다른 참여 정보도 남아 있습니다. 현재 역할의 저장 기록을 사용하며 이전 기록은 덮어쓰지 않습니다.');
      } else message('이전 공용 화면의 입장 정보가 올바르지 않습니다. 개인 복구 키를 확인하세요. 기존 기록은 유지합니다.');
    }
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (/^[A-F0-9]{12}$/.test(parsed.classroomId) && typeof parsed.credential === 'string' && parsed.role === pageRole) session = parsed;
      else message('저장된 입장 정보가 올바르지 않습니다. 복구 키로 입장하세요.');
    }
  } catch (error) {
    if (!apiBase) {
      $('#connection').textContent = `서버 설정 오류: ${error.message}`;
      document.querySelectorAll('form button, form input').forEach(element => { element.disabled = true; });
      return;
    }
    message(`브라우저 입장 정보를 읽지 못했습니다 (${error.name}). 복구 키로 입장하세요.`);
  }
  try { await request('/api/health', { token: null }); connected = true; }
  catch (error) { message(error.message); }
  connection();
  if (session) await poll();
}
void initialize();
