type MessageKeyEvent = {
  key: string;
  shiftKey: boolean;
  repeat: boolean;
  defaultPrevented: boolean;
  nativeEvent: { isComposing?: boolean; keyCode?: number };
  currentTarget: { value: string; disabled: boolean };
  preventDefault: () => void;
};

// Apply only to message composers, never to ordinary story/character editors.
export function sendOnEnter(event: MessageKeyEvent, send: () => void, composing = false) {
  if (event.defaultPrevented || event.key !== 'Enter' || event.shiftKey
    || composing || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
  event.preventDefault();
  if (!event.repeat && !event.currentTarget.disabled && event.currentTarget.value.trim()) send();
}
