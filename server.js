const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000; // Important for deployment

// ============================================
// 👇 ENTER YOUR EMAIL DETAILS HERE 👇
// ============================================
const MY_EMAIL = 'vtanujreddy@gmail.com'; 
const MY_APP_PASSWORD = 'dmdoucxkvtbujhfw'; 
const DESTINATION_EMAIL = 'vakadatanujreddy2006@gmail.com'; 
// ============================================

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
// FOR DEPLOYMENT: Replace this string with your MongoDB Atlas Connection String
const MONGO_URI = 'mongodb://127.0.0.1:27017/security_db'; 

mongoose.connect(MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Mongo Error:", err));

// --- SCHEMAS ---

// 1. Log Schema (Stores image as Base64 String)
const LogSchema = new mongoose.Schema({ 
    name: String, 
    timestamp: String, 
    imageData: String, // Contains the actual photo data
    contentType: String // e.g., 'image/jpeg'
});
const Log = mongoose.model('Log', LogSchema);

// 2. Student Schema (Stores image as Base64 String)
const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageData: String, // Contains the actual photo data
    contentType: String,
    registeredAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', StudentSchema);


// --- MULTER (MEMORY STORAGE) ---
// We use memoryStorage to get the 'buffer' (raw data) instead of saving to disk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// --- ROUTES ---

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === "admin123") res.json({ success: true, token: "admin-token" });
    else res.status(401).json({ success: false, message: "Invalid Password" });
});

// GET LOGS (Now sends the base64 image string to frontend)
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find().sort({ _id: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SAVE LOG (Security Alert)
app.post('/api/log', upload.single('image'), async (req, res) => {
    const { name, timestamp } = req.body;
    
    // Convert image buffer to Base64 string
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
    if (name === "Unknown") {
        if (true) { 
            console.log(`[ALERT] Sending Email...`);
            const mailOptions = {
                from: MY_EMAIL,
                to: DESTINATION_EMAIL,
                subject: '🚨 SECURITY ALERT: Intruder Detected',
                text: `Warning!\n\nAn unknown person was detected.\nTime: ${timestamp}`,
                attachments: []
            };

            // Attach image directly from Buffer (No file on disk needed)
            if (req.file) {
                mailOptions.attachments.push({
                    filename: 'intruder.jpg',
                    content: req.file.buffer // Nodemailer can send buffers directly!
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

// REGISTER STUDENT (Saves Image to DB)
app.post('/api/register', upload.single('photo'), async (req, res) => {
    try {
        const { studentName } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No photo uploaded" });
        }

        // Convert Buffer to Base64 to store in MongoDB
        const img64 = req.file.buffer.toString('base64');

        const newStudent = new Student({
            name: studentName,
            imageData: img64,
            contentType: req.file.mimetype
        });

        await newStudent.save();
        console.log(`[REGISTER] Saved ${studentName} to MongoDB (Base64)`);
        
        res.json({ success: true, message: "Student Registered in Database." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error saving to database." });
    }
});

// Helper route to check DB images easily
app.get('/api/students', async (req, res) => {
    const students = await Student.find();
    res.json(students);
});

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
// ... (your existing app.listen code)

// Add this at the very end:
module.exports = app;