import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Eye, Search, XCircle, MapPin, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import './AdminCustomersPage.css';

interface Product {
    name: string;
    images: string[];
}

interface OrderItem {
    id: number;
    quantity: number;
    price: number;
    product: Product;
    variant?: {
        images: string[];
    } | null;
}

interface Order {
    id: number;
    status: string;
    totalPrice: number;
    createdAt: string;
    items: OrderItem[];
    // Shipping Details from Order
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
}

interface Customer {
    id: number;
    email: string;
    name: string | null;
    createdAt: string;
    totalSpent: number;
    orders: Order[];
}

export const AdminCustomersPage = () => {
    const { t, i18n } = useTranslation();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/users/customers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomers(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching customers:', error);
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'NEW': return 'bg-blue-100 text-blue-800';
            case 'CONFIRMED': return 'bg-yellow-100 text-yellow-800';
            case 'PAID': return 'bg-purple-100 text-purple-800';
            case 'SHIPPED': return 'bg-indigo-100 text-indigo-800';
            case 'DELIVERED': return 'bg-green-100 text-green-800';
            case 'CANCELED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const translateStatus = (status: string) => {
        return t(`admin.orders.status.${status}`, { defaultValue: status });
    };

    const getDateLocale = () => {
        return i18n.language === 'en' ? enUS : uk;
    };

    const filteredCustomers = customers.filter(customer =>
        (customer.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.id.toString().includes(searchTerm))
    );

    if (loading) {
        return <div className="p-8 text-center text-gray-500">{t('admin.customers.loading')}</div>;
    }

    return (
        <div className="admin-customers-page">
            <div className="page-header">
                <h2>{t('admin.customers.title')}</h2>

                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder={t('admin.customers.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="customers-table-container">
                <table className="customers-table">
                    <thead>
                        <tr>
                            <th>{t('admin.customers.table.id')}</th>
                            <th>{t('admin.customers.table.name_email')}</th>
                            <th>{t('admin.customers.table.registration_date')}</th>
                            <th>{t('admin.customers.table.orders_count')}</th>
                            <th>{t('admin.customers.table.total_spent')}</th>
                            <th>{t('admin.customers.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-500">
                                    {t('admin.customers.no_customers')}
                                </td>
                            </tr>
                        ) : (
                            filteredCustomers.map(customer => (
                                <tr key={customer.id}>
                                    <td className="font-semibold">#{customer.id}</td>
                                    <td>
                                        <div className="customer-info-cell">
                                            <span className="customer-name">{customer.name || t('admin.customers.no_name')}</span>
                                            <span className="customer-email">{customer.email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {format(new Date(customer.createdAt), 'dd MMMM yyyy, HH:mm', { locale: getDateLocale() })}
                                    </td>
                                    <td>
                                        <span className="orders-count">{customer.orders.length}</span>
                                    </td>
                                    <td className="font-bold text-green-600">
                                        {Number(customer.totalSpent).toLocaleString(i18n.language === 'en' ? 'en-US' : 'uk-UA')} ₴
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button
                                                className="btn-icon"
                                                title={t('admin.customers.view_orders_tooltip')}
                                                onClick={() => setSelectedCustomer(customer)}
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Customer Details Modal / Slide-over */}
            {selectedCustomer && (
                <div className="customer-modal-overlay" onClick={() => setSelectedCustomer(null)}>
                    <div className="customer-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>{t('admin.customers.modal.title', { id: selectedCustomer.id })}</h3>
                                <p className="text-gray-500 text-sm mt-1">{selectedCustomer.name || selectedCustomer.email}</p>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedCustomer(null)}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Summary Cards */}
                            <div className="customer-summary-cards">
                                <div className="summary-card">
                                    <span className="label">{t('admin.customers.modal.total_spent')}</span>
                                    <span className="value text-green-600">{Number(selectedCustomer.totalSpent).toLocaleString(i18n.language === 'en' ? 'en-US' : 'uk-UA')} ₴</span>
                                </div>
                                <div className="summary-card">
                                    <span className="label">{t('admin.customers.modal.orders')}</span>
                                    <span className="value">{selectedCustomer.orders.length}</span>
                                </div>
                                <div className="summary-card">
                                    <span className="label">{t('admin.customers.modal.registration')}</span>
                                    <span className="value text-sm">{format(new Date(selectedCustomer.createdAt), 'dd.MM.yyyy')}</span>
                                </div>
                            </div>

                            <h4 className="section-title">{t('admin.customers.modal.order_history')}</h4>

                            {selectedCustomer.orders.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">{t('admin.customers.modal.no_orders')}</p>
                            ) : (
                                <div className="customer-orders-list">
                                    {selectedCustomer.orders.map(order => (
                                        <div key={order.id} className="customer-order-card">
                                            <div className="order-card-header">
                                                <div className="order-id-date">
                                                    <span className="font-bold">{t('admin.customers.modal.order_id', { id: order.id })}</span>
                                                    <span className="text-gray-500 text-sm flex items-center gap-1">
                                                        <Calendar size={14} />
                                                        {format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm', { locale: getDateLocale() })}
                                                    </span>
                                                </div>
                                                <span className={`status-badge ${getStatusStyle(order.status)}`}>
                                                    {translateStatus(order.status)}
                                                </span>
                                            </div>

                                            {/* Shipping Info Snapshot */}
                                            <div className="order-shipping-info">
                                                <p><Mail size={14} /> {order.email}</p>
                                                <p><Phone size={14} /> {order.phone}</p>
                                                <p><MapPin size={14} /> {order.city}, {order.address}</p>
                                            </div>

                                            <div className="order-items-mini">
                                                {order.items.map(item => (
                                                    <div key={item.id} className="item-mini">
                                                        <img
                                                            src={(item.variant?.images?.[0] || item.product?.images?.[0]) || 'https://via.placeholder.com/40'}
                                                            alt={item.product?.name || 'Product'}
                                                        />
                                                        <div className="item-mini-details">
                                                            <span className="item-name truncate">{item.product?.name || t('admin.customers.no_name')}</span>
                                                            <span className="item-qty-price">
                                                                {t('admin.customers.modal.qty_price', { count: item.quantity, price: Number(item.price).toLocaleString(i18n.language === 'en' ? 'en-US' : 'uk-UA') })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="order-card-footer">
                                                <span>{t('admin.orders.details.summary')}:</span>
                                                <span className="font-bold">{Number(order.totalPrice).toLocaleString(i18n.language === 'en' ? 'en-US' : 'uk-UA')} ₴</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
