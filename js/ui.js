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

// Lets the user drag an item (via its handle) to a new position in the list.
// The dragged item just floats via transform while dragging; on release the
// final index is computed against the other items' static positions and
// `onReorder(oldIndex, newIndex)` is called so the caller can persist + re-render.
function enableDragReorder(listEl, { itemSelector, handleSelector, onReorder }) {
  let dragEl = null;
  let startY = 0;
  let startTop = 0;
  let startHeight = 0;

  function onMove(e) {
    if (!dragEl) return;
    const dy = e.clientY - startY;
    dragEl.style.transform = `translateY(${dy}px)`;
  }

  function cleanup() {
    if (dragEl) {
      dragEl.classList.remove('dragging');
      dragEl.style.transform = '';
    }
    dragEl = null;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  }

  function onUp(e) {
    if (!dragEl) return;
    const draggedEl = dragEl;
    const dy = e.clientY - startY;
    const draggedMid = startTop + dy + startHeight / 2;
    const items = [...listEl.querySelectorAll(itemSelector)];
    const oldIndex = items.indexOf(draggedEl);
    const others = items.filter((i) => i !== draggedEl);

    let newIndex = others.length;
    for (let i = 0; i < others.length; i++) {
      const rect = others[i].getBoundingClientRect();
      if (draggedMid < rect.top + rect.height / 2) {
        newIndex = i;
        break;
      }
    }

    cleanup();
    if (newIndex !== oldIndex) onReorder(oldIndex, newIndex);
  }

  listEl.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest(handleSelector);
    if (!handle || !listEl.contains(handle)) return;
    const item = handle.closest(itemSelector);
    if (!item) return;
    dragEl = item;
    startY = e.clientY;
    const rect = item.getBoundingClientRect();
    startTop = rect.top;
    startHeight = rect.height;
    item.classList.add('dragging');
    e.preventDefault();
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });
}

export {
  formatMMSS,
  formatDurationKorean,
  formatDateKorean,
  showView,
  showToast,
  showMessageQueue,
  enableDragReorder,
};
