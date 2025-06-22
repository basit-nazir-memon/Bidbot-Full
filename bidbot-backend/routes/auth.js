const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { check, validationResult } = require('express-validator');
const getWelcomeEmail = require('../emailTemplates/welcome');
const passwordChange = require('../emailTemplates/passwordChangeConfirmation');
const sendEmail = require('../utils/emailSender');
const passwordValidator = require('../utils/passwordValidator');
const crypto = require('crypto');
const getResetEmail = require('../emailTemplates/resetPassword');
const Account = require('../models/Account');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    secure: true,
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

let streamUpload = (req) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
            if (result) {
                resolve(result);
            } else {
                reject(error);
            }
        });
        streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
};

async function uploadFile(req) {
    let result = await streamUpload(req);
    return result;
}

// Upload Avatar Route
router.post('/upload-avatar', auth, admin, upload.single('avatar'), async (req, res) => {
    try {
        const result = await uploadFile(req);
        res.status(200).json({ avatar: result.secure_url });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'An error occurred while uploading the avatar' });
    }
});

// Upload Profile Picture Route
router.post('/upload-profilePic', auth, upload.single('avatar'), async (req, res) => {
    try {
        const result = await uploadFile(req);
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.avatar = result.secure_url;
        await user.save();
        res.status(200).json({ avatar: result.secure_url });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'An error occurred while uploading the avatar' });
    }
});

// Register Route
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (name == ""){
            return res.status(400).json({
                error: 'Name is Required'
            })
        }

        if (!passwordValidator(password)) {
            return res.status(400).json({
                error: 'Password should have one lowercase letter, one uppercase letter, one special character, one number, and be at least 8 characters long',
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.match(emailRegex)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already in use' });
        }

        let user = new User({
            name,
            email,
            password,
            pagesAccess: {}
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await sendEmail(user.email, `Welcome to BidBot Community`, getWelcomeEmail(name, '', `${process.env.FRONT_END_URL}/authentication/sign-in`, password));

        await user.save();
        res.status(200).json({ msg: 'User Registered Successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update Password Route
router.post('/update-password', auth, async (req, res) => {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!passwordValidator(password)) {
        return res.status(400).json({
            error: 'Password should have one lowercase letter, one uppercase letter, one special character, one number, and be at least 8 characters long',
        });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        await sendEmail(user.email, 'Password Changed', passwordChange(user.firstName, user.lastName, `${process.env.FRONT_END_URL}/authentication/reset-password`));

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'An error occurred while updating the password' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const token = req.header('Authorization');
    if (token) {
        return res.status(401).json({ error: 'Already Logged In' });
    }
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        if (user.blocked) {
            return res.status(400).json({ error: 'Account Blocked' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            },
        };

        const pagesAccess = Object.entries(user._doc.pagesAccess)
            .filter(([key, value]) => value === true)
            .map(([key]) => key);

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" }, (err, token) => {
            if (err) throw err;
            res.json({ token, id: user.id, role: user.role, avatar: user.avatar, name: user.name, email: user.email, pagesAccess: pagesAccess });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



router.post('/reset-password', [
    check('email').isEmail().withMessage('Please enter a valid email address'),
    ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ msg: errors.array()[0] });
    }

    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'No account with that email found' });
        }

        const token = crypto.randomBytes(20).toString('hex');

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;

        await user.save();

        const resetUrl = `${process.env.FRONT_END_URL}/auth/reset-password/${token}`;

        await sendEmail(user.email, `Password Reset`, getResetEmail(resetUrl, user.firstName, user.lastName));

        res.status(200).json({ message: 'Password reset link sent' });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Route to handle password reset
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body; // Get the token and password from the request body

    // Check if passwords match
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate the password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!newPassword.match(passwordRegex)) {
        return res.status(400).json({
            error: 'Password should have one lowercase letter, one uppercase letter, one special character, one number, and be at least 8 characters long',
        });
    }

    try {
        // Find the user by ID
        let user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

        // Check if user exists and token is valid
        if (!user) {
            return res.status(400).json({ error: 'Invalid token or token has expired' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear the reset token and expiration
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        // Save the user
        await user.save();

        await sendEmail(user.email, `Password Changed`, passwordChange(user.firstName, user.lastName, `${process.env.FRONT_END_URL}/authentication/reset-password`));

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'An error occurred while updating the password' });
    }
});


// Onboarding Route
router.post('/onboard', auth, upload.single('profilePicture'), async (req, res) => {
    try {
        // Initialize user data
        const { gender, phone, accountType } = req.body;
        let profilePictureUrl = null;

        // Check if profile picture is uploaded
        if (req.file) {
            const result = await uploadFile(req);
            profilePictureUrl = result.secure_url; // Get the secure URL of the uploaded image
        }

        // Assuming you have a User model to handle user data
        const user = await User.findById(req.user.id); // Get the user from the database
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user profile information
        user.gender = gender;
        user.phone = phone;

        if (profilePictureUrl) {
            user.avatar = profilePictureUrl; // Save the profile picture URL
        }

        await user.save(); // Save the user data to the database

        // Create a new account
        const newAccount = new Account({
            owner: user._id, // Set user as the account owner
            type: accountType.charAt(0).toUpperCase() + accountType.slice(1), // Capitalize the first letter
        });

        if (accountType == "company"){
            user.role = "Company Admin";
            newAccount.maxUpworkAccounts = 5;
            user.pagesAccess.team = true;
        }else if (accountType == 'individual'){
            user.role = "Individual Freelancer"
            newAccount.maxUpworkAccounts = 1;
        }

        // Save the account to the database
        await newAccount.save();

        // Reference the account in the user document
        user.account = newAccount._id;

        user.pagesAccess.dashboard = true;
        user.pagesAccess.profile = true;
        user.pagesAccess.onboarding = false;
        user.pagesAccess.linkAccount = true;
        user.pagesAccess.accounts = true;
        user.pagesAccess.jobs = true;
        user.pagesAccess.tracking = true;
        user.pagesAccess.notifications = true;
        user.pagesAccess.jobDetails = true;
        user.pagesAccess.kanban = true;
        user.pagesAccess.manageKanban = true;
        user.pagesAccess.support = true;
        user.pagesAccess.reports = true;


        const pagesAccess = Object.entries(user._doc.pagesAccess)
            .filter(([key, value]) => value === true)  // Filter by value === true
            .map(([key]) => key);

        await user.save(); // Save the updated user

        res.status(200).json({ message: 'User profile updaxted successfully', pagesAccess: pagesAccess });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'An error occurred during onboarding' });
    }
});



module.exports = router;