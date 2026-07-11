function createSession(routineName, exercises) {
  return {
    routineName,
    startedAt: Date.now(),
    finishedAt: null,
    finished: false,
    exercises: exercises.map((e) => ({ ...e, parts: e.parts.map((p) => ({ ...p })) })),
    exerciseIndex: 0,
    setIndex: 1,
    resting: false,
    restEndsAt: null,
  };
}

function currentExercise(session) {
  return session.exercises[session.exerciseIndex];
}

function isLastSetOfExercise(session) {
  return session.setIndex >= currentExercise(session).sets;
}

function isLastExercise(session) {
  return session.exerciseIndex >= session.exercises.length - 1;
}

// Advance the session after the user finishes a set. Returns a description
// of what should happen next so the caller (main.js) can drive the UI.
function completeSet(session) {
  const finishedExercise = currentExercise(session);

  if (!isLastSetOfExercise(session)) {
    session.setIndex += 1;
    session.resting = true;
    session.restEndsAt = Date.now() + finishedExercise.restSeconds * 1000;
    return { event: 'rest-start' };
  }

  if (isLastExercise(session)) {
    session.finished = true;
    session.finishedAt = Date.now();
    session.resting = false;
    session.restEndsAt = null;
    return { event: 'workout-complete', exercise: finishedExercise };
  }

  session.exerciseIndex += 1;
  session.setIndex = 1;
  session.resting = false;
  session.restEndsAt = null;
  return { event: 'exercise-complete', exercise: finishedExercise };
}

function skipRest(session) {
  session.resting = false;
  session.restEndsAt = null;
}

function elapsedSeconds(session) {
  const end = session.finishedAt || Date.now();
  return Math.max(0, Math.floor((end - session.startedAt) / 1000));
}

function restRemainingSeconds(session) {
  if (!session.resting || !session.restEndsAt) return 0;
  return Math.max(0, Math.ceil((session.restEndsAt - Date.now()) / 1000));
}

export {
  createSession,
  currentExercise,
  isLastSetOfExercise,
  isLastExercise,
  completeSet,
  skipRest,
  elapsedSeconds,
  restRemainingSeconds,
};
