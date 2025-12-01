const nodemailer = require('nodemailer');


const MY_APP_PASSWORD = 'dmdo ucxk vtbu jhfw'; // The 16-letter App Password
const MY_EMAIL = 'vtanujreddy@gmail.com'; // Who receives the alert?
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: MY_EMAIL,
        pass: MY_APP_PASSWORD
    }
});

async function sendTest() {
    console.log("Attempting to send email...");
    try {
        await transporter.sendMail({
            from: MY_EMAIL,
            to: MY_EMAIL, // Send to yourself
            subject: 'Test Email',
            text: 'If you see this, your code is working!'
        });
        console.log("✅ SUCCESS: Email Sent! Check your inbox.");
    } catch (error) {
        console.log("❌ FAILURE: Could not send email.");
        console.log("Error Message:", error.message);
    }
}

sendTest();