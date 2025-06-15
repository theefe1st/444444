import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для базы данных
export interface Database {
  public: {
    Tables: {
      sales_data: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          product_name: string;
          product_id: string;
          category: string;
          quantity: number;
          unit_price: number;
          revenue: number;
          cost_price: number;
          profit: number;
          profitability: number;
          discount: number;
          vat: number;
          margin: number;
          customer_type: string;
          region: string;
          sales_channel: string;
          shipping_status: string;
          year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          product_name: string;
          product_id: string;
          category: string;
          quantity: number;
          unit_price: number;
          revenue: number;
          cost_price: number;
          profit: number;
          profitability: number;
          discount: number;
          vat: number;
          margin: number;
          customer_type: string;
          region: string;
          sales_channel: string;
          shipping_status: string;
          year: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          product_name?: string;
          product_id?: string;
          category?: string;
          quantity?: number;
          unit_price?: number;
          revenue?: number;
          cost_price?: number;
          profit?: number;
          profitability?: number;
          discount?: number;
          vat?: number;
          margin?: number;
          customer_type?: string;
          region?: string;
          sales_channel?: string;
          shipping_status?: string;
          year?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}