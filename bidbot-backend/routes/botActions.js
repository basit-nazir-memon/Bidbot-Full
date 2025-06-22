const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const UpworkAccount = require('../models/UpworkAccount');
const router = express.Router();


router.get('/startbot/account/:upworkAccountId', auth, async (req, res) => {
    try {
        const { upworkAccountId } = req.params;

        const user = await User.findById(req.user.id).populate('account');

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

        const upworkAccount = await UpworkAccount.findById(upworkAccountId);

        if (!upworkAccount) {
            return res.status(404).json({ message: 'Upwork account not found' });
        }

        if (upworkAccount.status === "Running") {
            return res.status(400).json({ message: "Bot is already running" });
        }

        // Extract credentials
        const username = upworkAccount.email;
        const password = upworkAccount.password;
        const security_answer = upworkAccount.security_answer; 

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // Send request to Flask backend
        const flaskResponse = await axios.post(`${process.env.PYTHON_APP_URL}/start`, {
            username,
            password,
            security_answer,
            upworkAccountId
        });

        // If Flask response is success, update status
        if (flaskResponse.data.result === "success") {
            upworkAccount.status = "Running";
            await upworkAccount.save();
            return res.status(200).json({ message: "Bot started successfully", status: "Running" });
        }

        // Handle failure from Flask
        return res.status(400).json({ message: flaskResponse.data.message || "Failed to start bot", status: "Stopped" });

    } catch (error) {
        console.error('Error starting bot:', error);
        return res.status(500).json({ message: 'An error occurred while starting the bot' });
    }
});



router.get('/stopbot/account/:upworkAccountId', auth, async (req, res) => {
    try {
        const { upworkAccountId } = req.params;

        const user = await User.findById(req.user.id).populate('account');

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

        const upworkAccount = await UpworkAccount.findById(upworkAccountId);

        if (!upworkAccount) {
            return res.status(404).json({ message: 'Upwork account not found' });
        }

        if (upworkAccount.status === "Stopped") {
            return res.status(400).json({ message: "Bot is already stopped" });
        }

        // Send request to Flask backend
        const flaskResponse = await axios.post(`${process.env.PYTHON_APP_URL}/close`, {
            upworkAccountId
        });

        // If Flask response is success, update status
        if (flaskResponse.data.result === "success") {
            upworkAccount.status = "Stopped";
            await upworkAccount.save();
            return res.status(200).json({ message: "Bot stopped successfully", status: "Stopped" });
        }

        // Handle failure from Flask
        return res.status(400).json({ message: flaskResponse.data.message || "Failed to stop bot", status: "Running" });

    } catch (error) {
        console.error('Error starting bot:', error);
        return res.status(500).json({ message: 'An error occurred while stopping the bot' });
    }
});


module.exports = router;
