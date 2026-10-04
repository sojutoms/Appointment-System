// Props that make a non-button element (table row, card) clickable with the
// keyboard too: focusable with Tab, activated with Enter or Space. Keys pressed
// on buttons inside it (e.g. Cancel) are left alone.
export function clickable(onActivate) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      onActivate();
    },
  };
}
