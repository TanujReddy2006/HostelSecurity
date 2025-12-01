const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 🔒 CONFIGURATION: Env Variables or Fallbacks
// ============================================
// Ideally, use a .env file locally (npm install dotenv)
const MY_EMAIL = process.env.EMAIL_USER || 'vtanujreddy@gmail.com'; 
const MY_APP_PASSWORD = process.env.EMAIL_PASS || 'dmdoucxkvtbujhfw'; 
const DESTINATION_EMAIL = 'vakadatanujreddy2006@gmail.com'; 
// Replace with your actual connection string if running locally without env vars
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://vakadatanujreddy:charutanu@cluster1.qsnbkzc.mongodb.net/security_db?appName=Cluster1'; 

// --- EMAIL CONFIG ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: { user: MY_EMAIL, pass: MY_APP_PASSWORD },
    tls: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ Mongo Connection Error:", err));

// --- SCHEMAS ---

// 1. Log Schema (Stores image as Base64 String)
const LogSchema = new mongoose.Schema({ 
    name: String, 
    timestamp: String, 
    imageData: String, 
    contentType: String 
});
const Log = mongoose.model('Log', LogSchema);

// 2. Student Schema (Stores registered faces)
const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageData: String, 
    contentType: String,
    registeredAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', StudentSchema);

// --- MULTER (MEMORY STORAGE) ---
// Stores files in RAM temporarily so we can save to Mongo as Base64
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROUTES ---

// Root Route (Health Check)
app.get('/', (req, res) => {
    res.send("✅ Security Backend is Running! System Ready.");
});

// Admin Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === "admin123") res.json({ success: true, token: "admin-token" });
    else res.status(401).json({ success: false, message: "Invalid Password" });
});

// Get Logs for Dashboard
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find().sort({ _id: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Receive Log from Python Script (Intruder/Student Detection)
app.post('/api/log', upload.single('image'), async (req, res) => {
    const { name, timestamp } = req.body;
    
    let imgData = null;
    let contentType = null;

    // If an image was sent (Intruder), convert to Base64
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
    console.log(`[DB] Saved log for: ${name}`);

    // --- EMAIL ALERT LOGIC ---
    if (name === "Unknown" && MY_EMAIL && MY_APP_PASSWORD) {
        // Simple Logic: Always send email for intruder
        // (In production, you might want to add a time-based throttle here)
        console.log(`[ALERT] Sending Email...`);
        
        const mailOptions = {
            from: MY_EMAIL,
            to: DESTINATION_EMAIL,
            subject: '🚨 SECURITY ALERT: Intruder Detected',
            text: `Warning!\n\nAn unknown person was detected.\nTime: ${timestamp}`,
            attachments: []
        };

        // Attach the image buffer directly to the email
        if (req.file) {
            mailOptions.attachments.push({
                filename: 'intruder.jpg',
                content: req.file.buffer 
            });
        }

        try {
            await transporter.sendMail(mailOptions);
            console.log(" -> Email Sent!");
        } catch (error) {
            console.error(" -> Email Failed:", error.message);
        }
    }
    
    res.json({ message: "Log processed" });
});

// Register New Student (From React Dashboard)
app.post('/api/register', upload.single('photo'), async (req, res) => {
    try {
        const { studentName } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No photo uploaded" });
        }

        // Convert Buffer to Base64
        const img64 = req.file.buffer.toString('base64');

        const newStudent = new Student({
            name: studentName,
            imageData: img64,
            contentType: req.file.mimetype
        });

        await newStudent.save();
        console.log(`[REGISTER] Saved ${studentName}`);
        
        res.json({ success: true, message: "Student Registered." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error saving to database." });
    }
});

// Get All Students (Used by Python Script to learn faces)
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export for Vercel
module.exports = app;

// Start Server Locally
if (require.main === module) {
    app.listen(PORT, () => console.log(`Backend running locally on port ${PORT}`));
}