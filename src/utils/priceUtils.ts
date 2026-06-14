/**
 * Price parsing utilities
 */

/**
 * Parse a price string to a number, handling European and US formats
 * European: "1.234,56" or "1234,56"
 * US: "1,234.56" or "1234.56"
 */
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;

  let cleaned = priceStr.trim();

  // Handle European format (1.234,56 -> 1234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // If comma comes after period, it's European format
    const lastComma = cleaned.lastIndexOf(',');
    const lastPeriod = cleaned.lastIndexOf('.');

    if (lastComma > lastPeriod) {
      // European: periods are thousands separators, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: commas are thousands separators, period is decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Check if comma is decimal separator (e.g., "12,99")
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1] && parts[1].length <= 2) {
      // Likely a decimal comma
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely a thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Detect currency from text content
 */
export function detectCurrency(text: string): string {
  if (text.includes('€') || text.includes('EUR')) {
    return 'EUR';
  } else if (text.includes('£') || text.includes('GBP')) {
    return 'GBP';
  } else if (text.includes('$') || text.includes('USD')) {
    return 'USD';
  }
  return 'EUR'; // Default
}

/**
 * Extract price from text using common patterns
 */
export function extractPriceFromText(text: string): { amount: number; currency: string } | null {
  const pricePatterns = [
    /(?:Summe|Gesamtsumme|Gesamt|Total)[:\s]*(?:EUR|€)?\s*([0-9.,]+)\s*(?:EUR|€)?/i,
    /(?:EUR|€)\s*([0-9.,]+)/i,
    /([0-9]+[.,][0-9]{2})\s*(?:EUR|€)/,
    /\$\s*([0-9.,]+)/,
    /£\s*([0-9.,]+)/,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parsePrice(match[1]);
      if (amount > 0) {
        return {
          amount,
          currency: detectCurrency(text),
        };
      }
    }
  }

  return null;
}

export interface OrderSummary {
  itemSubtotal: number | null;
  tax: number | null;
  rewardsApplied: number | null;
  grandTotal: number | null;
}

/**
 * Parse the order-summary block from an Amazon order details page.
 * Extracts the sub-totals that aren't shown on the order card, so orders paid
 * with rewards points or gift-card balance (Grand Total $0.00) still carry
 * their real item value. Returns null for any line that isn't present.
 */
export function parseOrderSummary(text: string): OrderSummary {
  // For a given set of label variants, find the first labelled amount.
  // Variants are tried most-specific first so "Estimated tax to be collected"
  // wins over a bare "Tax" that would also match "Total before tax".
  const amountFor = (labels: string[]): number | null => {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`${escaped}\\s*:?\\s*(-?)\\s*[$€£]?\\s*([0-9][0-9.,]*)`, 'i');
      const match = text.match(re);
      if (match?.[2]) {
        const value = parsePrice(match[2]);
        return match[1] === '-' ? -value : value;
      }
    }
    return null;
  };

  const rewards = amountFor([
    'Rewards Points',
    'Reward Points',
    'Points Redeemed',
    'Gift Card Amount',
    'Gift Card',
  ]);

  return {
    itemSubtotal: amountFor(['Item(s) Subtotal', 'Items Subtotal', 'Item Subtotal', 'Subtotal']),
    tax: amountFor(['Estimated tax to be collected', 'Tax Collected', 'Estimated Tax', 'Tax']),
    // Stored as a positive "amount applied" regardless of how Amazon signs it.
    rewardsApplied: rewards === null ? null : Math.abs(rewards),
    grandTotal: amountFor(['Grand Total', 'Order Total']),
  };
}
