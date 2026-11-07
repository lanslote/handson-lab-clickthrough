export const PORTIONS = [
  { id: '3-1', title: '에이전트와 지침', steps: ['intro', 'create', 'rename', 'instructions'] },
  { id: '3-2', title: '지식 소스 연결', steps: ['k-public', 'k-urls', 'k-file'] },
  { id: '3-3', title: '설정과 인사말', steps: ['settings', 'greeting'] },
  { id: '3-4', title: '테스트와 근거 확인', steps: ['preview', 'q1', 'q1-review', 'q2', 'q2-review'] },
  { id: '3-5', title: '범위 제한 실험', steps: ['whatif-edit', 'whatif-compare'] },
  { id: '3-6', title: '정리와 마무리', steps: ['transfer', 'final-quiz', 'review'] }
];

export function curriculumFor(lab) {
  let cursor = 0;
  const portions = PORTIONS.map(portion => {
    const start = cursor;
    const steps = portion.steps.map(id => {
      const step = lab.steps.find(item => item.id === id);
      if (!step || (!step.manual && !step.actions?.length)) throw new Error(`Invalid lab step: ${id}`);
      const count = step.manual ? 1 : step.actions.length;
      const result = { id, title: step.title, start: cursor, count };
      cursor += count;
      return result;
    });
    return { ...portion, steps, start, end: cursor };
  });
  if (portions.flatMap(portion => portion.steps).map(step => step.id).join() !== lab.steps.map(step => step.id).join()) {
    throw new Error('Lab 2 content and Lab 3 curriculum do not match.');
  }
  return portions;
}

export function participantView(participant, room, curriculum) {
  const active = curriculum[participant.activePortion];
  const completed = curriculum.filter(portion => participant.cursor >= portion.end).map(portion => portion.id);
  const next = curriculum[participant.activePortion + 1];
  const portionDone = active && participant.cursor >= active.end;
  const currentStep = active?.steps.find(step => participant.cursor < step.start + step.count) || active?.steps.at(-1);
  const state = !active ? 'not_started' : !portionDone ? 'working' : !next ? 'finished' : room.gates[next.id] ? 'ready' : 'waiting';
  return {
    id: participant.rowKey.slice('student:'.length), nickname: participant.nickname,
    cursor: participant.cursor, epoch: participant.epoch || 0, activePortionId: active?.id || null, completedPortions: completed,
    current: currentStep ? {
      stepId: currentStep.id, title: currentStep.title,
      actionIndex: portionDone ? currentStep.count : participant.cursor - currentStep.start,
      actionCount: currentStep.count
    } : null,
    state, lastSeen: participant.lastSeen
  };
}
