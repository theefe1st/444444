/*
  # Создание таблицы данных о продажах

  1. Новые таблицы
    - `sales_data`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `date` (date)
      - `product_name` (text)
      - `product_id` (text)
      - `category` (text)
      - `quantity` (integer)
      - `unit_price` (numeric)
      - `revenue` (numeric)
      - `cost_price` (numeric)
      - `profit` (numeric)
      - `profitability` (numeric)
      - `discount` (numeric)
      - `vat` (numeric)
      - `margin` (numeric)
      - `customer_type` (text)
      - `region` (text)
      - `sales_channel` (text)
      - `shipping_status` (text)
      - `year` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Безопасность
    - Включить RLS для таблицы `sales_data`
    - Добавить политики для доступа пользователей только к своим данным
*/

CREATE TABLE IF NOT EXISTS sales_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  product_name text NOT NULL,
  product_id text NOT NULL,
  category text NOT NULL DEFAULT 'Без категории',
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  profitability numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  margin numeric NOT NULL DEFAULT 0,
  customer_type text NOT NULL DEFAULT 'физ. лицо',
  region text NOT NULL DEFAULT 'Не указан',
  sales_channel text NOT NULL DEFAULT 'Офлайн',
  shipping_status text NOT NULL DEFAULT 'доставлено',
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;

-- Политика для чтения: пользователи видят только свои данные
CREATE POLICY "Users can read own sales data"
  ON sales_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Политика для вставки: пользователи могут добавлять только свои данные
CREATE POLICY "Users can insert own sales data"
  ON sales_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Политика для обновления: пользователи могут обновлять только свои данные
CREATE POLICY "Users can update own sales data"
  ON sales_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика для удаления: пользователи могут удалять только свои данные
CREATE POLICY "Users can delete own sales data"
  ON sales_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_sales_data_user_id ON sales_data(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_date ON sales_data(date);
CREATE INDEX IF NOT EXISTS idx_sales_data_category ON sales_data(category);
CREATE INDEX IF NOT EXISTS idx_sales_data_region ON sales_data(region);
CREATE INDEX IF NOT EXISTS idx_sales_data_product_name ON sales_data(product_name);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_sales_data_updated_at
  BEFORE UPDATE ON sales_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();