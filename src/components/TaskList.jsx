import React from 'react';
import { Plus } from 'lucide-react';
import TaskItem from './TaskItem';

const TaskList = ({ 
  category, 
  filteredTasks, 
  toggleTaskStatus, 
  toggleRecurringStatus, 
  deleteTask, 
  addNewTask, 
  isNewTaskRecurring, 
  setIsNewTaskRecurring 
}) => {
  
  const toggleSubtaskExpand = (categoryId, taskId) => {
    // This function is passed down to TaskItem to handle expanding/collapsing subtasks
    const updatedTasks = category.tasks.map(task => 
      task.id === taskId ? { ...task, expanded: !task.expanded } : task
    );
    
    // We need to implement this in the parent component that manages state
    // This is just a stub that would be passed down from Dashboard
  };
  
  const updateSubtaskStatus = (categoryId, taskId, subtaskId, completed) => {
    // This would be implemented in the parent component that manages state
    // Just a stub for the expected function
  };
  
  const updateSubtaskAmount = (categoryId, taskId, subtaskId, amount) => {
    // This would be implemented in the parent component that manages state
    // Just a stub for the expected function
  };
  
  const deleteSubtask = (categoryId, taskId, subtaskId) => {
    // This would be implemented in the parent component that manages state
    // Just a stub for the expected function
  };
  
  const addSubtask = (categoryId, taskId, name) => {
    // This would be implemented in the parent component that manages state
    // Just a stub for the expected function
  };

  return (
    <div className="p-4">
      <ul className="divide-y divide-gray-200">
        {filteredTasks.map(task => (
          <TaskItem 
            key={task.id}
            task={task}
            categoryId={category.id}
            toggleTaskStatus={toggleTaskStatus}
            toggleSubtaskExpand={toggleSubtaskExpand}
            toggleRecurringStatus={toggleRecurringStatus}
            deleteTask={deleteTask}
            updateSubtaskStatus={updateSubtaskStatus}
            updateSubtaskAmount={updateSubtaskAmount}
            deleteSubtask={deleteSubtask}
            addSubtask={addSubtask}
          />
        ))}
      </ul>
      
      {/* Add task section with recurring checkbox */}
      <div className="mt-3">
        <div className="flex items-center">
          <label className="inline-flex items-center mr-3">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-500"
              checked={isNewTaskRecurring}
              onChange={() => setIsNewTaskRecurring(!isNewTaskRecurring)}
            />
            <span className="ml-2 text-sm text-gray-600">Make recurring</span>
          </label>
          <button 
            onClick={() => addNewTask(category.id)}
            className="flex items-center text-sm text-blue-500 hover:text-blue-600 focus:outline-none"
          >
            <Plus size={16} className="mr-1" />
            Add task
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskList;