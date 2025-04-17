import React from 'react';
import { CheckCircle, Circle, Trash2, Repeat } from 'lucide-react';

const SubtaskList = ({ 
  task, 
  categoryId, 
  updateSubtaskStatus, 
  updateSubtaskAmount, 
  deleteSubtask, 
  addSubtask 
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newVendorName = e.target.value.trim();
      addSubtask(categoryId, task.id, newVendorName);
      e.target.value = '';
    }
  };

  const handleAdd = (e) => {
    const input = e.target.previousElementSibling;
    if (input && input.value.trim()) {
      const newVendorName = input.value.trim();
      addSubtask(categoryId, task.id, newVendorName);
      input.value = '';
    }
  };

  return (
    <div className="pl-6 mt-2 space-y-2">
      <div className="flex items-center mb-2">
        <input
          type="text"
          placeholder="Add new vendor"
          className="mr-2 px-2 py-1 border border-gray-300 rounded text-sm"
          onKeyDown={handleKeyDown}
        />
        <button
          className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
          onClick={handleAdd}
        >
          Add
        </button>
      </div>
      
      <ul className="space-y-2">
        {task.subtasks.map(subtask => (
          <li key={subtask.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => updateSubtaskStatus(categoryId, task.id, subtask.id, !subtask.completed)}
                className="focus:outline-none"
              >
                {subtask.completed ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <Circle size={16} className="text-gray-400" />
                )}
              </button>
              <div className="flex items-center">
                <span className={`text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                  {subtask.name}
                </span>
                {subtask.recurring && (
                  <Repeat 
                    size={14} 
                    className="ml-2 text-blue-500" 
                    title="Recurring vendor"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">$</span>
                <input
                  type="text"
                  placeholder="Amount"
                  className="w-24 px-1 py-0.5 text-xs border border-gray-300 rounded"
                  value={subtask.amount || ""}
                  onChange={(e) => {
                    // Remove existing commas and non-digit characters
                    const rawValue = e.target.value.replace(/[^\d]/g, '');
                    
                    // Format with commas for thousands
                    const formattedValue = rawValue === '' ? '' : 
                      Number(rawValue).toLocaleString('en-US');
                    
                    updateSubtaskAmount(categoryId, task.id, subtask.id, formattedValue);
                  }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {subtask.completed ? subtask.completionDate : "Open"}
              </span>
              <button
                onClick={() => deleteSubtask(categoryId, task.id, subtask.id)}
                className="text-gray-400 hover:text-red-500 focus:outline-none"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubtaskList;