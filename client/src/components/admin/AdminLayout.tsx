import { ReactNode } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, Users, Settings, LogOut, CheckSquare, MessageSquare, Headphones, Star, History, Box, Layers, ShoppingCart, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Logo from '../../assets/Logo.png';
import './AdminLayout.css';

interface AdminLayoutProps {
    children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();

    // перевірка прав доступу до сторінки
    const userStr = localStorage.getItem('user');
    let isAuthorized = false;

    try {
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role === 'ADMIN') {
                isAuthorized = true;
            }
        }
    } catch (e) {
        console.error("Failed to parse user state");
    }

    if (!isAuthorized) {
        // якщо не адмін — викидаємо на головну і просимо залогінитись
        return <Navigate to="/" replace state={{ openLogin: true }} />;
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const navItems = [
        { path: '/admin', icon: <LayoutDashboard size={20} />, label: t('admin.nav.dashboard') },
        { path: '/admin/products', icon: <Package size={20} />, label: t('admin.nav.products') },
        { path: '/admin/categories', icon: <Layers size={20} />, label: t('admin.nav.categories') },
        { path: '/admin/orders', icon: <ShoppingCart size={20} />, label: t('admin.nav.orders') },
        { path: '/admin/warehouse', icon: <Box size={20} />, label: t('admin.nav.warehouse') },
        { path: '/admin/inventory-log', icon: <History size={20} />, label: t('admin.nav.inventory_log') },
        { path: '/admin/tasks', icon: <CheckSquare size={20} />, label: t('admin.nav.tasks') },
        { path: '/admin/customers', icon: <Users size={20} />, label: t('admin.nav.customers') },
        { path: '/admin/reviews', icon: <Star size={20} />, label: t('admin.nav.reviews') },
        { path: '/admin/chats', icon: <MessageSquare size={20} />, label: t('admin.nav.chats') },
        { path: '/admin/support', icon: <Headphones size={20} />, label: t('admin.nav.support') },
        { path: '/admin/settings', icon: <Settings size={20} />, label: t('admin.nav.settings') },
    ];

    const toggleLanguage = () => {
        const isEn = i18n.language && i18n.language.startsWith('en');
        i18n.changeLanguage(isEn ? 'uk' : 'en');
    };

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <Link to="/" className="admin-logo-link">
                        <img src={Logo} alt="Gravity Logo" className="logo-icon" />
                        <span className="logo-text">Gravity<span className="text-blue-600">Admin</span></span>
                    </Link>
                </div>

                <nav className="admin-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="admin-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={20} />
                        <span>{t('admin.header.logout')}</span>
                    </button>
                </div>
            </aside>

            <div className="admin-main">
                <header className="admin-header">
                    <h3>{t('admin.header.control_panel')}</h3>
                    <div className="admin-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button 
                            onClick={toggleLanguage} 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: '500' }}
                        >
                            <Globe size={20} />
                            <span>{i18n.language && i18n.language.startsWith('en') ? 'EN' : 'UK'}</span>
                        </button>
                        <div className="admin-profile">
                            <div className="admin-avatar">A</div>
                            <span>{t('admin.header.main_admin')}</span>
                        </div>
                    </div>
                </header>

                <div className="admin-content">
                    {children}
                </div>
            </div>
        </div>
    );
};
