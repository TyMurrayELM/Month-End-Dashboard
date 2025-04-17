```jsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import TaskList from './TaskList';

const CategoryCard = ({ 
  category, 
  toggleExpand, 
  toggleTaskStatus, 
  toggleRecurringStatus, 
  deleteTask, 
  addNewTask, 
  showCompleted,
  isNewTaskRecurring,
  setIsNewTaskRecurring
}) => {
  const getCompletionStatus = (tasks) => {
    let total = tasks.length;
    let completed = tasks.filter(task => task.completed).length;
    
    tasks.forEach(task => {
      if (task.hasSubtasks && task.subtasks) {
        total += task.subtasks.length;
        completed += task.subtasks.filter(subtask => subtask.completed).length;
      }
    });
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const { completed, total, percentage } = getCompletionStatus(category.tasks);
  const filteredTasks = showCompleted 
    ? category.tasks 
    : category.tasks.filter(task => !task.completed);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => toggleExpand(category.id)}
          >
            <span className="text-xl">{category.icon}</span>
            <h2 className="text-lg font-medium text-gray-800">{category.title}</h2>
            {category.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {completed}/{total} completed
            </div>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {category.expanded && (
        <TaskList 
          category={category}
          filteredTasks={filteredTasks}
          toggleTaskStatus={toggleTaskStatus}
          toggleRecurringStatus={toggleRecurringStatus}
          deleteTask={deleteTask}
          addNewTask={addNewTask}
          isNewTaskRecurring={isNewTaskRecurring}
          setIsNewTaskRecurring={setIsNewTaskRecurring}
        />
      )}
    </div>
  );
};

export default CategoryCard;
```