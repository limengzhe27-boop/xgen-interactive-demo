'use client';
import { useRef, type ComponentProps } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { sendOnEnter } from '@/lib/message-keyboard';

export function MessageTextarea({ onSend, onKeyDown, onCompositionStart, onCompositionEnd, ...props }: ComponentProps<'textarea'> & { onSend?: () => void }) {
  const composing = useRef(false);
  return <><Textarea {...props} onCompositionStart={(event) => {
    composing.current = true; onCompositionStart?.(event);
  }} onCompositionEnd={(event) => {
    composing.current = false; onCompositionEnd?.(event);
  }} onKeyDown={(event) => {
    onKeyDown?.(event);
    sendOnEnter(event, () => {
      if (onSend) onSend();
      else event.currentTarget.form?.requestSubmit();
    }, composing.current);
  }} /><details className="dictation-help"><summary>使用系统语音输入</summary><p>先点输入框，再使用手机键盘的麦克风，或电脑系统的听写功能。转换后的文字可以修改，确认后再发送。</p><p>本站不录音、不调用付费识别服务。系统听写是否联网由设备设置决定；网页不能替你开启系统听写。</p></details></>;
}
