import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X } from 'lucide-react';
import './LoginModal.css';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: () => void;
}

export const LoginModal = ({ isOpen, onClose, onLoginSuccess }: LoginModalProps) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const url = mode === 'login'
                ? '/api/auth/login'
                : '/api/auth/register';

            const payload = mode === 'login'
                ? { email, password }
                : { email, password, name };

            const response = await axios.post(url, payload);

            if (response.data.access_token) {
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                onClose(); // Close modal first
                if (onLoginSuccess) {
                    onLoginSuccess();
                }

                if (response.data.user.role === 'ADMIN') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            }
        } catch (err: any) {
            console.error(err);
            if (mode === 'login') {
                setError('Невірний email або пароль');
            } else {
                setError(err.response?.data?.message || 'Помилка реєстрації. Можливо, такий email вже існує.');
            }
        }
    };

    const modalContent = (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <h2>{mode === 'login' ? 'Вхід в кабінет' : 'Реєстрація'}</h2>

                <form onSubmit={handleSubmit} className="login-form">
                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Ім'я</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ваше ім'я"
                                required
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-actions">
                        <button type="submit" className="login-btn">
                            {mode === 'login' ? 'Увійти' : 'Зареєструватись'}
                        </button>
                    </div>

                    <div className="auth-switch">
                        {mode === 'login' ? (
                            <p>Немає акаунту? <button type="button" onClick={() => { setMode('register'); setError(''); }} className="switch-btn">Реєстрація</button></p>
                        ) : (
                            <p>Вже є акаунт? <button type="button" onClick={() => { setMode('login'); setError(''); }} className="switch-btn">Увійти</button></p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );

    // Render directly into the document body to escape parent stacking contexts (like App Layout)
    return createPortal(modalContent, document.body);
};
