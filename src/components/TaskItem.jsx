```jsx
import React from 'react';
import { CheckCircle, Circle, Clock, Trash2, ChevronDown, ChevronUp, Repeat } from 'lucide-react';
import SubtaskList from './SubtaskList';

const TaskItem = ({ 
  task, 
  categoryId, 
  toggleTaskStatus, 
  toggleSubtaskExpand, 
  toggleRecurringStatus, 
  deleteTask,
  updateSubtaskStatus,
  updateSubtaskAmount,
  deleteSubtask,
  addSubtask
}) => {
  return (
    <li className="py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => toggleTaskStatus(categoryId, task.id)}
            className="focus:outline-none"
          >
            {task.completed ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <Circle size={20} className="text-gray-400" />
            )}
          </button>
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className={`${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {task.name}
              </span>
              {/* Recurring task indicator */}
              {task.recurring && (
                <Repeat 
                  size={16} 
                  className="ml-2 text-blue-500" 
                  title="Recurring task"
                />
              )}
              {task.hasSubtasks && (
                <button
                  onClick={() => toggleSubtaskExpand(categoryId, task.id)}
                  className="ml-2 focus:outline-none"
                >
                  {task.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
            </div>
            
            {task.hasSubtasks && task.expanded && (
              <SubtaskList 
                task={task}
                categoryId={categoryId}
                updateSubtaskStatus={updateSubtaskStatus}
                updateSubtaskAmount={updateSubtaskAmount}
                deleteSubtask={deleteSubtask}
                addSubtask={addSubtask}
              />
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Toggle recurring status button */}
          <button
            onClick={() => toggleRecurringStatus(categoryId, task.id)}
            className={`focus:outline-none ${task.recurring ? 'text-blue-500' : 'text-gray-400'}`}
            title={task.recurring ? "Remove from recurring" : "Make recurring"}
          >
            <Repeat size={16} />
          </button>
          <span className="text-sm text-gray-500 flex items-center">
            <Clock size={14} className="mr-1" />
            {task.completed ? task.completionDate : "Open"}
          </span>
          <button 
            onClick={() => deleteTask(categoryId, task.id)}
            className="text-gray-400 hover:text-red-500 focus:outline-none"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
};

export default TaskItem;
```