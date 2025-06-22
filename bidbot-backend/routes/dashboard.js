const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const Ticket = require('../models/Ticket');



router.get("/dashboard", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: {
                path: "upworkAccounts",
                populate: [
                    { path: "appliedJobs", populate: { path: "job" } },
                    { path: "completedJobs", populate: { path: "job" } },
                    { path: "suggestedJobs", populate: { path: "job" } },
                    {
                        path: 'connects', // Populate the upworkAccounts inside account
                        select: 'connects', // Select fields from upworkAccounts
                    },
                ]
            }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        const upworkAccounts = user.account?.upworkAccounts || [];
        let ongoingJobs = [];
        let totalFixedAmount = 0;
        let hourlyRates = [];
        let ongoingJobCounts = { fixed: 0, hourly: 0 };
        let totalCompletedJobs = 0;
        let monthlyStats = Array.from({ length: 8 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            return { month: date.toLocaleString('default', { month: 'short' }), jobsCompleted: 0, totalFixedPrice: 0 };
        }).reverse();

        let totalEarnings = 0;

        upworkAccounts.forEach(account => {
            // Process ongoing jobs
            const accountOngoingJobs = account.appliedJobs.filter(job => job.jobStatus === "Ongoing");
            ongoingJobs.push(...accountOngoingJobs);

            // Process ongoing jobs
            const completedJobs = account.completedJobs;
            completedJobs.forEach(job => {
                if (job.bidPrice) {
                    totalEarnings += Number(job.bidPrice);
                } else if (job.hourlyPrice) {
                    totalEarnings += Number(job.hourlyPrice * 120);
                }
            });

            accountOngoingJobs.forEach(job => {
                if (job.bidPrice) {
                    totalFixedAmount += Number(job.bidPrice);
                    ongoingJobCounts.fixed++;
                } else if (job.hourlyPrice) {
                    hourlyRates.push(Number(job.hourlyPrice));
                    ongoingJobCounts.hourly++;
                }
            });

            // Process completed jobs
            totalCompletedJobs += account.completedJobs.length;
            account.completedJobs.forEach(job => {
                const completionDate = new Date(job.completionDate);
                const monthYear = completionDate.toLocaleString('default', { month: 'short' });
                const monthIndex = monthlyStats.findIndex(m => m.month === monthYear);
                if (monthIndex !== -1) {
                    monthlyStats[monthIndex].jobsCompleted++;
                    if (job.bidPrice) monthlyStats[monthIndex].totalFixedPrice += Number(job.bidPrice);
                }
            });
        });

        const avgHourlyPrice = Number(hourlyRates.length ? (hourlyRates.reduce((a, b) => Number(a) + Number(b), 0) / hourlyRates.length).toFixed(2) : 0);

        const totalConnects = user.account?.upworkAccounts.reduce(
            (sum, account) => sum + (account.connects.connects || 0),
            0
        ) || 0;

        const monthlyStatsResult = {
            labels: monthlyStats.map(m => m.month),
            totalEarningsData: monthlyStats.map(m => m.totalFixedPrice),
            totalJobsData: monthlyStats.map(m => m.jobsCompleted)
        };


        const appliedJobs = upworkAccounts.flatMap(acc => acc.appliedJobs);
        const completedJobs = upworkAccounts.flatMap(acc => acc.completedJobs);
        const suggestedJobs = upworkAccounts.flatMap(acc => acc.suggestedJobs);

        // Proposal Status
        const proposalStatus = {
            accepted: completedJobs.length + appliedJobs.filter(job => job.jobStatus === "Ongoing").length,
            waiting: appliedJobs.filter(job => job.jobStatus === "Not Started").length
        };

        // Project Status
        const projectStatus = {
            suggested: suggestedJobs.length,
            notStarted: appliedJobs.filter(job => job.jobStatus === "Not Started").length,
            ongoing: appliedJobs.filter(job => job.jobStatus === "Ongoing").length,
            completed: completedJobs.length
        };

        let stats = {
            active: 0,
            resolved: 0,
            cancelled: 0,
        }
        stats.active = await Ticket.countDocuments({ user: user.account, status: 'active' });
        stats.resolved = await Ticket.countDocuments({ user: user.account, status: 'resolved' });
        stats.cancelled = await Ticket.countDocuments({ user: user.account, status: 'cancelled' })

        return res.status(200).json({
            totalOngoingJobs: ongoingJobs.length,
            totalFixedAmount,
            avgHourlyPrice,
            totalCompletedJobs,
            monthlyHistory: monthlyStatsResult,
            ongoingJobCounts,
            ongoingJobs,
            totalEarnings,
            totalConnects,
            proposalStatus,
            projectStatus,
            stats
        });
    } catch (error) {
        console.error("Error fetching job analytics:", error);
        return res.status(500).json({ message: "Server error", error });
    }
});



router.get('/admin/statistics', auth, async (req, res) => {
    try {
        // Fetch all users
        const users = await User.find().populate('account'); // Populate the account field

        // Total number of users
        const totalUsers = users.length;

        // Total number of linked Upwork accounts (sum of all upworkAccounts arrays across users)
        const totalLinkedAccounts = users.reduce((sum, user) => {
            return sum + (user.account?.upworkAccounts?.length || 0); // Safely check for upworkAccounts
        }, 0);

        const ticketsStats = {
            total: 0,
            active: 0,
            resolved: 0,
            cancelled: 0,
        }

        ticketsStats.total = await Ticket.countDocuments();
        ticketsStats.active = await Ticket.countDocuments({ status: 'active' });
        ticketsStats.resolved = await Ticket.countDocuments({ status: 'resolved' });
        ticketsStats.cancelled = await Ticket.countDocuments({ status: 'cancelled' });

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
            }
            );

        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 5); // Get date six months ago

        // Aggregate users by month
        const usersByMonth = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo } // Users created in the last 6 months
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // Group by Year-Month
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 } // Sort by month
            }
        ]);

        // Generate labels and data for the last 6 months
        const labels = [];
        const data = [];

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date();
            monthDate.setMonth(now.getMonth() - i);

            const monthLabel = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`; // Format: "Jan 2024"
            labels.push(monthLabel);

            // Find matching month count, otherwise push 0
            const found = usersByMonth.find((entry) => {
                const entryDate = new Date(entry._id + "-01"); // Convert YYYY-MM to Date
                return entryDate.getMonth() === monthDate.getMonth() && entryDate.getFullYear() === monthDate.getFullYear();
            });

            data.push(found ? found.count : 0);
        }

        // Create the response
        const stats = {
            totalUsers,
            totalLinkedAccounts,
            usersData: {
                labels,
                data
            },
            recentActiveTickets,
            ticketsStats
        };



        // Return the statistics
        res.status(200).json({ message: 'Statistics retrieved successfully', stats });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: 'An error occurred while retrieving statistics' });
    }
});

module.exports = router;
