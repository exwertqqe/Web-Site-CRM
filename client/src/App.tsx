import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { LoginPage } from './pages/LoginPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ProfilePage } from './pages/ProfilePage';
import { AboutPage } from './pages/AboutPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { WarrantyPage } from './pages/WarrantyPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminKanbanPage } from './pages/admin/AdminKanbanPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminChatsPage } from './pages/admin/AdminChatsPage';
import { AdminSupportPage } from './pages/admin/AdminSupportPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { AdminWarehousePage } from './pages/admin/AdminWarehousePage';
import { AdminInventoryLogPage } from './pages/admin/AdminInventoryLogPage';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { LoginModal } from './components/auth/LoginModal';
import { useTranslation } from 'react-i18next';
import './index.css';

import { ProductProvider } from './context/ProductContext';
import { CartProvider } from './context/CartContext';

function App() {
    const { t } = useTranslation();
    const [isChecking, setIsChecking] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    useEffect(() => {
        checkMaintenanceAndAuth();
    }, []);

    const checkMaintenanceAndAuth = async () => {
        try {
            // спочатку перевіряємо чи залогінений юзер локально
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setIsAdmin(user.role === 'ADMIN');
            }

            // перевіряємо чи не увімкнено режим технічних робіт
            const res = await axios.get('/api/settings/maintenance');
            setMaintenanceMode(res.data.enabled);
        } catch (error) {
            console.error("Failed to check maintenance mode:", error);
        } finally {
            setIsChecking(false);
        }
    };

    if (isChecking) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('store.loading')}</div>;
    }

    if (maintenanceMode && !isAdmin) {
        return (
            <>
                <MaintenanceScreen onLoginClick={() => setIsLoginModalOpen(true)} />
                <LoginModal
                    isOpen={isLoginModalOpen}
                    onClose={() => setIsLoginModalOpen(false)}
                    onLoginSuccess={checkMaintenanceAndAuth}
                />
            </>
        );
    }

    return (
        <ProductProvider>
            <CartProvider>
                <Routes>
                    {/* Публічні маршрути */}
                    <Route path="/" element={<Layout><HomePage /></Layout>} />
                    <Route path="/product/:slug" element={<Layout><ProductPage /></Layout>} />
                    <Route path="/login" element={<Layout><LoginPage /></Layout>} />
                    <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
                    <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
                    <Route path="/about" element={<Layout><AboutPage /></Layout>} />
                    <Route path="/delivery" element={<Layout><DeliveryPage /></Layout>} />
                    <Route path="/warranty" element={<Layout><WarrantyPage /></Layout>} />
                    <Route path="/returns" element={<Layout><ReturnsPage /></Layout>} />

                    {/* Маршрути адмінки */}
                    <Route path="/admin" element={<AdminLayout><DashboardPage /></AdminLayout>} />
                    <Route path="/admin/products" element={<AdminLayout><AdminProductsPage /></AdminLayout>} />
                    <Route path="/admin/categories" element={<AdminLayout><AdminCategoriesPage /></AdminLayout>} />
                    <Route path="/admin/orders" element={<AdminLayout><AdminOrdersPage /></AdminLayout>} />
                    <Route path="/admin/customers" element={<AdminLayout><AdminCustomersPage /></AdminLayout>} />
                    <Route path="/admin/tasks" element={<AdminLayout><AdminKanbanPage /></AdminLayout>} />
                    <Route path="/admin/reviews" element={<AdminLayout><AdminReviewsPage /></AdminLayout>} />
                    <Route path="/admin/settings" element={<AdminLayout><AdminSettingsPage /></AdminLayout>} />
                    <Route path="/admin/chats" element={<AdminLayout><AdminChatsPage /></AdminLayout>} />
                    <Route path="/admin/support" element={<AdminLayout><AdminSupportPage /></AdminLayout>} />
                    <Route path="/admin/warehouse" element={<AdminLayout><AdminWarehousePage /></AdminLayout>} />
                    <Route path="/admin/inventory-log" element={<AdminLayout><AdminInventoryLogPage /></AdminLayout>} />
                </Routes>
            </CartProvider>
        </ProductProvider>
    );
}

export default App;
