import { describe, it, expect } from 'vitest';
import {
  parsePrice,
  detectCurrency,
  extractPriceFromText,
  parseOrderSummary,
} from '../src/utils/priceUtils';

describe('parsePrice', () => {
  describe('European format', () => {
    it('should parse "12,99" as 12.99', () => {
      expect(parsePrice('12,99')).toBe(12.99);
    });

    it('should parse "1.234,56" as 1234.56', () => {
      expect(parsePrice('1.234,56')).toBe(1234.56);
    });

    it('should parse "99,00" as 99.00', () => {
      expect(parsePrice('99,00')).toBe(99);
    });

    it('should parse large European numbers', () => {
      expect(parsePrice('12.345,67')).toBe(12345.67);
    });
  });

  describe('US format', () => {
    it('should parse "12.99" as 12.99', () => {
      expect(parsePrice('12.99')).toBe(12.99);
    });

    it('should parse "1,234.56" as 1234.56', () => {
      expect(parsePrice('1,234.56')).toBe(1234.56);
    });

    it('should parse "99.00" as 99.00', () => {
      expect(parsePrice('99.00')).toBe(99);
    });

    it('should handle thousands separator only', () => {
      expect(parsePrice('1,234')).toBe(1234);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty string', () => {
      expect(parsePrice('')).toBe(0);
    });

    it('should handle whitespace', () => {
      expect(parsePrice('  12.99  ')).toBe(12.99);
    });

    it('should return 0 for non-numeric strings', () => {
      expect(parsePrice('abc')).toBe(0);
    });

    it('should parse simple integers', () => {
      expect(parsePrice('100')).toBe(100);
    });
  });
});

describe('detectCurrency', () => {
  it('should detect EUR from € symbol', () => {
    expect(detectCurrency('€12.99')).toBe('EUR');
  });

  it('should detect EUR from EUR text', () => {
    expect(detectCurrency('Total: EUR 12.99')).toBe('EUR');
  });

  it('should detect GBP from £ symbol', () => {
    expect(detectCurrency('£12.99')).toBe('GBP');
  });

  it('should detect GBP from GBP text', () => {
    expect(detectCurrency('Total: GBP 12.99')).toBe('GBP');
  });

  it('should detect USD from $ symbol', () => {
    expect(detectCurrency('$12.99')).toBe('USD');
  });

  it('should detect USD from USD text', () => {
    expect(detectCurrency('Total: USD 12.99')).toBe('USD');
  });

  it('should default to EUR when no currency found', () => {
    expect(detectCurrency('Total: 12.99')).toBe('EUR');
  });

  it('should prioritize EUR when multiple currencies present', () => {
    expect(detectCurrency('€12.99 ($15.00)')).toBe('EUR');
  });
});

describe('extractPriceFromText', () => {
  describe('German/European patterns', () => {
    it('should extract from "Summe: EUR 12,99"', () => {
      const result = extractPriceFromText('Summe: EUR 12,99');
      expect(result).toEqual({ amount: 12.99, currency: 'EUR' });
    });

    it('should extract from "Gesamtsumme: €99,00"', () => {
      const result = extractPriceFromText('Gesamtsumme: €99,00');
      expect(result).toEqual({ amount: 99, currency: 'EUR' });
    });

    it('should extract from "Total EUR 1.234,56"', () => {
      const result = extractPriceFromText('Total EUR 1.234,56');
      expect(result).toEqual({ amount: 1234.56, currency: 'EUR' });
    });
  });

  describe('simple currency patterns', () => {
    it('should extract from "€ 45.99"', () => {
      const result = extractPriceFromText('Price: € 45.99');
      expect(result).toEqual({ amount: 45.99, currency: 'EUR' });
    });

    it('should extract from "$ 29.99"', () => {
      const result = extractPriceFromText('Price: $ 29.99');
      expect(result).toEqual({ amount: 29.99, currency: 'USD' });
    });

    it('should extract from "£ 19.99"', () => {
      const result = extractPriceFromText('Price: £ 19.99');
      expect(result).toEqual({ amount: 19.99, currency: 'GBP' });
    });
  });

  describe('edge cases', () => {
    it('should return null when no price found', () => {
      expect(extractPriceFromText('No price here')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractPriceFromText('')).toBeNull();
    });

    it('should not match zero amounts', () => {
      expect(extractPriceFromText('Total: €0,00')).toBeNull();
    });
  });
});

describe('parseOrderSummary', () => {
  // Real markup captured from an order paid entirely with rewards points.
  const pointsPaid =
    'Order Summary Item(s) Subtotal: $12.19 Shipping & Handling: $0.00 ' +
    'Total before tax: $12.19 Estimated tax to be collected: $0.73 ' +
    'Rewards Points: -$12.92 Grand Total: $0.00';

  it('should extract the item subtotal', () => {
    expect(parseOrderSummary(pointsPaid).itemSubtotal).toBe(12.19);
  });

  it('should extract the tax (not "Total before tax")', () => {
    expect(parseOrderSummary(pointsPaid).tax).toBe(0.73);
  });

  it('should extract rewards applied as a positive amount', () => {
    expect(parseOrderSummary(pointsPaid).rewardsApplied).toBe(12.92);
  });

  it('should extract the grand total of $0.00', () => {
    expect(parseOrderSummary(pointsPaid).grandTotal).toBe(0);
  });

  it('should handle a normal card-paid order', () => {
    const normal =
      'Order Summary Item(s) Subtotal: $148.38 Estimated tax to be collected: $8.90 ' +
      'Grand Total: $157.28';
    const s = parseOrderSummary(normal);
    expect(s.itemSubtotal).toBe(148.38);
    expect(s.tax).toBe(8.9);
    expect(s.rewardsApplied).toBeNull();
    expect(s.grandTotal).toBe(157.28);
  });

  it('should return nulls when no summary present', () => {
    const s = parseOrderSummary('no totals here');
    expect(s.itemSubtotal).toBeNull();
    expect(s.tax).toBeNull();
    expect(s.rewardsApplied).toBeNull();
    expect(s.grandTotal).toBeNull();
  });
});
