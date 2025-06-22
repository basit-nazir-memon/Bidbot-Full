const express = require('express')
const mongoose = require('mongoose')

const authRoute = require('./routes/auth');
const accountsRoute = require('./routes/accounts')
const profileRoute = require('./routes/profile')
const usersRoute = require('./routes/users')
const dashboardRoute = require('./routes/dashboard')
const jobsRoute = require('./routes/jobs')
const botActionsRoute = require('./routes/botActions')
const notificationsRoute = require("./routes/notifications")
const teamRoute = require("./routes/team")
const kanbanRoute = require("./routes/kanban")
const supportRoute = require ("./routes/support")
const reportsRoute = require("./routes/reports")
const paymentRoute = require("./routes/payment")

const cors = require('cors');
require('dotenv').config()

const app = express()

// Only connect to MongoDB if not in test environment
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.t1ompdc.mongodb.net/${process.env.DATABASE_NAME}`, { useNewUrlParser: true })

    const db = mongoose.connection;

    db.on('error', console.error.bind(console, 'connection error: '));
    db.once('open', ()=>{
        console.log("MongoDB Connection Successfull");
    });
}

// Middleware for parsing JSON bodies
app.use('/webhook', express.raw({ type: 'application/json' }));

// Regular middleware for all other routes
app.use(express.json());
app.use(cors());

app.use('/', authRoute);
app.use('/', accountsRoute);
app.use('/', profileRoute);
app.use('/', usersRoute);
app.use('/', dashboardRoute);
app.use('/', jobsRoute);
app.use('/', botActionsRoute);
app.use('/', notificationsRoute);
app.use('/', teamRoute);
app.use('/', kanbanRoute);
app.use('/', supportRoute);
app.use('/', reportsRoute);
app.use('/', paymentRoute);

app.get('/status', (req, res)=> {
    res.status(200).json({
        status: 'Up',
        frontend: process.env.FRONT_END_URL
    })
})

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(process.env.PORT, () => console.log(`App listening on port ${process.env.PORT}!`))
}

module.exports = app;