const nodemailer = require("nodemailer");

// Create a transporter using Ethereal test credentials.
// For production, replace with your actual SMTP server details.
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "bab2752a21c3a0",
        pass: "6767b8a53e3566",
    },
});
//http://localhost:3000/api/v1/auth/resetpassword/a87edf6812f235e997c7b751422e6b2f5cd95aa994c55ebeeb931ca67214d645

// Send an email using async/await;
module.exports = {
    sendMail: async function (to,url) {
        await transporter.sendMail({
            from: 'admin@hehehe.com',
            to: to,
            subject: "reset pass",
            text: "click vo day de doi pass", // Plain-text version of the message
            html: "click vo <a href="+url+">day</a> de doi pass", // HTML version of the message
        });
    },
    sendWelcomePasswordMail: async function (to, username, plainPassword) {
        await transporter.sendMail({
            from: 'admin@hehehe.com',
            to: to,
            subject: "Tai khoan moi NNPTUD-C6",
            text: "Tai khoan cua ban da duoc tao. Username: " + username + ", Password tam thoi: " + plainPassword,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
                    <h2 style="margin-bottom: 8px;">Xin chao ${username},</h2>
                    <p>Tai khoan cua ban da duoc tao thanh cong.</p>
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Password tam thoi:</strong> ${plainPassword}</p>
                    <p>Vui long dang nhap va doi mat khau ngay sau lan dau tien su dung.</p>
                    <img
                        src="https://i.sstatic.net/l60Hf.png"
                        alt="Welcome image"
                        style="max-width: 220px; display: block; margin-top: 12px; border-radius: 8px;"
                    />
                </div>
            `,
        });
    }
}