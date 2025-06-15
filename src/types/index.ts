export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'analyst';
}

export interface SalesData {
  id: string;
  date: string;
  time?: string;
  product_name: string;
  product_id: string;
  category: string;
  supplier?: string;
  warehouse?: string;
  quantity: number;
  unit_price: number;
  revenue: number;
  cost_price: number;
  profit: number;
  profitability: number;
  discount: number;
  vat: number;
  margin: number;
  customer_id?: string;
  customer_type: 'розница' | 'опт' | 'физ. лицо' | 'юр. лицо';
  region: string;
  city?: string;
  delivery_address?: string;
  sales_person?: string;
  sales_channel: 'Онлайн' | 'Офлайн'; // Убрали 'Маркетплейсы'
  shipping_status: 'отправлено' | 'ожидание' | 'доставлено';
  day_of_week?: string;
  month?: string;
  quarter?: string;
  year?: number;
}

export interface FilterOptions {
  startDate: string;
  endDate: string;
  region: string;
  category: string;
  customerType: string;
}

export interface ABCAnalysisItem {
  product_name: string;
  revenue: number;
  percentage: number;
  cumulative_percentage: number;
  category: 'A' | 'B' | 'C';
}

export interface XYZAnalysisItem {
  product_name: string;
  coefficient_variation: number;
  category: 'X' | 'Y' | 'Z';
  demand_stability: string;
}

export interface ABCXYZAnalysisItem {
  product_name: string;
  abc_category: 'A' | 'B' | 'C';
  xyz_category: 'X' | 'Y' | 'Z';
  combined_category: string;
  revenue: number;
  coefficient_variation: number;
  strategy: string;
  priority: string;
}

export interface FactorAnalysis {
  factor: string;
  impact: number;
  description: string;
  trend: 'positive' | 'negative' | 'neutral';
}

export interface StructuralAnalysis {
  category: string;
  value: number;
  percentage: number;
  change: number;
}

export interface Analytics {
  totalRevenue: number;
  totalSales: number;
  averageCheck: number;
  liquidity: number;
  monthlyTrend: Array<{ month: string; sales: number; revenue: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
  regionAnalysis: Array<{ region: string; sales: number; percentage: number }>;
  abcAnalysis: ABCAnalysisItem[];
  xyzAnalysis: XYZAnalysisItem[];
  abcxyzAnalysis: ABCXYZAnalysisItem[];
  factorAnalysis: FactorAnalysis[];
  structuralAnalysis: {
    byCategory: StructuralAnalysis[];
    byRegion: StructuralAnalysis[];
    byChannel: StructuralAnalysis[];
  };
}