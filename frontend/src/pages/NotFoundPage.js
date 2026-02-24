import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCVStore } from '../store/cvStore';
import { cvAPI } from '../services/api';


return (<div className="not-found-page">
  <h1>404 - Page Not Found</h1>
  <p>Sorry, the page you are looking for does not exist.</p>
  <button onClick={() => navigate('/')}>Go to Home</button>
</div>
);
};

export default NotFoundPage;