import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { Download, ChevronDown, ChevronRight, AlertTriangle, TrendingUp, Target, Clock, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Analytics } from '../../types';

interface ChartsProps {
  analytics: Analytics;
}

const Charts: React.FC<ChartsProps> = ({ analytics }) => {
  const [activeAnalysis, setActiveAnalysis] = useState<'abc' | 'xyz' | 'abcxyz' | 'factor' | 'structural'>('abc');
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [abcxyzFilters, setAbcxyzFilters] = useState({
    abcCategory: '',
    xyzCategory: '',
    priority: '',
    combinedCategory: ''
  });
  
  const COLORS = ['#4A90E2', '#27AE60', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Лист 1: Обзор по месяцам
    const monthlyData = analytics.monthlyTrend.map(item => ({
      'Месяц': item.month,
      'Количество продаж': item.sales,
      'Выручка (руб.)': item.revenue
    }));
    const monthlyWs = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, monthlyWs, 'Обзор по месяцам');

    // Лист 2: ABC анализ
    const abcData = analytics.abcAnalysis.map(item => ({
      'Товар': item.product_name,
      'Выручка (руб.)': item.revenue,
      'Доля в выручке (%)': item.percentage.toFixed(1),
      'Накопительная доля (%)': item.cumulative_percentage.toFixed(1),
      'Категория': item.category
    }));
    const abcWs = XLSX.utils.json_to_sheet(abcData);
    XLSX.utils.book_append_sheet(wb, abcWs, 'ABC анализ');

    // Лист 3: XYZ анализ
    const xyzData = analytics.xyzAnalysis.map(item => ({
      'Товар': item.product_name,
      'Коэффициент вариации (%)': item.coefficient_variation.toFixed(1),
      'Категория': item.category,
      'Стабильность спроса': item.demand_stability
    }));
    const xyzWs = XLSX.utils.json_to_sheet(xyzData);
    XLSX.utils.book_append_sheet(wb, xyzWs, 'XYZ анализ');

    // Лист 4: ABC-XYZ анализ
    const abcxyzData = analytics.abcxyzAnalysis.map(item => ({
      'Товар': item.product_name,
      'ABC': item.abc_category,
      'XYZ': item.xyz_category,
      'Комбинированная категория': item.combined_category,
      'Стратегия': item.strategy,
      'Приоритет': item.priority,
      'Выручка (руб.)': item.revenue,
      'Коэффициент вариации (%)': item.coefficient_variation.toFixed(1)
    }));
    const abcxyzWs = XLSX.utils.json_to_sheet(abcxyzData);
    XLSX.utils.book_append_sheet(wb, abcxyzWs, 'ABC-XYZ анализ');

    // Лист 5: Подробный анализ
    const detailedData = analytics.abcxyzAnalysis.map(item => {
      const analysis = getStrategyAnalysis(
        item.combined_category, 
        item.product_name, 
        item.revenue, 
        item.coefficient_variation
      );
      
      return {
        'Товар': item.product_name,
        'Категория': item.combined_category,
        'Приоритет': item.priority,
        'Выручка (руб.)': item.revenue,
        'Коэффициент вариации (%)': item.coefficient_variation.toFixed(1),
        'Основные риски': analysis.risks.join('; '),
        'Рекомендации': analysis.recommendations.join('; '),
        'KPI для контроля': analysis.kpis.join('; ')
      };
    });
    const detailedWs = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, detailedWs, 'Подробный анализ');

    // Факторный анализ
    const factorData = analytics.factorAnalysis.map(item => ({
      'Фактор': item.factor,
      'Влияние (%)': item.impact.toFixed(1),
      'Описание': item.description,
      'Тренд': item.trend === 'positive' ? 'Положительный' : 
              item.trend === 'negative' ? 'Отрицательный' : 'Нейтральный'
    }));
    const factorWs = XLSX.utils.json_to_sheet(factorData);
    XLSX.utils.book_append_sheet(wb, factorWs, 'Факторный анализ');

    // Структурный анализ
    const structuralData = [
      ...analytics.structuralAnalysis.byCategory.map(item => ({ 
        'Тип': 'Категория', 
        'Название': item.category, 
        'Значение (руб.)': item.value,
        'Доля (%)': item.percentage.toFixed(1),
        'Изменение (%)': item.change.toFixed(1)
      })),
      ...analytics.structuralAnalysis.byRegion.map(item => ({ 
        'Тип': 'Регион', 
        'Название': item.category, 
        'Значение (руб.)': item.value,
        'Доля (%)': item.percentage.toFixed(1),
        'Изменение (%)': item.change.toFixed(1)
      })),
      ...analytics.structuralAnalysis.byChannel.map(item => ({ 
        'Тип': 'Канал', 
        'Название': item.category, 
        'Значение (руб.)': item.value,
        'Доля (%)': item.percentage.toFixed(1),
        'Изменение (%)': item.change.toFixed(1)
      }))
    ];
    const structuralWs = XLSX.utils.json_to_sheet(structuralData);
    XLSX.utils.book_append_sheet(wb, structuralWs, 'Структурный анализ');

    XLSX.writeFile(wb, `Анализ_Продаж_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStrategyAnalysis = (combinedCategory: string, productName: string, revenue: number, coefficientVariation: number) => {
    const analyses = {
      'AX': {
        icon: <Target className="w-5 h-5 text-green-600" />,
        title: 'Ключевые товары - постоянный контроль',
        priority: 'Критический',
        color: 'bg-green-50 border-green-200',
        reasons: [
          'Высокая доля в выручке (группа A) - приносит основную прибыль',
          'Стабильный спрос (группа X) - предсказуемые продажи',
          'Низкий коэффициент вариации - минимальные риски'
        ],
        recommendations: [
          'Обеспечить постоянное наличие на складе',
          'Мониторить конкурентов и рыночные цены',
          'Инвестировать в качество и улучшение продукта',
          'Развивать долгосрочные отношения с поставщиками'
        ],
        risks: [
          'Потеря поставщика критически скажется на бизнесе',
          'Изменение потребительских предпочтений',
          'Появление конкурентов с лучшим предложением'
        ],
        kpis: [
          `Уровень запасов: не менее 95%`,
          `Время выполнения заказа: максимум 24 часа`,
          `Удовлетворенность клиентов: выше 90%`,
          `Целевая выручка: ${(revenue * 1.1).toLocaleString('ru-RU')} ₽`
        ]
      },
      'AY': {
        icon: <Clock className="w-5 h-5 text-yellow-600" />,
        title: 'Важные товары - сезонное планирование',
        priority: 'Высокий',
        color: 'bg-yellow-50 border-yellow-200',
        reasons: [
          'Высокая доля в выручке, но сезонный характер спроса',
          'Коэффициент вариации указывает на периодичность',
          'Требует точного прогнозирования и планирования'
        ],
        recommendations: [
          'Создать детальный план сезонных закупок',
          'Анализировать исторические данные для прогнозов',
          'Разработать маркетинговые кампании под сезоны',
          'Подготовить альтернативные каналы сбыта'
        ],
        risks: [
          'Избыточные запасы в межсезонье',
          'Недостаток товара в пиковый период',
          'Изменение сезонных трендов'
        ],
        kpis: [
          `Точность прогноза: выше 85%`,
          `Оборачиваемость запасов: оптимальная для сезона`,
          `Потери от просрочки: менее 5%`,
          `Снижение вариации: с ${coefficientVariation.toFixed(1)}% до ${(coefficientVariation * 0.8).toFixed(1)}%`
        ]
      },
      'AZ': {
        icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
        title: revenue > 60000 ? 'Критические проблемные товары - срочный анализ' : 
              revenue > 30000 ? 'Контрольные проблемные товары - детальный анализ' : 
              'Условно-стабильные товары - мониторинг',
        priority: revenue > 60000 ? 'Критический' : revenue > 30000 ? 'Высокий' : 'Средний',
        color: revenue > 60000 ? 'bg-red-50 border-red-200' : 
               revenue > 30000 ? 'bg-orange-50 border-orange-200' : 
               'bg-yellow-50 border-yellow-200',
        reasons: [
          'Высокая доля в выручке, но нерегулярный спрос',
          'Высокий коэффициент вариации создает риски',
          'Сложность в планировании и управлении запасами',
          revenue > 60000 ? 'Критический масштаб влияния на бизнес' : 
          revenue > 30000 ? 'Значительное влияние на финансовые показатели' : 
          'Умеренное влияние на общую прибыльность'
        ],
        recommendations: [
          'Провести глубокий анализ причин нестабильности',
          'Изучить поведение клиентов и факторы спроса',
          'Рассмотреть сегментацию клиентской базы',
          'Разработать гибкую систему поставок',
          revenue > 60000 ? 'Создать отдельную команду для управления товаром' : 
          'Назначить ответственного менеджера'
        ],
        risks: [
          'Высокие затраты на хранение',
          'Потери от неликвидных остатков',
          'Сложность в планировании денежных потоков',
          revenue > 60000 ? 'Критическое влияние на общую прибыльность компании' : 
          'Значительные финансовые потери'
        ],
        kpis: [
          `Снижение коэффициента вариации: с ${coefficientVariation.toFixed(1)}% до ${(coefficientVariation * 0.7).toFixed(1)}%`,
          `Улучшение точности прогноза: до ${revenue > 60000 ? '80%' : '70%'}`,
          `Сокращение неликвидных остатков: на ${revenue > 60000 ? '40%' : '30%'}`,
          `Целевая выручка: ${(revenue * 0.95).toLocaleString('ru-RU')} ₽ (стабилизация)`
        ]
      },
      'BX': {
        icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
        title: 'Стабильные товары - регулярный контроль',
        priority: 'Средний',
        color: 'bg-blue-50 border-blue-200',
        reasons: [
          'Средняя доля в выручке со стабильным спросом',
          'Предсказуемые продажи облегчают планирование',
          'Хороший баланс между прибыльностью и стабильностью'
        ],
        recommendations: [
          'Оптимизировать уровни запасов',
          'Автоматизировать процессы заказа',
          'Искать возможности для увеличения маржи',
          'Рассмотреть возможности роста продаж'
        ],
        risks: [
          'Постепенное снижение доли рынка',
          'Появление более эффективных аналогов',
          'Изменение потребительских предпочтений'
        ],
        kpis: [
          'Уровень обслуживания: 90-95%',
          'Оборачиваемость: 6-8 раз в год',
          'Рост продаж: 5-10% в год',
          `Целевая выручка: ${(revenue * 1.07).toLocaleString('ru-RU')} ₽`
        ]
      },
      'BY': {
        icon: <Clock className="w-5 h-5 text-orange-600" />,
        title: 'Сезонные товары - планирование запасов',
        priority: 'Средний',
        color: 'bg-orange-50 border-orange-200',
        reasons: [
          'Средняя прибыльность с сезонными колебаниями',
          'Требует планирования под сезонные пики',
          'Возможности для оптимизации затрат'
        ],
        recommendations: [
          'Создать сезонные модели планирования',
          'Оптимизировать складские площади',
          'Развивать межсезонные продажи',
          'Искать новые рынки сбыта'
        ],
        risks: [
          'Затоваривание в межсезонье',
          'Упущенные продажи в пиковый период',
          'Высокие затраты на хранение'
        ],
        kpis: [
          'Сезонная точность прогноза: 80%',
          'Уровень запасов в межсезонье: минимальный',
          'Покрытие пикового спроса: 95%',
          `Снижение вариации: до ${(coefficientVariation * 0.85).toFixed(1)}%`
        ]
      },
      'BZ': {
        icon: <AlertTriangle className="w-5 h-5 text-purple-600" />,
        title: 'Нестабильные товары - минимальные запасы',
        priority: 'Низкий',
        color: 'bg-purple-50 border-purple-200',
        reasons: [
          'Средняя прибыльность с высокой нестабильностью',
          'Сложность прогнозирования увеличивает риски',
          'Требует особого подхода к управлению'
        ],
        recommendations: [
          'Минимизировать уровни запасов',
          'Использовать систему "точно в срок"',
          'Развивать быстрые каналы поставок',
          'Рассмотреть возможность отказа от товара'
        ],
        risks: [
          'Высокие затраты на управление',
          'Потери от неликвидности',
          'Сложность в обслуживании клиентов'
        ],
        kpis: [
          'Минимальный уровень запасов',
          'Быстрота реакции на спрос: 48 часов',
          'Рентабельность: положительная',
          `Стабилизация вариации: ниже ${(coefficientVariation * 0.9).toFixed(1)}%`
        ]
      },
      'CX': {
        icon: <Target className="w-5 h-5 text-gray-600" />,
        title: 'Стабильные товары - автоматизация',
        priority: 'Низкий',
        color: 'bg-gray-50 border-gray-200',
        reasons: [
          'Низкая доля в выручке, но стабильный спрос',
          'Предсказуемость позволяет автоматизировать процессы',
          'Минимальные требования к управлению'
        ],
        recommendations: [
          'Полная автоматизация заказов',
          'Оптимизация затрат на обслуживание',
          'Рассмотреть аутсорсинг',
          'Минимизировать административные расходы'
        ],
        risks: [
          'Потеря контроля над процессом',
          'Возможные сбои в автоматизации',
          'Снижение качества обслуживания'
        ],
        kpis: [
          'Автоматизация заказов: 100%',
          'Затраты на обслуживание: минимальные',
          'Уровень сервиса: базовый',
          `Поддержание выручки: ${revenue.toLocaleString('ru-RU')} ₽`
        ]
      },
      'CY': {
        icon: <Clock className="w-5 h-5 text-indigo-600" />,
        title: 'Сезонные товары - точечные закупки',
        priority: 'Низкий',
        color: 'bg-indigo-50 border-indigo-200',
        reasons: [
          'Низкая прибыльность с сезонными колебаниями',
          'Ограниченный потенциал роста',
          'Требует минимальных инвестиций'
        ],
        recommendations: [
          'Закупки только под конкретные заказы',
          'Минимизировать складские запасы',
          'Рассмотреть работу с дропшиппингом',
          'Оценить целесообразность продолжения продаж'
        ],
        risks: [
          'Потеря клиентов из-за отсутствия товара',
          'Упущенные возможности в пиковые периоды',
          'Высокие относительные затраты'
        ],
        kpis: [
          'Запасы: только под заказ',
          'Время выполнения: до 7 дней',
          'Прибыльность: положительная',
          `Минимальная выручка: ${(revenue * 0.8).toLocaleString('ru-RU')} ₽`
        ]
      },
      'CZ': {
        icon: <AlertTriangle className="w-5 h-5 text-red-800" />,
        title: 'Товары на выбытие - минимизация',
        priority: 'Критический (на выбытие)',
        color: 'bg-red-100 border-red-300',
        reasons: [
          'Низкая прибыльность и нестабильный спрос',
          'Высокие риски и затраты на управление',
          'Отвлекает ресурсы от более важных товаров'
        ],
        recommendations: [
          'Прекратить активные продажи',
          'Распродать остатки со скидкой',
          'Не возобновлять закупки',
          'Перенаправить ресурсы на группы A и B'
        ],
        risks: [
          'Потери от списания остатков',
          'Недовольство постоянных клиентов',
          'Возможные контрактные обязательства'
        ],
        kpis: [
          'Срок вывода: 3-6 месяцев',
          'Минимизация потерь при выводе',
          'Перераспределение ресурсов',
          `Целевая ликвидация: до ${(revenue * 0.3).toLocaleString('ru-RU')} ₽`
        ]
      }
    };

    return analyses[combinedCategory as keyof typeof analyses] || {
      icon: <AlertTriangle className="w-5 h-5 text-gray-600" />,
      title: 'Требует дополнительного анализа',
      priority: 'Неопределен',
      color: 'bg-gray-50 border-gray-200',
      reasons: ['Нестандартная комбинация категорий'],
      recommendations: ['Провести детальный анализ'],
      risks: ['Неопределенные риски'],
      kpis: ['Требуется определение KPI']
    };
  };

  // Фильтрация данных ABC-XYZ анализа
  const filteredAbcxyzData = analytics.abcxyzAnalysis.filter(item => {
    return (
      (!abcxyzFilters.abcCategory || item.abc_category === abcxyzFilters.abcCategory) &&
      (!abcxyzFilters.xyzCategory || item.xyz_category === abcxyzFilters.xyzCategory) &&
      (!abcxyzFilters.priority || item.priority === abcxyzFilters.priority) &&
      (!abcxyzFilters.combinedCategory || item.combined_category === abcxyzFilters.combinedCategory)
    );
  });

  const renderAnalysisContent = () => {
    switch (activeAnalysis) {
      case 'abc':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800">Группа A</h4>
                <p className="text-2xl font-bold text-green-900">
                  {analytics.abcAnalysis.filter(item => item.category === 'A').length}
                </p>
                <p className="text-sm text-green-600">80% выручки</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800">Группа B</h4>
                <p className="text-2xl font-bold text-yellow-900">
                  {analytics.abcAnalysis.filter(item => item.category === 'B').length}
                </p>
                <p className="text-sm text-yellow-600">15% выручки</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800">Группа C</h4>
                <p className="text-2xl font-bold text-red-900">
                  {analytics.abcAnalysis.filter(item => item.category === 'C').length}
                </p>
                <p className="text-sm text-red-600">5% выручки</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.abcAnalysis.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Выручка']} />
                <Bar dataKey="revenue" fill="#4A90E2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'xyz':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800">Группа X</h4>
                <p className="text-2xl font-bold text-blue-900">
                  {analytics.xyzAnalysis.filter(item => item.category === 'X').length}
                </p>
                <p className="text-sm text-blue-600">Стабильный спрос</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800">Группа Y</h4>
                <p className="text-2xl font-bold text-orange-900">
                  {analytics.xyzAnalysis.filter(item => item.category === 'Y').length}
                </p>
                <p className="text-sm text-orange-600">Сезонный спрос</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800">Группа Z</h4>
                <p className="text-2xl font-bold text-purple-900">
                  {analytics.xyzAnalysis.filter(item => item.category === 'Z').length}
                </p>
                <p className="text-sm text-purple-600">Нерегулярный спрос</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.xyzAnalysis.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [
                    `${value.toFixed(1)}%`,
                    'Коэффициент вариации'
                  ]}
                />
                <Bar dataKey="coefficient_variation" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'abcxyz':
        return (
          <div className="space-y-6">
            {/* Обновленная сводная матрица */}
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold mb-4">Сводная матрица ABC-XYZ</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="font-semibold"></div>
                <div className="font-semibold text-center">X (Стабильный)</div>
                <div className="font-semibold text-center">Y (Сезонный)</div>
                <div className="font-semibold text-center">Z (Нерегулярный)</div>
                
                {['A', 'B', 'C'].map(abc => (
                  <React.Fragment key={abc}>
                    <div className="font-semibold">{abc}</div>
                    {['X', 'Y', 'Z'].map(xyz => {
                      const count = analytics.abcxyzAnalysis.filter(
                        item => item.abc_category === abc && item.xyz_category === xyz
                      ).length;
                      const totalRevenue = analytics.abcxyzAnalysis
                        .filter(item => item.abc_category === abc && item.xyz_category === xyz)
                        .reduce((sum, item) => sum + item.revenue, 0);
                      
                      return (
                        <div key={xyz} className={`p-3 text-center rounded border ${
                          abc === 'A' && xyz === 'X' ? 'bg-green-100 text-green-800 border-green-300' :
                          abc === 'A' && xyz === 'Y' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          abc === 'A' && xyz === 'Z' ? 'bg-red-100 text-red-800 border-red-300' :
                          abc === 'B' && xyz === 'X' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          abc === 'B' && xyz === 'Y' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                          abc === 'B' && xyz === 'Z' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          <div className="font-bold text-lg">{count}</div>
                          <div className="text-xs">
                            {totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(0)}к ₽` : '0 ₽'}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Фильтры */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <h5 className="font-medium text-gray-800">Фильтры</h5>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={abcxyzFilters.abcCategory}
                  onChange={(e) => setAbcxyzFilters(prev => ({ ...prev, abcCategory: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">Все ABC</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
                
                <select
                  value={abcxyzFilters.xyzCategory}
                  onChange={(e) => setAbcxyzFilters(prev => ({ ...prev, xyzCategory: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">Все XYZ</option>
                  <option value="X">X</option>
                  <option value="Y">Y</option>
                  <option value="Z">Z</option>
                </select>
                
                <select
                  value={abcxyzFilters.combinedCategory}
                  onChange={(e) => setAbcxyzFilters(prev => ({ ...prev, combinedCategory: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">Все категории</option>
                  {['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                
                <select
                  value={abcxyzFilters.priority}
                  onChange={(e) => setAbcxyzFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">Все приоритеты</option>
                  <option value="Критический">Критический</option>
                  <option value="Высокий">Высокий</option>
                  <option value="Средний">Средний</option>
                  <option value="Низкий">Низкий</option>
                </select>
              </div>
              
              {Object.values(abcxyzFilters).some(filter => filter) && (
                <button
                  onClick={() => setAbcxyzFilters({ abcCategory: '', xyzCategory: '', priority: '', combinedCategory: '' })}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left">Товар</th>
                    <th className="p-2 text-center">ABC</th>
                    <th className="p-2 text-center">XYZ</th>
                    <th className="p-2 text-center">Приоритет</th>
                    <th className="p-2 text-left">Стратегия</th>
                    <th className="p-2 text-center">Анализ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbcxyzData.slice(0, 15).map((item, index) => {
                    const analysis = getStrategyAnalysis(
                      item.combined_category, 
                      item.product_name, 
                      item.revenue, 
                      item.coefficient_variation
                    );
                    const isExpanded = expandedStrategy === `${item.product_name}-${index}`;
                    
                    return (
                      <React.Fragment key={index}>
                        <tr className="border-t hover:bg-gray-50">
                          <td className="p-2 font-medium">{item.product_name}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.abc_category === 'A' ? 'bg-green-100 text-green-800' :
                              item.abc_category === 'B' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.abc_category}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.xyz_category === 'X' ? 'bg-blue-100 text-blue-800' :
                              item.xyz_category === 'Y' ? 'bg-orange-100 text-orange-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {item.xyz_category}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.priority.includes('Критический') ? 'bg-red-100 text-red-800' :
                              item.priority === 'Высокий' ? 'bg-yellow-100 text-yellow-800' :
                              item.priority === 'Средний' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="p-2 text-xs max-w-xs truncate" title={item.strategy}>
                            {item.strategy}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => setExpandedStrategy(isExpanded ? null : `${item.product_name}-${index}`)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              Анализ
                            </button>
                          </td>
                        </tr>
                        
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <div className={`m-2 p-4 rounded-lg border-2 ${analysis.color}`}>
                                <div className="flex items-center gap-2 mb-3">
                                  {analysis.icon}
                                  <h4 className="font-semibold text-lg">{analysis.title}</h4>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    analysis.priority.includes('Критический') ? 'bg-red-100 text-red-800' :
                                    analysis.priority === 'Высокий' ? 'bg-yellow-100 text-yellow-800' :
                                    analysis.priority === 'Средний' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {analysis.priority}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div>
                                    <h5 className="font-semibold mb-2 text-gray-800">Причины классификации:</h5>
                                    <ul className="text-sm space-y-1">
                                      {analysis.reasons.map((reason, idx) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-blue-600 mt-1">•</span>
                                          <span>{reason}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h5 className="font-semibold mb-2 text-gray-800">Рекомендации:</h5>
                                    <ul className="text-sm space-y-1">
                                      {analysis.recommendations.map((rec, idx) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-green-600 mt-1">✓</span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h5 className="font-semibold mb-2 text-gray-800">Риски:</h5>
                                    <ul className="text-sm space-y-1">
                                      {analysis.risks.map((risk, idx) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-red-600 mt-1">⚠</span>
                                          <span>{risk}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h5 className="font-semibold mb-2 text-gray-800">KPI для контроля:</h5>
                                    <ul className="text-sm space-y-1">
                                      {analysis.kpis.map((kpi, idx) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-purple-600 mt-1">📊</span>
                                          <span>{kpi}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                
                                <div className="mt-4 p-3 bg-white bg-opacity-50 rounded">
                                  <h6 className="font-semibold text-sm mb-1">Текущие показатели товара:</h6>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    <span>Выручка: {item.revenue.toLocaleString('ru-RU')} ₽</span>
                                    <span>Коэф. вариации: {item.coefficient_variation.toFixed(1)}%</span>
                                    <span>Категория: {item.combined_category}</span>
                                    <span>Приоритет: {item.priority}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAbcxyzData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет данных, соответствующих выбранным фильтрам
              </div>
            )}
          </div>
        );

      case 'factor':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.factorAnalysis.map((factor, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{factor.factor}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      factor.trend === 'positive' ? 'bg-green-100 text-green-800' :
                      factor.trend === 'negative' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {factor.trend === 'positive' ? '↗' : factor.trend === 'negative' ? '↘' : '→'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold mb-1">{factor.impact.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">{factor.description}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.factorAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="factor" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="impact" fill="#4A90E2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'structural':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-4">По категориям</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.structuralAnalysis.byCategory}
                      dataKey="percentage"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                    >
                      {analytics.structuralAnalysis.byCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="font-semibold mb-4">По регионам</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.structuralAnalysis.byRegion}
                      dataKey="percentage"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                    >
                      {analytics.structuralAnalysis.byRegion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="font-semibold mb-4">По каналам</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.structuralAnalysis.byChannel}
                      dataKey="percentage"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                    >
                      {analytics.structuralAnalysis.byChannel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[
                { title: 'Категории', data: analytics.structuralAnalysis.byCategory },
                { title: 'Регионы', data: analytics.structuralAnalysis.byRegion },
                { title: 'Каналы', data: analytics.structuralAnalysis.byChannel }
              ].map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h5 className="font-medium mb-3">{section.title}</h5>
                  <div className="space-y-2">
                    {section.data.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{item.category}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">{item.percentage.toFixed(1)}%</div>
                          <div className={`text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Продажи по месяцам - Комбинированная диаграмма */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Продажи по месяцам</h3>
        <p className="text-sm text-gray-600 mb-6">Динамика продаж за 2025 год</p>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={analytics.monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12, fill: '#374151' }}
              angle={-30}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              yAxisId="left" 
              label={{ 
                value: 'Количество продаж, шт.', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: '12px', fill: '#374151' }
              }}
              tick={{ fontSize: 12, fill: '#374151' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              label={{ 
                value: 'Выручка, ₽', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle', fontSize: '12px', fill: '#374151' }
              }}
              tick={{ fontSize: 12, fill: '#374151' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`}
            />
            <Tooltip
              formatter={(value: number, name: string, props: any) => {
                // Используем props.dataKey для определения, какой тип данных отображается
                if (props.dataKey === 'sales') {
                  return [`${value} шт`, 'Количество продаж'];
                } else if (props.dataKey === 'revenue') {
                  return [`${value.toLocaleString('ru-RU')} ₽`, 'Выручка'];
                }
                // Запасной вариант, если dataKey не соответствует 'sales' или 'revenue'
                return [value, name];
              }}
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            <Bar 
              yAxisId="left"
              dataKey="sales" 
              fill="#4A90E2" 
              name="Количество продаж"
              radius={[3, 3, 0, 0]}
              stroke="none"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="revenue" 
              stroke="#27AE60" 
              strokeWidth={3}
              name="Выручка"
              dot={{ fill: '#27AE60', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, stroke: '#27AE60', strokeWidth: 2, fill: '#ffffff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Топ-5 товаров */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Топ-5 товаров по выручке</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.topProducts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Выручка']}
            />
            <Bar dataKey="revenue" fill="#4A90E2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Анализ по регионам */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Распределение по регионам</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={analytics.regionAnalysis}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ region, percentage }) => `${region}: ${percentage.toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="sales"
            >
              {analytics.regionAnalysis.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Выручка']} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Расширенная аналитика */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Расширенная аналитика</h3>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Экспорт всех анализов
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'abc', label: 'ABC анализ' },
            { key: 'xyz', label: 'XYZ анализ' },
            { key: 'abcxyz', label: 'ABC-XYZ анализ' },
            { key: 'factor', label: 'Факторный анализ' },
            { key: 'structural', label: 'Структурный анализ' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveAnalysis(tab.key as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeAnalysis === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {renderAnalysisContent()}
      </div>
    </div>
  );
};

export default Charts;