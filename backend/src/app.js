const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const childrenRouter = require('./routes/children');
const errorHandler = require('./middleware/errorHandler');
const tasksRouter = require('./routes/tasks');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/children', childrenRouter);
app.use('/api', tasksRouter);

app.use(errorHandler);

module.exports = app;