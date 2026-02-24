import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';


return
<div>
    <h1>404 - Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <Link to="/">Go to Home</Link>
</div>
