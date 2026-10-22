import type { MorphkitDictionary } from '@trailofdad/morphkit';
import { useCallback, useEffect, useState } from 'react';
import { dictionaryUrl, loadDictionary, type LoadDictionaryOptions } from '../index';

export type DictionaryState =
  | { status: 'loading'; dictionary: null; error: null; retry: () => void }
  | { status: 'ready'; dictionary: MorphkitDictionary; error: null; retry: () => void }
  | { status: 'error'; dictionary: null; error: Error; retry: () => void };

export type UseDictionaryOptions = Omit<LoadDictionaryOptions, 'signal'>;

/**
 * One request per URL for the whole page: every `useDictionary` with the same
 * URL shares it. A failed request is evicted so `retry` fetches again.
 */
const requests = new Map<string, Promise<MorphkitDictionary>>();
const loaded = new Map<string, MorphkitDictionary>();

function request(url: string, fetchImpl: typeof fetch | undefined): Promise<MorphkitDictionary> {
  let pending = requests.get(url);
  if (!pending) {
    pending = loadDictionary({ url, ...(fetchImpl ? { fetch: fetchImpl } : {}) }).then(
      (dict) => {
        loaded.set(url, dict);
        return dict;
      },
      (error: unknown) => {
        requests.delete(url);
        throw error;
      },
    );
    requests.set(url, pending);
  }
  return pending;
}

type Settled =
  | { url: string; attempt: number; dictionary: MorphkitDictionary; error: null }
  | { url: string; attempt: number; dictionary: null; error: Error };

/**
 * Load a morphkit dictionary (a pinned release by default). Reports `loading`,
 * `ready` or `error` — a failed fetch never leaves the UI waiting forever — and
 * `retry()` re-requests after an error. Pass a stable `fetch` if you inject one.
 */
export function useDictionary(options: UseDictionaryOptions = {}): DictionaryState {
  const url = options.url ?? dictionaryUrl(options.version);
  const fetchImpl = options.fetch;
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (loaded.has(url)) return;
    let active = true;
    request(url, fetchImpl).then(
      (dictionary) => {
        if (active) setSettled({ url, attempt, dictionary, error: null });
      },
      (error: unknown) => {
        if (active) {
          const err = error instanceof Error ? error : new Error(String(error));
          setSettled({ url, attempt, dictionary: null, error: err });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [url, fetchImpl, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const cached = loaded.get(url);
  if (cached) return { status: 'ready', dictionary: cached, error: null, retry };
  if (settled && settled.url === url && settled.attempt === attempt && settled.error) {
    return { status: 'error', dictionary: null, error: settled.error, retry };
  }
  return { status: 'loading', dictionary: null, error: null, retry };
}

/** @internal Test hook: forget every cached dictionary request. */
export function resetDictionaryCache(): void {
  requests.clear();
  loaded.clear();
}
