/* Classic script: the adapter deliberately shares Lab 2's runtime lexical scope. */
(() => {
  const config = window.LAB3_ACTIVITY, bridge = parent.lab3Bridge;
  const originalGoStep = goStep, originalComplete = completeAction, originalGuideAction = guideAction, originalFinishClip = finishClip;
  const originalRenderGuide = renderGuide;
  let committing = false, portionFinished = false, returnToSummary = false;
  const notifyFailure = error => bridge.failure(config.generation, error);

  function finishPortion() {
    portionFinished = true; resetUi(); done = true;
    step = STEPS.length - 1; actionIdx = (STEPS[step].actions || []).length;
    document.querySelector('#overlay').replaceChildren();
    done = false; originalRenderGuide(); done = true;
    document.querySelector('.g-foot')?.remove();
    normalizeGuide();
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
    if (ui.clip) {
      const phase = ui.clip.phase || 'ready';
      document.querySelector('#guide').innerHTML = `<div class="g-head"><div class="g-kicker"><span>${config.portionId}</span><span>단계 ${step + 1} / ${STEPS.length}</span></div></div>
        <div class="g-body"><h2>${esc(curStep().title)}</h2><div class="note credit">🎬 ${esc(ui.clip.title)}</div>
        <p>${phase === 'complete' ? '시청을 마쳤습니다. 영상 아래의 실습 시작을 누르세요.' :
          phase === 'playing' ? '끝까지 시청한 뒤 실습 시작을 눌러 진행합니다.' :
          phase === 'error' ? '영상을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.' :
          '영상 보기를 누르면 안내가 시작됩니다. 시청 후 직접 실습을 시작합니다.'}</p></div>`;
    } else originalRenderGuide();
    normalizeGuide();
  };
  function normalizeGuide() {
    const kicker = document.querySelector('.g-kicker');
    if (kicker) {
      kicker.firstElementChild.textContent = config.portionId;
      kicker.lastElementChild.textContent = `단계 ${step + 1} / ${STEPS.length}`;
    }
  }

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
    if (committing) return;
    if (portionFinished) {
      if (kind === 'replay') {
        portionFinished = false; done = false; returnToSummary = true;
        startClip(curStep(), true); render();
      }
      return;
    }
    if (ui.clip && !ui.clip.skippable && ['prev', 'skipclip'].includes(kind)) return;
    if (kind === 'next' && curStep().manual) {
      void commit({ stepId: curStep().id, actionIndex: 0 }, () => goStep(step + 1));
    } else if (kind !== 'restart') originalGuideAction(kind);
  };
  finishClip = function (completed) {
    if (!returnToSummary) { originalFinishClip(completed); return; }
    if (completed && ui.clip) { watched.add(ui.clip.id); saveWatched(); }
    ui.clip = null; returnToSummary = false; finishPortion();
  };

  renderClip = function (overlay) {
    const clip = ui.clip;
    clip.phase ||= 'ready'; clip.max ||= 0;
    overlay.innerHTML = `<div class="clip-veil"><div class="clip-card" role="dialog" aria-modal="true" aria-label="안내 영상">
      <div class="clip-head"><span class="clip-tag">안내 영상</span><b>${esc(clip.title)}</b></div>
      <div class="clip-vwrap"><video id="clip-v" src="${esc(clip.src)}" muted playsinline preload="auto"></video></div>
      <div class="clip-status" id="clip-status" role="status"></div>
      <div class="clip-ctl"><button id="clip-toggle" data-lab3-video="toggle" hidden>일시정지</button>
        <div class="clip-bar"><i id="clip-prog"></i></div><span id="clip-time">0:00 / ${fmt(clip.sec)}</span>
        <button id="clip-primary" class="clip-primary" data-lab3-video="start">영상 보기</button>
        ${clip.skippable ? '<button data-lab3-video="skip">건너뛰기</button>' : ''}</div>
      <button id="clip-replay" data-lab3-video="replay" hidden>다시 보기</button>
    </div></div>`;
    const video = overlay.querySelector('video');
    const current = () => ui.clip === clip && video.isConnected;
    function controls() {
      if (!current()) return;
      const primary = overlay.querySelector('#clip-primary');
      primary.disabled = clip.phase === 'playing';
      primary.dataset.lab3Video = clip.phase === 'complete' ? 'confirm' : clip.phase === 'error' ? 'retry' : 'start';
      primary.textContent = clip.phase === 'complete' || clip.phase === 'playing' ? '실습 시작' : clip.phase === 'error' ? '다시 불러오기' : '영상 보기';
      primary.toggleAttribute('data-video-retry', clip.phase === 'error');
      overlay.querySelector('#clip-toggle').hidden = clip.phase !== 'playing';
      overlay.querySelector('#clip-toggle').textContent = video.paused ? '재생' : '일시정지';
      overlay.querySelector('#clip-replay').hidden = clip.phase !== 'complete';
      overlay.querySelector('#clip-status').textContent = clip.phase === 'complete' ? '시청 완료 · 실습 시작을 눌러 주세요' :
        clip.phase === 'error' ? '영상 로드 실패 · 완료 처리하지 않았습니다' :
        clip.phase === 'playing' ? '시청 중 · 끝까지 보면 실습 시작이 열립니다' : '준비됨 · 영상 보기를 눌러 주세요';
    }
    async function play() {
      clip.phase = 'playing'; controls(); renderGuide();
      try { await video.play(); }
      catch {
        clip.phase = 'ready'; controls(); renderGuide();
        toast('재생을 시작하지 못했습니다. 영상 보기를 다시 눌러 주세요.');
      }
    }
    video.addEventListener('timeupdate', () => {
      if (!current()) return;
      if (!clip.skippable && video.currentTime > clip.max + .8) { video.currentTime = clip.max; return; }
      clip.max = Math.max(clip.max, video.currentTime);
      const duration = video.duration || clip.sec;
      overlay.querySelector('#clip-prog').style.width = `${video.currentTime / duration * 100}%`;
      overlay.querySelector('#clip-time').textContent = `${fmt(video.currentTime)} / ${fmt(duration)}`;
    });
    video.addEventListener('ratechange', () => { if (video.playbackRate !== 1) video.playbackRate = 1; });
    video.addEventListener('play', controls); video.addEventListener('pause', controls);
    video.addEventListener('ended', () => {
      if (!current() || clip.phase !== 'playing' || !video.ended || clip.max < video.duration - .8) return;
      watched.add(clip.id); saveWatched(); clip.phase = 'complete'; controls(); renderGuide();
    });
    video.addEventListener('error', () => {
      if (!current()) return;
      clip.phase = 'error'; controls(); renderGuide();
    });
    overlay.querySelectorAll('[data-lab3-video]').forEach(button => button.onclick = event => {
      event.stopPropagation();
      const action = button.dataset.lab3Video;
      if (action === 'confirm' && clip.phase === 'complete') finishClip(true);
      else if (action === 'skip' && clip.skippable) finishClip(false);
      else if (action === 'retry') { clip.phase = 'ready'; clip.max = 0; video.load(); controls(); renderGuide(); }
      else if (action === 'replay') { clip.max = 0; video.currentTime = 0; void play(); }
      else if (action === 'start') void play();
      else if (action === 'toggle') { if (video.paused) void play(); else video.pause(); }
    });
    controls();
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
  window.lab3Activity = {
    setForceVideo(value) { forceVideo = value; toggle.checked = value; }
  };
  const summaryStep = STEPS.at(-1);
  if (!summaryStep.img) summaryStep.img = summaryStep.actions?.at(-1)?.img;
  STEPS[0].video = config.initialVideo;
  if (config.completed) finishPortion();
  else goStep(Math.max(0, STEPS.findIndex(step => step.id === config.stepId)), config.actionIndex);
  bridge.ready(config.generation);
})();
