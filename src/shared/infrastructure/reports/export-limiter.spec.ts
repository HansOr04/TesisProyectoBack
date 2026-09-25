import { exportLimiterStats, withExportSlot } from './export-limiter';

describe('withExportSlot', () => {
  it('never runs more tasks than the configured concurrency', async () => {
    const max = exportLimiterStats().maxConcurrent;
    let peak = 0;
    let active = 0;
    const task = () =>
      withExportSlot(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 10));
        active -= 1;
        return 'ok';
      });
    const results = await Promise.all(Array.from({ length: 6 }, task));
    expect(results).toEqual(Array(6).fill('ok'));
    expect(peak).toBeLessThanOrEqual(max);
    expect(exportLimiterStats().running).toBe(0);
  });

  it('releases the slot when the task throws', async () => {
    await expect(
      withExportSlot(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(exportLimiterStats().running).toBe(0);
  });
});
