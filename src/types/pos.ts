export type Tab = 'billing' | 'inventory' | 'analytics';

export type PaymentMethod = 'cash' | 'upi' | 'card';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number;
}
