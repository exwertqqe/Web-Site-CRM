import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './LoginPage.css';

export const LoginPage = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await axios.post('/api/auth/login', {
                email,
                password
            });

            if (response.data.access_token) {
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('user', JSON.stringify(response.data.user)); // Store basic user info

                // Redirect based on role
                if (response.data.user.role === 'ADMIN') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(t('store.login.error'));
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <h2>{t('store.login.title')}</h2>
                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label>{t('store.login.email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@gravity.ua"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('store.login.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-btn">{t('store.login.submit')}</button>
                </form>
            </div>
        </div>
    );
};
