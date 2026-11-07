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
let adminSession = null, adminStorageKey = '', legacySession = null, adminBusy = false;
let resumePending = false, mountedReview = false, activityFailed = false;
let enrollmentSaving = false, classesLoading = false, classesTimer;
let openClasses = null, classesError = '';
let archivedView = false, archiveSaving = false, adminListContent = '';
const adminListPath = () => archivedView ? '/api/admin/classrooms/archived' : '/api/admin/classrooms';

function renderOpenClasses() {
  if (pageRole !== 'student') return;
  const select = $('#class-select'), selected = select.value;
  const classes = openClasses || [];
  const removed = selected && !classes.some(room => room.id === selected);
  const options = '<option value="">수업을 선택하세요</option>' + classes.map(room =>
    `<option value="${escape(room.id)}">${escape(room.title)}</option>`).join('') +
    (removed ? `<option value="${escape(selected)}" disabled>선택한 수업 · 입장 종료</option>` : '');
  if (select.innerHTML !== options) select.innerHTML = options;
  select.value = selected;
  select.disabled = openClasses === null || classes.length === 0 || !!classesError;
  $('#join button[type=submit]').disabled = !selected || removed || !!classesError || openClasses === null;
  $('#classes-status').textContent = classesError || (openClasses === null ? '수업 목록을 불러오는 중…' :
    removed ? '선택한 수업이 종료되었습니다. 다른 수업은 직접 선택해 주세요.' :
    classes.length === 0 ? '현재 오픈된 수업이 없습니다. 강사의 안내를 기다려 주세요.' : '수업을 선택하고 닉네임을 입력하세요.');
  $('#classes-status').dataset.error = String(!!classesError || !!removed);
  $('#classes-retry').hidden = !classesError; $('#classes-retry').disabled = classesLoading;
}

async function refreshOpenClasses() {
  if (pageRole !== 'student' || session || classesLoading) return;
  classesLoading = true; clearTimeout(classesTimer);
  try {
    const data = await request('/api/classrooms/open', { token: null });
    if (session) return;
    if (!Array.isArray(data.classrooms)) throw new Error('공개 수업 목록 응답이 올바르지 않습니다.');
    openClasses = data.classrooms; classesError = ''; connected = true; connection();
  } catch (error) {
    classesError = `수업 목록을 불러오지 못했습니다. ${error.message}`;
    connected = false; connection();
  }
  finally {
    classesLoading = false;
    if (!session) { renderOpenClasses(); classesTimer = setTimeout(refreshOpenClasses, 5000); }
  }
}

function learnerNext() {
  if (pageRole !== 'student') return;
  const button = $('#next-portion'), student = snapshot?.participant;
  const index = curriculum.findIndex(portion => portion.id === student?.activePortionId);
  const active = curriculum[index], next = curriculum[index + 1];
  button.hidden = !student || !next || resumePending;
  if (!student || !next) return;
  const complete = !active || student.completedPortions.includes(active.id);
  const open = snapshot.classroom.portions.find(portion => portion.id === next.id).open;
  button.disabled = !connected || saving || activityFailed || !complete || !open;
  button.textContent = !connected ? `${next.id} · 서버 연결 확인 중` : saving ? `${next.id} · 진도 저장 중` :
    activityFailed ? `${next.id} · 실습 화면 확인 필요` : !complete ? `${next.id} · 현재 구간 완료 후 이동` :
    !open ? `${next.id} · 강사 오픈 대기 중` : `${active ? '다음 구간' : '실습 시작'} · ${next.id} 입장 →`;
  button.dataset.portion = next.id;
}

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function message(text = '') {
  $('#message').textContent = text; $('#message').hidden = !text;
}

function connection() {
  const bar = $('#connection');
  bar.dataset.state = connected ? 'online' : 'offline';
  bar.hidden = pageRole === 'student' && connected && !saving;
  bar.replaceChildren(document.createTextNode(
    saving ? (connected ? '활동 완료를 서버에 저장 중…' : '연결 끊김 · 완료 저장 대기. 저장되기 전에는 진행하지 않습니다.') :
      connected ? '서버 연결됨 · 약 2초마다 진도 동기화' : '서버 연결 끊김 · 마지막 확인 상태입니다. 구간 개방과 완료를 확정할 수 없습니다.'
  ));
  if (!connected) {
    const retry = document.createElement('button');
    retry.type = 'button'; retry.textContent = '다시 연결';
    retry.onclick = () => {
      pendingRetry?.();
      if (pageRole === 'student' && !session) void refreshOpenClasses(); else void poll();
    };
    bar.append(retry);
  }
  if ($('#next-portion')) {
    learnerNext();
    $('#continue').disabled = !snapshot || !connected || saving;
    $('#restart').disabled = !snapshot || !connected || saving;
  }
  document.querySelectorAll('[data-gate]').forEach(button => { button.disabled = !connected || gateSaving; });
  document.querySelectorAll('[data-manage], #admin-refresh, #back-list, #create button').forEach(button => {
    button.disabled = !connected || adminBusy || archiveSaving || enrollmentSaving;
  });
  if ($('#admin-logout')) $('#admin-logout').disabled = adminBusy || archiveSaving || enrollmentSaving;
  document.querySelectorAll('[data-enrollment], #enrollment-control').forEach(button => {
    button.disabled = !connected || enrollmentSaving || archiveSaving || adminBusy;
  });
  if (pageRole === 'teacher' && snapshot?.classroom.archived) $('#enrollment-control').disabled = true;
  document.querySelectorAll('[data-archive], #archive-control, #active-view, #archived-view').forEach(button => {
    button.disabled = !connected || archiveSaving || enrollmentSaving || adminBusy;
  });
}

async function request(path, { method = 'GET', body, token = session?.credential || adminSession?.credential } = {}) {
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
  if (pageRole === 'teacher') legacySession = value;
  try {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
  } catch (error) { message(`브라우저 저장소를 사용할 수 없습니다 (${error.name}). 새로고침 후 참여를 이어갈 수 없을 수 있습니다.`); }
}

function storeAdmin(value) {
  adminSession = value;
  try {
    if (value) sessionStorage.setItem(adminStorageKey, JSON.stringify(value));
    else sessionStorage.removeItem(adminStorageKey);
  } catch (error) { message(`관리 세션을 브라우저에 저장하지 못했습니다 (${error.name}). 새로고침하면 다시 로그인해야 합니다.`); }
}

function endAdmin(reason) {
  storeAdmin(null); session = null; snapshot = null; archivedView = false; clearTimeout(pollTimer);
  $('#admin-home').hidden = true; $('#admin-toolbar').hidden = true;
  $('#classroom').hidden = true; $('#entry').hidden = false;
  $('#recovery-key').value = ''; $('#recovery-key').type = 'password';
  $('#legacy-resume').hidden = !legacySession;
  connected = true; message(reason); connection();
}

function adminFailure(error) {
  if (!adminSession) return false;
  if (error.status === 401 || error.status === 403) {
    endAdmin(error.message + ' 강사 비밀키로 다시 로그인하세요.');
    return true;
  }
  if (!error.status || error.status >= 500) connected = false;
  message(error.message); connection();
  return false;
}

function renderAdminHome(data) {
  if (!Array.isArray(data.classrooms)) throw new Error('수업 목록 응답 형식이 다릅니다.');
  $('#entry').hidden = true; $('#classroom').hidden = true; $('#admin-home').hidden = false;
  $('#admin-toolbar').hidden = false;
  $('#list-title').textContent = archivedView ? '보관된 수업 · 기록 유지' : '수업 목록 · 최근 생성순';
  $('#active-view').setAttribute('aria-pressed', String(!archivedView));
  $('#archived-view').setAttribute('aria-pressed', String(archivedView));
  $('#create').hidden = archivedView;
  $('#admin-expiry').textContent = `${new Date(adminSession.expiresAt).toLocaleString('ko-KR')} 만료`;
  const content = data.classrooms.length ? data.classrooms.map(room => `<article class="card">
    <h3>${escape(room.title)}</h3><p class="mono">수업 코드 ${escape(room.id)}</p>
    <p class="badge">${room.archived ? '보관됨 · 기록 유지' : room.enrollmentOpen ? '수업 오픈 · 신규 입장 가능' : '수업 종료 · 신규 입장 불가'}</p>
    <p class="muted">${escape(new Date(room.createdAt).toLocaleString('ko-KR'))} 생성</p>
    <button type="button" data-manage="${escape(room.id)}">${room.archived ? '수업 기록 보기' : '수업 운영 →'}</button>
    ${room.archived ? `<button type="button" data-archive="${escape(room.id)}" data-title="${escape(room.title)}" data-archived="false">보관 해제</button>` :
      `<button type="button" data-enrollment="${escape(room.id)}" data-open="${!room.enrollmentOpen}">${room.enrollmentOpen ? '수업 종료' : '수업 오픈'}</button>
       <details class="archive-actions"><summary>수업 관리</summary><button type="button" data-archive="${escape(room.id)}" data-title="${escape(room.title)}" data-archived="true">보관</button></details>`}
  </article>`).join('') : `<p>${archivedView ? '보관된 수업이 없습니다.' : '아직 수업이 없습니다. 첫 수업을 만들어 주세요.'}</p>`;
  if (content !== adminListContent) {
    const expanded = [...$('#classrooms-list').querySelectorAll('details[open]')].map(details =>
      details.querySelector('[data-archive]')?.dataset.archive);
    $('#classrooms-list').innerHTML = content; adminListContent = content;
    expanded.forEach(id => { const details = $(`[data-archive="${id}"]`)?.closest('details'); if (details) details.open = true; });
  }
  connected = true; connection();
}

async function selectAdminClass(classroomId) {
  storeAdmin({ ...adminSession, classroomId });
  session = { role: 'teacher', credential: adminSession.credential, classroomId };
  snapshot = null; $('#admin-home').hidden = true; $('#classroom').hidden = true;
  message(); await poll();
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
  if (pageRole === 'student' && snapshot && (data.participant.epoch || 0) !== (snapshot.participant.epoch || 0)) {
    frameGeneration++; mountedPortion = null; mountedReview = false; activityFailed = false;
    $('#activity').srcdoc = ''; $('#activity').hidden = true;
  }
  snapshot = data; connected = true;
  render(); connection();
}

async function poll() {
  if ((!session && !adminSession) || polling) return;
  const expected = adminSession || session, expectedRoom = session?.classroomId;
  polling = true; clearTimeout(pollTimer);
  try {
    const data = await request(session ? `/api/classrooms/${session.classroomId}` : adminListPath());
    if (expected !== (adminSession || session) || expectedRoom !== session?.classroomId) return;
    if (adminSession) message();
    if (session) apply(data); else renderAdminHome(data);
    pendingRetry?.();
  } catch (error) {
    if (expected !== (adminSession || session) || expectedRoom !== session?.classroomId) return;
    if (adminSession && (error.status === 401 || error.status === 403)) { adminFailure(error); return; }
    if (error.status === 403) {
      session = null; connected = true; message(error.message); connection(); return;
    }
    connected = false; connection();
    if (error.status === 401 || error.status === 404) message(error.message + (pageRole === 'student'
      ? ' 메뉴에서 수업을 나간 뒤 새로 입장하세요.' : ' 내 복구 정보를 확인하거나 브라우저에서 나간 뒤 다시 입장하세요.'));
    else if (!snapshot) message(error.message);
  } finally {
    polling = false;
    if (session || adminSession) pollTimer = setTimeout(poll, 2000);
  }
}

async function login(newSession) {
  assertPageRole(newSession.role);
  frameGeneration++; mountedPortion = null; snapshot = null;
  storeSession(newSession); message(); await poll();
}

function render() {
  if (pageRole === 'student' && resumePending) {
    $('#entry').hidden = true; $('#classroom').hidden = true; $('#resume').hidden = false;
    $('#resume-status').textContent = `${snapshot.participant.nickname} · ${snapshot.classroom.title} · ${
      snapshot.participant.activePortionId || '시작 전'} · ${labels[snapshot.participant.state]}`;
    return;
  }
  $('#entry').hidden = true; $('#classroom').hidden = false;
  const teacher = snapshot.role === 'teacher', room = snapshot.classroom;
  $('#role').textContent = teacher ? '강사 관리 화면' : `수강생 · ${snapshot.participant.nickname}`;
  $('#class-title').textContent = room.title;
  if (teacher) {
    $('#recovery-code').value = room.id; $('#recovery-key').value = adminSession ? '' : session.credential;
  } else {
    document.body.dataset.inClass = 'true'; $('#resume').hidden = true;
    $('#student-identity').hidden = false; $('#learner-options').hidden = false;
    $('#class-title').title = room.title;
  }
  if (teacher) {
    $('#admin-home').hidden = true; $('#admin-toolbar').hidden = !adminSession;
    $('#back-list').hidden = !adminSession; $('#leave').hidden = !!adminSession;
    $('.recovery').hidden = !!adminSession;
    if (adminSession) {
      $('#admin-expiry').textContent = `${new Date(adminSession.expiresAt).toLocaleString('ko-KR')} 만료`;
    }
  }
  if (teacher) renderTeacher(); else renderLearner();
}

function renderTeacher() {
  const room = snapshot.classroom, participants = snapshot.participants;
  $('#enrollment-status').textContent = room.archived ? '보관된 수업 · 기존 학생과 기록은 유지' :
    room.enrollmentOpen ? '수업 오픈 · 공개 목록에서 신규 입장 가능' : '수업 종료 · 기존 학생은 계속 진행';
  $('#enrollment-control').textContent = room.archived ? '보관 해제 후 오픈' : room.enrollmentOpen ? '수업 종료' : '수업 오픈';
  $('#archive-control').textContent = room.archived ? '보관 해제' : '보관';
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
        if (adminSession && adminFailure(error)) return;
        if (!error.status || error.status >= 500) connected = false;
        message(`개방 변경을 확인하지 못했습니다. ${error.message} 최신 상태를 다시 확인하세요.`);
      } finally { gateSaving = false; if (snapshot) renderTeacher(); connection(); }
    };
  });
}

function renderLearner() {
  const student = snapshot.participant, activeIndex = curriculum.findIndex(portion => portion.id === student.activePortionId);
  const active = curriculum[activeIndex];
  const completed = active && student.completedPortions.includes(active.id);
  const viewed = mountedReview && curriculum.find(portion => portion.id === mountedPortion);
  const progress = active && !completed ? ` · 활동 ${student.cursor - active.start} / ${active.end - active.start} 완료` : '';
  const status = `<b>${viewed ? '복습 · ' + viewed.id + ' · ' + escape(viewed.title) :
    active ? active.id + ' · ' + escape(active.title) : '실습 시작 대기'}</b><span>${
    viewed ? `현재 진도 ${student.activePortionId} · ${labels[student.state]}` : labels[student.state] + progress}</span>`;
  if ($('#learner-status').innerHTML !== status) $('#learner-status').innerHTML = status;
  learnerNext();
  const previousSelection = $('#review').value;
  const options = curriculum.filter((_, index) => index <= activeIndex).map(portion =>
    `<option value="${portion.id}">${portion.id} · ${escape(portion.title)}</option>`).join('');
  if ($('#review').innerHTML !== options) $('#review').innerHTML = options;
  $('#review').value = previousSelection || active?.id || '';
  $('#review').disabled = activeIndex < 0 || saving; $('#current').disabled = activeIndex < 0 || saving;
  if (active && !mountedPortion) void openActivity(active.id, false);
}

async function openActivity(portionId, review) {
  const portion = curriculum.find(portion => portion.id === portionId);
  const activeIndex = curriculum.findIndex(portion => portion.id === snapshot.participant.activePortionId);
  if (!portion || curriculum.indexOf(portion) > activeIndex) return;
  const generation = ++frameGeneration;
  mountedPortion = portionId; mountedReview = review;
  renderLearner();
  activityFailed = false; $('#activity').hidden = true; $('#activity-error').hidden = true;
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
    const style = doc.createElement('link'); style.rel = 'stylesheet'; style.href = new URL('activity.css', location.href).href;
    doc.head.append(style);
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
    activityFailed = true; connection();
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
    const completion = { ...coordinate, epoch: snapshot.participant.epoch || 0 };
    saving = true; connection(); $('#review').disabled = true; $('#current').disabled = true;
    try {
      for (;;) {
        try {
          const result = await request(`/api/classrooms/${expected.classroomId}/progress`, {
            method: 'POST', body: completion, token: expected.credential
          });
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
    activityFailed = true; connection();
  }
};

function formAction(selector, action) {
  const formElement = $(selector);
  if (!formElement) return;
  formElement.onsubmit = async event => {
    event.preventDefault(); message();
    const form = event.currentTarget, button = form.querySelector('button[type=submit], button:not([type])');
    button.disabled = true;
    try { await action(new FormData(form)); }
    catch (error) { if (adminSession) adminFailure(error); else message(error.message); }
    finally { button.disabled = false; if (form.id === 'join') renderOpenClasses(); }
  };
}

formAction('#join', async data => {
  try {
    const joined = await request('/api/join', { method: 'POST', token: null, body: { code: data.get('code'), nickname: data.get('nickname') } });
    clearTimeout(classesTimer); await login(joined.session);
  } catch (error) {
    if (error.status === 423) { classesError = error.message; renderOpenClasses(); }
    void refreshOpenClasses(); throw error;
  }
});
formAction('#create', async data => {
  const result = await request('/api/admin/classrooms', { method: 'POST', body: { title: data.get('title') } });
  $('#create').reset(); await selectAdminClass(result.classroom.id);
});
formAction('#restore', async data => {
  const restored = { classroomId: data.get('code').trim().toUpperCase(), credential: data.get('credential').trim() };
  const result = await request(`/api/classrooms/${encodeURIComponent(restored.classroomId)}`, { token: restored.credential });
  $('#restore [name=credential]').value = '';
  assertPageRole(result.role);
  await login({ ...restored, role: result.role });
});
if (pageRole === 'student') {
  $('#class-select').onchange = renderOpenClasses;
  $('#classes-retry').onclick = () => { void refreshOpenClasses(); };
  $('#next-portion').onclick = async () => {
    const button = $('#next-portion'); button.disabled = true; message();
    try {
      const result = await request(`/api/classrooms/${session.classroomId}/enter`, { method: 'POST', body: {
        portionId: button.dataset.portion, epoch: snapshot.participant.epoch || 0
      } });
      $('#learner-menu').open = false; mountedPortion = null; mountedReview = false; apply(result);
    } catch (error) {
      if (!error.status || error.status >= 500) connected = false;
      message(error.message);
    } finally { connection(); }
  };
  $('#review').onchange = () => {
    if (!saving) { $('#learner-menu').open = false; void openActivity($('#review').value, true); }
  };
  $('#current').onclick = () => {
    if (!saving) { $('#learner-menu').open = false; void openActivity(snapshot.participant.activePortionId, false); }
  };
  $('#continue').onclick = () => {
    if (!snapshot || !connected || saving) { message('서버에서 마지막 진도를 확인한 뒤 선택하세요.'); return; }
    resumePending = false; render(); connection();
  };
  $('#restart').onclick = async () => {
    if (!snapshot || !connected || saving) { message('서버에서 마지막 진도를 확인한 뒤 선택하세요.'); return; }
    const operation = { operationId: crypto.randomUUID(), expectedEpoch: snapshot.participant.epoch || 0 };
    saving = true; connection(); message();
    try {
      for (;;) {
        try {
          const result = await request(`/api/classrooms/${session.classroomId}/reset`, { method: 'POST', body: operation });
          resumePending = false; mountedPortion = null; mountedReview = false; frameGeneration++;
          $('#activity').srcdoc = ''; $('#activity').hidden = true;
          apply(result); break;
        } catch (error) {
          if (error.status && error.status < 500) throw error;
          connected = false; connection();
          await new Promise(resolve => { pendingRetry = resolve; });
          pendingRetry = null;
        }
      }
    } catch (error) { message('초기화를 확인하지 못했습니다. ' + error.message); }
    finally { saving = false; pendingRetry = null; connection(); }
  };
  $('#force-video').onchange = () => {
    try { localStorage.setItem('lab3.force', $('#force-video').checked ? '1' : '0'); }
    catch (error) { message(`영상 설정을 저장하지 못했습니다 (${error.name}).`); }
    $('#activity').contentWindow?.lab3Activity?.setForceVideo($('#force-video').checked);
  };
  $('#learner-menu').addEventListener('toggle', () => {
    if (!$('#learner-menu').open && document.activeElement?.closest('.menu-panel')) $('#learner-menu > summary').focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#learner-menu').open) {
      $('#learner-menu').open = false; $('#learner-menu > summary').focus();
    }
  });
  document.addEventListener('click', event => { if (!event.target.closest('#learner-menu')) $('#learner-menu').open = false; });
}
if ($('#show-key')) $('#show-key').onclick = () => { $('#recovery-key').type = $('#recovery-key').type === 'password' ? 'text' : 'password'; };
$('#leave').onclick = () => {
  if (saving) { message('완료 기록이 저장 중입니다. 연결 복구 후 나가세요.'); return; }
  storeSession(null); snapshot = null; mountedPortion = null; frameGeneration++; clearTimeout(pollTimer);
  if ($('#activity')) $('#activity').srcdoc = '';
  $('#classroom').hidden = true; $('#entry').hidden = false;
  if ($('#recovery-key')) { $('#recovery-key').value = ''; $('#recovery-key').type = 'password'; }
  else {
    resumePending = false; mountedReview = false; activityFailed = false;
    $('#resume').hidden = true; $('#learner-menu').open = false; $('#learner-options').hidden = true;
    $('#student-identity').hidden = true; document.body.dataset.inClass = 'false';
  }
  message(); connection(); if (pageRole === 'student') void refreshOpenClasses();
};
$('#theme').onclick = () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  $('#activity')?.contentDocument?.documentElement.setAttribute('data-theme', theme);
};
window.addEventListener('online', () => {
  pendingRetry?.();
  if (pageRole === 'student' && !session) void refreshOpenClasses(); else void poll();
});
window.addEventListener('offline', () => { connected = false; connection(); });

if (pageRole === 'teacher') {
  formAction('#admin-login', async data => {
    let result;
    try { result = await request('/api/admin/login', { method: 'POST', token: data.get('admin'), body: {} }); }
    finally { $('#admin-login [name=admin]').value = ''; }
    if (result.session?.role !== 'admin') throw new Error('관리 로그인 응답 형식이 다릅니다.');
    storeAdmin(result.session); archivedView = false; session = null; snapshot = null; message(); await poll();
  });
  $('#legacy-resume').onclick = () => { void login(legacySession); };
  $('#classrooms-list').onclick = event => {
    const button = event.target.closest('[data-manage]');
    if (button && connected && !adminBusy) void selectAdminClass(button.dataset.manage);
    const enrollment = event.target.closest('[data-enrollment]');
    if (enrollment && connected && !enrollmentSaving) void changeEnrollment(enrollment.dataset.enrollment, enrollment.dataset.open === 'true');
    const archive = event.target.closest('[data-archive]');
    if (archive && connected && !archiveSaving) void changeArchive(archive.dataset.archive, archive.dataset.title, archive.dataset.archived === 'true');
  };
  for (const [selector, value] of [['#active-view', false], ['#archived-view', true]]) {
    $(selector).onclick = async () => {
      archivedView = value; storeAdmin({ ...adminSession, archivedView }); message(); await poll();
    };
  }
  $('#enrollment-control').onclick = () => { void changeEnrollment(snapshot.classroom.id, !snapshot.classroom.enrollmentOpen); };
  $('#archive-control').onclick = () => { void changeArchive(snapshot.classroom.id, snapshot.classroom.title, !snapshot.classroom.archived); };
  $('#back-list').onclick = async () => {
    storeAdmin({ ...adminSession, classroomId: null }); session = null; snapshot = null;
    $('#classroom').hidden = true; message(); await poll();
  };
  $('#admin-refresh').onclick = () => { void poll(); };
  $('#admin-logout').onclick = async () => {
    adminBusy = true; connection();
    try {
      await request('/api/admin/logout', { method: 'POST', token: adminSession.credential, body: {} });
      endAdmin('관리 로그아웃되었습니다. 다시 운영하려면 비밀키로 로그인하세요.');
    } catch (error) {
      if (!adminFailure(error)) message('관리 로그아웃을 확인하지 못했습니다. ' + error.message + ' 연결 복구 후 다시 시도하세요.');
    } finally { adminBusy = false; connection(); }
  };
}

async function changeEnrollment(classroomId, open) {
  enrollmentSaving = true; message(); connection();
  try {
    const result = await request(`/api/classrooms/${classroomId}/enrollment`, { method: 'PUT', body: { open } });
    if (session?.classroomId === classroomId) apply(result);
    else renderAdminHome(await request(adminListPath()));
  } catch (error) {
    if (adminSession) adminFailure(error); else message(error.message);
    if (!error.status || error.status >= 500) connected = false;
  } finally { enrollmentSaving = false; connection(); }
}

async function changeArchive(classroomId, title, archived) {
  const action = archived ? '보관' : '보관 해제';
  const detail = archived ? '기본 강사 목록과 학생 목록에서 숨기지만 학생 진도와 기록은 유지합니다.' :
    '기록은 그대로 복원하며 학생 입장은 종료 상태로 유지합니다. 필요하면 다시 수업을 오픈하세요.';
  if (!window.confirm(`‘${title}’ 수업을 ${action}하시겠습니까?\n${detail}`)) return;
  archiveSaving = true; message(); connection();
  try {
    const result = await request(`/api/classrooms/${classroomId}/archive`, { method: 'PUT', body: { archived } });
    if (session?.classroomId === classroomId) apply(result);
    else renderAdminHome(await request(adminListPath()));
  } catch (error) {
    if (adminSession) adminFailure(error); else message(error.message);
    if (!error.status || error.status >= 500) connected = false;
  } finally { archiveSaving = false; connection(); }
}

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
    adminStorageKey = `lab3.admin:${apiBase}`;
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
      if (/^[A-F0-9]{12}$/.test(parsed.classroomId) && typeof parsed.credential === 'string' && parsed.role === pageRole) {
        if (pageRole === 'teacher') legacySession = parsed;
        else {
          session = parsed; resumePending = true; $('#entry').hidden = true; $('#resume').hidden = false;
          $('#resume-status').textContent = '서버에서 마지막 진도를 확인하고 있습니다.';
          $('#learner-options').hidden = false;
        }
      } else message('저장된 입장 정보가 올바르지 않습니다. 참여 정보를 확인하세요.');
    }
    if (pageRole === 'student') $('#force-video').checked = localStorage.getItem('lab3.force') !== '0';
    if (pageRole === 'teacher') {
      $('#legacy-resume').hidden = !legacySession;
      const storedAdmin = sessionStorage.getItem(adminStorageKey);
      if (storedAdmin) {
        const parsed = JSON.parse(storedAdmin);
        if (parsed.role === 'admin' && /^a_[a-f0-9]{16}\.[A-Za-z0-9_-]{43}$/.test(parsed.credential)) {
          adminSession = parsed;
          archivedView = parsed.archivedView === true;
          if (/^[A-F0-9]{12}$/.test(parsed.classroomId)) {
            session = { role: 'teacher', credential: parsed.credential, classroomId: parsed.classroomId };
          }
        } else message('저장된 관리 세션 형식이 올바르지 않습니다. 비밀키로 다시 로그인하세요.');
      }
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
  if (session || adminSession) await poll();
  else if (pageRole === 'student') await refreshOpenClasses();
}
void initialize();
