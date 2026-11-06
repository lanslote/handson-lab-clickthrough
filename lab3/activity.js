/* Classic script: the adapter deliberately shares Lab 2's runtime lexical scope. */
(() => {
  const config = window.LAB3_ACTIVITY, bridge = parent.lab3Bridge;
  const originalGoStep = goStep, originalComplete = completeAction, originalGuideAction = guideAction;
  const originalRenderGuide = renderGuide, originalRenderClip = renderClip;
  let committing = false, portionFinished = false;
  const notifyFailure = error => bridge.failure(config.generation, error);

  function finishPortion() {
    portionFinished = true; resetUi(); done = true;
    step = STEPS.length - 1; actionIdx = (STEPS[step].actions || []).length;
    document.querySelector('#overlay').replaceChildren();
    document.querySelector('#guide').innerHTML = `<div class="g-body"><h2>${config.portionId} 완료 ✓</h2>
      <p>이 구간의 모든 활동을 완료했습니다.</p><p>다음 구간은 수업 화면 위쪽에서 직접 입장하세요. 강사가 아직 열지 않았다면 이곳에서 기다립니다.</p>
      <p>다시 보기는 수업 화면의 구간 선택을 이용하세요.</p></div>`;
    bridge.sectionDone(config.generation);
  }

  goStep = function (index, action = 0) {
    document.querySelector('video')?.pause();
    if (index >= STEPS.length) { finishPortion(); return; }
    if (index < 0) return;
    portionFinished = false; originalGoStep(index, action);
  };
  renderGuide = function () {
    if (portionFinished) return;
    originalRenderGuide();
  };

  async function commit(coordinate, advance) {
    if (committing || ui.clip) return;
    committing = true;
    try {
      await bridge.complete(config.generation, { portionId: config.portionId, ...coordinate });
      await advance();
    } catch (error) { notifyFailure(error); }
    finally { committing = false; }
  }
  completeAction = async function () {
    const action = curAction();
    if (!action || done || ui.busy ||
        (action.kind === 'quiz' && !ui.qs?.done) ||
        (action.kind === 'reflect' && !ui.reflDone) ||
        (action.kind === 'compare' && ui.cmp?.seen.size !== action.imgs.length)) return;
    await commit({ stepId: curStep().id, actionIndex: actionIdx }, () => originalComplete());
  };
  guideAction = function (kind) {
    if (committing || portionFinished) return;
    if (kind === 'next' && curStep().manual) {
      void commit({ stepId: curStep().id, actionIndex: 0 }, () => goStep(step + 1));
    } else if (kind !== 'restart') originalGuideAction(kind);
  };

  renderClip = function (overlay) {
    originalRenderClip(overlay);
    const video = overlay.querySelector('video');
    const clip = ui.clip;
    ['timeupdate', 'play', 'pause', 'ended', 'error'].forEach(type => video.addEventListener(type, event => {
      if (!video.isConnected || ui.clip !== clip) event.stopImmediatePropagation();
    }, { capture: true }));
    video.addEventListener('error', event => {
      event.stopImmediatePropagation();
      const controls = overlay.querySelector('.clip-ctl');
      if (controls.querySelector('[data-video-retry]')) return;
      const retry = document.createElement('button');
      retry.dataset.videoRetry = ''; retry.textContent = '영상 로드 실패 · 다시 시도';
      retry.onclick = () => {
        retry.remove(); video.load();
        video.play().catch(() => { toast('영상 재생 버튼을 눌러 다시 시도하세요.'); document.querySelector('#clip-big').hidden = false; });
      };
      controls.append(retry);
      toast('영상을 불러오지 못했습니다. 연결을 확인하고 다시 시도하세요. 완료 처리하지 않습니다.');
    }, { capture: true });
  };

  ['click', 'input', 'keydown'].forEach(type => document.addEventListener(type, event => {
    if (committing) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { capture: true }));
  document.querySelector('#reset').hidden = true;
  document.querySelector('.lab-top a').hidden = true;
  document.querySelector('.tag').textContent = `${config.portionId} · 수업 실습`;
  document.documentElement.dataset.theme = parent.document.documentElement.dataset.theme;
  forceVideo = true;
  try { forceVideo = localStorage.getItem('lab3.force') !== '0'; }
  catch (error) { toast(`영상 설정을 읽지 못했습니다 (${error.name}). 기본값으로 시청합니다.`); }
  const toggle = document.querySelector('#force-video'); toggle.checked = forceVideo;
  toggle.onchange = () => {
    forceVideo = toggle.checked;
    try { localStorage.setItem('lab3.force', forceVideo ? '1' : '0'); }
    catch (error) { toast(`영상 설정을 저장하지 못했습니다 (${error.name}).`); }
  };
  STEPS[0].video = config.initialVideo;
  if (config.completed) finishPortion();
  else goStep(Math.max(0, STEPS.findIndex(step => step.id === config.stepId)), config.actionIndex);
  bridge.ready(config.generation);
})();
