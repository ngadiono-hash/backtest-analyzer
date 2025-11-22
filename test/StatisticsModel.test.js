import { StatisticsModel } from '../model/StatisticsModel.js';
import trades from './data/trades.json' assert { type: 'json' };

// Mock helpers supaya test cepat
import * as MP from '../helpers/metrics_pips.js';
import * as MT from '../helpers/metrics_time.js';
import { log } from '../helpers/shortcut.js';

jest.unstable_mockModule('../helpers/metrics_pips.js', () => ({
  computePips: jest.fn(() => ({ pips: 10, vpips: 5 }))
}));

jest.unstable_mockModule('../helpers/metrics_time.js', () => ({
  dateISO: jest.fn(d => new Date(d)),
  estimateBarsHeld: jest.fn(() => 3)
}));

jest.unstable_mockModule('../helpers/shortcut.js', () => ({
  log: jest.fn()
}));

describe('StatisticsModel via tradedata-updated event', () => {
  let model;

  beforeEach(() => {
    model = new StatisticsModel();
  });

  test('tradedata-updated event builds stats for all trades', () => {
    window.dispatchEvent(new CustomEvent('tradedata-updated', {
      detail: { stats: { total: trades.length, invalid: 0 }, trades }
    }));

    // model.stats otomatis terisi karena listener
    expect(model.stats).toBeDefined();
    expect(model.stats.symbols.length).toBeGreaterThan(0);
    expect(Object.keys(model.stats.accumulations).length).toBeGreaterThan(0);
    expect(model.stats.equity.pips.length).toBe(trades.length);
    expect(model.stats.single.winrate.total).toBeGreaterThan(0);
  });
});