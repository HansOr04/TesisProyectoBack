import {
  correlationStrength,
  histogram,
  kMeans,
  linearRegression,
  mean,
  median,
  pearson,
  percentileRank,
  stdDev,
} from './statistics';

describe('statistics', () => {
  it('mean/median/stdDev', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
    expect(stdDev([1])).toBe(0);
  });

  it('percentileRank', () => {
    expect(percentileRank(7, [3, 5, 7, 9])).toBe(75);
    expect(percentileRank(1, [])).toBe(0);
  });

  it('pearson detects direct and inverse relations', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBe(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBe(-1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(pearson([1, 2], [1, 2])).toBeNull();
    expect(correlationStrength(0.85)).toBe('strong');
    expect(correlationStrength(-0.5)).toBe('moderate');
    expect(correlationStrength(0.1)).toBe('none');
  });

  it('histogram puts 10 in the last bin', () => {
    const h = histogram([0, 2, 5, 7.5, 10], 5);
    expect(h.map((b) => b.count)).toEqual([1, 1, 1, 1, 1]);
  });

  it('kMeans separates two obvious groups deterministically', () => {
    const pts = [
      [1, 1],
      [1.2, 0.8],
      [9, 9],
      [8.8, 9.1],
    ];
    const a = kMeans(pts, 2);
    const b = kMeans(pts, 2);
    expect(a.assignments[0]).toBe(a.assignments[1]);
    expect(a.assignments[2]).toBe(a.assignments[3]);
    expect(a.assignments[0]).not.toBe(a.assignments[2]);
    expect(a).toEqual(b);
  });

  it('linearRegression fits a line', () => {
    const fit = linearRegression([1, 2, 3, 4], [3, 5, 7, 9]);
    expect(fit?.slope).toBe(2);
    expect(fit?.intercept).toBe(1);
    expect(fit?.r2).toBe(1);
  });
});
