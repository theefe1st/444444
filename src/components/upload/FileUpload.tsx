import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SalesData } from '../../types';

interface FileUploadProps {
  onDataUpload: (data: SalesData[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [convertedData, setConvertedData] = useState<SalesData[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    setError('');
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/tab-separated-values'
    ];

    const validFiles = files.filter(file => 
      validTypes.includes(file.type) || 
      file.name.endsWith('.csv') || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.json') ||
      file.name.endsWith('.tsv') ||
      file.name.endsWith('.ods')
    );

    if (validFiles.length === 0) {
      setError('Пожалуйста, загрузите файлы поддерживаемых форматов: CSV, Excel, JSON, TSV, ODS');
      return;
    }

    setUploadedFiles(validFiles);
    parseFiles(validFiles);
  };

  const parseFiles = async (files: File[]) => {
    const allData: any[] = [];

    for (const file of files) {
      try {
        console.log(`Обрабатываем файл: ${file.name}`);
        
        if (file.name.endsWith('.csv')) {
          const text = await file.text();
          const result = Papa.parse(text, { 
            header: true, 
            skipEmptyLines: false,
            encoding: 'UTF-8',
            transformHeader: (header) => header.trim() // Убираем лишние пробелы из заголовков
          });
          console.log(`CSV данные из ${file.name}:`, result.data.length, 'записей');
          allData.push(...result.data);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          
          // Обрабатываем все листы
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            
            // Получаем диапазон данных
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
            console.log(`Лист ${sheetName} содержит данные в диапазоне:`, worksheet['!ref']);
            
            const data = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1,
              defval: '',
              raw: false,
              blankrows: false // Не включаем полностью пустые строки
            });
            
            console.log(`Сырые данные из листа ${sheetName}:`, data.length, 'строк');
            
            if (data.length > 1) {
              // Первая строка - заголовки
              const headers = (data[0] as string[]).map(h => String(h || '').trim()).filter(h => h);
              console.log('Заголовки:', headers);
              
              // Остальные строки - данные
              const rows = data.slice(1) as any[][];
              console.log(`Количество строк данных: ${rows.length}`);
              
              const jsonData = rows.map((row, rowIndex) => {
                const obj: any = {};
                headers.forEach((header, index) => {
                  if (header) {
                    const cellValue = row[index];
                    // Сохраняем все значения, включая 0, false, пустые строки
                    obj[header] = cellValue !== undefined && cellValue !== null ? cellValue : '';
                  }
                });
                
                return obj;
              });
              
              console.log(`Обработанные данные из листа ${sheetName}:`, jsonData.length, 'записей');
              allData.push(...jsonData);
            }
          }
        } else if (file.name.endsWith('.json')) {
          const text = await file.text();
          const data = JSON.parse(text);
          allData.push(...(Array.isArray(data) ? data : [data]));
        } else if (file.name.endsWith('.tsv')) {
          const text = await file.text();
          const result = Papa.parse(text, { 
            header: true, 
            delimiter: '\t', 
            skipEmptyLines: false 
          });
          allData.push(...result.data);
        }
      } catch (err) {
        console.error(`Ошибка при парсинге файла ${file.name}:`, err);
        setError(`Ошибка при парсинге файла ${file.name}: ${err}`);
        return;
      }
    }

    console.log('Все исходные данные из файлов:', allData.length, 'записей');
    
    // Минимальная фильтрация - убираем только записи, где ВСЕ поля пустые
    const filteredData = allData.filter((item, index) => {
      // Получаем все значения объекта
      const values = Object.values(item);
      
      // Проверяем, есть ли хотя бы одно непустое значение
      const hasAnyData = values.some(value => {
        if (value === null || value === undefined) return false;
        const strValue = String(value).trim();
        return strValue !== '' && strValue !== 'null' && strValue !== 'undefined';
      });
      
      // Логируем только первые 5 отфильтрованных записей для отладки
      if (!hasAnyData && index < 5) {
        console.log(`Отфильтрована полностью пустая запись ${index}:`, item);
      }
      
      return hasAnyData;
    });
    
    console.log('После фильтрации пустых записей:', filteredData.length, 'записей');
    console.log('Отфильтровано полностью пустых записей:', allData.length - filteredData.length);
    
    setParsedData(filteredData);
    
    // Конвертируем данные сразу после парсинга
    const salesData = convertToSalesData(filteredData);
    console.log('Конвертированные данные:', salesData.length, 'записей');
    setConvertedData(salesData);
    setPreviewMode(true);
  };

  // Функция для поиска значения по различным вариантам названий полей
  const findFieldValue = (item: any, fieldVariants: string[]): any => {
    for (const variant of fieldVariants) {
      // Ищем точное совпадение
      if (item.hasOwnProperty(variant)) {
        const value = item[variant];
        if (value !== null && value !== undefined) {
          const strValue = String(value).trim();
          if (strValue !== '' && strValue !== 'null' && strValue !== 'undefined') {
            return value;
          }
        }
      }
      
      // Ищем совпадение без учета регистра
      const keys = Object.keys(item);
      const foundKey = keys.find(key => 
        key.toLowerCase().trim() === variant.toLowerCase().trim()
      );
      
      if (foundKey) {
        const value = item[foundKey];
        if (value !== null && value !== undefined) {
          const strValue = String(value).trim();
          if (strValue !== '' && strValue !== 'null' && strValue !== 'undefined') {
            return value;
          }
        }
      }
    }
    return null;
  };

  // Улучшенная функция обработки дат
  const processDate = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    
    try {
      // Если это число (Excel serial date)
      if (typeof dateValue === 'number' && dateValue > 1) {
        // Excel считает дни с 1 января 1900 года (с поправкой на ошибку Excel)
        const excelEpoch = new Date(1899, 11, 30); // 30 декабря 1899
        const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Если это строка
      if (typeof dateValue === 'string' && dateValue.trim()) {
        const dateStr = dateValue.trim();
        
        // Пробуем различные форматы дат
        const formats = [
          // DD.MM.YYYY
          /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
          // DD/MM/YYYY
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
          // MM.DD.YYYY
          /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
          // MM/DD/YYYY
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
          // YYYY-MM-DD
          /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
          // DD-MM-YYYY
          /^(\d{1,2})-(\d{1,2})-(\d{4})$/
        ];
        
        // Пробуем парсить как обычную дату
        let date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          return date.toISOString().split('T')[0];
        }
        
        // Пробуем различные форматы
        for (let i = 0; i < formats.length; i++) {
          const format = formats[i];
          const match = dateStr.match(format);
          if (match) {
            const [, part1, part2, part3] = match;
            
            if (i < 2) { // DD.MM.YYYY или DD/MM/YYYY
              date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
            } else if (i < 4) { // MM.DD.YYYY или MM/DD/YYYY (если день > 12)
              if (parseInt(part1) > 12) {
                date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
              } else {
                date = new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2));
              }
            } else if (i === 4) { // YYYY-MM-DD
              date = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
            } else { // DD-MM-YYYY
              date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
            }
            
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
              return date.toISOString().split('T')[0];
            }
          }
        }
      }
      
    } catch (error) {
      console.warn('Ошибка обработки даты:', dateValue, error);
    }
    
    // Если ничего не получилось, возвращаем текущую дату
    return new Date().toISOString().split('T')[0];
  };

  const convertToSalesData = (rawData: any[]): SalesData[] => {
    if (!rawData || rawData.length === 0) {
      console.log('Нет данных для конвертации');
      return [];
    }

    console.log('Начинаем конвертацию данных. Количество записей:', rawData.length);

    const convertedData = rawData.map((item, index) => {
      // Функция для безопасного парсинга чисел
      const parseNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined || value === '') return defaultValue;
        
        // Убираем все символы кроме цифр, точки, запятой и минуса
        let cleanValue = String(value).replace(/[^\d.,-]/g, '');
        // Заменяем запятую на точку для десятичных дробей
        cleanValue = cleanValue.replace(',', '.');
        
        const parsed = parseFloat(cleanValue);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      // Функция для безопасного парсинга целых чисел
      const parseInteger = (value: any, defaultValue: number = 1): number => {
        const parsed = Math.floor(parseNumber(value, defaultValue));
        return parsed > 0 ? parsed : defaultValue;
      };

      // Функция для обработки скидок
      const parseDiscount = (value: any): number => {
        if (value === null || value === undefined || value === '') return 0;
        
        const numValue = parseNumber(value, 0);
        
        // Если значение больше 1, считаем что это уже проценты и конвертируем в доли
        if (numValue > 1) {
          return numValue / 100;
        }
        
        // Если значение от 0 до 1, считаем что это уже доли
        return Math.max(0, Math.min(1, numValue));
      };

      // Извлекаем поля с учетом различных вариантов названий
      const id = findFieldValue(item, [
        'id', 'ID', 'Id', 'номер', 'number', 'Номер', 'Number', '№', 'Код записи'
      ]) || (index + 1).toString();
      
      const rawDate = findFieldValue(item, [
        'date', 'Date', 'дата', 'Дата', 'DATE', 'Date_Time', 'datetime', 'Дата продажи', 'Дата операции'
      ]);
      const date = processDate(rawDate);
      
      const productName = findFieldValue(item, [
        'product_name', 'Product_Name', 'товар', 'Товар', 'название', 'Название', 
        'product', 'Product', 'name', 'Name', 'наименование', 'Наименование',
        'Product Name', 'Товар/услуга', 'Наименование товара', 'Продукт'
      ]) || `Товар ${index + 1}`;
      
      const productId = findFieldValue(item, [
        'product_id', 'Product_ID', 'артикул', 'Артикул', 'sku', 'SKU', 
        'код', 'Код', 'article', 'Article', 'Product ID', 'Код товара', 'Арт.'
      ]) || (index + 1).toString();
      
      const category = findFieldValue(item, [
        'category', 'Category', 'категория', 'Категория', 'группа', 'Группа', 
        'тип', 'Тип', 'class', 'Class', 'Группа товаров', 'Категория товара'
      ]) || 'Без категории';
      
      const quantity = parseInteger(findFieldValue(item, [
        'quantity', 'Quantity', 'количество', 'Количество', 'qty', 'Qty', 
        'кол_во', 'кол-во', 'amount', 'Amount', 'Кол-во', 'Объем', 'Штук'
      ]), 1);
      
      const unitPrice = parseNumber(findFieldValue(item, [
        'unit_price', 'Unit_Price', 'цена', 'Цена', 'price', 'Price', 
        'цена_за_единицу', 'цена за ед', 'стоимость', 'Стоимость',
        'Unit Price', 'Цена за единицу', 'Стоимость единицы', 'Цена за шт'
      ]), 0);
      
      const revenue = parseNumber(findFieldValue(item, [
        'revenue', 'Revenue', 'выручка', 'Выручка', 'сумма', 'Сумма', 
        'total', 'Total', 'итого', 'Итого', 'sum', 'Sum',
        'Общая сумма', 'Итоговая сумма', 'Стоимость', 'Оборот'
      ]), 0);
      
      const costPrice = parseNumber(findFieldValue(item, [
        'cost_price', 'Cost_Price', 'себестоимость', 'Себестоимость', 
        'cost', 'Cost', 'затраты', 'Затраты', 'Cost Price', 'Закупочная цена'
      ]), 0);
      
      const discount = parseDiscount(findFieldValue(item, [
        'discount', 'Discount', 'скидка', 'Скидка', 'disc', 'Disc',
        'Размер скидки', 'Скидка %', 'Скидка в %'
      ]));
      
      const customerType = findFieldValue(item, [
        'customer_type', 'Customer_Type', 'тип_клиента', 'тип клиента', 
        'клиент', 'Клиент', 'customer', 'Customer', 'Тип клиента', 'Покупатель'
      ]) || 'физ. лицо';
      
      const region = findFieldValue(item, [
        'region', 'Region', 'регион', 'Регион', 'область', 'Область', 
        'город', 'Город', 'location', 'Location', 'Регион продаж', 'Местоположение'
      ]) || 'Не указан';
      
      const salesChannel = findFieldValue(item, [
        'sales_channel', 'Sales_Channel', 'канал', 'Канал', 'channel', 'Channel', 
        'источник', 'Источник', 'Канал продаж', 'Способ продажи', 'Канал сбыта'
      ]) || 'Офлайн';

      // Рассчитываем недостающие значения
      let finalRevenue = revenue;
      let finalUnitPrice = unitPrice;
      let finalCostPrice = costPrice;

      // Если нет выручки, но есть цена и количество
      if (!finalRevenue && finalUnitPrice && quantity) {
        finalRevenue = finalUnitPrice * quantity;
      }
      
      // Если нет цены за единицу, но есть выручка и количество
      if (!finalUnitPrice && finalRevenue && quantity) {
        finalUnitPrice = finalRevenue / quantity;
      }
      
      // Если нет себестоимости, рассчитываем как 60% от выручки
      if (!finalCostPrice && finalRevenue) {
        finalCostPrice = finalRevenue * 0.6;
      }

      // Если все еще нет данных, устанавливаем минимальные значения
      if (!finalRevenue) finalRevenue = 1000;
      if (!finalUnitPrice) finalUnitPrice = finalRevenue / quantity;
      if (!finalCostPrice) finalCostPrice = finalRevenue * 0.6;

      // Рассчитываем производные поля
      const profit = finalRevenue - finalCostPrice;
      const profitability = finalRevenue > 0 ? (profit / finalRevenue) * 100 : 0;

      // Конвертируем типы клиентов
      const convertCustomerType = (type: any): 'розница' | 'опт' | 'физ. лицо' | 'юр. лицо' => {
        const typeStr = String(type || '').toLowerCase();
        if (typeStr.includes('retail') || typeStr.includes('розница')) return 'розница';
        if (typeStr.includes('wholesale') || typeStr.includes('опт')) return 'опт';
        if (typeStr.includes('individual') || typeStr.includes('физ') || typeStr.includes('частное')) return 'физ. лицо';
        if (typeStr.includes('corporate') || typeStr.includes('юр') || typeStr.includes('компания')) return 'юр. лицо';
        return 'физ. лицо';
      };

      // Конвертируем каналы продаж
      const convertSalesChannel = (channel: any): 'Онлайн' | 'Офлайн' => {
        const channelStr = String(channel || '').toLowerCase();
        if (channelStr.includes('online') || channelStr.includes('онлайн') || channelStr.includes('интернет') || 
            channelStr.includes('сайт') || channelStr.includes('web') || channelStr.includes('веб')) {
          return 'Онлайн';
        }
        return 'Офлайн';
      };

      const convertedItem = {
        id: String(id),
        date: date,
        product_name: String(productName),
        product_id: String(productId),
        category: String(category),
        quantity,
        unit_price: finalUnitPrice,
        revenue: finalRevenue,
        cost_price: finalCostPrice,
        profit,
        profitability,
        discount,
        vat: parseNumber(findFieldValue(item, ['vat', 'VAT', 'ндс', 'НДС']), finalRevenue * 0.2),
        margin: profitability,
        customer_type: convertCustomerType(customerType),
        region: String(region),
        sales_channel: convertSalesChannel(salesChannel),
        shipping_status: 'доставлено' as any,
        year: new Date(date).getFullYear()
      };

      // Логируем каждую 500-ю запись для отладки
      if (index % 500 === 0 || index < 5) {
        console.log(`Запись ${index + 1}:`, convertedItem);
      }

      return convertedItem;
    });

    console.log(`Успешно конвертировано ${convertedData.length} записей из ${rawData.length}`);
    return convertedData;
  };

  const handleConfirmUpload = () => {
    console.log('Загружаем данные:', convertedData.length, 'записей');
    onDataUpload(convertedData);
    setPreviewMode(false);
    setUploadedFiles([]);
    setParsedData([]);
    setConvertedData([]);
  };

  // Определяем колонки для отображения в предпросмотре
  const previewColumns = [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Дата' },
    { key: 'product_name', label: 'Товар' },
    { key: 'product_id', label: 'Артикул' },
    { key: 'category', label: 'Категория' },
    { key: 'quantity', label: 'Кол-во' },
    { key: 'unit_price', label: 'Цена за ед.' },
    { key: 'revenue', label: 'Выручка' },
    { key: 'cost_price', label: 'Себестоимость' },
    { key: 'profit', label: 'Прибыль' },
    { key: 'profitability', label: 'Рентабельность' },
    { key: 'discount', label: 'Скидка' },
    { key: 'customer_type', label: 'Тип клиента' },
    { key: 'region', label: 'Регион' },
    { key: 'sales_channel', label: 'Канал продаж' }
  ];

  const formatPreviewValue = (value: any, key: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (key) {
      case 'unit_price':
      case 'revenue':
      case 'cost_price':
      case 'profit':
        return `${Number(value).toLocaleString('ru-RU')} ₽`;
      case 'discount':
      case 'profitability':
        const numValue = Number(value);
        if (numValue <= 1) {
          return `${(numValue * 100).toFixed(2)}%`;
        } else {
          return `${numValue.toFixed(2)}%`;
        }
      case 'date':
        return new Date(value).toLocaleDateString('ru-RU');
      case 'quantity':
        return `${Number(value)} шт.`;
      default:
        return String(value);
    }
  };

  if (previewMode) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Eye className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Предпросмотр данных</h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            Найдено записей: <span className="font-semibold">{convertedData.length}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Данные из вашего файла автоматически обработаны и готовы к загрузке
          </p>
        </div>

        <div className="overflow-x-auto mb-6" style={{ maxHeight: '500px' }}>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {previewColumns.map(column => (
                  <th key={column.key} className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {convertedData.slice(0, 10).map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {previewColumns.map(column => (
                    <td key={column.key} className="border border-gray-300 px-3 py-2 text-gray-900 whitespace-nowrap">
                      {formatPreviewValue(row[column.key as keyof SalesData], column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {convertedData.length > 10 && (
          <div className="mb-6 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Показаны первые 10 записей из {convertedData.length}. 
              После подтверждения будут загружены все данные из вашего файла.
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleConfirmUpload}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Подтвердить загрузку ({convertedData.length} записей)
          </button>
          
          <button
            onClick={() => {
              setPreviewMode(false);
              setConvertedData([]);
              setParsedData([]);
              setUploadedFiles([]);
            }}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Отменить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Upload className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Загрузка данных</h3>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        
        <h4 className="text-xl font-semibold text-gray-900 mb-2">
          Перетащите файлы или нажмите для выбора
        </h4>
        
        <p className="text-gray-600 mb-6">
          Поддерживаемые форматы: CSV, Excel (.xlsx), JSON, TSV, ODS
        </p>
        
        <input
          type="file"
          multiple
          onChange={handleChange}
          accept=".csv,.xlsx,.xls,.json,.tsv,.ods"
          className="hidden"
          id="file-upload"
        />
        
        <label
          htmlFor="file-upload"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
        >
          <FileText className="w-5 h-5" />
          Выбрать файлы
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-900 mb-3">Загруженные файлы:</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">{file.name}</span>
                <span className="text-sm text-green-600">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Поддерживаемые поля:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
          <span>• ID / id</span>
          <span>• Дата / date</span>
          <span>• Товар / product_name</span>
          <span>• Артикул / product_id</span>
          <span>• Категория / category</span>
          <span>• Количество / quantity</span>
          <span>• Цена / unit_price</span>
          <span>• Выручка / revenue</span>
          <span>• Себестоимость / cost_price</span>
          <span>• Прибыль / profit</span>
          <span>• Рентабельность / profitability</span>
          <span>• Скидка / discount</span>
          <span>• Тип клиента / customer_type</span>
          <span>• Регион / region</span>
          <span>• Канал продаж / sales_channel</span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;