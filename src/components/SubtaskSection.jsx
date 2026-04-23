import React from 'react';
import { CheckCircle, Circle, Trash2, Repeat, DollarSign } from 'lucide-react';
import AmountInput from './AmountInput';
import { PAYMENT_TYPES } from '../constants';

const SubtaskSection = ({
  task,
  categoryId,
  isVendorSubtask,
  subtaskPaymentTypes,
  subtaskPaidStatus,
  formatDate,
  onAddSubtask,
  onToggleSubtask,
  onUpdateAmount,
  onSetPaymentType,
  onTogglePaid,
  onDeleteSubtask,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      onAddSubtask(categoryId, task.id, e.target.value.trim());
      e.target.value = '';
    }
  };

  const handleAddClick = (e) => {
    const input = e.target.previousElementSibling;
    if (input && input.value.trim()) {
      onAddSubtask(categoryId, task.id, input.value.trim());
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
          onClick={handleAddClick}
        >
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {task.subtasks && task.subtasks.map(subtask => {
          const isPaid = subtaskPaidStatus[subtask.id] || subtask.isPaid || false;
          const paymentType = subtaskPaymentTypes[subtask.id] || subtask.paymentType || '';

          return (
            <li key={subtask.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onToggleSubtask(categoryId, task.id, subtask.id)}
                  className="focus:outline-none"
                  aria-label={subtask.completed ? 'Mark subtask incomplete' : 'Mark subtask complete'}
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
                    <Repeat size={14} className="ml-2 text-blue-500" title="Recurring vendor" />
                  )}
                  {isVendorSubtask && isPaid && (
                    <div className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-md flex items-center">
                      <DollarSign size={12} className="mr-1" />
                      Paid
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <AmountInput
                  value={subtask.amount}
                  onChange={(v) => onUpdateAmount(categoryId, task.id, subtask.id, v)}
                />

                {isVendorSubtask && (
                  <>
                    <select
                      className="text-xs border border-gray-300 rounded py-0.5 px-1"
                      value={paymentType}
                      onChange={(e) => onSetPaymentType(subtask.id, e.target.value)}
                    >
                      <option value="">Payment Type</option>
                      <option value={PAYMENT_TYPES.CREDIT_CARD}>Credit Card</option>
                      <option value={PAYMENT_TYPES.ACH}>ACH</option>
                      <option value={PAYMENT_TYPES.ONLINE_PORTAL}>Online Portal</option>
                    </select>
                    <button
                      className={`text-xs px-2 py-0.5 rounded ${isPaid
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                      onClick={() => onTogglePaid(subtask.id)}
                    >
                      {isPaid ? 'Paid' : 'Mark Paid'}
                    </button>
                  </>
                )}

                <span className="text-xs text-gray-500">
                  {subtask.completed ? formatDate(subtask.completionDate) : 'Open'}
                </span>
                <button
                  onClick={() => onDeleteSubtask(categoryId, task.id, subtask.id)}
                  className="text-gray-400 hover:text-red-500 focus:outline-none"
                  aria-label="Delete subtask"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SubtaskSection;
