function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createExercise({ name, sets, restSeconds, parts }) {
  return {
    id: makeId(),
    name,
    sets,
    restSeconds,
    parts, // [{ bodyPart, weight, reps, message }] length 1 or 2
  };
}

function seedDefaultExercises() {
  return [
    createExercise({
      name: '레그 프레스',
      sets: 7,
      restSeconds: 60,
      parts: [{ bodyPart: '하체 전반', weight: 0, reps: 0, message: '' }],
    }),
    createExercise({
      name: '레그 컬',
      sets: 5,
      restSeconds: 60,
      parts: [{ bodyPart: '허벅지 뒤쪽', weight: 0, reps: 0, message: '' }],
    }),
    createExercise({
      name: '레그 익스텐션',
      sets: 5,
      restSeconds: 60,
      parts: [{ bodyPart: '허벅지 앞쪽', weight: 0, reps: 0, message: '허벅지 앞쪽이 단단해졌겠네요!' }],
    }),
    createExercise({
      name: '딥스 + 턱걸이',
      sets: 5,
      restSeconds: 60,
      parts: [
        { bodyPart: '삼두', weight: 0, reps: 0, message: '' },
        { bodyPart: '등', weight: 0, reps: 0, message: '' },
      ],
    }),
    createExercise({
      name: '버터플라이',
      sets: 5,
      restSeconds: 60,
      parts: [{ bodyPart: '가슴', weight: 0, reps: 0, message: '' }],
    }),
    createExercise({
      name: '숄더 프레스',
      sets: 5,
      restSeconds: 60,
      parts: [{ bodyPart: '어깨', weight: 0, reps: 0, message: '' }],
    }),
    createExercise({
      name: '크런치 + 레그레이즈',
      sets: 5,
      restSeconds: 60,
      parts: [{ bodyPart: '복근', weight: 0, reps: 0, message: '' }],
    }),
  ];
}

function ensureSeeded(state) {
  if (!state.routines['기본'] || state.routines['기본'].length === 0) {
    state.routines['기본'] = seedDefaultExercises();
  }
  return state;
}

function getRoutineNames(state) {
  return Object.keys(state.routines);
}

function getActiveExercises(state) {
  return state.routines[state.activeRoutine] || [];
}

function addExercise(state, routineName, exerciseInput) {
  const exercise = createExercise(exerciseInput);
  state.routines[routineName].push(exercise);
  return exercise;
}

function updateExercise(state, routineName, exerciseId, patch) {
  const list = state.routines[routineName];
  const idx = list.findIndex((e) => e.id === exerciseId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
}

function deleteExercise(state, routineName, exerciseId) {
  state.routines[routineName] = state.routines[routineName].filter((e) => e.id !== exerciseId);
}

function moveExercise(state, routineName, fromIndex, toIndex) {
  const list = state.routines[routineName];
  if (toIndex < 0 || toIndex >= list.length) return;
  const [item] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, item);
}

function addRoutine(state, name) {
  if (!state.routines[name]) state.routines[name] = [];
}

function deleteRoutine(state, name) {
  if (Object.keys(state.routines).length <= 1) return;
  delete state.routines[name];
  if (state.activeRoutine === name) {
    state.activeRoutine = Object.keys(state.routines)[0];
  }
}

export {
  makeId,
  createExercise,
  seedDefaultExercises,
  ensureSeeded,
  getRoutineNames,
  getActiveExercises,
  addExercise,
  updateExercise,
  deleteExercise,
  moveExercise,
  addRoutine,
  deleteRoutine,
};
