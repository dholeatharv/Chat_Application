// SigninTemp.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Signin.css';

const Signin = ({ setIsLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const handleSignin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/signin', {
        email,
        password,
      });
      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setIsLoggedIn(true);
        navigate('/chat');
      } else {
        alert(response.data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Error while logging in:', error);
      alert('An error occurred during sign-in. Please try again.');
    }
  };
  return (
    <>
      <div className="container">
        <form onSubmit={handleSignin}>
          <h2>Sign in</h2>
          <label className="label">Email</label>
          <input
            type="email" // Use correct type
            name="email"
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
          />
          <label className="label">Password</label>
          <input
            type="password" // Use correct type
            name="password"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
          />
          <button type="submit">Submit</button>
        </form>
      </div>
    </>
  );
};

export default Signin;
