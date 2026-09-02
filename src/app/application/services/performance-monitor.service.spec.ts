import { TestBed } from '@angular/core/testing';
import { PerformanceMonitorService } from './performance-monitor.service';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PerformanceMonitorService]
    });
    service = TestBed.inject(PerformanceMonitorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('measures synchronous operations and returns result', () => {
    const result = service.measureSync('test_sync', () => 42);
    expect(result).toBe(42);
  });

  it('measures asynchronous operations and returns result', async () => {
    const result = await service.measureAsync('test_async', async () => 'hello', 0);
    expect(result).toBe('hello');
  });

  it('does not send remote logs by default when logger is disabled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    service.measureSync('op', () => 1);
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('disables log server fetch calls after initial connection failure when enabled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));
    service.enableRemoteLogging();

    service.measureSync('first_op', () => 1);
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockClear();

    service.measureSync('second_op', () => 2);
    await Promise.resolve();

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
