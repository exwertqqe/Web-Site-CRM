import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Eye, Clock, CheckCircle2, Truck, Package, XCircle, FileText, Navigation } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { SmartStorekeeperModal } from '../../components/admin/SmartStorekeeperModal';
import './AdminOrdersPage.css';

interface OrderItem {
    id: number;
    productId: number;
    quantity: number;
    price: number;
    serialNumber?: string;
    warrantyMonths?: number;
    warrantyEndDate?: string;
    product: {
        name: string;
        images: string[];
    };
    variant?: {
        images: string[];
    } | null;
}

interface Order {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    city: string;
    address: string;
    status: 'NEW' | 'CONFIRMED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELED' | 'WARRANTY_CLAIM';
    totalPrice: number;
    createdAt: string;
    items: OrderItem[];
}

export const AdminOrdersPage = () => {
    const { t, i18n } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Warranty Generation State
    const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
    const [warrantyData, setWarrantyData] = useState<Record<number, { serial: string, months: string }>>({});

    const [storekeeperData, setStorekeeperData] = useState<{ isOpen: boolean, placements: any[], productName: string } | null>(null);

    // Function to generate PDF and save to server
    const generateWarrantyPDF = async () => {
        if (!selectedOrder) return;

        try {
            const token = localStorage.getItem('token');
            // 1. Save warranty data to server for each item that has data
            const savePromises = Object.entries(warrantyData).map(([itemId, data]) => {
                if (!data.serial || !data.months) return Promise.resolve();
                return axios.patch(`/api/orders/items/${itemId}/warranty`, {
                    serialNumber: data.serial,
                    warrantyMonths: parseInt(data.months)
                }, { headers: { Authorization: `Bearer ${token}` } });
            });

            await Promise.all(savePromises);

            // 2. Generate PDF
            const element = document.getElementById('warranty-print-template');
            if (element) {
                const opt = {
                    margin: 10,
                    filename: `warranty_order_${selectedOrder.id}.pdf`,
                    image: { type: 'jpeg' as const, quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
                };
                html2pdf().set(opt).from(element).save();
            }

            setIsWarrantyModalOpen(false);
            fetchOrders(); // Refresh to show updated data
        } catch (error) {
            console.error('Failed to save warranty data:', error);
            alert(t('admin.orders.warranty_modal.save_error'));
        }
    };

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/orders', {
                params: { search: searchTerm },
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            // Non-blocking error for now
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchOrders();
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const handleStatusChange = async (orderId: number, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/orders/${orderId}`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
            }
        } catch (error) {
            console.error('Failed to change status:', error);
            alert(t('admin.orders.actions.status_change_error'));
        }
    };

    const getImageUrl = (path: string) => {
        if (!path) return 'https://via.placeholder.com/50';
        if (path.startsWith('http')) return path;
        const baseUrl = window.location.origin;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'NEW': return { icon: <Clock size={16} />, className: 'status-new', label: t('admin.orders.status.NEW') };
            case 'CONFIRMED': return { icon: <CheckCircle2 size={16} />, className: 'status-confirmed', label: t('admin.orders.status.CONFIRMED') };
            case 'PAID': return { icon: <CheckCircle2 size={16} />, className: 'status-paid', label: t('admin.orders.status.PAID') };
            case 'SHIPPED': return { icon: <Truck size={16} />, className: 'status-shipped', label: t('admin.orders.status.SHIPPED') };
            case 'DELIVERED': return { icon: <Package size={16} />, className: 'status-delivered', label: t('admin.orders.status.DELIVERED') };
            case 'CANCELED': return { icon: <XCircle size={16} />, className: 'status-canceled', label: t('admin.orders.status.CANCELED') };
            case 'WARRANTY_CLAIM': return { icon: <FileText size={16} />, className: 'status-warranty', label: t('admin.orders.status.WARRANTY_CLAIM') };
            default: return { icon: <Clock size={16} />, className: 'status-new', label: status };
        }
    };

    const handleGatherItems = async () => {
        if (!selectedOrder) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/warehouse/order-placements/${selectedOrder.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data && res.data.length > 0) {
                // Determine a generalized name if multiple items
                const productName = res.data.length === 1 
                    ? res.data[0].productName 
                    : t('admin.orders.storekeeper.generalized_name', { id: selectedOrder.id, count: res.data.length });
                
                setStorekeeperData({
                    isOpen: true,
                    placements: res.data,
                    productName
                });
            } else {
                alert(t('admin.orders.storekeeper.not_found'));
            }
        } catch (error) {
            console.error('Failed to get placements:', error);
            alert(t('admin.orders.storekeeper.error'));
        }
    };

    if (loading) return <div className="p-8">{t('admin.orders.loading')}</div>;

    return (
        <div className="admin-orders-page">
            <div className="page-header">
                <h1 className="page-title">{t('admin.orders.title')}</h1>
                <div className="header-actions">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder={t('admin.orders.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-search-input"
                        />
                    </div>
                </div>
            </div>

            <div className="orders-container">
                {/* Orders List */}
                <div className={`orders-list-panel ${selectedOrder ? 'with-selection' : ''}`}>
                    <div className="table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>{t('admin.orders.table.id')}</th>
                                    <th>{t('admin.orders.table.date')}</th>
                                    <th>{t('admin.orders.table.customer')}</th>
                                    <th>{t('admin.orders.table.total')}</th>
                                    <th>{t('admin.orders.table.status')}</th>
                                    <th>{t('admin.orders.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-500">
                                            {t('admin.orders.no_orders')}
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => {
                                        const statusConfig = getStatusConfig(order.status);
                                        return (
                                            <tr
                                                key={order.id}
                                                className={selectedOrder?.id === order.id ? 'selected-row' : ''}
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                <td className="font-medium order-id-cell">{order.id}</td>
                                                <td>
                                                    <div className="order-date-time">
                                                        <span>{new Date(order.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'uk-UA')}</span>
                                                        <span className="order-time">{new Date(order.createdAt).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="client-info-cell">
                                                        <span className="client-name">{order.firstName} {order.lastName}</span>
                                                        <span className="client-phone">{order.phone}</span>
                                                    </div>
                                                </td>
                                                <td className="font-semibold">{Number(order.totalPrice).toFixed(0)} ₴</td>
                                                <td>
                                                    <span className={`status-badge ${statusConfig.className}`}>
                                                        {statusConfig.icon}
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="icon-btn view" title={t('admin.orders.details.view_details_tooltip')}>
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Order Details Panel */}
                {selectedOrder && (
                    <div className="order-details-panel">
                        <div className="details-header">
                            <div className="flex-header-left">
                                <h2>{t('admin.orders.details.title', { id: selectedOrder.id })}</h2>
                                <button
                                    className="btn-warranty-small"
                                    onClick={() => {
                                        const allHaveWarranty = selectedOrder.items.every(i => i.serialNumber && i.warrantyMonths);
                                        if (allHaveWarranty) {
                                            const initial: any = {};
                                            selectedOrder.items.forEach(i => {
                                                initial[i.id] = { serial: i.serialNumber, months: String(i.warrantyMonths) };
                                            });
                                            setWarrantyData(initial);
                                            setTimeout(() => generateWarrantyPDF(), 100);
                                        } else {
                                            setIsWarrantyModalOpen(true);
                                        }
                                    }}
                                >
                                    <FileText size={16} /> {t('admin.orders.details.warranty_btn')}
                                </button>
                                <button className="btn-warranty-small" onClick={handleGatherItems}>
                                    <Navigation size={15} /> {t('admin.orders.details.smart_storekeeper_btn')}
                                </button>
                            </div>
                            <button className="close-details-btn" onClick={() => setSelectedOrder(null)}>
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="details-content">
                            <div className="details-section">
                                <h3>{t('admin.orders.details.status_section')}</h3>
                                <select
                                    className="status-select"
                                    value={selectedOrder.status}
                                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                                >
                                    <option value="NEW">{t('admin.orders.status.NEW')}</option>
                                    <option value="CONFIRMED">{t('admin.orders.status.CONFIRMED')}</option>
                                    <option value="PAID">{t('admin.orders.status.PAID')}</option>
                                    <option value="SHIPPED">{t('admin.orders.status.SHIPPED')}</option>
                                    <option value="DELIVERED">{t('admin.orders.status.DELIVERED')}</option>
                                    <option value="CANCELED">{t('admin.orders.status.CANCELED')}</option>
                                    <option value="WARRANTY_CLAIM">{t('admin.orders.status.WARRANTY_CLAIM')}</option>
                                </select>
                            </div>

                            <div className="details-section">
                                <h3>{t('admin.orders.details.customer_info')}</h3>
                                <div className="info-grid">
                                    <div className="info-group">
                                        <span className="info-label">{t('admin.orders.details.customer_name')}</span>
                                        <span className="info-value">{selectedOrder.firstName} {selectedOrder.lastName}</span>
                                    </div>
                                    <div className="info-group">
                                        <span className="info-label">{t('admin.orders.details.customer_phone')}</span>
                                        <span className="info-value">{selectedOrder.phone}</span>
                                    </div>
                                    <div className="info-group">
                                        <span className="info-label">{t('admin.orders.details.customer_email')}</span>
                                        <span className="info-value">{selectedOrder.email || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="details-section">
                                <h3>{t('admin.orders.details.shipping_info')}</h3>
                                <div className="info-grid single-col">
                                    <div className="info-group">
                                        <span className="info-label">{t('admin.orders.details.city')}</span>
                                        <span className="info-value">{selectedOrder.city}</span>
                                    </div>
                                    <div className="info-group">
                                        <span className="info-label">{t('admin.orders.details.address')}</span>
                                        <span className="info-value">{selectedOrder.address}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="details-section">
                                <h3>{t('admin.orders.details.items', { count: selectedOrder.items.length })}</h3>
                                <div className="order-items-list">
                                    {selectedOrder.items.map(item => (
                                        <div key={item.id} className="order-item-card">
                                            <img
                                                src={getImageUrl(item.variant?.images?.[0] || item.product?.images?.[0] || '')}
                                                alt={item.product?.name || 'Product'}
                                                className="order-item-img"
                                            />
                                            <div className="order-item-info">
                                                <div className="order-item-name">{item.product?.name || `Product #${item.productId}`}</div>
                                                <div className="order-item-meta">
                                                    <span>{Number(item.price).toFixed(0)} ₴ x {item.quantity} шт.</span>
                                                    <span className="order-item-sum">{(Number(item.price) * item.quantity).toFixed(0)} ₴</span>
                                                </div>
                                                {item.serialNumber && (
                                                    <div className="order-item-warranty-info">
                                                        <div className="warranty-sn">{t('admin.orders.details.warranty_sn', { sn: item.serialNumber })}</div>
                                                        <div className="warranty-status">
                                                            {(() => {
                                                                const end = new Date(item.warrantyEndDate!);
                                                                const now = new Date();
                                                                const diff = end.getTime() - now.getTime();
                                                                const months = Math.ceil(diff / (1000 * 60 * 60 * 24 * 30.44));
                                                                if (diff <= 0) return <span className="expired">{t('admin.orders.details.warranty_expired')}</span>;
                                                                return <span className="active">{t('admin.orders.details.warranty_active', { count: months })}</span>;
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="order-grand-total">
                                    <span>{t('admin.orders.details.total_label')}</span>
                                    <span className="total-value">{Number(selectedOrder.totalPrice).toFixed(0)} ₴</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* -------------------- WARRANTY MODAL -------------------- */}
                {isWarrantyModalOpen && selectedOrder && (
                    <div className="warranty-modal-overlay">
                        <div className="warranty-modal">
                            <div className="warranty-modal-header">
                                <h3>{t('admin.orders.warranty_modal.title')}</h3>
                                <button className="close-modal-btn" onClick={() => setIsWarrantyModalOpen(false)}>
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <div className="warranty-modal-body">
                                <p className="warranty-instruction">{t('admin.orders.warranty_modal.instruction')}</p>
                                <div className="warranty-items-grid">
                                    {selectedOrder.items.map(item => (
                                        <div key={item.id} className="warranty-item-row">
                                            <div className="warranty-item-name">
                                                {item.product?.name || `Product #${item.productId}`} ({item.quantity} шт)
                                                {item.serialNumber && <div className="current-sn">{t('admin.orders.warranty_modal.current_sn', { sn: item.serialNumber })}</div>}
                                            </div>
                                            <div className="warranty-item-inputs">
                                                <input
                                                    type="text"
                                                    placeholder={t('admin.orders.warranty_modal.sn_placeholder')}
                                                    defaultValue={item.serialNumber || ''}
                                                    onBlur={e => setWarrantyData(prev => ({
                                                        ...prev,
                                                        [item.id]: { ...prev[item.id], serial: e.target.value, months: prev[item.id]?.months || String(item.warrantyMonths || '') }
                                                    }))}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder={t('admin.orders.warranty_modal.months_placeholder')}
                                                    defaultValue={item.warrantyMonths || ''}
                                                    onBlur={e => setWarrantyData(prev => ({
                                                        ...prev,
                                                        [item.id]: { ...prev[item.id], months: e.target.value, serial: prev[item.id]?.serial || item.serialNumber || '' }
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="warranty-modal-footer">
                                <button className="btn-secondary" onClick={() => setIsWarrantyModalOpen(false)}>{t('admin.orders.warranty_modal.cancel')}</button>
                                <button className="btn-primary" onClick={generateWarrantyPDF}>{t('admin.orders.warranty_modal.submit')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* -------------------- INVISIBLE WARRANTY PDF TEMPLATE -------------------- */}
                {selectedOrder && (
                    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                        <div id="warranty-print-template" className="warranty-print-container">
                            <div className="warranty-print-header">
                                <h1>{t('admin.orders.pdf.title')}</h1>
                                <p>{t('admin.orders.pdf.order_info', { id: selectedOrder.id, date: new Date(selectedOrder.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'uk-UA') })}</p>
                            </div>
                            <div className="warranty-print-details">
                                <p><strong>{t('admin.orders.pdf.customer')}:</strong> {selectedOrder.firstName} {selectedOrder.lastName}</p>
                                <p><strong>{t('admin.orders.pdf.phone')}:</strong> {selectedOrder.phone}</p>
                                <p><strong>{t('admin.orders.pdf.sale_date')}:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'uk-UA')}</p>
                            </div>
                            <table className="warranty-print-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'left' }}>{t('admin.orders.pdf.table.number')}</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'left' }}>{t('admin.orders.pdf.table.name')}</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'left' }}>{t('admin.orders.pdf.table.quantity')}</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'left' }}>{t('admin.orders.pdf.table.sn')}</th>
                                        <th style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'left' }}>{t('admin.orders.pdf.table.warranty')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map((item, index) => (
                                        <tr key={item.id}>
                                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>{index + 1}</td>
                                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>{item.product?.name || `Product #${item.productId}`}</td>
                                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>{item.quantity} {t('admin.orders.pdf.units')}</td>
                                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>{warrantyData[item.id]?.serial || '—'}</td>
                                            <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>{warrantyData[item.id]?.months ? `${warrantyData[item.id].months} ${t('admin.orders.pdf.months')}` : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="warranty-print-footer">
                                <div className="warranty-terms-text">
                                    <h4>{t('admin.orders.pdf.terms_title')}</h4>
                                    <p>{t('admin.orders.pdf.terms_1')}</p>
                                    <p>{t('admin.orders.pdf.terms_2')}</p>
                                    <p>{t('admin.orders.pdf.terms_3')}</p>
                                    <p>{t('admin.orders.pdf.terms_4')}</p>
                                    <ul>
                                        <li>{t('admin.orders.pdf.list_1')}</li>
                                        <li>{t('admin.orders.pdf.list_2')}</li>
                                        <li>{t('admin.orders.pdf.list_3')}</li>
                                        <li>{t('admin.orders.pdf.list_4')}</li>
                                        <li>{t('admin.orders.pdf.list_5')}</li>
                                    </ul>
                                    <p>{t('admin.orders.pdf.terms_5')}</p>
                                    <div className="warranty-contact">
                                        <p><strong>{t('admin.orders.pdf.contact_title')}</strong></p>
                                        <p>GravityShop</p>
                                        <p>0637923369</p>
                                    </div>
                                </div>
                                <div className="warranty-signatures">
                                    <div className="signature-box">
                                        <p>{t('admin.orders.pdf.signatures.seller')}</p>
                                        <div className="signature-line"></div>
                                        <p className="signature-sub">{t('admin.orders.pdf.signatures.signature_sub')}</p>
                                    </div>
                                    <div className="signature-box">
                                        <p>{t('admin.orders.pdf.signatures.customer')}</p>
                                        <div className="signature-line"></div>
                                        <p className="signature-sub">{t('admin.orders.pdf.signatures.signature_sub')}</p>
                                    </div>
                                </div>
                                <p className="warranty-terms">{t('admin.orders.pdf.confirm_text')}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {storekeeperData && (
                <SmartStorekeeperModal
                    isOpen={storekeeperData.isOpen}
                    onClose={() => setStorekeeperData(null)}
                    action="TAKE"
                    placements={storekeeperData.placements}
                    productName={storekeeperData.productName}
                />
            )}
        </div>
    );
};
