export const api = {
  async health(): Promise<{ ok: boolean }> {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('API unavailable');
    return response.json();
  },
};
