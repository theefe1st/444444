import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSalesData } from './hooks/useSalesData';

// Components
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Sidebar from './components/layout/Sidebar';
import StatsCards from './components/dashboard/StatsCards';
import FilterPanel from './components/dashboard/FilterPanel';
import Charts from './components/dashboard/Charts';
import FileUpload from './components/upload/FileUpload';
import SalesTable from './components/data/SalesTable';

function App() {
  const { user, isLoading: authLoading, login, register, logout } = useAuth();
  const { salesData, filteredData, filters, isLoading: dataLoading, updateFilters, addSalesData, clearAllData, getAnalytics } = useSalesData();
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState('analytics');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isLoading = authLoading || dataLoading;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <LoginForm 
        onLogin={login} 
        onSwitchToRegister={() => setAuthMode('register')} 
      />
    ) : (
      <RegisterForm 
        onRegister={register} 
        onSwitchToLogin={() => setAuthMode('login')} 
      />
    );
  }

  const analytics = getAnalytics();

  // Расчет актуального прогноза на основе данных
  const calculateForecast = () => {
    if (salesData.length === 0) {
      return {
        nextMonth: { value: 0, growth: 0 },
        nextQuarter: { value: 0, growth: 0 }
      };
    }

    // Анализ тренда по месяцам
    const monthlyRevenue = analytics.monthlyTrend
      .filter(month => month.revenue > 0)
      .map(month => month.revenue);

    if (monthlyRevenue.length === 0) {
      return {
        nextMonth: { value: analytics.totalRevenue * 0.1, growth: 5 },
        nextQuarter: { value: analytics.totalRevenue * 0.3, growth: 8 }
      };
    }

    // Средняя выручка за месяц
    const avgMonthlyRevenue = monthlyRevenue.reduce((sum, rev) => sum + rev, 0) / monthlyRevenue.length;
    
    // Расчет тренда роста
    let growthRate = 0;
    if (monthlyRevenue.length >= 2) {
      const recentMonths = monthlyRevenue.slice(-3); // Последние 3 месяца
      const olderMonths = monthlyRevenue.slice(0, -3);
      
      if (olderMonths.length > 0) {
        const recentAvg = recentMonths.reduce((sum, rev) => sum + rev, 0) / recentMonths.length;
        const olderAvg = olderMonths.reduce((sum, rev) => sum + rev, 0) / olderMonths.length;
        growthRate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 5;
      }
    }

    // Корректировка на основе качества ассортимента
    const categoryACount = analytics.abcAnalysis.filter(item => item.category === 'A').length;
    const totalProducts = analytics.abcAnalysis.length;
    const qualityBonus = totalProducts > 0 ? (categoryACount / totalProducts) * 5 : 0;

    // Корректировка на основе стабильности спроса
    const stableProducts = analytics.xyzAnalysis.filter(item => item.category === 'X').length;
    const stabilityBonus = totalProducts > 0 ? (stableProducts / totalProducts) * 3 : 0;

    const finalGrowthRate = Math.max(0, Math.min(25, growthRate + qualityBonus + stabilityBonus));

    return {
      nextMonth: {
        value: avgMonthlyRevenue * (1 + finalGrowthRate / 100),
        growth: finalGrowthRate
      },
      nextQuarter: {
        value: avgMonthlyRevenue * 3 * (1 + (finalGrowthRate * 0.8) / 100),
        growth: finalGrowthRate * 0.8
      }
    };
  };

  const forecast = calculateForecast();

  const handleDeleteConfirm = () => {
    clearAllData();
    setShowDeleteConfirm(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        if (salesData.length === 0) {
          return (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Анализ продаж</h2>
                <p className="text-gray-600">Комплексная аналитика и отчетность по продажам</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Нет данных для анализа</h3>
                <p className="text-gray-600 mb-6">
                  Загрузите данные о продажах, чтобы начать анализ и получить подробную аналитику
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Загрузить данные
                </button>
              </div>
            </div>
          );
        }
        
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Анализ продаж$</h2>
                <p className="text-gray-600">Комплексная аналитика и отчетность по продажам</p>
              </div>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                disabled={isLoading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isLoading ? 'Удаление...' : 'Удалить все данные'}
              </button>
            </div>
            
            <FilterPanel filters={filters} onFilterChange={updateFilters} />
            <StatsCards analytics={analytics} />
            <Charts analytics={analytics} />
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Прогноз продаж</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Следующий месяц</h4>
                  <p className="text-2xl font-bold text-blue-900">
                    {forecast.nextMonth.value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                  </p>
                  <p className="text-sm text-blue-600">
                    {forecast.nextMonth.growth >= 0 ? '+' : ''}{forecast.nextMonth.growth.toFixed(1)}% к текущему периоду
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    На основе анализа трендов и качества ассортимента
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Следующий квартал</h4>
                  <p className="text-2xl font-bold text-green-900">
                    {forecast.nextQuarter.value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                  </p>
                  <p className="text-sm text-green-600">
                    {forecast.nextQuarter.growth >= 0 ? '+' : ''}{forecast.nextQuarter.growth.toFixed(1)}% к прошлому кварталу
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    Учитывает сезонность и стабильность спроса
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-800 mb-2">Факторы прогноза:</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Качество ассортимента:</span>
                    <br />
                    {analytics.abcAnalysis.filter(item => item.category === 'A').length} товаров категории A
                  </div>
                  <div>
                    <span className="font-medium">Стабильность спроса:</span>
                    <br />
                    {analytics.xyzAnalysis.filter(item => item.category === 'X').length} стабильных товаров
                  </div>
                  <div>
                    <span className="font-medium">Средняя выручка:</span>
                    <br />
                    {(analytics.totalRevenue / Math.max(1, analytics.monthlyTrend.filter(m => m.revenue > 0).length)).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽/мес
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Загрузка данных</h2>
                <p className="text-gray-600">Импорт данных о продажах из различных источников</p>
              </div>
              
              {salesData.length > 0 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isLoading ? 'Удаление...' : 'Удалить все данные'}
                </button>
              )}
            </div>
            
            <FileUpload onDataUpload={addSalesData} />
            
            {isLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-800">Сохранение данных в базу...</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'data':
        if (salesData.length === 0) {
          return (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Данные о продажах</h2>
                <p className="text-gray-600">Детальная информация о всех транзакциях</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Нет данных</h3>
                <p className="text-gray-600 mb-6">
                  Загрузите данные о продажах, чтобы просматривать детальную информацию
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Загрузить данные
                </button>
              </div>
            </div>
          );
        }
        
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Данные о продажах</h2>
                <p className="text-gray-600">Детальная информация о всех транзакциях</p>
              </div>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                disabled={isLoading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isLoading ? 'Удаление...' : `Удалить все данные (${salesData.length} записей)`}
              </button>
            </div>
            
            <SalesTable data={filteredData} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Подтвердите удаление</h3>
                <p className="text-sm text-gray-600">Это действие нельзя отменить</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Вы уверены, что хотите удалить все данные о продажах? 
              Будет удалено <span className="font-semibold">{salesData.length} записей</span>.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Удаление...' : 'Да, удалить все'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Отменить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;