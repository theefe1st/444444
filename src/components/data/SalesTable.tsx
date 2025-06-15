import React, { useState } from 'react';
import { Search, Download, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SalesData } from '../../types';

interface SalesTableProps {
  data: SalesData[];
}

const SalesTable: React.FC<SalesTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof SalesData>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  console.log('SalesTable получила данных:', data.length);

  const filteredData = data.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  console.log('После фильтрации по поиску:', filteredData.length);

  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    // Специальная обработка для поля id
    if (sortField === 'id') {
      const aNum = parseInt(String(aValue), 10);
      const bNum = parseInt(String(bValue), 10);
      
      // Если оба значения являются числами
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Если одно из значений не число, сравниваем как строки
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  console.log('После сортировки:', sortedData.length);

  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  console.log('Для отображения на странице:', paginatedData.length);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (field: keyof SalesData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Сбрасываем на первую страницу при сортировке
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Сбрасываем на первую страницу при поиске
  };

  const exportToCSV = () => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...sortedData.map(row => 
        headers.map(header => `"${row[header as keyof SalesData]}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sales_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sortedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Данные о продажах');
    XLSX.writeFile(wb, `sales_data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columns = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'date', label: 'Дата', type: 'date' },
    { key: 'product_name', label: 'Товар', type: 'text' },
    { key: 'product_id', label: 'Артикул', type: 'text' },
    { key: 'category', label: 'Категория', type: 'text' },
    { key: 'quantity', label: 'Кол-во', type: 'number' },
    { key: 'unit_price', label: 'Цена за ед.', type: 'currency' },
    { key: 'revenue', label: 'Выручка', type: 'currency' },
    { key: 'cost_price', label: 'Себестоимость', type: 'currency' },
    { key: 'profit', label: 'Прибыль', type: 'currency' },
    { key: 'profitability', label: 'Рентабельность', type: 'percentage' },
    { key: 'discount', label: 'Скидка', type: 'percentage' },
    { key: 'customer_type', label: 'Тип клиента', type: 'text' },
    { key: 'region', label: 'Регион', type: 'text' },
    { key: 'sales_channel', label: 'Канал продаж', type: 'text' }
  ];

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'currency':
        return `${Number(value).toLocaleString('ru-RU')} ₽`;
      case 'percentage':
        // Исправляем отображение процентов
        const numValue = Number(value);
        if (numValue <= 1) {
          // Если значение от 0 до 1, умножаем на 100 для отображения в процентах
          return `${(numValue * 100).toFixed(2)}%`;
        } else {
          // Если значение больше 1, считаем что это уже проценты
          return `${numValue.toFixed(2)}%`;
        }
      case 'date':
        return new Date(value).toLocaleDateString('ru-RU');
      default:
        return String(value);
    }
  };

  // Информация о диапазоне записей на текущей странице
  const startRecord = (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, sortedData.length);

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Данные о продажах</h3>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по всем полям..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-gray-600">
            Показано записи {startRecord}-{endRecord} из {sortedData.length}
            {searchTerm && ` (отфильтровано из ${data.length})`}
          </div>
          
          {data.length > 0 && (
            <div className="text-sm text-gray-500">
              Всего загружено: {data.length.toLocaleString('ru-RU')} записей
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort(column.key as keyof SalesData)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {sortField === column.key && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {columns.map(column => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(row[column.key as keyof SalesData], column.type)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'Нет записей, соответствующих поисковому запросу' : 'Нет данных для отображения'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700">
              Страница {currentPage} из {totalPages}
              <span className="ml-2 text-gray-500">
                (по {itemsPerPage} записей на странице)
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ««
              </button>
              
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹ Назад
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (page > totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded text-sm transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперед ›
              </button>
              
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTable;