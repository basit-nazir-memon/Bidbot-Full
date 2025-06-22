const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Account = require("../models/Account");
const UpworkAccount = require("../models/UpworkAccount");
const Connects = require("../models/Connects");
const axios = require('axios')

// Middleware to verify user authentication (assuming JWT is used)
const auth = require("../middleware/auth");

// Route to fetch accounts of the authenticated user
router.get("/accounts", auth, async (req, res) => {
  try {
    // Find the authenticated user by their ID
    const user = await User.findById(req.user.id).populate({
        path: "account",
        populate: {
            path: "upworkAccounts",
            populate: {
            path: "connects",
            },
        },
    });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Check if the user has an account linked
    if (!user.account) {
        return res.status(404).json({ message: "No account linked to the user" });
    }

    const account = user.account;
    const upworkAccounts = account.upworkAccounts;

    // Calculate account limit left
    const accountsLimitLeft = account.maxUpworkAccounts - upworkAccounts.length;

    // Create response data
    const responseData = upworkAccounts.map((upworkAccount) => ({
        avatar: upworkAccount.avatar,
        username: upworkAccount.username, // Assuming username is the email used for Upwork login
        status: upworkAccount.status, // Assuming loginType could be used as status here
        connects: upworkAccount.connects ? upworkAccount.connects.connects : 0, // Connects data
        id: upworkAccount._id,
    }));

    // Return response with additional info
    res.json({
        upworkAccounts: responseData,
        maxUpworkAccounts: account.maxUpworkAccounts,
        accountsLimitLeft,
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ message: error.response?.data?.message || "Internal server error" });
  }
});

// Add account route
router.post("/addaccount", auth, async (req, res) => {
    const { email, password, security_answer } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        // If verification is successful, find the user
        const user = await User.findOne({ _id: req.user.id });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.account) {
            return res.status(404).json({ message: "User account is not created" });
        }

        if ((user.account.type == "Individual" && user.account.upworkAccounts.length > 0)
            || (user.account.type == "Company" && user.account.upworkAccounts.length > 5) ) {
            return res.status(401).json({ message: "Max Upwork Account Linking Limit Reached" });
        }


        // Verify the user credentials
        const response = await axios.post(`${process.env.PYTHON_APP_URL}/verify`, {
            email,
            password,
            security_answer,
            userId: req.user.id
        });

        console.log(response)
    
        // Check response from verification
        if (response.data.result === "failure") {
            return res.status(401).json({ message: response.data.message });
        }

        // Create a new connects document
        const newConnects = new Connects({ connects: response.data.connects });
        await newConnects.save();
    
        // Create a new Upwork account
        const newUpworkAccount = new UpworkAccount({
            loginType: "emailPass",
            email,
            password,
            connects: newConnects._id,
            username: "",
            role: "",
            status: 'Stopped',
            avatar: "",
            security_answer,
        });
    
        await newUpworkAccount.save();
    
        // Push the new Upwork account into the user's account
        const userAccount = await Account.findById(user.account);
        userAccount.upworkAccounts.push(newUpworkAccount._id);
        await userAccount.save();

        user.pagesAccess.upworkProfile = true;
        user.pagesAccess.accounts = true;
        user.pagesAccess.profile = true;
        user.pagesAccess.dashboard = true;
        user.pagesAccess.configurations = true;


        if ((user.account.type == "Individual" && user.account.upworkAccounts.length > 0)
            || (user.account.type == "Company" && user.account.upworkAccounts.length > 5) ) {
            
                user.pagesAccess.linkAccount = false;
        }

        await user.save();

        const pagesAccess = Object.entries(user._doc.pagesAccess)
            .filter(([key, value]) => value === true)
            .map(([key]) => key);

        return res.status(200).json({ message: "Upwork account added successfully", verified: true, pagesAccess: pagesAccess });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: error.response?.data?.message || "Internal server error" });
    }
});

module.exports = router;
