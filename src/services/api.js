import supabase from '../supabaseClient';

// Categories
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('order_index');
    
  if (error) throw error;
  return data;
};

// Months
export const getMonths = async () => {
  const { data, error } = await supabase
    .from('months')
    .select('*')
    .order('month_name');
    
  if (error) throw error;
  return data;
};

export const createMonth = async (monthName) => {
  // Calculate deadline date (7th business day)
  const [month, year] = monthName.split(' ');
  const monthIndex = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"]
                     .indexOf(month);
  
  const date = new Date(parseInt(year), monthIndex, 1);
  let businessDays = 0;
  
  while (businessDays < 7) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  
  // Insert new month
  const { data, error } = await supabase
    .from('months')
    .insert([
      { month_name: monthName, deadline_date: date.toISOString() }
    ])
    .select();
    
  if (error) throw error;
  
  // Create task instances from templates
  if (data && data.length > 0) {
    const monthId = data[0].id;
    await createTaskInstancesForMonth(monthId);
  }
  
  return data;
};

// Helper function to create task instances for a new month
const createTaskInstancesForMonth = async (monthId) => {
  // Get all recurring task templates
  const { data: templates, error: templatesError } = await supabase
    .from('task_templates')
    .select('*')
    .eq('recurring', true);
    
  if (templatesError) throw templatesError;
  
  // Create task instances
  for (const template of templates) {
    const { data: taskInstance, error: taskError } = await supabase
      .from('task_instances')
      .insert([
        { 
          month_id: monthId,
          task_template_id: template.id,
          completed: false,
          completion_date: null
        }
      ])
      .select();
      
    if (taskError) throw taskError;
    
    // If task has subtasks, create subtask instances
    if (template.has_subtasks) {
      const { data: subtasks, error: subtasksError } = await supabase
        .from('subtask_templates')
        .select('*')
        .eq('task_template_id', template.id)
        .eq('recurring', true);
        
      if (subtasksError) throw subtasksError;
      
      if (subtasks && subtasks.length > 0 && taskInstance && taskInstance.length > 0) {
        const subtaskInstances = subtasks.map(subtask => ({
          task_instance_id: taskInstance[0].id,
          subtask_template_id: subtask.id,
          completed: false,
          completion_date: null,
          amount: ''
        }));
        
        const { error: insertError } = await supabase
          .from('subtask_instances')
          .insert(subtaskInstances);
          
        if (insertError) throw insertError;
      }
    }
  }
};

// Tasks
export const getTasksForMonth = async (monthId) => {
  // Get task instances for month
  const { data: taskInstances, error: taskError } = await supabase
    .from('task_instances')
    .select(`
      id,
      completed,
      completion_date,
      task_templates (
        id,
        name,
        recurring,
        has_subtasks,
        category_id
      )
    `)
    .eq('month_id', monthId);
    
  if (taskError) throw taskError;
  
  // Get subtask instances for task instances
  const tasks = [];
  for (const instance of taskInstances) {
    const task = {
      id: instance.id,
      name: instance.task_templates.name,
      completed: instance.completed,
      completionDate: instance.completion_date,
      recurring: instance.task_templates.recurring,
      category_id: instance.task_templates.category_id,
      template_id: instance.task_templates.id
    };
    
    if (instance.task_templates.has_subtasks) {
      const { data: subtaskInstances, error: subtaskError } = await supabase
        .from('subtask_instances')
        .select(`
          id,
          completed,
          completion_date,
          amount,
          subtask_templates (
            id,
            name,
            recurring
          )
        `)
        .eq('task_instance_id', instance.id);
        
      if (subtaskError) throw subtaskError;
      
      task.hasSubtasks = true;
      task.expanded = false;
      task.subtasks = subtaskInstances.map(si => ({
        id: si.id,
        name: si.subtask_templates.name,
        completed: si.completed,
        completionDate: si.completion_date,
        amount: si.amount,
        recurring: si.subtask_templates.recurring,
        template_id: si.subtask_templates.id
      }));
    }
    
    tasks.push(task);
  }
  
  return tasks;
};

export const updateTaskStatus = async (taskId, completed) => {
  const { data, error } = await supabase
    .from('task_instances')
    .update({ 
      completed,
      completion_date: completed ? new Date().toISOString() : null
    })
    .eq('id', taskId)
    .select();
    
  if (error) throw error;
  return data;
};

export const updateSubtaskStatus = async (subtaskId, completed) => {
  const { data, error } = await supabase
    .from('subtask_instances')
    .update({ 
      completed,
      completion_date: completed ? new Date().toISOString() : null
    })
    .eq('id', subtaskId)
    .select();
    
  if (error) throw error;
  return data;
};

export const updateSubtaskAmount = async (subtaskId, amount) => {
  const { data, error } = await supabase
    .from('subtask_instances')
    .update({ amount })
    .eq('id', subtaskId)
    .select();
    
  if (error) throw error;
  return data;
};

// Add other CRUD operations as needed