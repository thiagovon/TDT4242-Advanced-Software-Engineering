// Tests for useApi — the thin fetch wrapper
// Covers: all 4 HTTP methods, error handling, JSON parsing

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let api: typeof import('../../hooks/useApi').api;

describe('useApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../hooks/useApi');
    api = mod.api;
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => { fetchSpy.mockRestore(); });

  it('api.get sends GET request to /api + path', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: 'test' }) } as Response);
    const result = await api.get('/assignments');
    expect(fetchSpy).toHaveBeenCalledWith('/api/assignments', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
    expect(result).toEqual({ data: 'test' });
  });

  it('api.post sends POST request with JSON body', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: '123' }) } as Response);
    const result = await api.post('/entries', { content: 'hello' });
    expect(fetchSpy).toHaveBeenCalledWith('/api/entries', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ content: 'hello' }),
    }));
    expect(result).toEqual({ id: '123' });
  });

  it('api.patch sends PATCH request with JSON body', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({ updated: true }) } as Response);
    const result = await api.patch('/entries/1', { content: 'updated' });
    expect(fetchSpy).toHaveBeenCalledWith('/api/entries/1', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ content: 'updated' }),
    }));
    expect(result).toEqual({ updated: true });
  });

  it('api.delete sends DELETE request', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) } as Response);
    await api.delete('/entries/1');
    expect(fetchSpy).toHaveBeenCalledWith('/api/entries/1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('throws error with message from JSON body when response is not ok', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({ error: 'Not found' }) } as Response);
    await expect(api.get('/missing')).rejects.toThrow('Not found');
  });

  it('throws generic HTTP error when JSON parse fails', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new Error('invalid json')) } as Response);
    await expect(api.get('/broken')).rejects.toThrow('HTTP 500');
  });

  it('throws generic HTTP error when error field is missing from body', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({}) } as Response);
    await expect(api.get('/forbidden')).rejects.toThrow('HTTP 403');
  });
});
