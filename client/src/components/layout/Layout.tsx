import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { LoginModal } from '../auth/LoginModal';
import { CartSlideOver } from './CartSlideOver';
import { GuestChatWidget } from '../chat/GuestChatWidget';
import axios from 'axios';
import './Layout.css';

interface LayoutProps {
    children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isChatDisabled, setIsChatDisabled] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state && location.state.openLogin) {
            setIsLoginModalOpen(true);
            // Clean up the state so it doesn't reopen on refresh
            const state = { ...location.state };
            delete state.openLogin;
            navigate(location.pathname, { replace: true, state });
        }
    }, [location, navigate]);

    useEffect(() => {
        const fetchChatStatus = async () => {
            try {
                const res = await axios.get('/api/settings/chat');
                setIsChatDisabled(res.data.disabled);
            } catch (error) {
                console.error('Failed to fetch chat settings:', error);
            }
        };
        fetchChatStatus();
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="app-container">
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
            <CartSlideOver />
            {!isChatDisabled && <GuestChatWidget />}

            <div className="app-layout">
                {isSidebarOpen && <Sidebar />}

                <div className="main-content-wrapper">
                    <Header
                        toggleSidebar={toggleSidebar}
                        onLoginClick={() => setIsLoginModalOpen(true)}
                    />
                    <main className="page-content">
                        {children}
                    </main>
                </div>
            </div>
            
            <Footer />
        </div>
    );
};
