```jsx
import React from 'react';

const ProgressBar = ({ 
  value, 
  max, 
  height = 4, 
  colorClass = 'bg-blue-500', 
  showPercentage = false, 
  isDanger = false,
  showLabels = false 
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  
  return (
    <div className="w-full">
      {showPercentage && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{value}/{max}</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full h-${height}`}>
        <div 
          className={`h-${height} rounded-full ${isDanger ? 'bg-red-500' : colorClass}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin="0"
          aria-valuemax={max}
        ></div>
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
```