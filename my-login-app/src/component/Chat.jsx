// Chat.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Chat.css';
import { io } from 'socket.io-client';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const token = localStorage.getItem('token');

  
  const fetchCurrentUser = async () => {
    if (token) {
      try {
        const response = await axios.get('http://localhost:3000/currentUser', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCurrentUser(response.data);
        initializeSocket(response.data.id);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  // Initialize Socket.IO
  const [socket, setSocket] = useState(null);
  const initializeSocket = (userId) => {
    const newSocket = io('http://localhost:3000');
    newSocket.emit('joinRoom', userId);
    setSocket(newSocket);

    newSocket.on('receiveMessage', (newMessage) => {
      if (
        (newMessage.senderId === currentUser.id && newMessage.receiverId === selectedUser._id) ||
        (newMessage.senderId === selectedUser._id && newMessage.receiverId === currentUser.id)
      ) {
        setMessages((prev) => [...prev, newMessage]);
      }
    });

    newSocket.on('newFriendRequest', () => {
      fetchCurrentUser();
    });

    newSocket.on('friendRequestResponse', () => {
      fetchCurrentUser();
    });

    return () => {
      newSocket.disconnect();
    };
  };

  const sendMessage = async () => {
    if (message.trim() && selectedUser) {
      try {
        await axios.post(
          'http://localhost:3000/sendMessage',
          {
            senderId: currentUser.id,
            receiverId: selectedUser._id,
            content: message,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    if (!token) {
      console.error('No token found, user might not be logged in.');
      return;
    }

    try {
      const response = await axios.get(`http://localhost:3000/searchUser?username=${searchQuery}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleUserSelection = (user) => {
    if (!currentUser.friends.some((friend) => friend._id === user._id)) {
      alert(`${user.name} is not your friend yet. Send a friend request first.`);
      return;
    }
    setSelectedUser(user);
    setMessages([]);
    fetchMessages(user._id);
  };

  const fetchMessages = async (receiverId) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/getMessages/${currentUser.id}/${receiverId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      const response = await axios.post(
        'http://localhost:3000/sendFriendRequest',
        {
          receiverId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert(response.data.message);

      fetchCurrentUser();

      // Emit an event to the receiver to refresh their friend requests
      socket.emit('friendRequestSent', receiverId);

    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const respondFriendRequest = async (senderId, accept) => {
    try {
      const response = await axios.post(
        'http://localhost:3000/respondFriendRequest',
        {
          senderId,
          accept,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert(response.data.message);
      
      fetchCurrentUser();

      if (accept) {
        socket.emit('friendRequestAccepted', senderId);
      }
    } catch (error) {
      console.error('Error responding to friend request:', error);
    }
  };

  return (
    <div className="chat-container">
      {/* Search Section */}
      <div className="search-section">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search user by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <ul className="search-results">
          {searchResults.map((user) => (
            <li key={user._id}>
              <div>{user.name}</div>
              {user._id !== currentUser.id && !currentUser.friends.some((friend) => friend._id === user._id) && (
                <button onClick={() => sendFriendRequest(user._id)}>Send Friend Request</button>
              )}
              {currentUser.friends.some((friend) => friend._id === user._id) && (
                <button onClick={() => handleUserSelection(user)}>Chat</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Section */}
      {selectedUser && (
        <div className="chat-section">
          <h3>Chat with {selectedUser.name}</h3>
          <div className="messages">
            {messages.map((msg, index) => (
              <p key={index} className={msg.senderId === currentUser.id ? 'sent' : 'received'}>
                {msg.content}
              </p>
            ))}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}

      {/* Friend Requests Section */}
      {currentUser && currentUser.friendRequests && currentUser.friendRequests.length > 0 && (
        <div className="friend-requests">
          <h4>Your Friend Requests</h4>
          <ul>
            {currentUser.friendRequests.map((requester) => (
              <li key={requester._id}>
                <span>{requester.name}</span>
                <button onClick={() => respondFriendRequest(requester._id, true)}>Accept</button>
                <button onClick={() => respondFriendRequest(requester._id, false)}>Decline</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Chat;
