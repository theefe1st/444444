import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { SalesData, FilterOptions, Analytics, ABCAnalysisItem, XYZAnalysisItem, ABCXYZAnalysisItem, FactorAnalysis, StructuralAnalysis } from '../types';

// Новые типы для сортировки
type SortDirection = 'asc' | 'desc' | null;
type SortBy = keyof SalesData | null;

export const useSalesData = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [filteredData, setFilteredData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: '',
    endDate: '',
    region: '',
    category: '',
    customerType: ''
  });

  // Состояние для конфигурации сортировки
  const [sortConfig, setSortConfig] = useState<{ key: SortBy, direction: SortDirection }>({ key: null, direction: null });

  // Загрузка данных пользователя из Supabase
  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('Пользователь не авторизован');
        setSalesData([]);
        return;
      }

      const { data, error } = await supabase
        .from('sales_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки данных:', error);
        return;
      }

      console.log(`Загружено ${data?.length || 0} записей из Supabase`);
      setSalesData(data || []);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // useMemo для фильтрации данных
  const preSortedFilteredData = useMemo(() => {
    console.log('Применяем фильтры к данным. Исходных данных:', salesData.length);
    let currentFiltered = salesData;

    if (filters.startDate) {
      currentFiltered = currentFiltered.filter(item => item.date >= filters.startDate);
    }
    if (filters.endDate) {
      currentFiltered = currentFiltered.filter(item => item.date <= filters.endDate);
    }
    if (filters.region) {
      currentFiltered = currentFiltered.filter(item => 
        item.region.toLowerCase().includes(filters.region.toLowerCase())
      );
    }
    if (filters.category) {
      currentFiltered = currentFiltered.filter(item => 
        item.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }
    if (filters.customerType) {
      currentFiltered = currentFiltered.filter(item => item.customer_type === filters.customerType);
    }
    
    console.log('Количество данных после фильтрации:', currentFiltered.length);
    return currentFiltered;
  }, [salesData, filters]);

  // useEffect для сортировки отфильтрованных данных
  useEffect(() => {
    if (sortConfig.key === null) {
      setFilteredData(preSortedFilteredData);
      return;
    }

    const sortedArray = [...preSortedFilteredData].sort((a, b) => {
      const aValue = a[sortConfig.key!] as any;
      const bValue = b[sortConfig.key!] as any;

      // Специальная числовая сортировка для 'id'
      if (sortConfig.key === 'id') {
        const idA = parseInt(String(aValue), 10);
        const idB = parseInt(String(bValue), 10);
        return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
      }
      
      // Сравнение для чисел
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Для остальных полей (как строки)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
    
    setFilteredData(sortedArray);
  }, [preSortedFilteredData, sortConfig]);

  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const addSalesData = useCallback(async (newData: SalesData[]) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Пользователь не авторизован');
        return;
      }

      console.log(`Добавляем ${newData.length} записей в Supabase`);

      // Подготавливаем данные для вставки
      const dataToInsert = newData.map(item => ({
        user_id: user.id,
        date: item.date,
        product_name: item.product_name,
        product_id: item.product_id,
        category: item.category,
        quantity: item.quantity,
        unit_price: item.unit_price,
        revenue: item.revenue,
        cost_price: item.cost_price,
        profit: item.profit,
        profitability: item.profitability,
        discount: item.discount,
        vat: item.vat,
        margin: item.margin,
        customer_type: item.customer_type,
        region: item.region,
        sales_channel: item.sales_channel,
        shipping_status: item.shipping_status,
        year: item.year || new Date(item.date).getFullYear()
      }));

      const { data, error } = await supabase
        .from('sales_data')
        .insert(dataToInsert)
        .select();

      if (error) {
        console.error('Ошибка при добавлении данных:', error);
        return;
      }

      console.log(`Успешно добавлено ${data?.length || 0} записей`);
      
      // Перезагружаем данные
      await loadUserData();

      // Сбрасываем фильтры
      setFilters({
        startDate: '',
        endDate: '',
        region: '',
        category: '',
        customerType: ''
      });
    } catch (error) {
      console.error('Ошибка при добавлении данных:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadUserData]);

  const clearAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Пользователь не авторизован');
        return;
      }

      const { error } = await supabase
        .from('sales_data')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Ошибка при удалении данных:', error);
        return;
      }

      console.log('Все данные пользователя удалены');
      setSalesData([]);
      setFilteredData([]);

      // Сбрасываем фильтры
      setFilters({
        startDate: '',
        endDate: '',
        region: '',
        category: '',
        customerType: ''
      });
    } catch (error) {
      console.error('Ошибка при удалении данных:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestSort = useCallback((key: keyof SalesData) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
      key = null;
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  // Функции аналитики (без изменений)
  const calculateABCAnalysis = (data: SalesData[]): ABCAnalysisItem[] => {
    if (data.length === 0) return [];
    const productRevenue = data.reduce((acc, item) => {
      if (!acc[item.product_name]) {
        acc[item.product_name] = 0;
      }
      acc[item.product_name] += item.revenue;
      return acc;
    }, {} as Record<string, number>);

    const sortedProducts = Object.entries(productRevenue)
      .map(([name, revenue]) => ({ product_name: name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = sortedProducts.reduce((sum, item) => sum + item.revenue, 0);
    let cumulativeRevenue = 0;

    return sortedProducts.map(item => {
      cumulativeRevenue += item.revenue;
      const percentage = (item.revenue / totalRevenue) * 100;
      const cumulative_percentage = (cumulativeRevenue / totalRevenue) * 100;
      
      let category: 'A' | 'B' | 'C';
      if (cumulative_percentage <= 80) category = 'A';
      else if (cumulative_percentage <= 95) category = 'B';
      else category = 'C';

      return {
        product_name: item.product_name,
        revenue: item.revenue,
        percentage,
        cumulative_percentage,
        category
      };
    });
  };

  const calculateXYZAnalysis = (data: SalesData[]): XYZAnalysisItem[] => {
    if (data.length === 0) return [];
    const productMonthlyData = data.reduce((acc, item) => {
      const month = new Date(item.date).getMonth();
      if (!acc[item.product_name]) {
        acc[item.product_name] = Array(12).fill(0);
      }
      acc[item.product_name][month] += item.quantity;
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(productMonthlyData).map(([product_name, monthlyValues]) => {
      const nonZeroValues = monthlyValues.filter(val => val > 0);
      
      if (nonZeroValues.length === 0) {
        return {
          product_name,
          coefficient_variation: 100,
          category: 'Z' as const,
          demand_stability: 'Нерегулярный спрос'
        };
      }

      const mean = nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length;
      const variance = nonZeroValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / nonZeroValues.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficient_variation = mean > 0 ? (standardDeviation / mean) * 100 : 100;

      let category: 'X' | 'Y' | 'Z';
      let demand_stability: string;
      
      if (coefficient_variation <= 15) {
        category = 'X';
        demand_stability = 'Стабильный спрос';
      } else if (coefficient_variation <= 35) {
        category = 'Y';
        demand_stability = 'Сезонный спрос';
      } else {
        category = 'Z';
        demand_stability = 'Нерегулярный спрос';
      }

      return {
        product_name,
        coefficient_variation,
        category,
        demand_stability
      };
    });
  };

  const calculateABCXYZAnalysis = (abcData: ABCAnalysisItem[], xyzData: XYZAnalysisItem[]): ABCXYZAnalysisItem[] => {
    return abcData.map(abcItem => {
      const xyzItem = xyzData.find(xyz => xyz.product_name === abcItem.product_name);
      const combined_category = `${abcItem.category}${xyzItem?.category || 'Z'}`;
      
      let strategy: string;
      let priority: string;
      
      switch (combined_category) {
        case 'AX': 
          strategy = 'Ключевые товары - постоянный контроль'; 
          priority = abcItem.revenue > 50000 ? 'Критический' : 'Высокий';
          break;
        case 'AY': 
          strategy = 'Важные товары - сезонное планирование'; 
          priority = abcItem.revenue > 40000 ? 'Критический' : 'Высокий';
          break;
        case 'AZ': 
          if (abcItem.revenue > 60000) {
            strategy = 'Критические проблемные товары - срочный анализ';
            priority = 'Критический';
          } else if (abcItem.revenue > 30000) {
            strategy = 'Контрольные проблемные товары - детальный анализ';
            priority = 'Высокий';
          } else {
            strategy = 'Условно-стабильные товары - мониторинг';
            priority = 'Средний';
          }
          break;
        case 'BX': strategy = 'Стабильные товары - регулярный контроль'; priority = 'Средний'; break;
        case 'BY': strategy = 'Сезонные товары - планирование запасов'; priority = 'Средний'; break;
        case 'BZ': strategy = 'Нестабильные товары - минимальные запасы'; priority = 'Низкий'; break;
        case 'CX': strategy = 'Стабильные товары - автоматизация'; priority = 'Низкий'; break;
        case 'CY': strategy = 'Сезонные товары - точечные закупки'; priority = 'Низкий'; break;
        case 'CZ': strategy = 'Товары на выбытие - минимизация'; priority = 'Критический (на выбытие)'; break;
        default: strategy = 'Требует анализа'; priority = 'Неопределен';
      }

      return {
        product_name: abcItem.product_name,
        abc_category: abcItem.category,
        xyz_category: xyzItem?.category || 'Z',
        combined_category,
        revenue: abcItem.revenue,
        coefficient_variation: xyzItem?.coefficient_variation || 0,
        strategy,
        priority
      };
    });
  };

  const calculateFactorAnalysis = (data: SalesData[]): FactorAnalysis[] => {
    if (data.length === 0) {
      return [
        {
          factor: 'Нет данных',
          impact: 0,
          description: 'Загрузите данные для анализа',
          trend: 'neutral'
        }
      ];
    }
    
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    
    const channelRevenue = data.reduce((acc, item) => {
      if (!acc[item.sales_channel]) acc[item.sales_channel] = 0;
      acc[item.sales_channel] += item.revenue;
      return acc;
    }, {} as Record<string, number>);

    const regionRevenue = data.reduce((acc, item) => {
      if (!acc[item.region]) acc[item.region] = 0;
      acc[item.region] += item.revenue;
      return acc;
    }, {} as Record<string, number>);

    const monthlyRevenue = data.reduce((acc, item) => {
      const month = new Date(item.date).getMonth();
      if (!acc[month]) acc[month] = 0;
      acc[month] += item.revenue;
      return acc;
    }, {} as Record<number, number>);

    const monthlyValues = Object.values(monthlyRevenue);
    const avgMonthlyRevenue = monthlyValues.reduce((sum, val) => sum + val, 0) / (monthlyValues.length || 1);
    const maxMonthly = monthlyValues.length > 0 ? Math.max(...monthlyValues) : 0;
    const minMonthly = monthlyValues.filter(val => val > 0).length > 0 ? Math.min(...monthlyValues.filter(val => val > 0)) : 0;
    const seasonalityVariation = minMonthly > 0 ? maxMonthly / minMonthly : 1;

    return [
      {
        factor: 'Онлайн продажи',
        impact: ((channelRevenue['Онлайн'] || 0) / totalRevenue) * 100,
        description: 'Доля онлайн канала в общих продажах',
        trend: 'positive'
      },
      {
        factor: 'Региональная концентрация',
        impact: (Math.max(...Object.values(regionRevenue)) / totalRevenue) * 100,
        description: 'Концентрация продаж в ведущем регионе',
        trend: 'neutral'
      },
      {
        factor: 'Сезонность',
        impact: seasonalityVariation,
        description: 'Коэффициент сезонных колебаний',
        trend: seasonalityVariation > 2 ? 'negative' : 'positive'
      },
      {
        factor: 'Средняя маржинальность',
        impact: data.length > 0 ? data.reduce((sum, item) => sum + item.margin, 0) / data.length : 0,
        description: 'Средняя маржинальность по всем товарам',
        trend: 'positive'
      }
    ];
  };

  const calculateStructuralAnalysis = (data: SalesData[]) => {
    if (data.length === 0) {
      return {
        byCategory: [],
        byRegion: [],
        byChannel: []
      };
    }
    
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

    const categoryData = data.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = 0;
      acc[item.category] += item.revenue;
      return acc;
    }, {} as Record<string, number>);

    const byCategory: StructuralAnalysis[] = Object.entries(categoryData).map(([category, value]) => ({
      category,
      value,
      percentage: (value / totalRevenue) * 100,
      change: Math.random() * 20 - 10
    }));

    const regionData = data.reduce((acc, item) => {
      if (!acc[item.region]) acc[item.region] = 0;
      acc[item.region] += item.revenue;
      return acc;
    }, {} as Record<string, number>);

    const byRegion: StructuralAnalysis[] = Object.entries(regionData).map(([category, value]) => ({
      category,
      value,
      percentage: (value / totalRevenue) * 100,
      change: Math.random() * 15 - 7.5
    }));

    const channelData = data.reduce((acc, item) => {
      if (!acc[item.sales_channel]) acc[item.sales_channel] = 0;
      acc[item.sales_channel] += item.revenue;
      return acc;
    }, {} as Record<string, number>);

    const byChannel: StructuralAnalysis[] = Object.entries(channelData).map(([category, value]) => ({
      category,
      value,
      percentage: (value / totalRevenue) * 100,
      change: Math.random() * 25 - 12.5
    }));

    return { byCategory, byRegion, byChannel };
  };

  const getAnalytics = useCallback((): Analytics => {
    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
    const totalSales = filteredData.length;
    const averageCheck = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const liquidAssets = filteredData.filter(item => item.quantity > 3).length;
    const liquidity = totalSales > 0 ? (liquidAssets / totalSales) * 100 : 0;
    
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const monthlyData = filteredData.reduce((acc, item) => {
      const monthIndex = new Date(item.date).getMonth();
      const monthName = monthNames[monthIndex];
      if (!acc[monthName]) {
        acc[monthName] = { sales: 0, revenue: 0 };
      }
      acc[monthName].sales += 1;
      acc[monthName].revenue += item.revenue;
      return acc;
    }, {} as Record<string, { sales: number; revenue: number }>);

    const monthlyTrend = monthNames.map(month => ({
      month,
      sales: monthlyData[month]?.sales || 0,
      revenue: monthlyData[month]?.revenue || 0
    }));

    const productData = filteredData.reduce((acc, item) => {
      if (!acc[item.product_name]) {
        acc[item.product_name] = { sales: 0, revenue: 0 };
      }
      acc[item.product_name].sales += item.quantity;
      acc[item.product_name].revenue += item.revenue;
      return acc;
    }, {} as Record<string, { sales: number; revenue: number }>);

    const topProducts = Object.entries(productData)
      .map(([name, data]) => ({ name, sales: data.sales, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const regionData = filteredData.reduce((acc, item) => {
      if (!acc[item.region]) {
        acc[item.region] = 0;
      }
      acc[item.region] += item.revenue;
      return acc;
    }, {} as Record<string, number>);

    const regionAnalysis = Object.entries(regionData).map(([region, sales]) => ({
      region,
      sales,
      percentage: totalRevenue > 0 ? (sales / totalRevenue) * 100 : 0
    }));

    const abcAnalysis = calculateABCAnalysis(filteredData);
    const xyzAnalysis = calculateXYZAnalysis(filteredData);
    const abcxyzAnalysis = calculateABCXYZAnalysis(abcAnalysis, xyzAnalysis);
    const factorAnalysis = calculateFactorAnalysis(filteredData);
    const structuralAnalysis = calculateStructuralAnalysis(filteredData);

    return {
      totalRevenue,
      totalSales,
      averageCheck,
      liquidity,
      monthlyTrend,
      topProducts,
      regionAnalysis,
      abcAnalysis,
      xyzAnalysis,
      abcxyzAnalysis,
      factorAnalysis,
      structuralAnalysis
    };
  }, [filteredData]);

  return {
    salesData,
    filteredData,
    filters,
    isLoading,
    updateFilters,
    addSalesData,
    clearAllData,
    getAnalytics,
    requestSort,
    sortConfig
  };
};