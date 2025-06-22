const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Account = require('../models/Account');

// Mock JWT token for authentication
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

// Increase timeout for all tests
jest.setTimeout(30000);

describe('Users Routes', () => {
    let testUser;
    let testAccount;
    let authToken;

    beforeAll(async () => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        
        try {
            await mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.t1ompdc.mongodb.net/test-db`, { useNewUrlParser: true })

            // // Connect to test database with timeout
            // await mongoose.connect(process.env.MONGODB_URI, {
            //     serverSelectionTimeoutMS: 5000,
            //     socketTimeoutMS: 45000,
            // });
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    });

    beforeEach(async () => {
        try {
            // Clear the database before each test
            await User.deleteMany({});
            await Account.deleteMany({});

            // Create a test account
            testAccount = await Account.create({
                type: 'Individual',
                upworkAccounts: [],
                maxUpworkAccounts: 1,
                description: 'Test Account',
                skills: ['Testing'],
                totalHoursPerWeek: 40,
                pricePerHour: 25
            });

            // Create a test user
            testUser = await User.create({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                role: 'Company Admin',
                gender: 'male',
                account: testAccount._id
            });

            // Generate auth token
            authToken = generateToken(testUser._id);
        } catch (error) {
            console.error('Test setup error:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            // Close database connection
            await mongoose.connection.close();
        } catch (error) {
            console.error('Error closing MongoDB connection:', error);
            throw error;
        }
    });

    describe('GET /users', () => {
        it('should return list of users when authenticated', async () => {
            const response = await request(app)
                .get('/users')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.result).toBe('success');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('name');
            expect(response.body.data[0]).toHaveProperty('email');
            expect(response.body.data[0]).toHaveProperty('role');
            expect(response.body.data[0]).toHaveProperty('blocked');
            expect(response.body.data[0]).toHaveProperty('linkedAccounts');
        });

        it('should return 401 when not authenticated', async () => {
            const response = await request(app)
                .get('/users');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /users/:id/block', () => {
        it('should block a user successfully', async () => {
            const response = await request(app)
                .post(`/users/${testUser._id}/block`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.result).toBe('success');
            expect(response.body.message).toBe('User blocked successfully');

            // Verify user is blocked in database
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.blocked).toBe(true);
        });

        it('should return 400 when user is already blocked', async () => {
            // First block the user
            await User.findByIdAndUpdate(testUser._id, { blocked: true });

            const response = await request(app)
                .post(`/users/${testUser._id}/block`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.result).toBe('failure');
            expect(response.body.message).toBe('User is already blocked');
        });

        it('should return 404 when user not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .post(`/users/${nonExistentId}/block`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /users/:id/unblock', () => {
        it('should unblock a user successfully', async () => {
            // First block the user
            await User.findByIdAndUpdate(testUser._id, { blocked: true });

            const response = await request(app)
                .post(`/users/${testUser._id}/unblock`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.result).toBe('success');
            expect(response.body.message).toBe('User unblocked successfully');

            // Verify user is unblocked in database
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.blocked).toBe(false);
        });

        it('should return 400 when user is already unblocked', async () => {
            const response = await request(app)
                .post(`/users/${testUser._id}/unblock`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.result).toBe('failure');
            expect(response.body.message).toBe('User is already unblocked');
        });

        it('should return 404 when user not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .post(`/users/${nonExistentId}/unblock`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
        });
    });
}); 