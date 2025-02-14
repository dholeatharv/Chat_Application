// route.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Message } from '../model/connection.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid Token' });
    req.user = user;
    next();
  });
};

// Signup route
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      friends: [],
      friendRequests: [],
    });
    return res.status(201).json({ success: 'User created successfully', newUser });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Signin route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user without population first
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found with email:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error('Invalid credentials for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Populate friends and friendRequests
    const populatedUser = await User.findById(user._id)
      .populate('friends', 'name email _id')
      .populate('friendRequests', 'name email _id');

    const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        friends: populatedUser.friends || [],
        friendRequests: populatedUser.friendRequests || [],
      },
    });
  } catch (error) {
    console.error('Something went wrong during sign-in:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout route
router.post('/logout', authenticateToken, (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// Fetch current user data
router.get('/currentUser', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'name email _id')
      .populate('friendRequests', 'name email _id');

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      friends: user.friends,
      friendRequests: user.friendRequests,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Friend Request System
router.post('/sendFriendRequest', authenticateToken, async (req, res) => {
  const { receiverId } = req.body;
  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'User not found' });

    if (receiver.friendRequests.includes(req.user.id)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    if (receiver.friends.includes(req.user.id)) {
      return res.status(400).json({ message: 'User is already your friend' });
    }

    receiver.friendRequests.push(req.user.id);
    await receiver.save();

    res.status(200).json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/respondFriendRequest', authenticateToken, async (req, res) => {
  const { senderId, accept } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user.friendRequests.includes(senderId)) {
      return res.status(400).json({ message: 'No such friend request' });
    }

    // Remove the sender ID from friend requests
    user.friendRequests = user.friendRequests.filter((id) => id.toString() !== senderId);

    if (accept) {
      // Add each other to friends lists
      user.friends.push(senderId);
      const sender = await User.findById(senderId);
      sender.friends.push(user._id);
      await sender.save();
    }

    await user.save();
    res.status(200).json({ message: accept ? 'Friend request accepted' : 'Friend request declined' });
  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'name email');
    res.status(200).json(user.friends);
  } catch (error) {
    console.error('Error fetching friends list:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message route
router.post('/sendMessage', authenticateToken, async (req, res) => {
  const { senderId, receiverId, content } = req.body;

  if (!senderId || !receiverId || !content) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Convert ObjectIDs to strings for comparison
    const friendsList = sender.friends.map((friendId) => friendId.toString());
    if (!friendsList.includes(receiverId)) {
      return res.status(403).json({ message: 'Can only message friends' });
    }

    const newMessage = new Message({ senderId, receiverId, content });
    await newMessage.save();

    // Emit message to the receiver
    req.io.to(receiverId).emit('receiveMessage', newMessage);

    res.status(201).json({ success: 'Message sent successfully', newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages between two users
router.get('/getMessages/:senderId/:receiverId', authenticateToken, async (req, res) => {
  const { senderId, receiverId } = req.params;

  try {
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Convert ObjectIDs to strings for comparison
    const friendsList = sender.friends.map((friendId) => friendId.toString());
    if (!friendsList.includes(receiverId)) {
      return res.status(403).json({ message: 'Can only view messages with friends' });
    }

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search for users
router.get('/searchUser', authenticateToken, async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const users = await User.find({ name: { $regex: username, $options: 'i' } })
      .limit(10)
      .select('name email _id');

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
