const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/team', auth, async (req, res) => {
    try {
        // Fetch user by req.user.id (assumes user ID is attached to the request)
        const user = await User.findById(req.user.id).populate('account');

        // If the user doesn't exist, return a 404 error
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== "Company Admin") {
            return res.status(401).json({ message: "Not authorized to manage the Company Teams" })
        }

        // Fetch the account data to get the team members
        const account = user.account;

        // If no account is associated with the user, return a 404 error
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        // Fetch all the users who are part of the team (using the 'team' field in the account)
        const teamMembers = await User.find({ '_id': { $in: account.team } });

        // Filter and transform pagesAccess to only include pages where selected is true
        const pagesAccess = Object.keys(user.pagesAccess)
            .filter((key) => user.pagesAccess[key] === true) // Filter only selected pages
            .reduce((acc, key) => {
                acc[key] = {
                    name: key.charAt(0).toUpperCase() + key.slice(1),  // Capitalize the first letter of each key
                    selected: false,  // Set selected as false (because it's filtered for selected new pages)
                };
                return acc;
            }, {});

        // Map through each team member and transform their pagesAccess in the same format
        const transformedTeamMembers = await Promise.all(
            teamMembers.map(async (teamMember) => {
                const teamMemberPagesAccess = Object.keys(teamMember.pagesAccess)
                    .filter((key) => teamMember.pagesAccess[key] === true || user.pagesAccess[key]) // Filter only selected pages
                    .reduce((acc, key) => {
                        acc[key] = {
                            name: key.charAt(0).toUpperCase() + key.slice(1),  // Capitalize the first letter of each key
                            selected: teamMember.pagesAccess[key],
                        };
                        return acc;
                    }, {});

                return {
                    ...teamMember.toObject(),
                    pagesAccess: teamMemberPagesAccess, // Add the transformed pagesAccess
                };
            })
        );

        // Prepare the response with pagesAccess and team details
        const response = {
            pagesAccess: pagesAccess, // Get the pagesAccess from the user document
            team: transformedTeamMembers, // List of team members
        };

        // Send the response
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});


// POST /team route
router.post("/team", auth, async (req, res) => {
    const { name, email, gender, role, pageAccess } = req.body;

    // Validate the incoming data
    if (!name || !email || !gender || !role || !pageAccess) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const updatedPagesAccess = Object.keys(pageAccess).reduce((acc, key) => {
        acc[key] = pageAccess[key].selected;
        return acc;
    }, {});

    try {
        // Fetch user by req.user.id (assumes user ID is attached to the request)
        const user = await User.findById(req.user.id).populate('account');

        // If the user doesn't exist, return a 404 error
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.account) {
            return res.status(404).json({ message: 'Account not found for this user.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash( "Abcd1234@", salt);


        // Create a new user
        const newUser = new User({
            name,
            email,
            password,
            gender,
            role: "Company Team Member",
            companyRole: role,
            pagesAccess: { ...updatedPagesAccess, onboarding: false },
            account: user.account._id,
        });
        

        // Save the user to the database
        const savedUser = await newUser.save();

        user.account.team.push(savedUser._id);

        // Save the account document with the updated team
        await user.account.save();  // Ensure the account is saved with the updated team array

        // Return success response with the new team member
        return res.status(201).json({
            message: "User created successfully",
            teamMember: savedUser  // Include the newly created team member in the response
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while creating the user" });
    }
});


// POST /team/:memberID/access route
router.post('/team/:memberID/access', auth, async (req, res) => {
    const { memberID } = req.params;
    const { pagesAccess } = req.body;

    // Check if the pagesAccess object is valid
    if (!pagesAccess || typeof pagesAccess !== 'object') {
        return res.status(400).json({ message: 'Invalid pagesAccess data' });
    }

    try {
        // Fetch user by req.user.id (the logged-in user)
        const user = await User.findById(req.user.id).populate('account');

        // If the user doesn't exist, return a 404 error
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is an admin or has permission to modify the team
        if (user.role !== 'Company Admin') {
            return res.status(401).json({ message: 'Not authorized to manage the team' });
        }

        // Check if the memberID exists in the user's account team
        if (!user.account.team.includes(memberID)) {
            return res.status(404).json({ message: 'Member not found in this team' });
        }

        // Find the team member by memberID
        const member = await User.findById(memberID);

        // If the team member doesn't exist, return a 404 error
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        const updatedPagesAccess = Object.keys(pagesAccess).reduce((acc, key) => {
            acc[key] = pagesAccess[key].selected;
            return acc;
        }, {});

        // Update the member's pagesAccess with the data passed in the request body
        member.pagesAccess = { ...member.pagesAccess, ...updatedPagesAccess };

        // Save the updated member
        await member.save();

        // Return a success response
        return res.status(200).json({ message: 'Team member pagesAccess updated successfully', member });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'An error occurred while updating the team member' });
    }
});


router.post("/team/:id/toggle", auth, async (req, res) => {
    try {
        // Fetch user by req.user.id (the logged-in user)
        const user = await User.findById(req.user.id).populate('account');

        // If the user doesn't exist, return a 404 error
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = req.params.id;

        // Check if the memberID exists in the user's account team
        if (!user.account.team.includes(userId)) {
            return res.status(404).json({ message: 'Member not found in this team' });
        }

        const { blocked } = req.body;
        const member = await User.findById(userId);

        // Check if the user is already blocked
        if (member.blocked == blocked) {
            return res.status(400).json({ result: "failure", message: "Team Member already in that state" });
        }

        await User.findByIdAndUpdate(userId, { blocked: blocked });
        res.status(200).json({ result: "success", message: "User blocked successfully" });
    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({ result: "failure", message: "Server error" });
    }
});


module.exports = router;