const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();


router.get('/user/role', auth, async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    return res.status(200).json({ role: user.role });
})

router.get("/reports/proposals", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: {
                path: "upworkAccounts",
                populate: [
                    { path: "appliedJobs", populate: { path: "job", select: "_id title type" } },
                    { path: "completedJobs" },
                    { path: "suggestedJobs" }
                ]
            }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        const upworkAccounts = user.account?.upworkAccounts || [];
        let totalProposalsSent = 0;
        let totalProposalsAccepted = 0;
        let totalSuggestedJobs = 0;
        let totalCompletedJobs = 0;
        let totalOngoingJobs = 0;
        let totalNotStartedJobs = 0;
        
        let monthlyStats = Array.from({ length: 6 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            return {
                month: date.toLocaleString('default', { month: 'long' }),
                sent: 0,
                accepted: 0
            };
        }).reverse();
        
        let recentlyAppliedJobs = [];
        
        upworkAccounts.forEach(account => {
            const appliedJobs = account.appliedJobs || [];
            const completedJobs = account.completedJobs || [];
            const suggestedJobs = account.suggestedJobs || [];
            
            totalProposalsSent += appliedJobs.length + completedJobs.length;
            totalProposalsAccepted += appliedJobs.filter(job => job.jobStatus === "Ongoing").length + completedJobs.length;
            totalSuggestedJobs += suggestedJobs.length;
            totalCompletedJobs += completedJobs.length;
            totalOngoingJobs += appliedJobs.filter(job => job.jobStatus === "Ongoing").length;
            totalNotStartedJobs += appliedJobs.filter(job => job.jobStatus === "Not Started").length;
            
            [...appliedJobs, ...completedJobs].forEach(job => {
                const appliedDate = new Date(job.appliedOn);
                const monthYear = appliedDate.toLocaleString('default', { month: 'long' });
                const monthIndex = monthlyStats.findIndex(m => m.month === monthYear);
                if (monthIndex !== -1) {
                    monthlyStats[monthIndex].sent++;
                    if (job.jobStatus === "Ongoing" || completedJobs.includes(job)) {
                        monthlyStats[monthIndex].accepted++;
                    }
                }
            });

            recentlyAppliedJobs.push(...appliedJobs);
        });

        recentlyAppliedJobs.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));
        recentlyAppliedJobs = recentlyAppliedJobs.slice(0, 5);

        return res.status(200).json({
            totalProposalsSent,
            totalProposalsAccepted,
            totalSuggestedJobs,
            jobStatusStats: {
                totalCompletedJobs,
                totalOngoingJobs,
                totalNotStartedJobs
            },
            monthlyHistory: {
                labels: monthlyStats.map(m => m.month),
                sent: monthlyStats.map(m => m.sent),
                accepted: monthlyStats.map(m => m.accepted)
            },
            recentlyAppliedJobs
        });
    } catch (error) {
        console.error("Error fetching proposal reports:", error);
        return res.status(500).json({ message: "Server error", error });
    }
});

router.get('/reports/team', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: [
                {
                    path: "upworkAccounts",
                    populate: [
                        { path: "appliedJobs", populate: { path: "job", select: "_id title type createdAt status" } },
                        { path: "completedJobs", populate: { path: "job", select: "_id title type createdAt" } },
                        { path: "suggestedJobs", populate: { path: "job", select: "_id title type" } }
                    ]
                },
                {
                    path: "team",
                    select: "name email avatar companyRole gender"
                }
            ]
        });

        if (!user || !user.account) {
            return res.status(404).json({ message: "User or account not found" });
        }

        const { team, upworkAccounts } = user.account;
        let totalCompletedJobs = 0;
        let totalAppliedJobs = 0;
        let totalOngoingJobs = 0;
        let totalNotStartedJobs = 0;
        let totalSuggestedJobs = 0;

        const jobsPerMonth = new Array(6).fill(0); // Last 6 months
        const labels = [];

        // Generate month labels (last 6 months)
        for (let i = 5; i >= 0; i--) {
            const month = new Date();
            month.setMonth(month.getMonth() - i);
            labels.push(month.toLocaleString("default", { month: "long" }));
        }

        upworkAccounts.forEach((account) => {
            // Count completed jobs
            account.completedJobs.forEach((job) => {
                const jobDate = new Date(job.completionDate);
                const monthIndex = 5 - (new Date().getMonth() - jobDate.getMonth());
                if (monthIndex >= 0 && monthIndex < 6) {
                    jobsPerMonth[monthIndex]++;
                }
                totalCompletedJobs++;
            });

            // Count applied jobs
            account.appliedJobs.forEach((appliedJob) => {
                totalAppliedJobs++;
                if (appliedJob.jobStatus === "Ongoing") {
                    totalOngoingJobs++;
                } else if (appliedJob.jobStatus === "Not Started") {
                    totalNotStartedJobs++;
                }
            });

            // Count suggested jobs
            totalSuggestedJobs += account.suggestedJobs.length;
        });

        const response = {
            totalTeamMembers: team.length,
            totalCompletedJobs,
            totalAppliedJobs,
            totalOngoingJobs,
            totalNotStartedJobs,
            totalSuggestedJobs,
            jobsCompletedGraph: {
                labels,
                data: jobsPerMonth
            },
            teamMembers: team
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

router.get('/reports/earnings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: {
                path: "upworkAccounts",
                populate: [
                    { 
                        path: "completedJobs", 
                        populate: { path: "job", select: "_id title type" }
                    },
                    {
                        path: "appliedJobs",
                        
                    }
                ]
            }
        });

        if (!user || !user.account) {
            return res.status(404).json({ message: "User or account not found" });
        }

        const { upworkAccounts } = user.account;
        let totalAnnualEarnings = 0;
        let monthlyEarnings = new Array(12).fill(0);
        let pastSixMonthsEarnings = { labels: [], fixedEarning: [], hourlyEarning: [] };
        let totalEarningsByType = { fixed: 0, hourly: 0 };
        let topEarningJobs = [];
        let highestEarningMonth = 0;
        let activeOrderAmount = 0;
        
        const now = new Date();
        const currentYear = now.getFullYear();
        
        // Get last 6 months' labels
        for (let i = 5; i >= 0; i--) {
            const month = new Date();
            month.setMonth(month.getMonth() - i);
            pastSixMonthsEarnings.labels.push(month.toLocaleString("default", { month: "long" }));
        }
        
        upworkAccounts.forEach((account) => {
            account.appliedJobs.forEach((appliedJob) => {
                if (appliedJob.jobStatus === "Ongoing") {
                    const jobEarnings = appliedJob.bidPrice ? appliedJob.bidPrice : appliedJob.hourlyPrice;
                    activeOrderAmount += jobEarnings;
                }
            });

            account.completedJobs.forEach((job) => {
                const jobDate = new Date(job.completionDate);
                const monthIndex = jobDate.getMonth();
                const jobEarnings = job.bidPrice ? job.bidPrice : job.hourlyPrice;
                
                if (jobDate.getFullYear() === currentYear) {
                    totalAnnualEarnings += jobEarnings;
                    monthlyEarnings[monthIndex] += jobEarnings;
                }
                
                // Track highest earning month
                if (monthlyEarnings[monthIndex] > highestEarningMonth) {
                    highestEarningMonth = monthlyEarnings[monthIndex];
                }
                
                // Track earnings by type
                if (job.bidPrice) {
                    totalEarningsByType.fixed += job.bidPrice;
                } else if (job.hourlyPrice) {
                    totalEarningsByType.hourly += job.hourlyPrice;
                }
                
                // Store top earning jobs
                topEarningJobs.push({
                    id: job.job._id,
                    title: job.job.title,
                    earnings: jobEarnings,
                    type: job.job.type,
                    jobStatus: "Completed"
                });
            });
        });
        
        // Sort top earning jobs and get the top 5
        topEarningJobs = topEarningJobs.sort((a, b) => b.earnings - a.earnings).slice(0, 5);
        
        // Get last 6 months' earnings breakdown
        for (let i = 5; i >= 0; i--) {
            const month = new Date();
            month.setMonth(month.getMonth() - i);
            const monthIndex = month.getMonth();
            pastSixMonthsEarnings.fixedEarning.push(totalEarningsByType.fixed ? monthlyEarnings[monthIndex] : 0);
            pastSixMonthsEarnings.hourlyEarning.push(totalEarningsByType.hourly ? monthlyEarnings[monthIndex] : 0);
        }
        
        const response = {
            totalAnnualEarnings,
            averageMonthlyEarnings: totalAnnualEarnings / 12,
            highestEarningMonthAmount: highestEarningMonth,
            activeOrderAmount,
            pastSixMonthsEarnings,
            totalEarningsByJobType: totalEarningsByType,
            topEarningJobs
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});


router.get('/reports/general', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: [
                {
                    path: "upworkAccounts",
                    populate: [
                        { path: "appliedJobs", populate: { path: "job", select: "_id title type jobStatus budget" } },
                        { path: "completedJobs", select: "budget completedAt type" },
                        { path: "suggestedJobs", select: "_id" }
                    ]
                }
            ]
        });

        if (!user || !user.account) {
            return res.status(404).json({ message: "User or Account not found" });
        }

        const upworkAccounts = user.account.upworkAccounts;
        const appliedJobs = upworkAccounts.flatMap(acc => acc.appliedJobs);
        const completedJobs = upworkAccounts.flatMap(acc => acc.completedJobs);
        const suggestedJobs = upworkAccounts.flatMap(acc => acc.suggestedJobs);


        // Get past 6 months labels
        const currentDate = new Date();
        const monthLabels = [];
        const earningsByMonth = {};
        
        for (let i = 5; i >= 0; i--) {
            const month = new Date();
            month.setMonth(currentDate.getMonth() - i);
            const monthName = month.toLocaleString("default", { month: "short" });
            monthLabels.push(monthName);
            earningsByMonth[monthName] = 0; // Initialize with zero
        }

        // Process completed jobs earnings
        completedJobs.forEach(job => {
            const jobDate = new Date(job.completionDate);
            const month = jobDate.toLocaleString("default", { month: "short" });

            if (earningsByMonth.hasOwnProperty(month)) {
                earningsByMonth[month] += job.bidPrice ? job.bidPrice : hourlyPrice;
            }
        });

        const monthData = Object.values(earningsByMonth);

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

        res.status(200).json({
            monthlyEarnings: {
                labels: monthLabels,
                data: monthData
            },
            proposalStatus,
            projectStatus
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});



module.exports = router;