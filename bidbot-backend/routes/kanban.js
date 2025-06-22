const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Task = require('../models/Task');
const router = express.Router();


// GET /tasks route
router.get('/tasks', auth, async (req, res) => {
    try {

        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: [ 
                {
                    path: "upworkAccounts",
                    populate: [
                        { path: "appliedJobs", populate: { path: "job", select: "title"} }
                    ]
                },
                {
                    path: "team",
                    select: "name _id" 
                }
            ]
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.pagesAccess.kanban === false){
            return res.status(401).json({ message: 'Not Authorized to View Kanban' });
        }

        let ongoingJobs = [];

        user.account.upworkAccounts.forEach(account => {
            const accountOngoingJobs = account.appliedJobs.filter(job => job.jobStatus === "Ongoing");
            ongoingJobs.push(...accountOngoingJobs);
        });

        
        // Get the name and _id of the team members
        const teamMembers = user.account.team.map(member => ({
            name: member.name,
            _id: member._id
        }));
        
        const found = teamMembers.filter((member) => member._id === user._id);

        if (!found){
            teamMembers.push({name: user.name, _id: user._id})
        }

        // Initialize categories for task statuses
        const tasks = {
            planning: [],
            requirements: [],
            design: [],
            development: [],
            testing: [],
            deployment: [],
            completed: []
        };

        // Fetch all tasks for this account
        const allTasks = await Task.find({ account: user.account }).populate({
            path: "assignedTo",
            select: "_id name"
        });

        // Sort tasks by their status
        allTasks.forEach(task => {
            if (tasks[task.status]) {
                tasks[task.status].push({
                    id: task._id,
                    title: task.title,
                    description: task.description,
                    columnId: task.status,
                    priority: task.priority,
                    dueDate: task.dueDate,
                    job: task.job,
                    assignee: task.assignedTo,
                });
            }
        });

        // Prepare the response data
        const response = {
            tasks,          // All tasks related to the user's account
            ongoingJobs,    // All ongoing jobs (excluding completed)
            teamMembers,    // All team members in the account
        };

        // Send the response
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching tasks and related data' });
    }
});


// Route to create a new task
router.post('/tasks', auth, async (req, res) => {
    try {
        const { title, description, status, priority, job, assignedTo, dueDate } = req.body;

        // Validate incoming data
        if (!title || !status || !priority || !job || !assignedTo) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Fetch user by req.user.id
        const user = await User.findById(req.user.id);

        if (user.pagesAccess.manageKanban === false){
            return res.status(401).json({ message: 'Not Authorized to Manage Kanban' });
        }

        // Create a new task
        const newTask = new Task({
            title,
            description,
            status,
            priority,
            job,
            assignedTo,
            dueDate,
            account: user.account
        });

        // Save the task
        await newTask.save();

        // Return success response
        res.status(201).json({ message: 'Task created successfully', task: newTask });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while creating the task' });
    }
});


// PUT /tasks/:taskId/status route
router.put('/tasks/:taskId/status', auth, async (req, res) => {
    try {
        const { taskId } = req.params; // Get the taskId from the URL params
        const { status } = req.body; // Get the new status from the request body

        // Fetch user by req.user.id
        const user = await User.findById(req.user.id);

        if (user.pagesAccess.manageKanban === false){
            return res.status(401).json({ message: 'Not Authorized to Manage Kanban' });
        }

        // Validate that the status is provided and valid
        const validStatuses = ['planning', 'requirements', 'design', 'development', 'testing', 'deployment', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Find the task by its ID
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Update the task's status
        task.status = status;

        // Save the updated task
        await task.save();

        // Return the updated task as a response
        res.status(200).json({ message: 'Task status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while updating the task status' });
    }
});


// DELETE /tasks/:taskId route
router.delete('/tasks/:taskId', auth, async (req, res) => {
    const { taskId } = req.params; // Get taskId from the URL params

    try {
        // Fetch user by req.user.id
        const user = await User.findById(req.user.id);

        if (user.pagesAccess.manageKanban === false){
            return res.status(401).json({ message: 'Not Authorized to Manage Kanban' });
        }

        // Find the task by its ID and delete it
        const task = await Task.findByIdAndDelete(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Return a success response if the task is deleted
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while deleting the task' });
    }
});


module.exports = router;
