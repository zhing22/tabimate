import { describe, expect, it, vi } from 'vitest';
import { createBus } from './events';

interface TestEvents {
  ping: { n: number };
  pong: string;
}

describe('createBus', () => {
  it('delivers payloads to listeners of that event only', () => {
    const bus = createBus<TestEvents>();
    const ping = vi.fn();
    const pong = vi.fn();
    bus.on('ping', ping);
    bus.on('pong', pong);
    bus.emit('ping', { n: 1 });
    expect(ping).toHaveBeenCalledWith({ n: 1 });
    expect(pong).not.toHaveBeenCalled();
  });

  it('calls every listener, in subscription order', () => {
    const bus = createBus<TestEvents>();
    const calls: string[] = [];
    bus.on('pong', (s) => calls.push(`a${s}`));
    bus.on('pong', (s) => calls.push(`b${s}`));
    bus.emit('pong', '!');
    expect(calls).toEqual(['a!', 'b!']);
  });

  it('on() returns an unsubscribe function, and off() removes too', () => {
    const bus = createBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    const stopA = bus.on('pong', a);
    bus.on('pong', b);
    stopA();
    bus.off('pong', b);
    bus.emit('pong', 'x');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('lets a listener unsubscribe while the event is being delivered', () => {
    const bus = createBus<TestEvents>();
    const later = vi.fn();
    const stop = bus.on('pong', () => stop());
    bus.on('pong', later);
    bus.emit('pong', 'x');
    bus.emit('pong', 'y');
    expect(later).toHaveBeenCalledTimes(2);
  });

  it('keeps going when a listener throws, and reports the error', () => {
    const errors: [unknown, string][] = [];
    const bus = createBus<TestEvents>({ onError: (error, type) => errors.push([error, type]) });
    const after = vi.fn();
    const boom = new Error('scene broke');
    bus.on('pong', () => {
      throw boom;
    });
    bus.on('pong', after);
    expect(() => bus.emit('pong', 'x')).not.toThrow();
    expect(after).toHaveBeenCalledWith('x');
    expect(errors).toEqual([[boom, 'pong']]);
  });

  it('ignores emits and offs with no listeners', () => {
    const bus = createBus<TestEvents>();
    expect(() => bus.emit('ping', { n: 0 })).not.toThrow();
    expect(() => bus.off('ping', vi.fn())).not.toThrow();
  });
});
