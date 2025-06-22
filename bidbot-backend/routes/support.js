const express = require('express');
const auth = require('../middleware/auth');
const Ticket = require('../models/Ticket');
const FAQ = require('../models/FAQ');
const User = require('../models/User');
const router = express.Router();

router.get('/support/isAdmin', auth, async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    if (user.role === "Admin" || user.role === "Support Team") {
        return res.status(200).json({ isAdmin: true });
    } else {
        return res.status(200).json({ isAdmin: false });
    }

})

router.post('/tickets', auth, async (req, res) => {
    try {
        const { subject, type, description, priority } = req.body;

        // Fetch user details with account reference
        const user = await User.findById(req.user.id);

        if (!user || !user.account) {
            return res.status(400).json({ message: 'User account not found' });
        }

        const userAccount = user.account;

        if (!userAccount) {
            return res.status(400).json({ message: 'User account not found' });
        }

        const ticket = new Ticket({
            subject,
            description,
            type,
            priority,
            user: userAccount
        });

        await ticket.save();
        res.status(201).json({ message: "Support Ticket Created." });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});


// Get all tickets for the authenticated user
router.get('/tickets', auth, async (req, res) => {
    try {
        // Fetch user details with account reference
        const user = await User.findById(req.user.id);

        if (!user || !user.account) {
            return res.status(400).json({ message: 'User account not found' });
        }

        // Find tickets where ticket.user matches user.account
        const tickets = await Ticket.find({ user: user.account }).populate(
            {
                path: "user",
                select: "owner avatar",
                populate: {
                    path: "owner",
                    select: "name email"
                }
            }
        ).sort({ createdAt: -1 }); // Sort by most recent

        res.status(200).json({ tickets });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});


// Get tickets based on query parameter (status)
router.get('/admin/tickets', auth, async (req, res) => {
    try {
        const { status } = req.query; // Get status from query parameters
        const validStatuses = ["active", "resolved", "canceled"];

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Fetch user details with account reference
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(400).json({ message: 'User account not found' });
        }

        if (!(user.role === "Support Team" || user.role === "Admin")) {
            return res.status(401).json({ message: "Not Authenticated for this action" })
        }

        // // Build query object
        // const query = { user: user.account };
        // if (status) {
        //     query.status = status;
        // }

        // Fetch tickets with optional filtering by status
        const tickets = await Ticket.find({ status: status }).populate({
            path: "user",
            select: "owner",
            populate: {
                path: "owner",
                select: "name email avatar"
            }
        }).sort({ createdAt: -1 }) // Sort by most recent;

        res.status(200).json({ tickets });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});


// Add a response to a ticket
router.post('/tickets/:ticketId/response', auth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { response } = req.body;

        const message = response;

        if (!message) {
            return res.status(400).json({ message: "Response message is required" });
        }


        // Fetch user details with account reference
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isAdmin = user.role === 'Admin' || user.role === 'Support Team';

        if (!isAdmin && !user.account) {
            return res.status(400).json({ message: 'User account not found' });
        }


        // Find the ticket
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        // Check if the user is the ticket owner or an admin
        if (!isAdmin && ticket.user.toString() !== user.account.toString()) {
            return res.status(403).json({ message: "Unauthorized to respond to this ticket" });
        }

        // Add response
        const ticketResponse = {
            message,
            isAdmin,
            createdAt: new Date(),
        };

        ticket.responses.push(ticketResponse);
        await ticket.save();

        res.status(201).json({ message: "Response added successfully", response: ticketResponse });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", error });
    }
});


// Update ticket status using query parameters
router.put('/tickets/:ticketId/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const { ticketId } = req.params

        if (!ticketId || !status) {
            return res.status(400).json({ message: "Both ticketId and status are required" });
        }

        // Validate status value
        const validStatuses = ["active", "resolved", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        // Fetch user details with account reference
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isAdmin = user.role === 'Admin' || user.role === 'Support Team';

        if (!isAdmin && !user.account) {
            return res.status(400).json({ message: 'User account not found' });
        }


        // Find the ticket
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        // Check authorization: only admins or the ticket owner can update the status
        if (!isAdmin && ticket.user.toString() !== user.account.toString()) {
            return res.status(403).json({ message: "Unauthorized to update this ticket" });
        }

        // Update status
        ticket.status = status;
        await ticket.save();

        res.status(200).json({ message: "Ticket status updated successfully", ticket });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error });
    }
});

// Function to get month names
const getMonthName = (monthIndex) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[monthIndex - 1]; // monthIndex is 1-based in MongoDB $month
};

// Get ticket analytics
router.get('/tickets/analytics', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isAdmin = user.role === 'Admin' || user.role === 'Support Team';

        if (!isAdmin && !user.account) {
            return res.status(400).json({ message: 'User account not found' });
        }

        let stats = {
            total: 0,
            active: 0,
            resolved: 0,
            cancelled: 0,
        }

        if (isAdmin) {
            stats.total = await Ticket.countDocuments();
            stats.active = await Ticket.countDocuments({ status: 'active' });
            stats.resolved = await Ticket.countDocuments({ status: 'resolved' });
            stats.cancelled = await Ticket.countDocuments({ status: 'cancelled' });
        } else {
            stats.total = await Ticket.countDocuments({ user: user.account });
            stats.active = await Ticket.countDocuments({ user: user.account, status: 'active' });
            stats.resolved = await Ticket.countDocuments({ user: user.account, status: 'resolved' });
            stats.cancelled = await Ticket.countDocuments({ user: user.account, status: 'cancelled' })
        }

        // 3. Fetch two recent active tickets
        const recentActiveTickets = await Ticket.find({ status: 'active' })
            .sort({ createdAt: -1 }) // Sort by most recent
            .limit(2)
            .populate({
                path: "user",
                select: "owner",
                populate: {
                    path: "owner",
                    select: "name email avatar"
                }
            });

        // 4. Fetch two FAQs
        const faqs = await FAQ.find().limit(2);

        // Common response data
        const responseData = {
            stats,
            recentActiveTickets,
            faqs
        };

        // If the user is admin, send additional analytics
        // if (isAdmin) {
        // 5. Tickets resolved and canceled per month for the past 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // Include the current month as well

        const monthlyStatsRaw = await Ticket.aggregate([
            {
                $match: {
                    status: { $in: ["resolved", "cancelled"] },
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    resolved: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "resolved"] }, 1, 0]
                        }
                    },
                    canceled: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Initialize dataset arrays
        const labels = [];
        const resolvedData = [];
        const canceledData = [];

        // Get the last six months including the current month
        const today = new Date();
        const months = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({ month: date.getMonth() + 1, year: date.getFullYear(), label: getMonthName(date.getMonth() + 1) });
        }

        // Fill data with zero if no data found for a month
        months.forEach(({ month, year, label }) => {
            const found = monthlyStatsRaw.find(entry => entry._id.month === month && entry._id.year === year);
            labels.push(label);
            resolvedData.push(found ? found.resolved : 0);
            canceledData.push(found ? found.canceled : 0);
        });

        const monthlyStats = {
            labels,
            datasets: [
                {
                    label: "Resolved",
                    color: "info",
                    data: resolvedData
                },
                {
                    label: "Cancelled",
                    color: "dark",
                    data: canceledData
                }
            ]
        };

        // 6. Count of low, medium, and high-priority tickets
        const priorityCounts = await Ticket.aggregate([
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                }
            }
        ]);

        const priorityData = {
            low: priorityCounts.find(p => p._id === "low")?.count || 0,
            medium: priorityCounts.find(p => p._id === "medium")?.count || 0,
            high: priorityCounts.find(p => p._id === "high")?.count || 0
        };

        responseData.adminAnalytics = {
            monthlyStats,
            priorityCounts: priorityData
        };
        // }

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});


// GET all FAQs
router.get('/faqs', async (req, res) => {
    try {
        const faqs = await FAQ.find();
        res.status(200).json({ faqs });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});

module.exports = router;