import { describe, expect, it } from 'vitest';
import { DictionaryLoadError, dictionaryUrl, loadDictionary } from '../../src';
import { MINI_DICT } from '../helpers';

const respond = (body: unknown, status = 200): typeof fetch =>
  (async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
    })) as typeof fetch;

describe('dictionaryUrl', () => {
  it('pins a tagged jsDelivr release', () => {
    expect(dictionaryUrl('4.0.0')).toBe(
      'https://cdn.jsdelivr.net/gh/trailofdad/morphkit-dictionary@v4.0.0/dictionary.json',
    );
  });
});

describe('loadDictionary', () => {
  it('returns the dictionary and requests the pinned default URL', async () => {
    let requested = '';
    const fetchSpy = (async (url: string) => {
      requested = url;
      return new Response(JSON.stringify(MINI_DICT));
    }) as unknown as typeof fetch;
    await expect(loadDictionary({ fetch: fetchSpy })).resolves.toEqual(MINI_DICT);
    expect(requested).toBe(dictionaryUrl());
  });

  it('throws a typed error on a non-2xx response', async () => {
    const err = await loadDictionary({
      url: 'https://x/d.json',
      fetch: respond('nope', 404),
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DictionaryLoadError);
    expect(err).toMatchObject({ status: 404, url: 'https://x/d.json' });
  });

  it('throws on a network failure', async () => {
    const fail = (async () => {
      throw new TypeError('offline');
    }) as typeof fetch;
    await expect(loadDictionary({ fetch: fail })).rejects.toBeInstanceOf(DictionaryLoadError);
  });

  it('throws on a payload that is not a dictionary', async () => {
    await expect(loadDictionary({ fetch: respond({ hello: 1 }) })).rejects.toThrow(
      /not a morphkit dictionary/,
    );
    await expect(loadDictionary({ fetch: respond('<html>') })).rejects.toThrow(/not valid JSON/);
  });
});
