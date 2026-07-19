'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AssistantId, ChatLanguage, SttFormat, SttLanguage } from '@/lib/chatTypes';

type UseMicSttOptions = {
  assistantId: AssistantId;
  /** Optional Whisper hint — map chat language when not auto */
  language?: ChatLanguage | SttLanguage;
  onTranscript: (text: string) => void;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read audio'));
    reader.readAsDataURL(blob);
  });

const pickMimeType = (): { mimeType: string; format: SttFormat } => {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: '', format: 'webm' };
  }
  const candidates: Array<{ mimeType: string; format: SttFormat }> = [
    { mimeType: 'audio/webm;codecs=opus', format: 'webm' },
    { mimeType: 'audio/webm', format: 'webm' },
    { mimeType: 'audio/mp4', format: 'mp4' },
    { mimeType: 'audio/ogg;codecs=opus', format: 'ogg' },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
  }
  return { mimeType: '', format: 'webm' };
};

const toSttLanguage = (
  language?: ChatLanguage | SttLanguage
): SttLanguage | undefined => {
  if (!language || language === 'auto') return undefined;
  if (language === 'az' || language === 'en' || language === 'ru' || language === 'tr') {
    return language;
  }
  return undefined;
};

export const useMicStt = ({ assistantId, language, onTranscript }: UseMicSttOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mimeType, format } = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setIsTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          cleanupStream();
          if (blob.size < 100) {
            throw new Error('Recording too short — try again.');
          }
          const audio_base64 = await blobToBase64(blob);
          const res = await fetch('/api/chat/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assistantId,
              audio_base64,
              format,
              ...(toSttLanguage(language) ? { language: toSttLanguage(language) } : {}),
            }),
          });
          const data = await res.json();
          if (!res.ok || data.success === false) {
            throw new Error(data.error || 'STT failed');
          }
          const text = String(data.data?.text || '').trim();
          if (!text) throw new Error('No speech detected');
          onTranscript(text);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'STT failed');
          cleanupStream();
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: unknown) {
      cleanupStream();
      setError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : err instanceof Error
            ? err.message
            : 'Could not access microphone'
      );
    }
  }, [assistantId, cleanupStream, language, onTranscript]);

  const toggleRecording = useCallback(() => {
    if (isTranscribing) return;
    if (isRecording) stopRecording();
    else void startRecording();
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    error,
    setError,
    toggleRecording,
    startRecording,
    stopRecording,
  };
};
