const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const UpworkAccount = require('../models/UpworkAccount');
const auth = require('../middleware/auth');

router.get('/notifications', auth, async (req, res) => {
    try {
        // Find the user and populate necessary fields
        const user = await User.findById(req.user.id)
            .populate({
                path: 'account', // Populate the account details
                select: 'upworkAccounts', // Select only required fields
                populate: {
                    path: 'upworkAccounts', // Populate upworkAccounts inside account
                    select: 'notifications', // Include notifications field
                    populate: {
                        path: 'notifications', // Populate connects inside upworkAccounts
                    }
                }
            })

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Extract Upwork accounts from the populated user object
        const upworkAccounts = user.account?.upworkAccounts ?? [];

        // Merge and sort notifications
        const notifications = upworkAccounts
            .flatMap(account => account.notifications || []) // Ensure notifications exist
            .sort((a, b) => new Date(b.postedOn) - new Date(a.postedOn)); // Sort by newest first

        return res.status(200).json(notifications);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error });
    }
});


/// Mark a notification as read
router.post('/notifications/mark/:notificationId', auth, async (req, res) => {
    try {
        const { notificationId } = req.params;

        // Find the user by token ID and populate all Upwork accounts
        const user = await User.findById(req.user.id).populate({
            path: 'account', // Populate the account details
            select: 'upworkAccounts', // Select only required fields
            populate: {
                path: 'upworkAccounts', // Populate upworkAccounts inside account
                select: 'notifications', // Include notifications field
                populate: {
                    path: 'notifications', // Populate connects inside upworkAccounts
                }
            }
        })

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Iterate through all Upwork accounts to find the notification
        let notificationFound = false;

        for (const upworkAccount of user.account.upworkAccounts) {
            const account = await UpworkAccount.findById(upworkAccount._id);
            if (!account) continue;

            // Find the notification within the account
            const notification = account.notifications.id(notificationId);
            if (notification) {
                notification.isRead = true;
                await account.save();
                notificationFound = true;
                break; // Stop searching after marking the first found notification
            }
        }

        if (!notificationFound) {
            return res.status(404).json({ message: "Notification not found in any Upwork account" });
        }

        return res.status(200).json({ message: "Notification marked as read" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});




module.exports = router;
