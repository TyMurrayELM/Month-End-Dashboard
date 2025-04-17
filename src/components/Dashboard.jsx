import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Clock, Trash2, Plus, ChevronDown, ChevronUp, Filter, AlertTriangle, CheckSquare, Repeat } from 'lucide-react';
import supabase from '../supabaseClient';

const Dashboard = () => {
  const [categories, setCategories] = useState([]);
  const [isNewTaskRecurring, setIsNewTaskRecurring] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [currentMonthId, setCurrentMonthId] = useState(null);
  const [monthOptions, setMonthOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskNames, setNewTaskNames] = useState({});
  const [deadlineStatus, setDeadlineStatus] = useState({
    deadlineDate: null,
    isPastDeadline: false,
    isComplete: false
  });

  // Load months and categories when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Load months
        const { data: months, error: monthsError } = await supabase
          .from('months')
          .select('*')
          .order('month_name');
          
        if (monthsError) throw monthsError;
        
        // Create initial month if none exist
        if (!months || months.length === 0) {
          const currentDate = new Date();
          const monthName = `${
            ["January", "February", "March", "April", "May", "June", 
             "July", "August", "September", "October", "November", "December"][currentDate.getMonth()]
          } ${currentDate.getFullYear()}`;
          
          // Calculate deadline (7th business day)
          const deadlineDate = calculateDeadlineDate(monthName);
          
          const { data: newMonth, error: newMonthError } = await supabase
            .from('months')
            .insert([{ month_name: monthName, deadline_date: deadlineDate.toISOString() }])
            .select();
            
          if (newMonthError) throw newMonthError;
          
          setMonthOptions([{ id: newMonth[0].id, name: monthName }]);
          setCurrentMonthId(newMonth[0].id);
          
          // After creating month, create task instances from templates
          await createTaskInstancesForMonth(newMonth[0].id);
        } else {
          // Use existing months
          setMonthOptions(months.map(m => ({ id: m.id, name: m.month_name })));
          
          // Sort months chronologically (oldest to newest)
          const sortedMonths = [...months].sort((a, b) => {
            const [monthA, yearA] = a.month_name.split(' ');
            const [monthB, yearB] = b.month_name.split(' ');
            const monthOrder = {
              "January": 0, "February": 1, "March": 2, "April": 3, 
              "May": 4, "June": 5, "July": 6, "August": 7,
              "September": 8, "October": 9, "November": 10, "December": 11
            };
            
            // First compare year
            if (parseInt(yearA) !== parseInt(yearB)) {
              return parseInt(yearA) - parseInt(yearB);
            }
            // If same year, compare month
            return monthOrder[monthA] - monthOrder[monthB];
          });

          // Find first incomplete month
          const findIncompleteMonth = async () => {
            for (const month of sortedMonths) {
              // Check for incomplete tasks
              const { data: incompleteTasks } = await supabase
                .from('task_instances')
                .select('id')
                .eq('month_id', month.id)
                .eq('completed', false)
                .limit(1);
                
              if (incompleteTasks?.length > 0) {
                setCurrentMonthId(month.id);
                return;
              }
              
              // Check for incomplete subtasks
              const { data: tasks } = await supabase
                .from('task_instances')
                .select('id')
                .eq('month_id', month.id);
                
              if (tasks?.length) {
                const { data: subtasks } = await supabase
                  .from('subtask_instances')
                  .select('id')
                  .in('task_instance_id', tasks.map(t => t.id))
                  .eq('completed', false)
                  .limit(1);
                  
                if (subtasks?.length > 0) {
                  setCurrentMonthId(month.id);
                  return;
                }
              }
            }
            
            // If all complete, use most recent
            setCurrentMonthId(sortedMonths[0].id);
          };

          await findIncompleteMonth();
        }
        
        // Load categories (without tasks at this point)
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('order_index');
          
        if (categoriesError) throw categoriesError;
        
        setCategories(categoriesData.map(c => ({
          ...c,
          expanded: true,
          tasks: []
        })));
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Load tasks when month changes
  useEffect(() => {
    const loadTasksForMonth = async () => {
      if (!currentMonthId || categories.length === 0) return;
      
      try {
        setLoading(true);
        
        // Get month details for deadline
        const { data: monthData, error: monthError } = await supabase
          .from('months')
          .select('*')
          .eq('id', currentMonthId)
          .single();
          
        if (monthError) throw monthError;
        
        const deadlineDate = new Date(monthData.deadline_date);
        const today = new Date();
        
        // Get tasks for this month with their templates
        const { data: taskInstances, error: tasksError } = await supabase
          .from('task_instances')
          .select(`
            id,
            completed,
            completion_date,
            task_templates(id, name, recurring, has_subtasks, category_id)
          `)
          .eq('month_id', currentMonthId);
          
        if (tasksError) throw tasksError;
        
        // Process categories with tasks
        const categoriesWithTasks = [...categories];
        
        // Reset tasks in all categories
        categoriesWithTasks.forEach(category => {
          category.tasks = [];
        });
        
        // Process each task and add to its category
        for (const instance of taskInstances) {
          if (!instance.task_templates) continue;
          
          const categoryId = instance.task_templates.category_id;
          const categoryIndex = categoriesWithTasks.findIndex(c => c.id === categoryId);
          
          if (categoryIndex === -1) continue;
          
          const task = {
            id: instance.id,
            name: instance.task_templates.name,
            completed: instance.completed,
            completionDate: instance.completion_date,
            recurring: instance.task_templates.recurring,
            templateId: instance.task_templates.id
          };
          
          // If task has subtasks, load them
          if (instance.task_templates.has_subtasks) {
            task.hasSubtasks = true;
            task.expanded = false;
            
            // Get subtasks for this task
            const { data: subtasks, error: subtasksError } = await supabase
              .from('subtask_instances')
              .select(`
                id,
                completed,
                completion_date,
                amount,
                subtask_templates(id, name, recurring)
              `)
              .eq('task_instance_id', instance.id);
              
            if (subtasksError) throw subtasksError;
            
            // Map subtasks to the expected format
            task.subtasks = subtasks.map(s => ({
              id: s.id,
              name: s.subtask_templates?.name || '',
              completed: s.completed,
              completionDate: s.completion_date,
              amount: s.amount || '',
              recurring: s.subtask_templates?.recurring || true,
              templateId: s.subtask_templates?.id
            }));
          }
          
          categoriesWithTasks[categoryIndex].tasks.push(task);
        }
        
        // Check if all tasks are complete
        const allTasksComplete = categoriesWithTasks.every(category => 
          category.tasks.every(task => 
            task.completed && (!task.hasSubtasks || task.subtasks.every(subtask => subtask.completed))
          )
        );
        
        setCategories(categoriesWithTasks);
        setDeadlineStatus({
          deadlineDate,
          isPastDeadline: today > deadlineDate,
          isComplete: allTasksComplete
        });
      } catch (error) {
        console.error("Error loading tasks:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTasksForMonth();
  }, [currentMonthId, categories.length]);
  
  // Calculate 7th business day of a month
  const calculateDeadlineDate = (monthName) => {
    const [month, year] = monthName.split(' ');
    const monthIndex = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"]
                      .indexOf(month);
    
    const date = new Date(parseInt(year), monthIndex, 1);
    let businessDays = 0;
    
    while (businessDays < 7) {
      // Move to next day
      date.setDate(date.getDate() + 1);
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    
    return date;
  };
  
  // Create task instances for a new month
  const createTaskInstancesForMonth = async (monthId) => {
    try {
      // Get all template tasks (both recurring and non-recurring for the initial month)
      const { data: taskTemplates, error: templatesError } = await supabase
        .from('task_templates')
        .select('*');
        
      if (templatesError) throw templatesError;
      
      // Create task instances
      for (const template of taskTemplates) {
        const { data: taskInstance, error: taskError } = await supabase
          .from('task_instances')
          .insert([{
            month_id: monthId,
            task_template_id: template.id,
            completed: false,
            completion_date: null
          }])
          .select();
          
        if (taskError) throw taskError;
        
        // If this is a task with subtasks, create subtask instances
        if (template.has_subtasks && taskInstance && taskInstance.length > 0) {
          const { data: subtaskTemplates, error: subtasksError } = await supabase
            .from('subtask_templates')
            .select('*')
            .eq('task_template_id', template.id);
            
          if (subtasksError) throw subtasksError;
          
          if (subtaskTemplates && subtaskTemplates.length > 0) {
            // Build array of subtask instances to insert
            const subtaskInstances = subtaskTemplates.map(st => ({
              task_instance_id: taskInstance[0].id,
              subtask_template_id: st.id,
              completed: false,
              completion_date: null,
              amount: ''
            }));
            
            // Insert all subtask instances
            const { error: insertError } = await supabase
              .from('subtask_instances')
              .insert(subtaskInstances);
              
            if (insertError) throw insertError;
          }
        }
      }
    } catch (error) {
      console.error("Error creating task instances:", error);
      throw error;
    }
  };
  
  // Create a new month
  const createNextMonth = async () => {
    try {
      // Get current month data to determine next month
      const { data: currentMonth, error: currentMonthError } = await supabase
        .from('months')
        .select('month_name')
        .eq('id', currentMonthId)
        .single();
        
      if (currentMonthError) throw currentMonthError;
      
      // Calculate next month name
      const [month, year] = currentMonth.month_name.split(' ');
      const monthIndex = ["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"]
                         .indexOf(month);
      
      // Calculate next month
      let nextMonthIndex = (monthIndex + 1) % 12;
      let nextYear = parseInt(year);
      if (nextMonthIndex === 0) { // If we're moving from December to January
        nextYear++;
      }
      
      const nextMonthName = `${["January", "February", "March", "April", "May", "June", 
                             "July", "August", "September", "October", "November", "December"][nextMonthIndex]} ${nextYear}`;
      
      // Check if next month already exists
      const { data: existingMonth, error: existingMonthError } = await supabase
        .from('months')
        .select('id')
        .eq('month_name', nextMonthName)
        .single();
        
      if (existingMonth) {
        alert(`${nextMonthName} already exists. Please select it from the dropdown.`);
        return;
      }
      
      if (existingMonthError && existingMonthError.code !== 'PGRST116') {
        // PGRST116 means "no rows returned" which is what we expect
        throw existingMonthError;
      }
      
      // Calculate deadline date
      const deadlineDate = calculateDeadlineDate(nextMonthName);
      
      // Create new month
      const { data: newMonth, error: createError } = await supabase
        .from('months')
        .insert([{
          month_name: nextMonthName,
          deadline_date: deadlineDate.toISOString()
        }])
        .select();
        
      if (createError) throw createError;
      
      // Get recurring task templates only for continuing months
      const { data: taskTemplates, error: templatesError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('recurring', true);
        
      if (templatesError) throw templatesError;
      
      // Create recurring task instances
      for (const template of taskTemplates) {
        const { data: taskInstance, error: taskError } = await supabase
          .from('task_instances')
          .insert([{
            month_id: newMonth[0].id,
            task_template_id: template.id,
            completed: false,
            completion_date: null
          }])
          .select();
          
        if (taskError) throw taskError;
        
        // If this is a task with subtasks, create subtask instances
        if (template.has_subtasks && taskInstance && taskInstance.length > 0) {
          const { data: subtaskTemplates, error: subtasksError } = await supabase
            .from('subtask_templates')
            .select('*')
            .eq('task_template_id', template.id)
            .eq('recurring', true); // Only recurring subtasks
            
          if (subtasksError) throw subtasksError;
          
          if (subtaskTemplates && subtaskTemplates.length > 0) {
            // Build array of subtask instances to insert
            const subtaskInstances = subtaskTemplates.map(st => ({
              task_instance_id: taskInstance[0].id,
              subtask_template_id: st.id,
              completed: false,
              completion_date: null,
              amount: ''
            }));
            
            // Insert all subtask instances
            const { error: insertError } = await supabase
              .from('subtask_instances')
              .insert(subtaskInstances);
              
            if (insertError) throw insertError;
          }
        }
      }
      
      // Update months and select the new month
      setMonthOptions([...monthOptions, { id: newMonth[0].id, name: nextMonthName }]);
      setCurrentMonthId(newMonth[0].id);
      
    } catch (error) {
      console.error("Error creating next month:", error);
      alert("Error creating next month: " + error.message);
    }
  };
  
  // Check if next month already exists
  const getNextMonthInfo = () => {
    const currentMonth = monthOptions.find(m => m.id === currentMonthId);
    if (!currentMonth) return { exists: true }; // Default to disabled if no current month
    
    const [month, year] = currentMonth.name.split(' ');
    const monthIndex = ["January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"]
                       .indexOf(month);
    
    // Calculate next month
    let nextMonthIndex = (monthIndex + 1) % 12;
    let nextYear = parseInt(year);
    if (nextMonthIndex === 0) { // If we're moving from December to January
      nextYear++;
    }
    
    const nextMonth = `${["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"][nextMonthIndex]} ${nextYear}`;
    
    // Check if this month name already exists
    const exists = monthOptions.some(m => m.name === nextMonth);
    
    return {
      nextMonth,
      exists
    };
  };
  
  // Toggle task expansion (for subtasks)
  const toggleExpand = (categoryId) => {
    setCategories(categories.map(category => 
      category.id === categoryId 
        ? { ...category, expanded: !category.expanded } 
        : category
    ));
  };
  
  // Toggle task completion status
  const toggleTaskStatus = async (categoryId, taskId) => {
    try {
      // Find the task
      const categoryIndex = categories.findIndex(c => c.id === categoryId);
      if (categoryIndex === -1) return;
      
      const taskIndex = categories[categoryIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const task = categories[categoryIndex].tasks[taskIndex];
      const newCompletionStatus = !task.completed;
      
      // Update in database
      const { error } = await supabase
        .from('task_instances')
        .update({ 
          completed: newCompletionStatus,
          completion_date: newCompletionStatus ? new Date().toISOString() : null
        })
        .eq('id', taskId);
        
      if (error) throw error;
      
      // Update local state
      const newCategories = [...categories];
      newCategories[categoryIndex].tasks[taskIndex] = {
        ...task,
        completed: newCompletionStatus,
        completionDate: newCompletionStatus ? new Date().toLocaleDateString() : null
      };
      
      setCategories(newCategories);
      
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };
  
  // Toggle subtask completion status
  const toggleSubtaskStatus = async (categoryId, taskId, subtaskId) => {
    try {
      // Find the subtask
      const categoryIndex = categories.findIndex(c => c.id === categoryId);
      if (categoryIndex === -1) return;
      
      const taskIndex = categories[categoryIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const task = categories[categoryIndex].tasks[taskIndex];
      if (!task.subtasks) return;
      
      const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
      if (subtaskIndex === -1) return;
      
      const subtask = task.subtasks[subtaskIndex];
      const newCompletionStatus = !subtask.completed;
      
      // Update in database
      const { error } = await supabase
        .from('subtask_instances')
        .update({ 
          completed: newCompletionStatus,
          completion_date: newCompletionStatus ? new Date().toISOString() : null
        })
        .eq('id', subtaskId);
        
      if (error) throw error;
      
      // Update local state
      const newCategories = [...categories];
      newCategories[categoryIndex].tasks[taskIndex].subtasks[subtaskIndex] = {
        ...subtask,
        completed: newCompletionStatus,
        completionDate: newCompletionStatus ? new Date().toLocaleDateString() : null
      };
      
      setCategories(newCategories);
      
    } catch (error) {
      console.error("Error updating subtask status:", error);
    }
  };
  
  // Toggle subtask expanded state
  const toggleSubtaskExpand = (categoryId, taskId) => {
    setCategories(categories.map(category => 
      category.id === categoryId 
        ? {
            ...category,
            tasks: category.tasks.map(task => 
              task.id === taskId 
                ? { ...task, expanded: !task.expanded } 
                : task
            )
          }
        : category
    ));
  };
  
  // Add a new task
  const addNewTask = async (categoryId) => {
    try {
      const name = (newTaskNames[categoryId] || "New Task").trim() || "New Task";
      
      // Create task template first
      const { data: template, error: templateError } = await supabase
        .from('task_templates')
        .insert([{ 
          name: name, 
          category_id: categoryId,
          recurring: isNewTaskRecurring,
          has_subtasks: false
        }])
        .select();
        
      if (templateError) throw templateError;
      
      // Create task instance for this month
      const { data: instance, error: instanceError } = await supabase
        .from('task_instances')
        .insert([{
          month_id: currentMonthId,
          task_template_id: template[0].id,
          completed: false,
          completion_date: null
        }])
        .select();
        
      if (instanceError) throw instanceError;
      
      // Update state
      setCategories(categories.map(category => 
        category.id === categoryId 
          ? {
              ...category,
              tasks: [
                ...category.tasks,
                { 
                  id: instance[0].id,
                  name: name, 
                  completed: false, 
                  completionDate: null,
                  recurring: isNewTaskRecurring,
                  templateId: template[0].id
                }
              ]
            }
          : category
      ));
      
      // Reset just this category's task name
      setNewTaskNames(prev => ({
        ...prev,
        [categoryId]: "New Task"
      }));
      
      setIsNewTaskRecurring(true);
      
    } catch (error) {
      console.error("Error adding new task:", error);
    }
  };
  
  // Delete a task
  const deleteTask = async (categoryId, taskId) => {
    try {
      // Find the task
      const categoryIndex = categories.findIndex(c => c.id === categoryId);
      if (categoryIndex === -1) return;
      
      const taskIndex = categories[categoryIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const task = categories[categoryIndex].tasks[taskIndex];
      
      // Delete task instance
      const { error: instanceError } = await supabase
        .from('task_instances')
        .delete()
        .eq('id', taskId);
        
      if (instanceError) throw instanceError;
      
      // Delete task template
      if (task.templateId) {
        const { error: templateError } = await supabase
          .from('task_templates')
          .delete()
          .eq('id', task.templateId);
          
        if (templateError) throw templateError;
      }
      
      // Update state
      const newCategories = [...categories];
      newCategories[categoryIndex].tasks = newCategories[categoryIndex].tasks.filter(t => t.id !== taskId);
      setCategories(newCategories);
      
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };
  
  // Toggle task recurring status
  const toggleRecurringStatus = async (categoryId, taskId) => {
    try {
      // Find the task
      const categoryIndex = categories.findIndex(c => c.id === categoryId);
      if (categoryIndex === -1) return;
      
      const taskIndex = categories[categoryIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const task = categories[categoryIndex].tasks[taskIndex];
      if (!task.templateId) return;
      
      const newRecurringStatus = !task.recurring;
      
      // Update template in database
      const { error } = await supabase
        .from('task_templates')
        .update({ recurring: newRecurringStatus })
        .eq('id', task.templateId);
        
      if (error) throw error;
      
      // Update local state
      const newCategories = [...categories];
      newCategories[categoryIndex].tasks[taskIndex] = {
        ...task,
        recurring: newRecurringStatus
      };
      
      setCategories(newCategories);
      
    } catch (error) {
      console.error("Error updating recurring status:", error);
    }
  };
  
  // Update subtask amount
  const updateSubtaskAmount = async (categoryId, taskId, subtaskId, amount) => {
    try {
      // Find the subtask
      const categoryIndex = categories.findIndex(c => c.id === categoryId);
      if (categoryIndex === -1) return;
      
      const taskIndex = categories[categoryIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const task = categories[categoryIndex].tasks[taskIndex];
      if (!task.subtasks) return;
      
      const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
      if (subtaskIndex === -1) return;
      
      // Update in database
      const { error } = await supabase
        .from('subtask_instances')
        .update({ amount })
        .eq('id', subtaskId);
        
      if (error) throw error;
      
      // Update local state
      const newCategories = [...categories];
      newCategories[categoryIndex].tasks[taskIndex].subtasks[subtaskIndex].amount = amount;
      
      setCategories(newCategories);
      
    } catch (error) {
      console.error("Error updating subtask amount:", error);
    }
  };
  
  // Add a new subtask (vendor)
  const addSubtask = async (categoryId, taskId, name) => {
    try {
      // Find the task
      const categoryIndex = categories.findIndex(c => c.id === categoryId);
      if (categoryIndex === -1) return;
      
      const taskIndex = categories[categoryIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const task = categories[categoryIndex].tasks[taskIndex];
      if (!task.templateId) return;
      
      // Create subtask template
      const { data: template, error: templateError } = await supabase
        .from('subtask_templates')
        .insert([{ 
          name, 
          task_template_id: task.templateId,
          recurring: true
        }])
        .select();
        
      if (templateError) throw templateError;
      
      // Create subtask instance
      const { data: instance, error: instanceError } = await supabase
        .from('subtask_instances')
        .insert([{
          task_instance_id: taskId,
          subtask_template_id: template[0].id,
          completed: false,
          completion_date: null,
          amount: ''
        }])
        .select();
        
      if (instanceError) throw instanceError;
      
      // Update state
      const newCategories = [...categories];
      if (!newCategories[categoryIndex].tasks[taskIndex].subtasks) {
        newCategories[categoryIndex].tasks[taskIndex].subtasks = [];
      }
      
      newCategories[categoryIndex].tasks[taskIndex].subtasks.push({
        id: instance[0].id,
        name,
        completed: false,
        completionDate: null,
        amount: '',
        recurring: true,
        templateId: template[0].id
      });
      
      setCategories(newCategories);
      
    } catch (error) {
      console.error("Error adding subtask:", error);
    }
  };
  
  // Delete a subtask
  const deleteSubtask = async (categoryId, taskId, subtaskId) => {
    try {
      // Find the subtask
      const categoryIndex = categories.findIndex(c => c.id === categoryId);
      if (categoryIndex === -1) return;
      
      const taskIndex = categories[categoryIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const task = categories[categoryIndex].tasks[taskIndex];
      if (!task.subtasks) return;
      
      const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
      if (subtaskIndex === -1) return;
      
      const subtask = task.subtasks[subtaskIndex];
      
      // Delete subtask instance
      const { error: instanceError } = await supabase
        .from('subtask_instances')
        .delete()
        .eq('id', subtaskId);
        
      if (instanceError) throw instanceError;
      
      // Delete subtask template
      if (subtask.templateId) {
        const { error: templateError } = await supabase
          .from('subtask_templates')
          .delete()
          .eq('id', subtask.templateId);
          
        if (templateError) throw templateError;
      }
      
      // Update state
      const newCategories = [...categories];
      newCategories[categoryIndex].tasks[taskIndex].subtasks = 
        newCategories[categoryIndex].tasks[taskIndex].subtasks.filter(s => s.id !== subtaskId);
      
      setCategories(newCategories);
      
    } catch (error) {
      console.error("Error deleting subtask:", error);
    }
  };
  
  // Get completion status for category tasks
  const getCompletionStatus = (tasks) => {
    let total = tasks.length;
    let completed = tasks.filter(task => task.completed).length;
    
    // Count subtasks if any
    tasks.forEach(task => {
      if (task.hasSubtasks && task.subtasks) {
        total += task.subtasks.length;
        completed += task.subtasks.filter(subtask => subtask.completed).length;
      }
    });
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };
  
  // Calculate overall completion percentage across all categories
  const getOverallCompletionStatus = () => {
    let totalTasks = 0;
    let completedTasks = 0;
    
    categories.forEach(category => {
      const tasks = category.tasks;
      totalTasks += tasks.length;
      completedTasks += tasks.filter(task => task.completed).length;
      
      // Count subtasks if any
      tasks.forEach(task => {
        if (task.hasSubtasks && task.subtasks) {
          totalTasks += task.subtasks.length;
          completedTasks += task.subtasks.filter(subtask => subtask.completed).length;
        }
      });
    });
    
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { completed: completedTasks, total: totalTasks, percentage };
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-blue-50 p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Month-End Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select 
              className="bg-white border border-gray-300 rounded-md py-2 px-4 pr-8 text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={currentMonthId || ''}
              onChange={(e) => setCurrentMonthId(e.target.value)}
            >
              {monthOptions.map(month => (
                <option key={month.id} value={month.id}>{month.name}</option>
              ))}
            </select>
          </div>
          <button 
            className={`flex items-center space-x-1 border rounded-md py-2 px-4 ${
              getNextMonthInfo().exists 
                ? 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-blue-500 border-blue-600 text-white hover:bg-blue-600'
            }`}
            onClick={createNextMonth}
            disabled={getNextMonthInfo().exists}
            title={getNextMonthInfo().exists ? `${getNextMonthInfo().nextMonth} already exists` : `Create ${getNextMonthInfo().nextMonth}`}
          >
            <Plus size={16} />
            <span>Create Next Month</span>
          </button>
          <button 
            className="flex items-center space-x-1 bg-white border border-gray-300 rounded-md py-2 px-4 text-gray-700 hover:bg-gray-50"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <Filter size={16} />
            <span>{showCompleted ? "Hide Completed" : "Show Completed"}</span>
          </button>
        </div>
      </div>
      
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium text-gray-800">Completion Goal Date</h2>
          <div className="flex items-center space-x-2">
            {deadlineStatus.isComplete ? (
              <div className="flex items-center text-green-500">
                <CheckSquare size={20} className="mr-2" />
                <span className="font-medium">All tasks complete</span>
              </div>
            ) : deadlineStatus.isPastDeadline ? (
              <div className="flex items-center text-red-500">
                <AlertTriangle size={20} className="mr-2" />
                <span className="font-medium">Past due date</span>
              </div>
            ) : (
              <div className="flex items-center text-blue-500">
                <Clock size={20} className="mr-2" />
                <span className="font-medium">In progress</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center mb-3">
          <span className="text-gray-600">Target completion: </span>
          <span className="ml-2 font-medium">
            {deadlineStatus.deadlineDate ? deadlineStatus.deadlineDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : "Calculating..."}
          </span>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="mb-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Overall Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {(() => {
                const { completed, total, percentage } = getOverallCompletionStatus();
                return `${completed}/${total} tasks (${percentage}%)`;
              })()}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div 
            className={`h-4 rounded-full ${deadlineStatus.isPastDeadline ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${getOverallCompletionStatus().percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Month-End Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(category => {
            const { completed, total, percentage } = getCompletionStatus(category.tasks);
            return (
              <div key={category.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{category.icon}</span>
                  <h3 className="font-medium text-gray-700">{category.title}</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{completed}/{total}</span>
                  <span className="text-sm font-medium text-gray-700">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(category => {
          const { completed, total, percentage } = getCompletionStatus(category.tasks);
          const filteredTasks = showCompleted 
            ? category.tasks 
            : category.tasks.filter(task => !task.completed);

          return (
            <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
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
                <div className="p-4">
                  <ul className="divide-y divide-gray-200">
                    {filteredTasks.map(task => (
                      <li key={task.id} className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => toggleTaskStatus(category.id, task.id)}
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
                                    onClick={() => toggleSubtaskExpand(category.id, task.id)}
                                    className="ml-2 focus:outline-none"
                                  >
                                    {task.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                )}
                              </div>
                              
                              {task.hasSubtasks && task.expanded && (
                                <div className="pl-6 mt-2 space-y-2">
                                  <div className="flex items-center mb-2">
                                    <input
                                      type="text"
                                      placeholder="Add new vendor"
                                      className="mr-2 px-2 py-1 border border-gray-300 rounded text-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                          addSubtask(category.id, task.id, e.target.value.trim());
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                    <button
                                      className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                                      onClick={(e) => {
                                        const input = e.target.previousElementSibling;
                                        if (input && input.value.trim()) {
                                          addSubtask(category.id, task.id, input.value.trim());
                                          input.value = '';
                                        }
                                      }}
                                    >
                                      Add
                                    </button>
                                  </div>
                                  
                                  <ul className="space-y-2">
                                  {task.subtasks && task.subtasks.map(subtask => (
                                    <li key={subtask.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                                      <div className="flex items-center space-x-2">
                                        <button 
                                          onClick={() => toggleSubtaskStatus(category.id, task.id, subtask.id)}
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
                                              
                                              updateSubtaskAmount(category.id, task.id, subtask.id, formattedValue);
                                            }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {subtask.completed ? subtask.completionDate : "Open"}
                                        </span>
                                        <button
                                          onClick={() => deleteSubtask(category.id, task.id, subtask.id)}
                                          className="text-gray-400 hover:text-red-500 focus:outline-none"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {/* Toggle recurring status button */}
                            <button
                              onClick={() => toggleRecurringStatus(category.id, task.id)}
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
                              onClick={() => deleteTask(category.id, task.id)}
                              className="text-gray-400 hover:text-red-500 focus:outline-none"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  {/* Add task section with input field */}
                  <div className="mt-3">
                    <div className="flex items-center mb-2">
                      <input
                        type="text"
                        placeholder="Task name"
                        className="mr-2 px-2 py-1 border border-gray-300 rounded text-sm"
                        value={newTaskNames[category.id] || "New Task"}
                        onChange={(e) => setNewTaskNames(prev => ({
                          ...prev,
                          [category.id]: e.target.value
                        }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (newTaskNames[category.id] || "").trim()) {
                            addNewTask(category.id);
                          }
                        }}
                      />
                      <button 
                        onClick={() => addNewTask(category.id)}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                      >
                        Add Task
                      </button>
                    </div>
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
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;