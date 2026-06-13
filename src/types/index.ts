/**
 * Shared types for Order History Exporter for Amazon
 */

export interface OrderItem {
    title: string;
    asin: string;
    digitalId?: string;
    quantity: number;
    price: number;
    discount: number;
    itemUrl: string;
    contentType?: string;
}

export interface Order {
    orderId: string;
    orderDate: string;
    totalAmount: number;
    currency: string;
    items: OrderItem[];
    orderStatus: string;
    detailsUrl: string;
    promotions: Promotion[];
    totalSavings: number;
    orderType?: 'physical' | 'digital';
}

export interface Promotion {
    description: string;
    amount: number;
}

export interface ExportOptions {
    format: 'json' | 'csv';
    startDate: string | null;
    endDate: string | null;
    exportAll: boolean;
}

export interface ExportState {
    inProgress: boolean;
    format: 'json' | 'csv';
    startDate: string | null;
    endDate: string | null;
    exportAll: boolean;
    yearsToProcess: string[];
    currentYearIndex: number;
    currentStartIndex: number;
    collectedOrders: Order[];
    seenOrderIds: string[];
    baseUrl: string;
}

export interface DownloadData {
    content: string;
    fileName: string;
    mimeType: string;
}
