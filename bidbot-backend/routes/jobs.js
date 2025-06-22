const express = require("express");
const UpworkAccount = require("../models/UpworkAccount");
const Job = require("../models/Job");
const auth = require("../middleware/auth");
const User = require("../models/User");
const router = express.Router();
const axios = require('axios');

router.get("/jobs/suggested", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'account',
            populate: {
                path: 'upworkAccounts',
                populate: {
                    path: 'suggestedJobs',
                    populate: {
                        path: 'job',
                    },
                },
            },
        });

        // Check if the user exists
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userAccount = user.account;
        if (!userAccount) {
            return res.status(404).json({ message: "User account not found" });
        }

        const upworkAccounts = userAccount.upworkAccounts;
        if (!upworkAccounts || upworkAccounts.length === 0) {
            return res.status(404).json({ message: 'No Upwork accounts found' });
        }

        // Collect suggested jobs from all Upwork accounts
        const allSuggestedJobs = upworkAccounts.flatMap(account => account.suggestedJobs);

        return res.status(200).json({ 
            message: 'Suggested jobs retrieved successfully', 
            jobs: allSuggestedJobs 
        });

    } catch (error) {
        console.error('Error getting jobs:', error);
        return res.status(500).json({ message: 'An error occurred while retrieving the jobs' });
    }
});

router.get("/jobs/applied", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'account',
            populate: {
                path: 'upworkAccounts',
                populate: {
                    path: 'appliedJobs',
                    populate: {
                        path: 'job',
                    },
                },
            },
        });

        // Check if the user exists
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userAccount = user.account;
        if (!userAccount) {
            return res.status(404).json({ message: "User account not found" });
        }

        const upworkAccounts = userAccount.upworkAccounts;
        if (!upworkAccounts || upworkAccounts.length === 0) {
            return res.status(404).json({ message: 'No Upwork accounts found' });
        }

        // Collect suggested jobs from all Upwork accounts
        const allAppliedJobs = upworkAccounts.flatMap(account => account.appliedJobs);

        return res.status(200).json({ 
            message: 'Applied jobs retrieved successfully', 
            jobs: allAppliedJobs 
        });

    } catch (error) {
        console.error('Error getting jobs:', error);
        return res.status(500).json({ message: 'An error occurred while retrieving the jobs' });
    }
});

router.get("/jobs/:jobId", auth, async (req, res) => {
    try {
        const { jobId } = req.params;

        // Find the job in the Job model
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Find the user and populate all Upwork accounts and their jobs
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: {
                path: "upworkAccounts",
                populate: [
                    { path: "suggestedJobs", populate: { path: "job" } },
                    { path: "appliedJobs", populate: { path: "job" } },
                ],
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userAccount = user.account;
        if (!userAccount) {
            return res.status(404).json({ message: "User account not found" });
        }

        const upworkAccounts = userAccount.upworkAccounts;
        if (!upworkAccounts || upworkAccounts.length === 0) {
            return res.status(404).json({ message: "No Upwork accounts found" });
        }

        // Check if the job exists in either suggestedJobs or appliedJobs
        let suggestedJobDetails = null;
        let appliedJobDetails = null;

        for (const account of upworkAccounts) {
            // Check in suggestedJobs
            const suggestedJob = account.suggestedJobs.find(
                (sj) => sj.job && sj.job._id.toString() === jobId
            );
            if (suggestedJob) {
                suggestedJobDetails = suggestedJob;
            }

            // Check in appliedJobs
            const appliedJob = account.appliedJobs.find(
                (aj) => aj.job && aj.job._id.toString() === jobId
            );
            if (appliedJob) {
                appliedJobDetails = appliedJob;
            }

            // Stop searching if both are found
            if (suggestedJobDetails && appliedJobDetails) break;
        }

        return res.status(200).json({
            message: "Job details retrieved successfully",
            job: job,
            suggested: !!suggestedJobDetails, // True if found in suggestedJobs
            applied: !!appliedJobDetails, // True if found in appliedJobs
            suggestedJob: suggestedJobDetails || null,
            appliedJob: appliedJobDetails || null,
        });

    } catch (error) {
        console.error("Error getting job details:", error);
        return res.status(500).json({ message: "An error occurred while retrieving the job details" });
    }
});


router.post("/add-jobs", async (req, res) => {
    const { accountId, data } = req.body;

    if (!accountId || !Array.isArray(data)) {
        return res.status(400).json({ message: "Invalid input. Provide accountId and array of jobs." });
    }

    try {
        const upworkAccount = await UpworkAccount.findById(accountId);
        if (!upworkAccount) {
            return res.status(404).json({ message: "Upwork account not found." });
        }

        // Extract or create jobs synchronously
        const jobIds = [];
        for (const jobData of data) {
            const upworkIdMatch = jobData.url.match(/~(.*?)\/\?/);
            if (!upworkIdMatch) {
                return res.status(400).json({ message: `Invalid URL format in job: ${jobData.url}` });
            }

            const upworkId = upworkIdMatch[1];
            let job = await Job.findOne({ upwork_id: upworkId });

            if (!job) {
                job = await Job.create({
                    budget: jobData.budget,
                    country: jobData.country,
                    description: jobData.description,
                    items: jobData.items,
                    payment_status: jobData.payment_status,
                    postedOn: jobData.postedOn,
                    proposals: jobData.proposals,
                    rating: jobData.rating,
                    spendings: jobData.spendingsFloat,
                    maxHourlyPrice: jobData.maxHourlyPrice,
                    minHourlyPrice: jobData.minHourlyPrice,
                    title: jobData.title,
                    type: jobData.type,
                    url: jobData.url,
                    upwork_id: upworkId,
                });

                jobIds.push(job._id);
            }

        }

        // Respond immediately
        res.status(200).json({ message: "Jobs added successfully. Processing filtering in background." });

        // **Process filtering and notifications asynchronously**
        setImmediate(() => processJobs(jobIds, upworkAccount));

    } catch (error) {
        console.log("Server Error: ", error);
        res.status(500).json({ message: "Server error.", error });
    }
});


router.post("/job/apply/:jobId", auth, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { proposal, bidamount, hourlyPrice, duration } = req.body;

        if ( !(bidamount || hourlyPrice) || !proposal) {
            return res.status(400).json({ message: "Missing required job details" });
        }

        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: {
                path: "upworkAccounts",
                populate: {
                    path: "suggestedJobs",
                    populate: { path: "job" },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userAccount = user.account;
        if (!userAccount) {
            return res.status(404).json({ message: "User account not found" });
        }

        const upworkAccounts = userAccount.upworkAccounts;
        if (!upworkAccounts || upworkAccounts.length === 0) {
            return res.status(404).json({ message: "No Upwork accounts found" });
        }

        let targetJob = null;
        let targetAccount = null;

        for (const account of upworkAccounts) {
            const jobEntry = account.suggestedJobs.find(sj => sj.job && sj.job._id.toString() === jobId);
            if (jobEntry) {
                targetJob = jobEntry;
                targetAccount = account;
                break;
            }
        }

        if (!targetJob) {
            return res.status(404).json({ message: "Job not found in suggested jobs" });
        }

        const { url, type } = targetJob.job;

        if (!url || !type) {
            return res.status(400).json({ message: "Missing required job details" });
        }

        // console.log({
        //     user_id: targetAccount._id,
        //     url: url,
        //     jobType: type.toLowerCase(),
        //     bidamount: bidamount,
        //     proposal: proposal,
        // });

        // Send request to Flask API
        const flaskResponse = await axios.post(`${process.env.PYTHON_APP_URL}/apply-job`, {
            user_id: targetAccount._id,
            url: url,
            jobType: type.toLowerCase(),
            bidamount: bidamount,
            proposal: proposal,
            hourlyrate: hourlyPrice,
            duration: duration
        });

        // console.log(flaskResponse)

        if (flaskResponse.data.result !== "success") {
            return res.status(500).json({ message: flaskResponse.data.message });
        }

        // Remove from suggestedJobs and add to appliedJobs
        targetAccount.suggestedJobs = targetAccount.suggestedJobs.filter(sj => sj.job._id.toString() !== jobId);
        
        const appliedJob = {
            job: targetJob.job._id,
            proposalGenerated: proposal,
            bidPrice: bidamount,
            hourlyPrice,
            jobType: type,
            jobDuration: duration
        }

        targetAccount.appliedJobs.push(appliedJob);

        await targetAccount.save();

        return res.status(200).json({ message: "Job applied successfully", jobId });

    } catch (error) {
        console.error("Error applying for job:", error);
        return res.status(500).json({ message: error?.response?.data?.message || "Error Applying Job" });
    }
});

// **Background processing function**
async function processJobs(jobIds, upworkAccount) {
    try {
        const filters = upworkAccount.configuration.job;
        const costAndTimeFilters = upworkAccount.configuration.costAndTime;
        const proposalFilters = upworkAccount.configuration.proposal;

        let notification;

        for (const jobId of jobIds) {
            const job = await Job.findById(jobId);
            if (!job) continue;

            // Apply filtering
            if (job.budget != null && job.budget < filters.minimumFixedPrice) continue;
            if (job.minHourlyPrice != null && job.minHourlyPrice < filters.minimumHourlyPrice) continue;
            if (filters.jobType == "hourly" && job.type == "fixed") continue;
            if (filters.jobType == "fixed" && job.type == "hourly") continue;
            if (job.proposals != null && job.proposals > filters.maxProposalsSubmitted) continue;
            if (filters.excludedCountries.includes(job.country)) continue;
            if (job.rating < filters.minimumClientRating) continue;
            if (job.spendings < filters.clientMinimumSpentUSD) continue;
            if (filters.onlyPaymentVerified && job.payment_status.includes("unverified")) continue;

            let proposalGenerated = "";
            
            try {
                const requestBody = {
                    job_description: job.description, // Assuming `proposal` holds the job description
                    additional_context: "", // Add context if needed
                    tone: "Professional",
                    max_length: 500,
                    model: "default-model", // Replace with actual model name if required
                    previous_proposals: [],
                    associated_files: [],
                    job_tags: job?.items || [],
                    job_type: job?.type || "", // Adjust based on the job type
                    user_previous_projects: []
                };

                console.log("Request Data: ", requestBody);
        
                const response = await axios.post(`${process.env.MODEL_APP_URL}/api/generateProposal`, requestBody);
        
                // Assuming response contains { proposal, status, model_used }
                proposalGenerated = response.data.proposal;

                console.log(proposalGenerated);
            } catch (error) {
                console.error("Error generating proposal:", error);
            } 
            

            // const proposalGenerated = `
            // Hi [Client's Name],

            // I came across your job posting and would love to help you with [mention the project briefly, e.g., building a responsive website, fixing bugs, or developing a custom web application]. With [X] years of experience in Web Development, I have successfully built and optimized numerous websites and web applications that are fast, secure, and scalable.

            // 🔹 My Expertise Includes:
            // ✔️ Frontend: React.js, Vue.js, HTML, CSS, JavaScript
            // ✔️ Backend: Node.js, Express.js, Django, PHP
            // ✔️ Databases: MongoDB, MySQL, Firebase
            // ✔️ WordPress, Shopify, and Custom CMS Solutions
            // ✔️ API Integrations & Payment Gateways
            // ✔️ Performance Optimization & SEO

            // 🚀 Why Choose Me?

            // 100% client satisfaction with on-time delivery
            // Clean, maintainable code with best industry practices
            // Ongoing support even after project completion
            // I would love to discuss your project in detail and see how I can bring your vision to life. Let’s hop on a quick call or chat to get started. Looking forward to working with you!

            // Best regards,
            // `

            let estimatedCost = 200;
            let estimatedTime = "lessThan1Month";

            if (costAndTimeFilters.timeEstimationStrategy == "JobEstimatedTime"){
                if (job.budget != null){
                    
                }

            }else if (costAndTimeFilters.timeEstimationStrategy == "Custom"){

            }else{
                // Send Request to Gen Model for Price Calc Module Break Down
            }

            if (costAndTimeFilters.costEstimationStrategy == "HourBased"){
                if (job.budget != null){
                    
                }

            }else if (costAndTimeFilters.costEstimationStrategy == "clientBudget"){
                if (job.budget != null){
                    estimatedCost = job.budget;
                }else if (job.maxHourlyPrice != null){
                    estimatedCost = job.maxHourlyPrice * 120;
                }
            }else if (costAndTimeFilters.costEstimationStrategy == "Custom"){
                if (job.budget != null){
                    estimatedCost = job.budget;
                }else if (job.maxHourlyPrice != null){
                    estimatedCost = job.maxHourlyPrice * 120;
                }
            }else{
                // Send Request to Gen Model for Price Calc Prev Projects Based
            }

            // Add to suggestedJobs
            const suggestedJob = {
                job: job._id,
                proposalGenerated: proposalGenerated,
                proposalStatus: "Pending",
                jobApplicationStatus: "Suggested",
                bidPrice: job.type == "fixed" ? estimatedCost : null,
                hourlyPrice: job.type == "hourly" ? estimatedCost : null,
                jobType: job.type,
                jobDuration: estimatedTime,
            };

            // Create a notification
            notification = {
                title: `New Job Matched Your Profile! Check it Out`,
                icon: "work",
                redirect_url: `/jobs/${job.upwork_id}/details`,
            };

            if (notification) {
                upworkAccount.notifications.push(notification);
            }

            // Update UpworkAccount
            upworkAccount.suggestedJobs.push(suggestedJob);

            await upworkAccount.save();
        }

        console.log("Job filtering completed successfully.");
    } catch (error) {
        console.log("Error in background processing:", error);
    }
}

router.post("/ignore/job/:jobId", auth, async (req, res) => {
    try {
        const { jobId } = req.params;

        // Find the user and populate Upwork accounts
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: {
                path: "upworkAccounts",
            },
        });

        if (!user || !user.account || !user.account.upworkAccounts.length) {
            return res.status(404).json({ message: "No Upwork accounts found" });
        }

        let jobRemoved = false;

        for (const account of user.account.upworkAccounts) {
            const initialLength = account.suggestedJobs.length;
            account.suggestedJobs = account.suggestedJobs.filter(job => job.job.toString() !== jobId);

            if (initialLength !== account.suggestedJobs.length) {
                await account.save();
                jobRemoved = true;
            }
        }

        if (!jobRemoved) {
            return res.status(404).json({ message: "Job not found in suggested jobs" });
        }

        res.status(200).json({ message: "Job successfully ignored" });

    } catch (error) {
        console.error("Error ignoring job:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/mark/job/spam/:jobId", auth, async (req, res) => {
    try {
        const { jobId } = req.params;

        // Find the user and populate Upwork accounts
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: {
                path: "upworkAccounts",
            },
        });

        if (!user || !user.account || !user.account.upworkAccounts.length) {
            return res.status(404).json({ message: "No Upwork accounts found" });
        }

        let jobMarkedAsSpam = false;

        for (const account of user.account.upworkAccounts) {
            const initialLength = account.suggestedJobs.length;
            account.suggestedJobs = account.suggestedJobs.filter(job => job.job.toString() !== jobId);

            if (initialLength !== account.suggestedJobs.length) {
                if (!account.spamJobs) {
                    account.spamJobs = [];
                }

                account.spamJobs.push(jobId);
                await account.save();
                jobMarkedAsSpam = true;
            }
        }

        if (!jobMarkedAsSpam) {
            return res.status(404).json({ message: "Job not found in suggested jobs" });
        }

        res.status(200).json({ message: "Job successfully marked as spam" });

    } catch (error) {
        console.error("Error marking job as spam:", error);
        res.status(500).json({ message: "Server error" });
    }
});



router.get("/jobs/tracking/analytics", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: "account",
            populate: {
                path: "upworkAccounts",
                populate: [
                    { path: "appliedJobs", populate: { path: "job" } },
                    { path: "completedJobs", populate: { path: "job" } }
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

        upworkAccounts.forEach(account => {
            // Process ongoing jobs
            const accountOngoingJobs = account.appliedJobs.filter(job => job.jobStatus === "Ongoing");
            ongoingJobs.push(...accountOngoingJobs);

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
        

        return res.status(200).json({
            totalOngoingJobs: ongoingJobs.length,
            totalFixedAmount,
            avgHourlyPrice,
            totalCompletedJobs,
            monthlyHistory: monthlyStats,
            ongoingJobCounts,
            ongoingJobs
        });
    } catch (error) {
        console.error("Error fetching job analytics:", error);
        return res.status(500).json({ message: "Server error", error });
    }
});


module.exports = router;