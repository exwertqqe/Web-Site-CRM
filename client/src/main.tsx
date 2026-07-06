import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import axios from 'axios'
import { BrowserRouter } from 'react-router-dom'
import './i18n'

// Global Axios Interceptor to handle expired tokens (401 Unauthorized)
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const hasToken = !!localStorage.getItem('token');
            // Check if the request that failed actually tried to use the token
            const requestHasAuthHeader = !!(error.config && error.config.headers && error.config.headers.Authorization);
            
            if (hasToken && requestHasAuthHeader) {
                // Clear expired session data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // Redirect if on protected paths, otherwise reload to reflect logged-out state
                const protectedPaths = ['/admin', '/profile', '/checkout'];
                const isProtected = protectedPaths.some(p => window.location.pathname.startsWith(p));
                
                if (isProtected) {
                    window.location.href = '/login';
                } else {
                    window.location.reload();
                }
            }
        }
        return Promise.reject(error);
    }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)
