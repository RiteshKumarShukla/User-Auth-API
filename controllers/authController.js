const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');

// Signup
exports.signup = async (req, res) => {
    const { username, email, password } = req.body;
    console.log('Received:', { username, email, password });

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            console.log('User already exists');
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            email,
            password
        });

        if (user) {
            // Send confirmation email
            const confirmationMessage = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333333; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
                        .header { background-color: #4CAF50; padding: 20px; text-align: center; color: #ffffff; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .content p { line-height: 1.6; }
                        .content a { display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                        .content a:hover { background-color: #45a049; }
                        .footer { text-align: center; padding: 10px; font-size: 12px; color: #777777; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>Welcome to Our Platform</h1></div>
                        <div class="content">
                            <p>Thank you for signing up, ${user.username}. Please confirm your email address by clicking the link below:</p>
                            <a href="http://localhost:5000/api/confirm-email?token=${generateToken(user._id)}">Confirm Email</a>
                            <p>If you did not create an account, no further action is required.</p>
                        </div>
                        <div class="footer"><p>&copy; 2024 Our Platform. All rights reserved.</p></div>
                    </div>
                </body>
                </html>
            `;

            try {
                await sendEmail({
                    email: user.email,
                    subject: 'Email Confirmation',
                    message: confirmationMessage
                });
                console.log('Confirmation email sent');
            } catch (emailError) {
                console.error('Error sending email:', emailError.message);
                return res.status(500).json({ message: 'Error sending email' });
            }

            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Error during signup:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};


// Email Confirmation
exports.confirmEmail = async (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(400).json({ message: 'Invalid or missing token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isConfirmed = true;
        await user.save();

        res.status(200).json({ message: 'Email confirmed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};