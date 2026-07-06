import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Shield, ShieldAlert, User as UserIcon, AlertTriangle, Image as ImageIcon, Plus, Trash2, ExternalLink, Search, X, Database, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import './AdminSettingsPage.css';
import { Product } from '../../types';
import { WarehouseSettingsSection } from './WarehouseSettingsSection';

interface User {
    id: number;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
}

interface Banner {
    id: number;
    title: string | null;
    description: string | null;
    imageUrl: string;
    linkUrl: string | null;
    order: number;
    isActive: boolean;
}

export const AdminSettingsPage = () => {
    const { t, i18n } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [chatDisabled, setChatDisabled] = useState(false);
    const [purchasesDisabled, setPurchasesDisabled] = useState(false);
    const [showMaintenancePopup, setShowMaintenancePopup] = useState(false);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [newBanner, setNewBanner] = useState({ imageUrl: '', linkUrl: '', order: 0 });

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = window.location.origin;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    };
    const [isAddingBanner, setIsAddingBanner] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Product Selector Modal State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [productSearchQuery, setProductSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
        fetchGlobalSettings();
        fetchBanners();
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products');
            setAllProducts(res.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchBanners = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/banners/admin', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBanners(res.data);
        } catch (error) {
            console.error('Error fetching banners:', error);
        }
    };

    const fetchGlobalSettings = async () => {
        try {
            const maintenanceRes = await axios.get('/api/settings/maintenance');
            setMaintenanceMode(maintenanceRes.data.enabled);

            const chatRes = await axios.get('/api/settings/chat');
            setChatDisabled(chatRes.data.disabled);

            const purchasesRes = await axios.get('/api/settings/purchases');
            setPurchasesDisabled(purchasesRes.data.disabled);
        } catch (error) {
            console.error('Error fetching global settings:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching all users:', error);
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: number, newRole: string) => {
        setUpdatingUserId(userId);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/users/${userId}/role`, { role: newRole }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Error updating user role:', error);
            alert(t('admin.settings.errors.role_update'));
        } finally {
            setUpdatingUserId(null);
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'ADMIN': return <ShieldAlert size={16} className="text-red-600" />;
            case 'MANAGER': return <Shield size={16} className="text-yellow-600" />;
            default: return <UserIcon size={16} className="text-gray-500" />;
        }
    };

    const handleToggleMaintenance = () => {
        if (!maintenanceMode) {
            // About to enable, show popup
            setShowMaintenancePopup(true);
        } else {
            // Disabling, just do it directly
            confirmMaintenanceToggle(false);
        }
    };

    const confirmMaintenanceToggle = async (enable: boolean) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.patch('/api/settings/maintenance',
                { enabled: enable },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMaintenanceMode(res.data.enabled);
            setShowMaintenancePopup(false);
        } catch (error) {
            console.error('Error toggling maintenance mode:', error);
            alert(t('admin.settings.errors.mode_change'));
            setShowMaintenancePopup(false);
        }
    };

    const handleToggleChat = async () => {
        try {
            const token = localStorage.getItem('token');
            const newStatus = !chatDisabled;
            const res = await axios.patch('/api/settings/chat',
                { disabled: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setChatDisabled(res.data.disabled);
        } catch (error) {
            console.error('Error toggling chat status:', error);
            alert(t('admin.settings.errors.chat_toggle'));
        }
    };

    const handleTogglePurchases = async () => {
        try {
            const token = localStorage.getItem('token');
            const newStatus = !purchasesDisabled;
            const res = await axios.patch('/api/settings/purchases',
                { disabled: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPurchasesDisabled(res.data.disabled);
        } catch (error) {
            console.error('Error toggling purchases status:', error);
            alert(t('admin.settings.errors.purchases_toggle'));
        }
    };
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/banners/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            setNewBanner({ ...newBanner, imageUrl: res.data.url });
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(t('admin.settings.errors.upload'));
        } finally {
            setIsUploading(false);
        }
    };

    const filteredProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
    );

    const handleSelectProduct = (slug: string) => {
        setNewBanner({ ...newBanner, linkUrl: `/product/${slug}` });
        setIsProductModalOpen(false);
    };

    const handleAddBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/banners', newBanner, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBanners([...banners, res.data].sort((a, b) => a.order - b.order));
            setNewBanner({ imageUrl: '', linkUrl: '', order: 0 });
            setIsAddingBanner(false);
        } catch (error) {
            console.error('Error adding banner:', error);
            alert(t('admin.settings.errors.add_banner'));
        }
    };

    const handleDeleteBanner = async (id: number) => {
        if (!window.confirm(t('admin.settings.banners.delete_confirm'))) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/banners/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBanners(banners.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert(t('admin.settings.errors.delete_banner'));
        }
    };

    const handleDownloadSql = async () => {
        setIsBackingUp(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/settings/backup/sql', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `crm_backup_${date}.sql`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Sql backup failed:', error);
            alert(t('admin.settings.errors.sql_backup'));
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleDownloadExcel = async () => {
        setIsExporting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/settings/backup/excel', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `products_export_${date}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Excel export failed:', error);
            alert(t('admin.settings.errors.excel_export'));
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">{t('admin.settings.loading')}</div>;
    }

    return (
        <div className="admin-settings-page">
            <div className="page-header">
                <h2>{t('admin.settings.title')}</h2>
                <p className="text-gray-500 text-sm mt-1">{t('admin.settings.subtitle')}</p>
            </div>

            <div className="settings-section">
                <h3>{t('admin.settings.general.title')}</h3>
                <div className="settings-card">
                    <div className="setting-row">
                        <div className="setting-info">
                            <h4>{t('admin.settings.general.maintenance.title')}</h4>
                            <p>{t('admin.settings.general.maintenance.desc')}</p>
                        </div>
                        <div className="setting-action">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={maintenanceMode}
                                    onChange={handleToggleMaintenance}
                                    className="sr-only"
                                />
                                <div className={`toggle-bg ${maintenanceMode ? 'active' : ''}`}>
                                    <div className={`toggle-knob ${maintenanceMode ? 'active' : ''}`}></div>
                                </div>
                            </label>
                            <span className={`toggle-label ${maintenanceMode ? 'active-text' : ''}`}>
                                {maintenanceMode ? t('admin.settings.general.maintenance.on') : t('admin.settings.general.maintenance.off')}
                            </span>
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <h4>{t('admin.settings.general.chat.title')}</h4>
                            <p>{t('admin.settings.general.chat.desc')}</p>
                        </div>
                        <div className="setting-action">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={chatDisabled}
                                    onChange={handleToggleChat}
                                    className="sr-only"
                                />
                                <div className={`toggle-bg ${chatDisabled ? 'active' : ''}`}>
                                    <div className={`toggle-knob ${chatDisabled ? 'active' : ''}`}></div>
                                </div>
                            </label>
                            <span className={`toggle-label ${chatDisabled ? 'active-text' : ''}`}>
                                {chatDisabled ? t('admin.settings.general.chat.on') : t('admin.settings.general.chat.off')}
                            </span>
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <h4>{t('admin.settings.general.purchases.title')}</h4>
                            <p>{t('admin.settings.general.purchases.desc')}</p>
                        </div>
                        <div className="setting-action">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={purchasesDisabled}
                                    onChange={handleTogglePurchases}
                                    className="sr-only"
                                />
                                <div className={`toggle-bg ${purchasesDisabled ? 'active' : ''}`}>
                                    <div className={`toggle-knob ${purchasesDisabled ? 'active' : ''}`}></div>
                                </div>
                            </label>
                            <span className={`toggle-label ${purchasesDisabled ? 'active-text' : ''}`}>
                                {purchasesDisabled ? t('admin.settings.general.purchases.on') : t('admin.settings.general.purchases.off')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warehouse Settings Section */}
            <WarehouseSettingsSection />

            <div className="settings-section mt-8">
                <h3>{t('admin.settings.backup.title')}</h3>
                <div className="backup-grid">
                    <div className="backup-card">
                        <div className="backup-icon sql">
                            <Database size={24} />
                        </div>
                        <div className="backup-info">
                            <h4>{t('admin.settings.backup.sql.title')}</h4>
                            <p>{t('admin.settings.backup.sql.desc')}</p>
                        </div>
                        <button 
                            className={`btn-backup ${isBackingUp ? 'loading' : ''}`} 
                            onClick={handleDownloadSql}
                            disabled={isBackingUp}
                        >
                            {isBackingUp ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                            <span>{isBackingUp ? t('admin.settings.backup.sql.creating') : t('admin.settings.backup.sql.btn')}</span>
                        </button>
                    </div>

                    <div className="backup-card">
                        <div className="backup-icon excel">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div className="backup-info">
                            <h4>{t('admin.settings.backup.excel.title')}</h4>
                            <p>{t('admin.settings.backup.excel.desc')}</p>
                        </div>
                        <button 
                            className={`btn-backup excel ${isExporting ? 'loading' : ''}`} 
                            onClick={handleDownloadExcel}
                            disabled={isExporting}
                        >
                            {isExporting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                            <span>{isExporting ? t('admin.settings.backup.excel.processing') : t('admin.settings.backup.excel.btn')}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-section mt-8">
                <div className="section-header">
                    <h3>{t('admin.settings.banners.title')}</h3>
                    <button className="btn-add-banner" onClick={() => setIsAddingBanner(true)}>
                        <Plus size={18} /> {t('admin.settings.banners.add_btn')}
                    </button>
                </div>

                {isAddingBanner && (
                    <div className="banner-form-card mb-6">
                        <form onSubmit={handleAddBanner}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>{t('admin.settings.banners.form.image_url')}</label>
                                    <div className="image-input-group">
                                        <input
                                            type="text"
                                            required
                                            placeholder={t('admin.settings.banners.form.image_placeholder')}
                                            value={newBanner.imageUrl}
                                            onChange={e => setNewBanner({ ...newBanner, imageUrl: e.target.value })}
                                        />
                                        <div className="upload-separator">{t('admin.settings.banners.form.or')}</div>
                                        <label className="file-upload-label">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                                className="hidden-file-input"
                                            />
                                            <div className={`btn-upload-file ${isUploading ? 'loading' : ''}`}>
                                                {isUploading ? t('admin.settings.banners.form.uploading') : t('admin.settings.banners.form.upload_btn')}
                                            </div>
                                        </label>
                                        <div className="image-size-hint">{t('admin.settings.banners.form.size_hint')}</div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('admin.settings.banners.form.link_url')}</label>
                                    <div className="link-input-group">
                                        <input
                                            type="text"
                                            placeholder={t('admin.settings.banners.form.link_placeholder')}
                                            value={newBanner.linkUrl}
                                            onChange={e => setNewBanner({ ...newBanner, linkUrl: e.target.value })}
                                        />
                                        <button 
                                            type="button" 
                                            className="btn-select-product"
                                            onClick={() => setIsProductModalOpen(true)}
                                            title="Вибрати товар"
                                        >
                                            <Search size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('admin.settings.banners.form.order')}</label>
                                    <input
                                        type="number"
                                        value={newBanner.order}
                                        onChange={e => setNewBanner({ ...newBanner, order: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="form-actions mt-6">
                                <button type="button" className="btn-cancel" onClick={() => setIsAddingBanner(false)}>
                                    <X size={18} /> {t('admin.settings.banners.form.cancel')}
                                </button>
                                <button type="submit" className="btn-save">
                                    <Plus size={18} /> {t('admin.settings.banners.form.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="banners-grid mt-4">
                    {banners.length > 0 ? (
                        banners.map(banner => (
                            <div key={banner.id} className="banner-admin-card">
                                <div className="banner-preview">
                                    <img src={getImageUrl(banner.imageUrl)} alt="Banner Preview" />
                                    <div className="banner-overlay-actions">
                                        <button onClick={() => handleDeleteBanner(banner.id)} className="btn-delete-banner" title={t('admin.settings.banners.delete_confirm')}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="banner-details">
                                    <div className="banner-link">
                                        <ExternalLink size={14} />
                                        <span>{banner.linkUrl || t('admin.settings.banners.not_specified')}</span>
                                    </div>
                                    <div className="banner-order">{t('admin.settings.banners.order_label', { order: banner.order })}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-banners">
                            <ImageIcon size={48} />
                            <p>{t('admin.settings.banners.empty')}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="settings-section mt-8">
                <h3>{t('admin.settings.users.title')}</h3>

                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>{t('admin.settings.users.table.id')}</th>
                                <th>{t('admin.settings.users.table.user')}</th>
                                <th>{t('admin.settings.users.table.registration')}</th>
                                <th>{t('admin.settings.users.table.role')}</th>
                                <th>{t('admin.settings.users.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="font-semibold text-gray-500">#{user.id}</td>
                                    <td>
                                        <div className="user-info-cell">
                                            <span className="user-name">{user.name || t('admin.settings.users.no_name')}</span>
                                            <span className="user-email">{user.email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: i18n.language === 'en' ? enUS : uk })}
                                    </td>
                                    <td>
                                        <div className={`role-badge role-${user.role.toLowerCase()}`}>
                                            {getRoleIcon(user.role)}
                                            <span>{user.role}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <select
                                            className="role-select"
                                            value={user.role}
                                            disabled={updatingUserId === user.id}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        >
                                            <option value="USER">{t('admin.settings.users.roles.USER')}</option>
                                            <option value="ADMIN">{t('admin.settings.users.roles.ADMIN')}</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Maintenance Mode Confirmation Popup */}
            {showMaintenancePopup && (
                <div className="admin-modal-overlay">
                    <div className="maintenance-modal">
                        <div className="modal-icon warning">
                            <AlertTriangle size={32} />
                        </div>
                        <h3>{t('admin.settings.maintenance_modal.title')}</h3>
                        <p className="modal-warning-text">
                            {t('admin.settings.maintenance_modal.desc')}
                        </p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowMaintenancePopup(false)}>
                                {t('admin.settings.banners.form.cancel')}
                            </button>
                            <button className="btn-danger" onClick={() => confirmMaintenanceToggle(true)}>
                                {t('admin.settings.maintenance_modal.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Selector Modal */}
            {isProductModalOpen && (
                <div className="admin-modal-overlay">
                    <div className="product-selector-modal">
                        <div className="modal-header">
                            <h3>{t('admin.settings.product_modal.title')}</h3>
                            <button className="btn-close-modal" onClick={() => setIsProductModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="modal-search">
                            <div className="search-input-wrapper">
                                <Search size={18} className="search-icon" />
                                <input 
                                    type="text" 
                                    placeholder={t('admin.settings.product_modal.search_placeholder')} 
                                    value={productSearchQuery}
                                    onChange={e => setProductSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="products-list-scroll">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => {
                                    const firstVariant = product.variants?.[0];
                                    const productImage = firstVariant?.images?.[0];
                                    
                                    return (
                                        <div 
                                            key={product.id} 
                                            className="product-selection-item"
                                            onClick={() => handleSelectProduct(product.slug)}
                                        >
                                            <div className="item-thumbnail">
                                                <img src={getImageUrl(productImage || '')} alt="" />
                                                {!productImage && <ImageIcon size={20} className="text-gray-300" />}
                                            </div>
                                            <div className="item-info">
                                                <div className="item-name">{product.name}</div>
                                                <div className="item-category text-xs text-gray-400">{product.category?.name || t('admin.settings.product_modal.no_category')}</div>
                                            </div>
                                            <div className="item-price">{product.price} {t('admin.dashboard.card.currency')}</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="empty-search">{t('admin.settings.product_modal.empty')}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
