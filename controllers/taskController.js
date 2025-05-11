const Task = require('../models/Task');
const GamificationService = require('../services/gamificationService');
const SocketService = require('../services/socketService'); // Thêm dòng này

const createTask = async (req, res, next) => {
    console.log('\n--- [taskController] Running createTask ---');
    console.log('[taskController] Request Body:', req.body);
    console.log('[taskController] User:', req.user);  

    const { title, description, deadline, xpReward } = req.body;
    const ownerId = req.user.id; 

    try {
        if (!title) {
            return res.status(400).json({ message: 'Task title is required.' });
        }

        const newTask = new Task({
            owner: ownerId,
            title,
            description,
            deadline,  
            xpReward,  
        });

        await newTask.save();
        console.log('[taskController] Task created:', newTask._id);
        res.status(201).json(newTask);

    } catch (error) {
        console.error('[taskController] Error creating task:', error);
        next(error);  
    }
};

const getUserTasks = async (req, res, next) => {
    console.log('\n--- [taskController] Running getUserTasks ---');
    console.log('[taskController] User:', req.user);
    const ownerId = req.user.id;
    const { completed } = req.query;  

    try {
         const query = { owner: ownerId };
         if (completed !== undefined) {
             query.completed = completed === 'true';  
         }
         const tasks = await Task.find(query).sort({ createdAt: -1 });  
         res.status(200).json(tasks);
    } catch (error) {
         console.error('[taskController] Error fetching tasks:', error);
         next(error);
    }
};

const getTaskById = async (req, res, next) => {
    console.log('\n--- [taskController] Running getTaskById ---');
    console.log('[taskController] Task ID:', req.params.id);
    console.log('[taskController] User:', req.user);
     const taskId = req.params.id;
     const ownerId = req.user.id;

     try {
         const task = await Task.findOne({ _id: taskId, owner: ownerId });  
         if (!task) {
             return res.status(404).json({ message: 'Task not found or you do not have permission.' });
         }
         res.status(200).json(task);
     } catch (error) {
       
        if (error.name === 'CastError') { 
             return res.status(400).json({ message: 'Invalid Task ID format.' });
        }
         console.error('[taskController] Error fetching task by ID:', error);
         next(error);
     }
};

const updateTask = async (req, res, next) => {
    console.log('\n--- [taskController] Running updateTask ---');
    console.log('[taskController] Task ID:', req.params.id);
    console.log('[taskController] Request Body:', req.body);
    console.log('[taskController] User:', req.user);
    const taskId = req.params.id;
    const ownerId = req.user.id;
    const { title, description, deadline } = req.body;  

   
     if (req.body.completed !== undefined || req.body.xpReward !== undefined || req.body.owner !== undefined) {
        return res.status(400).json({ message: 'Cannot update completed status, XP reward, or owner via this endpoint.' });
     }

     try {
        const task = await Task.findOne({ _id: taskId, owner: ownerId });
        if (!task) {
            return res.status(404).json({ message: 'Task not found or you do not have permission.' });
        }
        if (task.completed) {
            return res.status(400).json({ message: 'Cannot update a completed task.' });
        }

     
        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (deadline !== undefined) task.deadline = deadline;  

        await task.save();
        res.status(200).json(task);

     } catch (error) {
         if (error.name === 'CastError') { 
             return res.status(400).json({ message: 'Invalid Task ID format.' });
         }
        console.error('[taskController] Error updating task:', error);
        next(error);
     }
};

const deleteTask = async (req, res, next) => {
    console.log('\n--- [taskController] Running deleteTask ---');
    console.log('[taskController] Task ID:', req.params.id);
    console.log('[taskController] User:', req.user);
    const taskId = req.params.id;
    const ownerId = req.user.id;

    try {
        const task = await Task.findOne({ _id: taskId, owner: ownerId });
        if (!task) {
            return res.status(404).json({ message: 'Task not found or you do not have permission.' });
        }
        if (task.completed) {
            return res.status(400).json({ message: 'Cannot delete a completed task.' });
        }

        await Task.deleteOne({ _id: taskId, owner: ownerId });  
        res.status(200).json({ message: 'Task deleted successfully.' });  

    } catch (error) {
        if (error.name === 'CastError') { 
            return res.status(400).json({ message: 'Invalid Task ID format.' });
        }
        console.error('[taskController] Error deleting task:', error);
        next(error);
    }
};

const completeTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const ownerId = req.user.id;

    const task = await Task.findOne({ _id: taskId, owner: ownerId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or you do not have permission.' });
    }
    if (task.completed) {
      return res.status(400).json({ message: 'Task is already completed.' });
    }

    const io = req.app.get("io");

    // Đánh dấu task là hoàn thành
    task.completed = true;
    task.completedAt = new Date();
    await task.save();

    // Cộng XP cho người dùng
    const xpGained = task.xpReward || 10;
    const tokenGained = Math.ceil(xpGained * 0.2); // Tính token dựa trên XP (20%)
    const { user, leveledUp } = await GamificationService.awardXp(ownerId, xpGained, io);

    // Cộng token cho người dùng
    await GamificationService.awardTokens(ownerId, tokenGained);

    // Đếm số nhiệm vụ đã hoàn thành của user
    const completedTaskCount = await Task.countDocuments({
      owner: ownerId,
      completed: true
    });

    // Bây giờ sử dụng completedTaskCount
    const newBadges = await GamificationService.checkAndAwardBadges(ownerId, {
      tasksCompleted: completedTaskCount,
      level: user.level
    }, io);

    if (io) {
      SocketService.notifyTaskUpdate(io, ownerId, task);
      SocketService.notifyTokensAdded(io, ownerId, tokenGained);
    }

    // Trả về kết quả
    res.status(200).json({
      task,
      xpGained,
      tokenGained,
      leveledUp,
      newBadges
    });
  } catch (error) {
    console.error('[taskController] Error completing task:', error);
    next(error);
  }
};



module.exports = {
  createTask,
  getUserTasks,
  getTaskById,
  updateTask,
  deleteTask,
  completeTask,
};