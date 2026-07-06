import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Mail, Shield } from 'lucide-react';
import './ProfilePage.css';

export const ProfilePage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [user, setUser] = useState(() => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    });

    if (!user) {
        navigate('/');
        return null;
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const [activeTab, setActiveTab] = useState('orders');
    const [orders, setOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Profile Settings States
    const [editName, setEditName] = useState(user.name || '');
    const [editEmail, setEditEmail] = useState(user.email || '');
    const [editAvatar, setEditAvatar] = useState(user.avatar || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (activeTab === 'orders') {
            fetchOrders();
        }
    }, [activeTab]);

    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/orders/my-orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setProfileMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const res = await axios.patch('/api/users/profile', {
                name: editName,
                email: editEmail,
                avatar: editAvatar
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update user in state and local storage
            const updatedUser = { ...user, ...res.data };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setProfileMessage({ type: 'success', text: t('store.profile.settings.success') });

            // hide success message after 3 seconds
            setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            setProfileMessage({
                type: 'error',
                text: error.response?.data?.message || t('store.profile.settings.error')
            });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const getImageUrl = (path: string) => {
        if (!path) return '/placeholder.png';
        if (path.startsWith('http')) return path;
        const baseUrl = window.location.origin;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    };

    return (
        <div className="profile-page-wrapper">
            <div className="profile-page-container">
                {/* Left Sidebar - Profile Card */}
                <aside className="profile-sidebar">
                    <div className="profile-card">
                        <div className="profile-header">
                            <div className="profile-avatar-large">
                                {user.avatar ? (
                                    <img src={getImageUrl(user.avatar)} alt="Avatar" className="avatar-image-full" />
                                ) : (
                                    user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()
                                )}
                            </div>
                            <h2>{t('store.profile.title')}</h2>
                            <p className="profile-role">
                                {user.role === 'USER' ? t('store.profile.role_user') : t('store.profile.role_admin')}
                            </p>
                        </div>

                        <div className="profile-details">
                            <div className="detail-item">
                                <div className="detail-icon bg-blue-50 text-blue-600">
                                    <User size={20} />
                                </div>
                                <div className="detail-content">
                                    <label>{t('store.profile.details.name')}</label>
                                    <span>{user.name || t('store.profile.details.not_specified')}</span>
                                </div>
                            </div>

                            <div className="detail-item">
                                <div className="detail-icon bg-green-50 text-green-600">
                                    <Mail size={20} />
                                </div>
                                <div className="detail-content">
                                    <label>{t('store.profile.details.email')}</label>
                                    <span>{user.email}</span>
                                </div>
                            </div>

                            <div className="detail-item">
                                <div className="detail-icon bg-purple-50 text-purple-600">
                                    <Shield size={20} />
                                </div>
                                <div className="detail-content">
                                    <label>{t('store.profile.details.status')}</label>
                                    <span>{t('store.profile.details.active')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="profile-actions">
                            <button onClick={handleLogout} className="btn-logout w-full flex items-center justify-center gap-2">
                                <LogOut size={18} />
                                {t('store.profile.actions.logout')}
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Right Content Area */}
                <main className="profile-main-content">
                    <div className="profile-nav-tabs">
                        <button
                            className={`profile-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                            onClick={() => setActiveTab('orders')}
                        >
                            {t('store.profile.tabs.orders')}
                        </button>
                        <button
                            className={`profile-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
                            onClick={() => setActiveTab('saved')}
                        >
                            {t('store.profile.tabs.saved')}
                        </button>
                        <button
                            className={`profile-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            {t('store.profile.tabs.settings')}
                        </button>
                    </div>

                    <div className="profile-tab-content">
                        {activeTab === 'orders' && (
                            <div className="tab-pane">
                                <h3>{t('store.profile.orders.title')}</h3>
                                {loadingOrders ? (
                                    <p className="empty-state-text">{t('store.profile.orders.loading')}</p>
                                ) : orders.length === 0 ? (
                                    <p className="empty-state-text">{t('store.profile.orders.empty')}</p>
                                ) : (
                                    <div className="orders-list">
                                        {orders.map(order => (
                                            <div key={order.id} className="customer-order-card">
                                                <div className="order-card-header">
                                                    <div>
                                                        <span className="order-number">{t('store.profile.orders.order_number', { id: order.id })}</span>
                                                        <span className="order-date">{formatDate(order.createdAt)}</span>
                                                    </div>
                                                    <span className={`order-status status-${order.status.toLowerCase()}`}>
                                                        {t(`store.order_status.${order.status.toLowerCase()}`)}
                                                    </span>
                                                </div>
                                                <div className="order-card-body">
                                                    <div className="order-items-preview">
                                                        {order.items.map((item: any) => (
                                                            <div key={item.id} className="order-item-mini">
                                                                <img 
                                                                    src={getImageUrl(item.variant?.images?.[0] || item.product?.images?.[0] || '')} 
                                                                    alt={item.product?.name} 
                                                                    className="mini-item-img" 
                                                                />
                                                                <div className="mini-item-info">
                                                                    <span className="mini-item-name">{item.product?.name}</span>
                                                                    <span className="mini-item-qty">{t('store.profile.orders.qty', { count: item.quantity })} × {Number(item.price).toFixed(0)} {t('admin.dashboard.card.currency')}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="order-card-footer">
                                                        <span className="order-total-label">{t('store.profile.orders.total')}</span>
                                                        <span className="order-total-price">{Number(order.totalPrice).toFixed(0)} {t('admin.dashboard.card.currency')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'saved' && (
                            <div className="tab-pane">
                                <h3>{t('store.profile.saved.title')}</h3>
                                <p className="empty-state-text">{t('store.profile.saved.empty')}</p>
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="tab-pane profile-settings-pane">
                                <h3>{t('store.profile.settings.title')}</h3>

                                {profileMessage.text && (
                                    <div className={`profile-alert alert-${profileMessage.type}`}>
                                        {profileMessage.text}
                                    </div>
                                )}

                                <form className="profile-settings-form" onSubmit={handleProfileUpdate}>
                                    <div className="form-group">
                                        <label>{t('store.profile.settings.name_label')}</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder={t('store.profile.details.not_specified')}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>{t('store.profile.settings.email_label')}</label>
                                        <input
                                            type="email"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>{t('store.profile.settings.avatar_label')}</label>
                                        <input
                                            type="url"
                                            value={editAvatar}
                                            onChange={(e) => setEditAvatar(e.target.value)}
                                            placeholder="https://example.com/my-photo.jpg"
                                        />
                                        <small className="form-hint">{t('store.profile.settings.avatar_hint')}</small>
                                    </div>

                                    <div className="form-actions">
                                        <button
                                            type="submit"
                                            className="btn-save-profile"
                                            disabled={isSavingProfile}
                                        >
                                            {isSavingProfile ? t('store.profile.settings.saving') : t('store.profile.settings.save')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
