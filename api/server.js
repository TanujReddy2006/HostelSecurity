const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();

// ============================================
// 🔒 CONFIGURATION
// ============================================
const MY_EMAIL = process.env.EMAIL_USER || 'vtanujreddy@gmail.com'; 
const MY_APP_PASSWORD = process.env.EMAIL_PASS || 'dmdoucxkvtbujhfw'; 
const DESTINATION_EMAIL = 'vakadatanujreddy2006@gmail.com'; 
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://vakadatanujreddy:charutanu@cluster1.qsnbkzc.mongodb.net/security_db?appName=Cluster1'; 

// --- DATABASE CONNECTION ---
let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000, 
            socketTimeoutMS: 45000,
        });
        isConnected = true;
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ Mongo Connection Error:", err.message);
    }
};

// Connect on every request (Vercel Best Practice)
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

app.use(cors());
app.use(express.json());

// --- SCHEMAS ---
const LogSchema = new mongoose.Schema({ 
    name: String, 
    timestamp: String, 
    imageData: String, 
    contentType: String 
});
// Check if model exists to prevent "OverwriteModelError" in serverless
const Log = mongoose.models.Log || mongoose.model('Log', LogSchema);

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageData: String, 
    contentType: String,
    registeredAt: { type: Date, default: Date.now }
});
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

// --- MULTER ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROUTES ---

app.get('/', (req, res) => {
    res.send("✅ Security Backend is Running! (API Folder Mode)");
});

// DEBUG ROUTE: Check DB Connection Status
app.get('/api/status', (req, res) => {
    const state = mongoose.connection.readyState;
    const states = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
    res.json({ 
        server: "Online", 
        dbState: states[state], 
        mongoUriConfigured: !!MONGO_URI 
    });
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === "admin123") res.json({ success: true, token: "admin-token" });
    else res.status(401).json({ success: false, message: "Invalid Password" });
});

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find().sort({ _id: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message, type: "DB_ERROR" });
    }
});

app.post('/api/log', upload.single('image'), async (req, res) => {
    try {
        const { name, timestamp } = req.body;
        let imgData = null;
        let contentType = null;

        if (req.file) {
            imgData = req.file.buffer.toString('base64');
            contentType = req.file.mimetype;
        }

        const newLog = new Log({ 
            name, 
            timestamp: timestamp || new Date().toLocaleString(), 
            imageData: imgData,
            contentType: contentType
        });
        
        await newLog.save();
        
        if (name === "Unknown" && MY_EMAIL && MY_APP_PASSWORD) {
            const mailOptions = {
                from: MY_EMAIL,
                to: DESTINATION_EMAIL,
                subject: '🚨 SECURITY ALERT',
                text: `Intruder Detected at ${timestamp}`,
                attachments: req.file ? [{ filename: 'intruder.jpg', content: req.file.buffer }] : []
            };
            transporter.sendMail(mailOptions).catch(console.error);
        }
        res.json({ message: "Log processed" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/register', upload.single('photo'), async (req, res) => {
    try {
        const { studentName } = req.body;
        if (!req.file) return res.status(400).json({ success: false, message: "No photo" });

        const img64 = req.file.buffer.toString('base64');
        const newStudent = new Student({
            name: studentName,
            imageData: img64,
            contentType: req.file.mimetype
        });
        await newStudent.save();
        res.json({ success: true, message: "Student Registered." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message, details: "Check Mongo Connection" });
    }
});

module.exports = app;