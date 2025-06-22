const express = require("express");
const auth = require("../middleware/auth");
const Account = require("../models/Account");
const User = require("../models/User");

const router = express.Router();

// Route to get the list of users
router.get("/users", auth, async (req, res) => {
    try {
        const users = await User.find().select("avatar name role email gender blocked account");

        const userList = await Promise.all(users.map(async (user) => {
            const linkedAccounts = user.account 
                ? await Account.findById(user.account).populate("upworkAccounts") 
                : null;

            const upworkAccountCount = linkedAccounts ? linkedAccounts.upworkAccounts.length : 0;

            return {
                id: user._id,
                avatar: user.avatar,
                name: user.name,
                role: user.role,
                email: user.email,
                gender: user.gender,
                blocked: user.blocked,
                linkedAccounts: upworkAccountCount
            };
        }));

        res.status(200).json({result: "success", data: userList});
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({result: "failure", message: "Server error" });
    }
});


router.post("/users/:id/block", auth, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ result: "failure", message: "User not found" });
        }

        // Check if the user is already blocked
        if (user.blocked) {
            return res.status(400).json({ result: "failure", message: "User is already blocked" });
        }

        await User.findByIdAndUpdate(userId, { blocked: true });
        res.status(200).json({ result: "success", message: "User blocked successfully" });
    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({ result: "failure", message: "Server error" });
    }
});


router.post("/users/:id/unblock", auth, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ result: "failure", message: "User not found" });
        }

        // Check if the user is already unblocked
        if (!user.blocked) {
            return res.status(400).json({ result: "failure", message: "User is already unblocked" });
        }

        await User.findByIdAndUpdate(userId, { blocked: false });
        res.status(200).json({ result: "success", message: "User unblocked successfully" });
    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(500).json({ result: "failure", message: "Server error" });
    }
});


module.exports = router;
