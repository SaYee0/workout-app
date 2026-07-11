import { load, save, exportData, importData } from './storage.js';
import {
  ensureSeeded,
  getRoutineNames,
  addExercise,
  updateExercise,
  deleteExercise,
  moveExercise,
  addRoutine,
} from './routine.js';
import { GYM_ARRIVAL_MESSAGE, pickFinalMessage } from './messages.js';
import {
  createSession,
  isSessionComplete,
  completeSet,
  endRest,
  elapsedSeconds,
  restRemainingSeconds,
} from './workout.js';
import {
  formatMMSS,
  formatDurationKorean,
  formatDateKorean,
  showView,
  showToast,
  showMessageQueue,
  enableDragReorder,
} from './ui.js';

let state = load();
ensureSeeded(state);
save(state);

let editingRoutine = state.activeRoutine;
let editingExerciseId = null; // null = adding new

let session = null;
let stopwatchTimer = null;
let restTimer = null;

// ---------- HOME ----------

function renderHome() {
  const names = getRoutineNames(state);
  const picker = document.getElementById('routine-picker');
  const select = document.getElementById('routine-select');
  if (names.length > 1) {
    picker.hidden = false;
    select.innerHTML = names.map((n) => `<option value="${n}">${n}</option>`).join('');
    select.value = state.activeRoutine;
  } else {
    picker.hidden = true;
  }

  const list = document.getElementById('history-list');
  const history = [...state.history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  if (history.length === 0) {
    list.innerHTML = '<li class="empty">아직 기록이 없어요.</li>';
  } else {
    list.innerHTML = history
      .map(
        (h) =>
          `<li><span>${formatDateKorean(h.date)} · ${h.routineName}</span><span>${formatDurationKorean(h.durationSeconds)}</span></li>`
      )
      .join('');
  }
}

document.getElementById('routine-select').addEventListener('change', (e) => {
  state.activeRoutine = e.target.value;
  save(state);
});

document.getElementById('btn-goto-routine').addEventListener('click', () => {
  editingRoutine = state.activeRoutine;
  renderRoutineView();
  showView('view-routine');
});

document.getElementById('btn-goto-backup').addEventListener('click', () => {
  showView('view-backup');
});

document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.back === 'view-home') renderHome();
    showView(btn.dataset.back);
  });
});

// ---------- ROUTINE EDITOR ----------

function renderRoutineTabs() {
  const tabs = document.getElementById('routine-tabs');
  const names = getRoutineNames(state);
  tabs.innerHTML = names
    .map(
      (n) =>
        `<button class="routine-tab ${n === editingRoutine ? 'active' : ''}" data-name="${n}">${n}</button>`
    )
    .join('');
  tabs.querySelectorAll('.routine-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      editingRoutine = tab.dataset.name;
      renderRoutineView();
    });
  });
}

function partsSummary(exercise) {
  return exercise.parts.map((p) => p.bodyPart).join(' + ');
}

function renderExerciseList() {
  const list = document.getElementById('exercise-list');
  const exercises = state.routines[editingRoutine] || [];
  if (exercises.length === 0) {
    list.innerHTML = '<li class="empty">등록된 운동이 없어요. 아래에서 추가해보세요.</li>';
    return;
  }
  list.innerHTML = exercises
    .map(
      (ex) => `
      <li class="exercise-item" data-id="${ex.id}">
        <span class="drag-handle">☰</span>
        <div class="exercise-item-body">
          <div class="ex-name">${escapeAttr(ex.name)}</div>
          <div class="ex-meta">${escapeAttr(partsSummary(ex))} · ${ex.sets}세트 · 휴식 ${ex.restSeconds}초</div>
        </div>
      </li>`
    )
    .join('');

  list.querySelectorAll('.exercise-item-body').forEach((body) => {
    body.addEventListener('click', () => {
      openExerciseForm(body.closest('.exercise-item').dataset.id);
    });
  });
}

enableDragReorder(document.getElementById('exercise-list'), {
  itemSelector: '.exercise-item',
  handleSelector: '.drag-handle',
  onReorder: (oldIndex, newIndex) => {
    moveExercise(state, editingRoutine, oldIndex, newIndex);
    save(state);
    renderExerciseList();
  },
});

function renderRoutineView() {
  renderRoutineTabs();
  renderExerciseList();
}

document.getElementById('btn-add-routine').addEventListener('click', () => {
  const name = prompt('새 루틴 이름 (예: 상체, 하체)');
  if (!name || !name.trim()) return;
  addRoutine(state, name.trim());
  save(state);
  editingRoutine = name.trim();
  renderRoutineView();
});

document.getElementById('btn-add-exercise').addEventListener('click', () => {
  openExerciseForm(null);
});

// ---------- EXERCISE FORM ----------

function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function partBlockHTML(index, part) {
  const p = part || { bodyPart: '', weight: 0, reps: 0, message: '' };
  return `
    <div class="part-block" data-index="${index}">
      <div class="part-block-title">부위 ${index + 1}</div>
      <label>부위 이름
        <input type="text" class="part-bodypart" placeholder="예: 허벅지 앞쪽" value="${escapeAttr(p.bodyPart)}" required />
      </label>
      <label>무게(kg)
        <input type="number" class="part-weight" min="0" step="0.5" value="${p.weight}" />
      </label>
      <label>횟수
        <input type="number" class="part-reps" min="0" value="${p.reps}" />
      </label>
      <label>완료 시 독려 메시지
        <input type="text" class="part-message" placeholder="예: 허벅지 앞쪽이 단단해졌겠네요!" value="${escapeAttr(p.message)}" />
      </label>
    </div>`;
}

function renderPartBlocks(parts) {
  const container = document.getElementById('ex-parts');
  container.innerHTML = parts.map((p, i) => partBlockHTML(i, p)).join('');
}

function getSupersetCheckbox() {
  return document.getElementById('ex-superset');
}

function openExerciseForm(exerciseId) {
  editingExerciseId = exerciseId;
  const form = document.getElementById('exercise-form');
  form.reset();
  const title = document.getElementById('exercise-form-title');
  const deleteBtn = document.getElementById('btn-delete-exercise');

  if (exerciseId) {
    const ex = state.routines[editingRoutine].find((e) => e.id === exerciseId);
    title.textContent = '운동 수정';
    deleteBtn.hidden = false;
    document.getElementById('ex-name').value = ex.name;
    document.getElementById('ex-sets').value = ex.sets;
    document.getElementById('ex-rest').value = ex.restSeconds;
    getSupersetCheckbox().checked = ex.parts.length === 2;
    renderPartBlocks(ex.parts);
  } else {
    title.textContent = '운동 추가';
    deleteBtn.hidden = true;
    document.getElementById('ex-sets').value = 5;
    document.getElementById('ex-rest').value = 60;
    getSupersetCheckbox().checked = false;
    renderPartBlocks([{ bodyPart: '', weight: 0, reps: 0, message: '' }]);
  }
  showView('view-exercise-form');
}

getSupersetCheckbox().addEventListener('change', (e) => {
  const blocks = document.querySelectorAll('#ex-parts .part-block');
  const current = [...blocks].map((b) => ({
    bodyPart: b.querySelector('.part-bodypart').value,
    weight: Number(b.querySelector('.part-weight').value) || 0,
    reps: Number(b.querySelector('.part-reps').value) || 0,
    message: b.querySelector('.part-message').value,
  }));
  if (e.target.checked) {
    if (current.length < 2) current.push({ bodyPart: '', weight: 0, reps: 0, message: '' });
  } else {
    current.length = 1;
  }
  renderPartBlocks(current);
});

document.getElementById('exercise-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('ex-name').value.trim();
  const sets = Number(document.getElementById('ex-sets').value) || 1;
  const restSeconds = Number(document.getElementById('ex-rest').value) || 0;
  const parts = [...document.querySelectorAll('#ex-parts .part-block')].map((b) => ({
    bodyPart: b.querySelector('.part-bodypart').value.trim(),
    weight: Number(b.querySelector('.part-weight').value) || 0,
    reps: Number(b.querySelector('.part-reps').value) || 0,
    message: b.querySelector('.part-message').value.trim(),
  }));

  if (editingExerciseId) {
    updateExercise(state, editingRoutine, editingExerciseId, { name, sets, restSeconds, parts });
  } else {
    addExercise(state, editingRoutine, { name, sets, restSeconds, parts });
  }
  save(state);
  renderExerciseList();
  showView('view-routine');
});

document.getElementById('btn-delete-exercise').addEventListener('click', () => {
  if (!editingExerciseId) return;
  if (!confirm('이 운동을 삭제할까요?')) return;
  deleteExercise(state, editingRoutine, editingExerciseId);
  save(state);
  renderExerciseList();
  showView('view-routine');
});

// ---------- BACKUP ----------

document.getElementById('btn-export').addEventListener('click', () => {
  exportData(state);
});

document.getElementById('file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state = await importData(file);
    editingRoutine = state.activeRoutine;
    renderHome();
    alert('백업을 불러왔어요!');
    showView('view-home');
  } catch (err) {
    alert('가져오기에 실패했어요: ' + err.message);
  } finally {
    e.target.value = '';
  }
});

// ---------- WORKOUT ----------

function persistSession() {
  state.inProgressSession = session;
  save(state);
}

function sessionExercises() {
  return state.routines[session.routineName] || [];
}

function getExercise(exerciseId) {
  return sessionExercises().find((e) => e.id === exerciseId);
}

function currentExercise() {
  return getExercise(session.currentExerciseId);
}

function renderHubList() {
  const exercises = sessionExercises();
  const doneCount = exercises.filter((ex) => session.progress[ex.id]?.completed).length;
  document.getElementById('hub-progress').textContent = `${doneCount} / ${exercises.length} 운동 완료`;

  const list = document.getElementById('workout-hub-list');
  list.innerHTML = exercises
    .map((ex) => {
      const completed = session.progress[ex.id]?.completed;
      return `
      <li class="hub-item ${completed ? 'completed' : ''}" data-id="${ex.id}">
        <span class="drag-handle">☰</span>
        <div class="hub-item-body">
          <div class="ex-name">${escapeAttr(ex.name)}</div>
          <div class="ex-meta">${escapeAttr(partsSummary(ex))} · ${ex.sets}세트</div>
        </div>
      </li>`;
    })
    .join('');

  list.querySelectorAll('.hub-item-body').forEach((body) => {
    body.addEventListener('click', () => {
      openExerciseDetail(body.closest('.hub-item').dataset.id);
    });
  });
}

enableDragReorder(document.getElementById('workout-hub-list'), {
  itemSelector: '.hub-item',
  handleSelector: '.drag-handle',
  onReorder: (oldIndex, newIndex) => {
    moveExercise(state, session.routineName, oldIndex, newIndex);
    save(state);
    renderHubList();
  },
});

function openExerciseDetail(exerciseId) {
  session.currentExerciseId = exerciseId;
  persistSession();
  showView('view-workout-exercise');
  renderExerciseCard();
  const prog = session.progress[exerciseId];
  if (prog.resting) {
    startRestCountdown();
  }
}

function renderExerciseCard() {
  const ex = currentExercise();
  const prog = session.progress[ex.id];
  document.getElementById('wk-exercise-name').textContent = ex.name;
  document.getElementById('wk-set-label').textContent = `${prog.setIndex} / ${ex.sets} 세트`;
  const targetEl = document.getElementById('wk-target');
  targetEl.innerHTML = ex.parts
    .map((p) => `<div class="part-row">${p.bodyPart} · ${p.weight}kg x ${p.reps}회</div>`)
    .join('');
}

document.getElementById('btn-back-to-hub').addEventListener('click', () => {
  session.currentExerciseId = null;
  persistSession();
  renderHubList();
  showView('view-workout-hub');
});

function startStopwatch() {
  stopStopwatch();
  const tick = () => {
    const text = formatMMSS(elapsedSeconds(session));
    document.getElementById('stopwatch-hub').textContent = text;
    document.getElementById('stopwatch-ex').textContent = text;
  };
  tick();
  stopwatchTimer = setInterval(tick, 500);
}

function stopStopwatch() {
  if (stopwatchTimer) clearInterval(stopwatchTimer);
  stopwatchTimer = null;
}

function startRestCountdown() {
  const overlay = document.getElementById('rest-overlay');
  const countdownEl = document.getElementById('rest-countdown');
  const label = document.getElementById('rest-label');
  const btn = document.getElementById('btn-skip-rest');
  overlay.hidden = false;
  overlay.classList.remove('rest-ready');
  label.textContent = '휴식 중';
  btn.textContent = '건너뛰기';

  const ex = currentExercise();

  const tick = () => {
    const remaining = restRemainingSeconds(session, ex);
    countdownEl.textContent = remaining;
    if (remaining <= 0 && restTimer) {
      clearInterval(restTimer);
      restTimer = null;
      navigator.vibrate?.(200);
      overlay.classList.add('rest-ready');
      label.textContent = '휴식 완료!';
      btn.textContent = '다음 세트 시작';
    }
  };
  tick();
  restTimer = setInterval(tick, 250);
}

function stopRestCountdown() {
  if (restTimer) clearInterval(restTimer);
  restTimer = null;
  document.getElementById('rest-overlay').hidden = true;
}

document.getElementById('btn-skip-rest').addEventListener('click', () => {
  stopRestCountdown();
  endRest(session, currentExercise());
  persistSession();
  renderExerciseCard();
});

function messagesFor(exercise) {
  return exercise.parts.map((p) => p.message?.trim() || `${p.bodyPart} 운동, 수고하셨어요!`);
}

async function finishWorkout() {
  if (!session || session.finished) return;
  stopStopwatch();
  session.finished = true;
  session.finishedAt = Date.now();
  const finalText = formatMMSS(elapsedSeconds(session));
  document.getElementById('stopwatch-hub').textContent = finalText;
  document.getElementById('stopwatch-ex').textContent = finalText;

  state.history.push({
    id: `h-${Date.now()}`,
    routineName: session.routineName,
    date: new Date().toISOString(),
    durationSeconds: elapsedSeconds(session),
  });
  state.inProgressSession = null;
  save(state);

  await showToast(pickFinalMessage(), 3200);

  session = null;
  renderHome();
  showView('view-home');
}

async function handleCompleteSet() {
  const ex = currentExercise();
  const result = completeSet(session, ex);
  persistSession();

  if (result.event === 'rest-start') {
    startRestCountdown();
    return;
  }

  // exercise-complete
  const btn = document.getElementById('btn-complete-set');
  btn.disabled = true;
  await showMessageQueue(messagesFor(ex));

  if (isSessionComplete(session, sessionExercises())) {
    await finishWorkout();
    return; // view has moved to home; no need to re-enable the old button
  }

  btn.disabled = false;
  session.currentExerciseId = null;
  persistSession();
  renderHubList();
  showView('view-workout-hub');
}

document.getElementById('btn-complete-set').addEventListener('click', handleCompleteSet);

document.getElementById('btn-quit-workout').addEventListener('click', () => {
  if (!confirm('운동을 종료할까요? 지금까지의 진행 상황은 저장되지 않아요.')) return;
  stopStopwatch();
  stopRestCountdown();
  session = null;
  state.inProgressSession = null;
  save(state);
  renderHome();
  showView('view-home');
});

function beginNewWorkout() {
  const exercises = state.routines[state.activeRoutine] || [];
  if (exercises.length === 0) {
    alert('먼저 루틴 설정에서 운동을 추가해주세요.');
    return;
  }
  session = createSession(state.activeRoutine, exercises);
  persistSession();
  renderHubList();
  showView('view-workout-hub');
  startStopwatch();
  showToast(GYM_ARRIVAL_MESSAGE);
}

document.getElementById('btn-start-workout').addEventListener('click', beginNewWorkout);

function resumeSession(savedSession) {
  session = savedSession;
  startStopwatch();
  if (session.currentExerciseId) {
    showView('view-workout-exercise');
    renderExerciseCard();
    if (session.progress[session.currentExerciseId].resting) {
      startRestCountdown();
    }
  } else {
    renderHubList();
    showView('view-workout-hub');
  }
}

// ---------- INIT / RESUME PROMPT ----------

function init() {
  renderHome();
  showView('view-home');

  if (state.inProgressSession) {
    document.getElementById('resume-overlay').hidden = false;
  }
}

document.getElementById('btn-resume-yes').addEventListener('click', () => {
  document.getElementById('resume-overlay').hidden = true;
  resumeSession(state.inProgressSession);
});

document.getElementById('btn-resume-no').addEventListener('click', () => {
  document.getElementById('resume-overlay').hidden = true;
  state.inProgressSession = null;
  save(state);
});

init();
