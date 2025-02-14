// App.jsx
import { useState, useEffect } from 'react';
import './App.css';
import { Route, Routes, Link } from 'react-router-dom';
import Signup from './component/Signup';
import Signin from './component/SigninTemp';
import './Navbar.css';
import { Home } from './component/Home';
import Chat from './component/Chat';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if the token exists in localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
  };

  return (
    <div>
      <nav className="navbar">
        <h1>Talky</h1>
        <div className="navbar-links">
          {!isLoggedIn && (
            <>
              <Link to="/signup" className="signup-btn">Sign Up</Link>
              <Link to="/signin" className="signin-btn">Sign In</Link>
            </>
          )}
          {isLoggedIn && (
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </div>
  );
}

export default App;
