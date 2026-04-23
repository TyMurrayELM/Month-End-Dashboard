import React from 'react';

const formatAmount = (input) => {
  let raw = input.replace(/,/g, '');

  const decimalCount = (raw.match(/\./g) || []).length;
  if (decimalCount > 1) {
    const [intPart, ...rest] = raw.split('.');
    raw = intPart + '.' + rest.join('');
  }

  raw = raw.replace(/[^\d.]/g, '');
  if (raw === '') return '';

  const parsed = parseFloat(raw);
  if (isNaN(parsed)) return '';

  if (raw.endsWith('.')) {
    return parsed.toLocaleString('en-US') + '.';
  }
  if (raw.includes('.')) {
    const decimalPlaces = raw.split('.')[1].length;
    return parsed.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  }
  return parsed.toLocaleString('en-US');
};

const AmountInput = ({ value, onChange, placeholder = 'Amount', widthClass = 'w-24' }) => {
  return (
    <div className="flex items-center">
      <span className="text-xs text-gray-500 mr-1">$</span>
      <input
        type="text"
        placeholder={placeholder}
        className={`${widthClass} px-1 py-0.5 text-xs border border-gray-300 rounded text-right`}
        value={value || ''}
        onChange={(e) => onChange(formatAmount(e.target.value))}
      />
    </div>
  );
};

export default AmountInput;
