const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 🔒 SECURITY: We read these from Vercel Settings
// ============================================
const MY_EMAIL = process.env.EMAIL_USER; 
const MY_APP_PASSWORD = process.env.EMAIL_PASS; 
const DESTINATION_EMAIL = 'vakadatanujreddy2006@gmail.com'; 
const MONGO_URI = process.env.MONGO_URI; 

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
if (!MONGO_URI) {
    console.error("❌ CRITICAL: MONGO_URI is missing in Environment Variables.");
} else {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("✅ Connected to MongoDB Atlas"))
        .catch(err => console.error("❌ Mongo Error:", err));
}

// --- SCHEMAS ---
const LogSchema = new mongoose.Schema({ 
    name: String, 
    timestamp: String, 
    imageData: String, 
    contentType: String 
});
const Log = mongoose.model('Log', LogSchema);

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageData: String, 
    contentType: String,
    registeredAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', StudentSchema);

// --- MULTER (MEMORY STORAGE) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROUTES ---

// Test Route
app.get('/', (req, res) => {
    res.send("Security System Backend is Live!");
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
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/log', upload.single('image'), async (req, res) => {
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
    console.log(`[DB] Saved log for: ${name}`);

    // --- EMAIL ALERT ---
    if (name === "Unknown" && MY_EMAIL && MY_APP_PASSWORD) {
        // Simple throttle logic could go here
        if (true) { 
            console.log(`[ALERT] Sending Email...`);
            const mailOptions = {
                from: MY_EMAIL,
                to: DESTINATION_EMAIL,
                subject: '🚨 SECURITY ALERT: Intruder Detected',
                text: `Warning!\n\nAn unknown person was detected.\nTime: ${timestamp}`,
                attachments: []
            };

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
    }
    res.json({ message: "Log processed" });
});

app.post('/api/register', upload.single('photo'), async (req, res) => {
    try {
        const { studentName } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No photo uploaded" });
        }

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

app.get('/api/students', async (req, res) => {
    const students = await Student.find();
    res.json(students);
});

// --- VERCEL CONFIGURATION ---
// This allows Vercel to turn this Express app into a serverless function
module.exports = app;

// This allows you to run it locally with `node index.js`
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend running locally on port ${PORT}`);
    });
}