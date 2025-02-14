// Signup.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signup.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/signup', {
        name,
        email,
        password,
      });

      if (response.status === 201) {
        console.log('User created successfully!');
        navigate('/signin');
      } else {
        alert(response.data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup failed', error);
      alert('An error occurred during signup. Please try again.');
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSignup}>
        <h2>Sign up</h2>
        <label className="label">Username</label>
        <input
          type="text"
          name="name"
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className="label">Email</label>
        <input
          type="email" // Use correct type for validation
          name="email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="label">Password</label>
        <input
          type="password" // Use type="password" for security
          name="password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default Signup;
