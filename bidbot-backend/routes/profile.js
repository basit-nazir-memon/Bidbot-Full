const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const Account = require('../models/Account');
const UpworkAccount = require('../models/UpworkAccount');
const Connects = require('../models/Connects');
const router = express.Router();


router.get('/profile/account/:upworkAccountId', auth, async (req, res) => {
    try {
        const { upworkAccountId } = req.params;

        const user = await User.findById(req.user.id).populate('account');
    
        // Check if the user exists
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userAccount = user.account;

        if (!userAccount) {
            return res.status(404).json({ message: "User account not found" });
        }

        const hasUpworkAccount = userAccount.upworkAccounts.some(accountId => accountId.toString() === upworkAccountId);

        if (!hasUpworkAccount) {
            return res.status(404).json({ message: 'User with Upwork account not found' });
        }

        // Find the Upwork account
        const upworkAccount = await UpworkAccount.findById(upworkAccountId).populate('connects');

        if (!upworkAccount) {
            return res.status(404).json({ message: 'Upwork account not found' });
        }

        // Get the connects count
        const connectsCount = upworkAccount.connects ? upworkAccount.connects.connects : 0;

        // Convert Mongoose document to plain object and exclude 'appliedJobs'
        const { appliedJobs, ...upworkAccountData } = upworkAccount.toObject();

        // Combine the Upwork account data and connects count
        const responseData = {
            ...upworkAccountData,
            connects: connectsCount,
        };

        // Send the response
        res.status(200).json({ message: 'Profile data retrieved successfully', profile: responseData });

    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ message: 'An error occurred while retrieving the profile' });
    }
});




router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
        .populate({
            path: 'account', // Populate the account details
            select: 'description type skills upworkAccounts', // Select only the required fields from the account
            populate: {
            path: 'upworkAccounts', // Populate the upworkAccounts field inside account
            select: 'avatar username connects skills', // Select the required fields for upworkAccounts
            populate: {
                path: 'connects', // Populate the connects inside upworkAccounts
                select: 'connects' // Only select the connects value
            }
            }
        })
        .select('name email role companyRole gender phone createdAt avatar'); // Select the required fields from the user

        // Check if user exists
        if (!user) {
        return { error: 'User not found' };
        }

        // Extract account skills or fallback to upworkAccounts skills
        let accountSkills = user.account?.skills || [];
        
        // If no skills in the account, use the upworkAccounts skills
        if (accountSkills.length === 0 && user.account?.upworkAccounts) {
            accountSkills = user.account.upworkAccounts.reduce((skillsAcc, upworkAccount) => {
                if (upworkAccount.skills && upworkAccount.skills.length > 0) {
                    return [...skillsAcc, ...upworkAccount.skills];
                }
                return skillsAcc;
            }, []);
        }


        // Create the response object with the necessary fields
        const userDetails = {
            name: user.name,
            email: user.email,
            role: user.role,
            companyRole: user.companyRole,
            gender: user.gender,
            phone: user.phone,
            createdAt: user.createdAt,
            location: user.location,
            description: user.account?.description || '', 
            type: user.account?.type || '', 
            skills: accountSkills,
            projects: user.projects || [],
            avatar: user.avatar,
            upworkAccounts: user.account?.upworkAccounts.map((account) => ({
                _id: account._id,
                avatar: account.avatar,
                username: account.username,
                connects: account.connects?.connects || 0,
            })) || [],
        };

        res.status(200).json({ message: 'User data retrieved successfully', profile: userDetails });

    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'An error occurred while retrieving the profile' });
    }
});

router.get('/profile/:id', auth, admin,async (req, res) => {
    try {
        const {id} = req.params;

        const user = await User.findById(id)
        .populate({
            path: 'account', // Populate the account details
            select: 'description type skills upworkAccounts', // Select only the required fields from the account
            populate: {
            path: 'upworkAccounts', // Populate the upworkAccounts field inside account
            select: 'avatar username connects skills', // Select the required fields for upworkAccounts
            populate: {
                path: 'connects', // Populate the connects inside upworkAccounts
                select: 'connects' // Only select the connects value
            }
            }
        })
        .select('name email role companyRole gender phone createdAt avatar'); // Select the required fields from the user

        // Check if user exists
        if (!user) {
        return { error: 'User not found' };
        }

        // Extract account skills or fallback to upworkAccounts skills
        let accountSkills = user.account?.skills || [];
        
        // If no skills in the account, use the upworkAccounts skills
        if (accountSkills.length === 0 && user.account?.upworkAccounts) {
            accountSkills = user.account.upworkAccounts.reduce((skillsAcc, upworkAccount) => {
                if (upworkAccount.skills && upworkAccount.skills.length > 0) {
                    return [...skillsAcc, ...upworkAccount.skills];
                }
                return skillsAcc;
            }, []);
        }


        // Create the response object with the necessary fields
        const userDetails = {
            name: user.name,
            email: user.email,
            role: user.role,
            companyRole: user.companyRole,
            gender: user.gender,
            phone: user.phone,
            createdAt: user.createdAt,
            location: user.location,
            description: user.account?.description || '', 
            type: user.account?.type || '', 
            skills: accountSkills,
            projects: user.projects || [],
            avatar: user.avatar,
            upworkAccounts: user.account?.upworkAccounts.map((account) => ({
                _id: account._id,
                avatar: account.avatar,
                username: account.username,
                connects: account.connects?.connects || 0,
            })) || [],
        };

        res.status(200).json({ message: 'User data retrieved successfully', profile: userDetails });

    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'An error occurred while retrieving the profile' });
    }
});



// Route to scrape profile from Upwork
router.get('/scrape/profile/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(req.user.id).populate('account');
    
        // Check if the user exists
        if (!user) {
            throw new Error("User not found");
        }

        // Step 2: Check if the user's account has the Upwork account ID
        const userAccount = user.account; // The user's associated account

        // Check if the userAccount is populated
        if (!userAccount) {
        throw new Error("User account not found");
        }

        const hasUpworkAccount = userAccount.upworkAccounts.some(accountId => accountId.toString() === id);

        if (!hasUpworkAccount) {
            return res.status(404).json({ message: 'User with Upwork account not found' });
        }

        const upworkAccount = await UpworkAccount.findById(id);

        let profileResponse = {};

        try {
            profileResponse = await axios.post(`${process.env.PYTHON_APP_URL}/get-profile`, {
                email: upworkAccount.email,
                password: upworkAccount.password,
                userId: id,
            });
            // console.log("Profile data:", profileResponse.data);
        } catch (error) {
            console.error("Error fetching profile data:", error.message);
        }

        const profileData = profileResponse.data.data;
        
        if (profileResponse.data.result !== 'success') {
            return res.status(500).json({ message: 'Failed to retrieve profile data from Upwork' });
        }

        // Update the user's Upwork account with the fetched profile data
        const accountUpdate = {
            address: profileData.address,
            description: profileData.description,
            education: profileData.education.map(edu => ({
                degree: edu.degree,
                institute: edu.institute,
                year: edu.year
            })),
            employment_history: profileData.employment_history.map(job => ({
                title: job.title,
                duration: job.duration,
                description: job.description
            })),
            name: profileData.name,
            per_hour_charge: profileData.per_hour_charge,
            phone: profileData.phone,
            projects: profileData.projects.map(proj => ({
                description: proj.description,
                media: proj.media,
                published: proj.published,
                role: proj.role,
                skills: proj.skills,
                title: proj.title
            })),
            role: profileData.role,
            skills: profileData.skills,
            timezone: profileData.timezone,
            total_earnings: profileData.total_earnings,
            total_jobs: profileData.total_jobs,
            username: profileData.username,
            work_history: profileData.work_history.map(work => ({
                duration: work.duration,
                price: work.price,
                title: work.title,
                type: work.type
            })),
            userid: profileData.userid,
            avatar: profileData.avatar,
        };

        // Perform the update in the database
        const updatedUpworkAccount = await UpworkAccount.findByIdAndUpdate(
            id, 
            accountUpdate, 
            { new: true }
        );

        const connects = await Connects.findByIdAndUpdate(
            updatedUpworkAccount.connects,
            {
                connects: profileData.connects
            },
            { new: true }
        );

        const accountWithConnects = {
            ...updatedUpworkAccount._doc,
            connects: connects ? connects.connects : 0 
        };

        console.log(accountWithConnects);

        // Respond with the updated account details
        res.status(200).json({ message: 'Profile scraped and updated successfully', account: accountWithConnects  });
    } catch (error) {
        console.error('Error scraping profile:', error);
        res.status(500).json({ message: 'An error occurred while scraping the profile' });
    }
});

module.exports = router;
