'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AssistantId, ChatLanguage, TtsGender } from '@/lib/chatTypes';
import { AssistantsApiTestOptions } from '@/lib/assistantsApiTestOptions';
import { ApiTestDebugInfo, extractTestDebug } from '@/lib/assistantsApiTestLog';

type UseAssistantTtsOptions = {
  assistantId: AssistantId;
  language?: ChatLanguage;
  gender?: TtsGender;
  apiTestOptions?: Pick<AssistantsApiTestOptions, 'includeTtsLanguage' | 'includeTtsGender'>;
  onRequestLogged?: (entry: ApiTestDebugInfo) => void;
  includeTestDebug?: boolean;
};

export const useAssistantTts = ({
  assistantId,
  language = 'auto',
  gender,
  apiTestOptions,
  onRequestLogged,
  includeTestDebug = false,
}: UseAssistantTtsOptions) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const play = useCallback(
    async (messageId: string, text: string) => {
      if (!text.trim()) return;

      if (playingId === messageId && audioRef.current) {
        stop();
        return;
      }

      stop();
      setError('');
      setLoadingId(messageId);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/chat/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            text,
            assistantId,
            language,
            ...(gender ? { gender } : {}),
            apiTestOptions,
            includeTestDebug,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (!response.ok) {
          let errorText = `TTS failed (${response.status})`;
          if (contentType.includes('application/json')) {
            const errPayload = await response.json().catch(() => null);
            const { debug, data: err } = extractTestDebug(errPayload);
            if (debug) onRequestLogged?.(debug);
            const code =
              err && typeof err === 'object' && 'code' in err
                ? String((err as { code?: string }).code || '')
                : '';
            if (code === 'TTS_DISABLED') {
              errorText = 'TTS is disabled for this assistant.';
            } else if (
              err &&
              typeof err === 'object' &&
              ('error' in err || 'message' in err)
            ) {
              errorText = String(
                (err as { error?: string; message?: string }).error ||
                  (err as { message?: string }).message ||
                  errorText
              );
            }
          }
          throw new Error(errorText);
        }

        let blob: Blob;
        if (contentType.includes('application/json')) {
          const payload = await response.json();
          const { debug, data } = extractTestDebug(payload);
          if (debug) onRequestLogged?.(debug);
          const audioBase64 =
            data && typeof data === 'object' && 'audioBase64' in data
              ? String((data as { audioBase64?: string }).audioBase64 || '')
              : '';
          if (!audioBase64) throw new Error('TTS audio missing in response');
          const binary = atob(audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          blob = new Blob([bytes], {
            type:
              data && typeof data === 'object' && 'audioContentType' in data
                ? String((data as { audioContentType?: string }).audioContentType || 'audio/wav')
                : 'audio/wav',
          });
        } else {
          blob = await response.blob();
        }

        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setPlayingId(null);
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
        };
        audio.onerror = () => {
          setError('Audio playback failed');
          stop();
        };

        await audio.play();
        setPlayingId(messageId);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'TTS failed');
        stop();
      } finally {
        setLoadingId(null);
      }
    },
    [
      assistantId,
      apiTestOptions,
      gender,
      includeTestDebug,
      language,
      onRequestLogged,
      playingId,
      stop,
    ]
  );

  return {
    play,
    stop,
    playingId,
    loadingId,
    error,
    setError,
  };
};
