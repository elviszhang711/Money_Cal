import React from 'react';

interface MoneyInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  note?: string;
  isNegative?: boolean; // Legacy: simply makes text red if true
  useStockColor?: boolean; // New: Positive = Red, Negative = Green
  currency?: 'TWD' | 'USD';
  readOnly?: boolean;
}

const MoneyInput: React.FC<MoneyInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "0",
  note,
  isNegative = false,
  useStockColor = false,
  currency = 'TWD',
  readOnly = false
}) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(0);
      return;
    }
    // Allow typing negative signs and decimals
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleClear = () => {
    onChange(0);
  };

  // Determine text color based on props and value
  let textColorClass = 'text-gray-900';
  if (readOnly) {
    textColorClass = 'text-gray-500';
  } else if (useStockColor) {
    if (value > 0) textColorClass = 'text-red-600 font-medium';
    else if (value < 0) textColorClass = 'text-green-600 font-medium';
  } else if (isNegative) {
    textColorClass = 'text-red-600';
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700 flex justify-between items-center">
        {label}
        {currency === 'USD' && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">USD</span>}
      </label>
      <div className="relative rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm">
            {currency === 'USD' ? '$' : 'NT$'}
          </span>
        </div>
        <input
          type="number"
          step={currency === 'USD' ? "0.01" : "1"}
          className={`block w-full rounded-md border-0 py-2 pl-12 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-colors
            ${readOnly ? 'bg-gray-100 ring-gray-200 cursor-not-allowed' : 'bg-white ring-gray-300 focus:ring-indigo-600'}
            ${textColorClass}
          `}
          placeholder={placeholder}
          value={value === 0 ? '' : value}
          onChange={handleChange}
          readOnly={readOnly}
        />
        {!readOnly && value !== 0 && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="清除金額"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  );
};

export default MoneyInput;