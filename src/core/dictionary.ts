import type { DictionaryIndex, MorphkitDictionary } from '@trailofdad/morphkit';
import { createDictionaryIndex } from '@trailofdad/morphkit';

/**
 * The morphkit-dictionary release this package is tested against. Loading a
 * pinned release (rather than the repo's `main` branch) means a dictionary edit
 * never changes results until the consumer opts in.
 */
export const DEFAULT_DICTIONARY_VERSION = '4.1.0';

/** jsDelivr URL for a tagged morphkit-dictionary release. */
export function dictionaryUrl(version: string = DEFAULT_DICTIONARY_VERSION): string {
  return `https://cdn.jsdelivr.net/gh/trailofdad/morphkit-dictionary@v${version}/dictionary.json`;
}

/** Why {@link loadDictionary} failed: the request, the HTTP status, or the payload. */
export class DictionaryLoadError extends Error {
  readonly url: string;
  readonly status: number | undefined;

  constructor(message: string, url: string, status?: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DictionaryLoadError';
    this.url = url;
    this.status = status;
  }
}

export interface LoadDictionaryOptions {
  /** Full URL; overrides `version`. */
  url?: string;
  /** morphkit-dictionary release, e.g. `"4.1.0"`. Defaults to {@link DEFAULT_DICTIONARY_VERSION}. */
  version?: string;
  /** Injected for tests or non-browser runtimes. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * Fetch a morphkit dictionary. Throws {@link DictionaryLoadError} on a network
 * failure, a non-2xx response, or a payload that is not a dictionary — so the
 * caller can show an error rather than wait forever.
 */
export async function loadDictionary(
  options: LoadDictionaryOptions = {},
): Promise<MorphkitDictionary> {
  const url = options.url ?? dictionaryUrl(options.version);
  const doFetch = options.fetch ?? globalThis.fetch;

  let res: Response;
  try {
    res = await doFetch(url, options.signal ? { signal: options.signal } : undefined);
  } catch (e) {
    throw new DictionaryLoadError(`Could not reach ${url}`, url, undefined, { cause: e });
  }
  if (!res.ok) {
    throw new DictionaryLoadError(`Dictionary request failed (${res.status})`, url, res.status);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (e) {
    throw new DictionaryLoadError('Dictionary is not valid JSON', url, res.status, { cause: e });
  }
  if (!isDictionary(body)) {
    throw new DictionaryLoadError('Response is not a morphkit dictionary', url, res.status);
  }
  return body;
}

function isDictionary(value: unknown): value is MorphkitDictionary {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.loci === 'object' && v.loci !== null && Array.isArray(v.combos);
}

/**
 * Memoized morphkit dictionary index, one per dictionary object. Keying a
 * WeakMap on the dictionary lets every helper share a single O(1) index instead
 * of re-scanning `dict.loci` per call.
 */
const indexCache = new WeakMap<MorphkitDictionary, DictionaryIndex>();

/** @internal */
export function dictIndex(dict: MorphkitDictionary): DictionaryIndex {
  let index = indexCache.get(dict);
  if (!index) {
    index = createDictionaryIndex(dict);
    indexCache.set(dict, index);
  }
  return index;
}

/** Inheritance pattern by dictionary locus key (canonical `LocusInput.locusId`). */
export function getInheritanceById(locusId: string, dict: MorphkitDictionary): string | undefined {
  return dictIndex(dict).getInheritance(locusId);
}

/** @internal */
export const isNormalAllele = (a: string): boolean => a.toLowerCase() === 'normal' || a === '';
