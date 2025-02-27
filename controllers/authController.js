// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');
const crypto = require('crypto');


const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
};

//Generate Random Password
const generateRandomPassword = () => {
  const length = 12;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate verification token
const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send verification email
const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email/${token}`;
  const mailOptions = {
    from: 'Courtney Sessions',
    to: email,
    subject: 'Verify Your Email',
    html: `<p style="font-size: 1.5em; font-weight: bold;">Click the link to verify your email on Courtney Sessions:</p>
    Please click <a href="${verificationUrl}">this link</a> to verify your email`,
  };
  await transporter.sendMail(mailOptions);
};

// Register controller
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        verified: false,
        verificationToken,
      },
    });

    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: 'User registered. Please verify your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed', error });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({ where: { verificationToken: token } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link.' });
    }

    // Instantly verify the user
    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, verificationToken: null },
    });

    // Redirect user or send success response
    // res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`); 
    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Email verification failed.', error });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.status(200).json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed', error });
  }
};

//Update User
exports.updateUser = async (req, res) => {
  try {
    //Get the user id from the jwt
    const userId = req.authPayload?.user?.id;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: req.body,
    });

    if(!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

//Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    const mailOptions = {
      from: 'Courtney Sessions',
      to: email,
      subject: 'Reset Password',
      text: `Your new password is ${newPassword}. Please login and change your password as soon as possible.`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Password reset successfully. Please check your email for your new password.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

//Update Password
exports.updatePassword = async (req, res) => {
  try {
    const userId = req.authPayload?.user?.id;
    const updatedPassword = await prisma.user.update({
      where: { id: userId },
      data: req.body,
    }); 

    if(!updatedPassword) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(updatedPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

//Delete Users
exports.deleteUser = async (req, res) => {
  try {
    const {userId} = req.body;
    const deletedUser = await prisma.user.delete({
      where: { id: userId },
    });

    if(!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

//Get Users
exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    if(users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

//Get User by ID 
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId} });
    if(!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}