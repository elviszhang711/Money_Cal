import React from 'react';

interface SummaryCardProps {
  title: string;
  amount: number;
  subtext?: string;
  color?: 'blue' | 'green' | 'red' | 'indigo';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, subtext, color = 'indigo' }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-rose-50 border-rose-200 text-rose-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} flex flex-col justify-between h-full`}>
      <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wider">{title}</h3>
      <div className="mt-2">
        <p className={`text-2xl font-bold ${amount < 0 ? 'text-red-600' : ''}`}>
          {formatCurrency(amount)}
        </p>
        {subtext && <p className="text-xs opacity-70 mt-1">{subtext}</p>}
      </div>
    </div>
  );
};

export default SummaryCard;