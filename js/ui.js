function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDurationKorean(totalSeconds) {
  const m = Math.round(totalSeconds / 60);
  return `${m}분`;
}

function formatDateKorean(isoDate) {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach((v) => {
    v.hidden = v.id !== viewId;
  });
}

let toastTimer = null;
function showToast(text, duration = 2200) {
  const el = document.getElementById('message-toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  return new Promise((resolve) => {
    toastTimer = setTimeout(() => {
      el.hidden = true;
      resolve();
    }, duration);
  });
}

async function showMessageQueue(messages, duration = 2200) {
  for (const msg of messages) {
    if (!msg) continue;
    await showToast(msg, duration);
  }
}

export { formatMMSS, formatDurationKorean, formatDateKorean, showView, showToast, showMessageQueue };
