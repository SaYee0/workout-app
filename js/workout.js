function createSession(routineName, exercises) {
  const progress = {};
  exercises.forEach((ex) => {
    progress[ex.id] = { setIndex: 1, completed: false, resting: false, restEndsAt: null };
  });
  return {
    routineName,
    startedAt: Date.now(),
    finishedAt: null,
    finished: false,
    currentExerciseId: null, // null = hub/list view
    progress,
  };
}

function isSessionComplete(session, exercises) {
  return exercises.every((ex) => session.progress[ex.id]?.completed);
}

// Advance the given exercise's progress after the user finishes a set.
// Returns a description of what should happen next so main.js can drive the UI.
function completeSet(session, exercise) {
  const prog = session.progress[exercise.id];

  if (prog.setIndex < exercise.sets) {
    prog.setIndex += 1;
    prog.resting = true;
    prog.restEndsAt = Date.now() + exercise.restSeconds * 1000;
    return { event: 'rest-start' };
  }

  prog.completed = true;
  prog.resting = false;
  prog.restEndsAt = null;
  return { event: 'exercise-complete' };
}

// Called when the user taps "다음 세트 시작" (either after the rest timer
// naturally reaches zero, or to skip the remaining rest early).
function endRest(session, exercise) {
  const prog = session.progress[exercise.id];
  prog.resting = false;
  prog.restEndsAt = null;
}

function restRemainingSeconds(session, exercise) {
  const prog = session.progress[exercise.id];
  if (!prog || !prog.resting || !prog.restEndsAt) return 0;
  return Math.max(0, Math.ceil((prog.restEndsAt - Date.now()) / 1000));
}

function elapsedSeconds(session) {
  const end = session.finishedAt || Date.now();
  return Math.max(0, Math.floor((end - session.startedAt) / 1000));
}

export {
  createSession,
  isSessionComplete,
  completeSet,
  endRest,
  restRemainingSeconds,
  elapsedSeconds,
};
