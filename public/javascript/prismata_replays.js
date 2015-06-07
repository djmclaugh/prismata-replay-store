function stopPropagation() {
  e = window.event;
  e.cancelBubble = true;
  if (e.stopPropagation) {
    e.stopPropagation();
  }
}

