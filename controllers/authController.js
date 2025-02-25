// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
};

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName },
    });

    // const token = generateToken(user);
    res.status(201).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed', error });
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
    //Get the email from the jwt
    const email = req.authPayload?.user?.email;
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.status(200).json(updatedUser);
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