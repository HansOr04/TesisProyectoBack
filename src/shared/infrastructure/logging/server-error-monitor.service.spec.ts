import { ServerErrorMonitor } from './server-error-monitor.service';

describe('ServerErrorMonitor', () => {
  const start = Date.UTC(2026, 10, 25, 10);
  const minutes = (n: number) => start + n * 60 * 1000;

  it('starts without errors', () => {
    expect(new ServerErrorMonitor().snapshot()).toEqual({
      lastHour: 0,
      lastAt: null,
    });
  });

  it('counts the errors of the last hour and forgets the older ones', () => {
    const monitor = new ServerErrorMonitor();
    monitor.record(minutes(0));
    monitor.record(minutes(40));

    expect(monitor.snapshot(minutes(59))).toEqual({
      lastHour: 2,
      lastAt: new Date(minutes(40)).toISOString(),
    });
    expect(monitor.snapshot(minutes(60)).lastHour).toBe(1);
    expect(monitor.snapshot(minutes(100))).toEqual({
      lastHour: 0,
      lastAt: null,
    });
  });
});
