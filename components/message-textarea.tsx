'use client';
import { useRef, type ComponentProps } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { sendOnEnter } from '@/lib/message-keyboard';

export function MessageTextarea({ onSend, onKeyDown, onCompositionStart, onCompositionEnd, ...props }: ComponentProps<'textarea'> & { onSend?: () => void }) {
  const composing = useRef(false);
  return <Textarea {...props} onCompositionStart={(event) => {
    composing.current = true; onCompositionStart?.(event);
  }} onCompositionEnd={(event) => {
    composing.current = false; onCompositionEnd?.(event);
  }} onKeyDown={(event) => {
    onKeyDown?.(event);
    sendOnEnter(event, () => {
      if (onSend) onSend();
      else event.currentTarget.form?.requestSubmit();
    }, composing.current);
  }} />;
}
