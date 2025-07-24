const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// Debug environment variables
console.log('Environment check:');
console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('- NODE_ENV:', process.env.NODE_ENV);

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS handling for API requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Simple test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        hasJWTSecret: !!process.env.JWT_SECRET,
        hasMongoDB: !!process.env.MONGODB_URI,
        mongooseState: mongoose.connection.readyState // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    });
});

// MongoDB connection with clean, modern settings
let isConnected = false;

const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        console.log('Using existing MongoDB connection');
        return;
    }

    try {
        // Hardcoded MongoDB URI for testing
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://maanvader:qr96kIH1JgGdOww7@cluster0.xh35tzc.mongodb.net/career-launchpad?retryWrites=true&w=majority&appName=Cluster0';
        
        if (!mongoURI) {
            throw new Error('MONGODB_URI not provided');
        }

        console.log('Attempting to connect to MongoDB...');
        console.log('Connection string (sanitized):', mongoURI.replace(/\/\/.*@/, '//[CREDENTIALS]@'));
        
        // Clean connection with minimal options
        const startTime = Date.now();
        await mongoose.connect(mongoURI);
        const endTime = Date.now();
        
        console.log(`MongoDB Connected successfully in ${endTime - startTime}ms`);
        console.log('Connection state:', mongoose.connection.readyState);
        
        // Test the connection with a ping
        try {
            const admin = mongoose.connection.db.admin();
            const ping = await admin.ping();
            console.log('Ping result:', ping);
            console.log('Database name:', mongoose.connection.db.databaseName);
        } catch (pingError) {
            console.error('Ping failed:', pingError);
        }
        
        isConnected = true;
        console.log('=== Connection Success ===');
        
    } catch (error) {
        console.error('MongoDB connection error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            codeName: error.codeName
        });
        isConnected = false;
        throw error;
    }
};

// Connect to MongoDB
console.log('Starting MongoDB connection...');
connectDB().catch(err => {
    console.error('Initial MongoDB connection failed:', err.message);
});

// Add connection event listeners
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
    isConnected = true;
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
    isConnected = false;
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
    isConnected = false;
});

// Middleware to ensure DB connection before API routes
app.use('/api/auth', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed for auth route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message
        });
    }
});

app.use('/api/plan', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed for plan route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Import and use routes
try {
    const authRoutes = require('./routes/auth');
    const planRoutes = require('./routes/plan');
    
    // Add logging middleware for API routes
    app.use('/api', (req, res, next) => {
        console.log(`API Request: ${req.method} ${req.path}`, req.body);
        next();
    });
    
    app.use('/api/auth', authRoutes);
    app.use('/api/plan', planRoutes);
    console.log('Routes loaded successfully');
} catch (error) {
    console.error('Error loading routes:', error);
}

// Catch-all handler for client-side routing (Express 4.x compatible)
app.get('*', (req, res) => {
    // Don't handle API routes here
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API route not found' });
    }
    
    // Serve index.html for all non-API routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Local development server
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Export for Vercel
module.exports = app;
