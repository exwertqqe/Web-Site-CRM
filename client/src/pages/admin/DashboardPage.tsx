import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { useTranslation } from 'react-i18next';
import './DashboardPage.css';

interface OrderSummary {
    id: number;
    firstName: string;
    lastName: string;
    totalPrice: number;
    status: string;
    createdAt: string;
}

interface TopProduct {
    id: number;
    name: string;
    price: number;
    salesCount: number;
    image: string | null;
}

interface ChartData {
    name: string;
    total?: number;
    value?: number;
    date?: string;
}

interface LowStockProduct {
    variantId: number;
    productId: number;
    productName: string;
    colorName: string;
    stock: number;
    image: string | null;
}

interface DashboardStats {
    totalSales: number;
    activeOrders: number;
    totalProducts: number;
    newCustomers: number;
    recentOrders: OrderSummary[];
    monthlySales: ChartData[];
    categoryStats: ChartData[];
    topProducts: TopProduct[];
    averageOrderValue: number;
    cancellationRate: number;
    cancellationCount: number;
    warrantyClaimsCount: number;
    warrantyRate: number;
    totalOrdersCount: number;
    ordersThisMonth: number;
    lowStockCount: number;
    lowStockProducts: LowStockProduct[];
    ordersByStatus: ChartData[];
    ordersLast7Days: ChartData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Widgets visible by default on first visit
const DEFAULT_WIDGET_IDS = ['total_sales', 'active_orders', 'total_products', 'new_customers', 'chart_sales_by_month', 'chart_sales_by_category'];

// All available widgets (default + optional)
const ALL_WIDGET_IDS = [
    'total_sales', 'active_orders', 'total_products', 'new_customers',
    'avg_order_value', 'warranty_claims_count', 'cancellation_rate', 'low_stock',
    'orders_this_month', 'total_orders', 'cancellation_count', 'warranty_rate',
    'chart_orders_by_status', 'chart_orders_last_7_days',
    'chart_sales_by_month', 'chart_sales_by_category'
];



const STORAGE_KEY = 'dashboard_widget_order';

const loadWidgetOrder = (): string[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed: string[] = JSON.parse(saved);
            // Migrate old IDs that were renamed
            const migrated = parsed.map(id => id === 'warranty_claims' ? 'warranty_claims_count' : id);
            // Keep only known IDs and deduplicate
            const seen = new Set<string>();
            const valid = migrated.filter(id => {
                if (!ALL_WIDGET_IDS.includes(id) || seen.has(id)) return false;
                seen.add(id);
                return true;
            });
            if (valid.length > 0) return valid;
        }
    } catch { }
    return [...DEFAULT_WIDGET_IDS];
};

export const DashboardPage = () => {
    const { t, i18n } = useTranslation();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showLowStockModal, setShowLowStockModal] = useState(false);

    // Widget customization state
    const [widgetOrder, setWidgetOrder] = useState<string[]>(loadWidgetOrder);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Drag & drop refs
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (error: any) {
                console.error('Failed to fetch dashboard stats', error);
                const message = error.response?.data?.message || error.message || t('admin.dashboard.unknown_error');
                const status = error.response?.status ? ` (Code: ${error.response.status})` : '';
                setError(`${t('admin.dashboard.error_fetch')}: ${message}${status}`);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetOrder));
    }, [widgetOrder]);

    const removedWidgets = ALL_WIDGET_IDS.filter(id => !widgetOrder.includes(id));

    const removeWidget = (id: string) => setWidgetOrder(prev => prev.filter(w => w !== id));
    const addWidget = (id: string) => { setWidgetOrder(prev => [...prev, id]); setShowAddModal(false); };
    const toggleEditMode = () => { setIsEditMode(prev => !prev); setShowAddModal(false); };

    const handleDragStart = (index: number) => { dragItem.current = index; };
    const handleDragEnter = (index: number) => { dragOverItem.current = index; };
    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;
        const newOrder = [...widgetOrder];
        const dragged = newOrder.splice(dragItem.current, 1)[0];
        newOrder.splice(dragOverItem.current, 0, dragged);
        setWidgetOrder(newOrder);
        dragItem.current = null;
        dragOverItem.current = null;
    };

    if (loading) return (
        <div className="dashboard-page">
            <div className="loading-state"><div>{t('admin.dashboard.loading')}</div></div>
        </div>
    );

    if (error || !stats) return (
        <div className="dashboard-page">
            <div className="error-state">
                <h4>{t('admin.dashboard.error_fetch')}</h4>
                <p>{error || t('admin.dashboard.card.no_data')}</p>
                <button onClick={() => window.location.reload()}>{t('admin.dashboard.card.no_data') !== 'No data to display' ? 'Спробувати ще раз' : 'Try again'}</button>
            </div>
        </div>
    );

    const getStatusConfig = (status: string) => {
        return { text: t(`admin.orders.status.${status}`, { defaultValue: status }), colorClass: `status-${status.toLowerCase()}` };
    };

    const renderWidget = (id: string, index: number) => {
        const dragProps = isEditMode ? {
            draggable: true,
            onDragStart: () => handleDragStart(index),
            onDragEnter: () => handleDragEnter(index),
            onDragEnd: handleDragEnd,
            onDragOver: (e: React.DragEvent) => e.preventDefault(),
        } : {};

        const isLarge = id.startsWith('chart_');
        const wrapCard = (content: React.ReactNode) => (
            <div
                key={id}
                className={`stat-card widget-card ${isLarge ? 'widget-large' : ''} ${isEditMode ? 'edit-mode-card' : ''}`}
                {...dragProps}
            >
                {isEditMode && (
                    <div className="widget-edit-controls">
                        <span className="drag-handle" title={t('admin.dashboard.btn_edit')}>⠿</span>
                        <button
                            className="widget-remove-btn"
                            onClick={(e) => { e.stopPropagation(); removeWidget(id); }}
                            title={t('admin.dashboard.modals.add_widget.close')}
                        >✕</button>
                    </div>
                )}
                {content}
            </div>
        );

        switch (id) {
            case 'total_sales':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.sales')}</h3>
                    <div className="value">₴ {stats.totalSales.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                    <span className="trend positive">{t('admin.orders.status.PAID')}</span>
                </>);
            case 'active_orders':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.orders')}</h3>
                    <div className="value">{stats.activeOrders}</div>
                    <span className="trend">{t('admin.orders.status.NEW')} & {t('admin.orders.status.CONFIRMED')}</span>
                </>);
            case 'total_products':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.products')}</h3>
                    <div className="value">{stats.totalProducts}</div>
                    <span className="trend">{t('admin.dashboard.title')}</span>
                </>);
            case 'new_customers':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.clients')}</h3>
                    <div className="value">{stats.newCustomers}</div>
                    <span className="trend positive">{t('admin.dashboard.widgets.new_customers.label')}</span>
                </>);
            case 'avg_order_value':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.average_check')}</h3>
                    <div className="value">₴ {(stats.averageOrderValue ?? 0).toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <span className="trend">{t('admin.dashboard.widgets.avg_order_value.label')}</span>
                </>);
            case 'warranty_claims_count':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.warranty_numeric')}</h3>
                    <div className="value">{stats.warrantyClaimsCount ?? 0}</div>
                    <span className="trend">{t('admin.dashboard.widgets.warranty_claims_count.label')}</span>
                </>);
            case 'cancellation_rate':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.cancellation_rate')}</h3>
                    <div className="value stat-value-danger">{stats.cancellationRate ?? 0}%</div>
                    <span className="trend">{t('admin.dashboard.card.from_total')}</span>
                </>);
            case 'low_stock':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.low_stock')}</h3>
                    <div className="stat-lowstock-row">
                        <div className="value">{stats.lowStockCount}</div>
                        <button
                            className="lowstock-view-btn"
                            onClick={(e) => { e.stopPropagation(); setShowLowStockModal(true); }}
                            title={t('admin.dashboard.widgets.low_stock.btn')}
                        >🔍</button>
                    </div>
                    <span className="trend">{t('admin.dashboard.modals.low_stock.title')}</span>
                </>);
            case 'orders_this_month':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.this_month')}</h3>
                    <div className="value">{stats.ordersThisMonth ?? 0}</div>
                    <span className="trend">{t('admin.dashboard.widgets.orders_this_month.label')}</span>
                </>);
            case 'total_orders':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.total_orders')}</h3>
                    <div className="value">{stats.totalOrdersCount ?? 0}</div>
                    <span className="trend">{t('admin.dashboard.widgets.total_orders.label')}</span>
                </>);
            case 'cancellation_count':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.cancellation_numeric')}</h3>
                    <div className="value stat-value-danger">{stats.cancellationCount ?? 0}</div>
                    <span className="trend">{t('admin.orders.status.CANCELED')}</span>
                </>);
            case 'warranty_rate':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.warranty_rate')}</h3>
                    <div className="value">{stats.warrantyRate ?? 0}%</div>
                    <span className="trend">{t('admin.dashboard.card.from_total')}</span>
                </>);
            case 'chart_orders_by_status':
                const translatedStatuses = stats.ordersByStatus.map(d => ({ ...d, name: getStatusConfig(d.name).text }));
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.chart_status')}</h3>
                    <div style={{ height: '220px', width: '100%', marginTop: '1rem' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie data={translatedStatuses} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {translatedStatuses.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </>);

            case 'chart_orders_last_7_days':
                const formatted7Days = stats.ordersLast7Days.map(d => ({
                    ...d,
                    name: d.date ? format(new Date(d.date), 'eee, dd.MM', { locale: i18n.language === 'en' ? enUS : uk }) : ''
                }));
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.chart_7_days')}</h3>
                    <div style={{ height: '220px', width: '100%', marginTop: '1rem' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={formatted7Days} margin={{ left: -20, right: 10, top: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </>);
            case 'chart_sales_by_month':
                const formattedMonthly = stats.monthlySales.map(m => ({
                    ...m,
                    name: m.date ? format(new Date(m.date), 'MMM', { locale: i18n.language === 'en' ? enUS : uk }) : ''
                }));
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.chart_monthly')}</h3>
                    <div style={{ height: '260px', width: '100%', marginTop: '1rem' }}>
                        {formattedMonthly.every(m => m.total === 0) ? (
                            <div className="no-data-text">{t('admin.dashboard.card.no_data')}</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={formattedMonthly} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={40} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        formatter={(value: any) => [`${Number(value).toLocaleString(i18n.language === 'en' ? 'en-US' : 'uk-UA')} ${t('admin.dashboard.card.currency')}`, t('admin.dashboard.card.sales_label')] }
                                    />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </>);
            case 'chart_sales_by_category':
                return wrapCard(<>
                    <h3>{t('admin.dashboard.card.chart_category')}</h3>
                    <div style={{ height: '260px', width: '100%', marginTop: '1rem' }}>
                        {stats.categoryStats.length === 0 ? (
                            <div className="no-data-text">{t('admin.dashboard.card.no_data')}</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie data={stats.categoryStats} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {stats.categoryStats.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </>);
            default:
                return null;
        }
    };



    return (
        <div className="dashboard-page">
            {/* Widget toolbar */}
            <div className="widget-toolbar">
                <button
                    className={`widget-edit-btn ${isEditMode ? 'active' : ''}`}
                    onClick={toggleEditMode}
                    title={isEditMode ? t('admin.dashboard.btn_done') : t('admin.dashboard.btn_edit')}
                >
                    {isEditMode ? t('admin.dashboard.btn_done') : t('admin.dashboard.btn_edit')}
                </button>
                {isEditMode && (
                    <button
                        className="widget-add-btn"
                        onClick={() => setShowAddModal(true)}
                        title={t('admin.dashboard.btn_add_widget')}
                        disabled={removedWidgets.length === 0}
                    >
                        {t('admin.dashboard.btn_add_widget')}
                    </button>
                )}
            </div>

            {/* Stat widgets grid */}
            <div className="dashboard-stats-grid">
                {widgetOrder.map((id, index) => renderWidget(id, index))}
            </div>

            {widgetOrder.length === 0 && (
                <div className="empty-widgets-hint">
                    <p>{t('admin.dashboard.hint_hidden')}</p>
                    <button className="widget-add-btn" onClick={() => { setIsEditMode(true); setShowAddModal(true); }}>{t('admin.dashboard.btn_add_widget')}</button>
                </div>
            )}

            {/* Top Products */}
            <div className="top-products-section mt-8">
                <div className="stat-card">
                    <h3 className="section-title">{t('admin.dashboard.top_products.title')}</h3>
                    <div className="top-products-horizontal-grid">
                        {stats.topProducts.length === 0 ? (
                            <div className="no-data-text py-8 text-center w-full">{t('admin.dashboard.top_products.empty')}</div>
                        ) : (
                            stats.topProducts.map((product) => (
                                <div key={product.id} className="top-product-card">
                                    <div className="card-image">
                                        {product.image ? (
                                            <img src={product.image.startsWith('http') ? product.image : `${window.location.origin}${product.image}`} alt={product.name} />
                                        ) : (
                                            <div className="no-image-placeholder">{t('store.header.no_photo')}</div>
                                        )}
                                        <div className="card-sales-badge">
                                            {product.salesCount} <span className="sales-label">{t('admin.dashboard.top_products.sales_unit')}</span>
                                        </div>
                                    </div>
                                    <div className="card-info">
                                        <div className="card-name" title={product.name}>{product.name}</div>
                                        <div className="card-price">₴ {product.price.toLocaleString(i18n.language === 'en' ? 'en-US' : 'uk-UA')}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="recent-orders mt-8">
                <h3 className="table-header">{t('admin.dashboard.recent_orders.title')}</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '1rem' }}>{t('admin.dashboard.recent_orders.table.id')}</th>
                                <th>{t('admin.dashboard.recent_orders.table.date')}</th>
                                <th>{t('admin.dashboard.recent_orders.table.customer')}</th>
                                <th>{t('admin.dashboard.recent_orders.table.total')}</th>
                                <th>{t('admin.dashboard.recent_orders.table.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentOrders.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>{t('admin.dashboard.recent_orders.empty') || 'Немає замовлень'}</td></tr>
                            ) : stats.recentOrders.map(order => (
                                <tr key={order.id}>
                                    <td style={{ paddingLeft: '1rem' }} className="order-id">#{order.id}</td>
                                    <td style={{ fontSize: '0.875rem' }}>{format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm', { locale: i18n.language === 'en' ? enUS : uk })}</td>
                                    <td>{order.firstName} {order.lastName}</td>
                                    <td className="order-amount">{Number(order.totalPrice).toLocaleString(i18n.language === 'en' ? 'en-US' : 'uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {t('admin.dashboard.card.currency')}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusConfig(order.status).colorClass}`}>
                                            {getStatusConfig(order.status).text}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Widget Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-container add-widget-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>＋ {t('admin.dashboard.modals.add_widget.title')}</h3>
                            <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {removedWidgets.length === 0 ? (
                                <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>{t('admin.dashboard.modals.add_widget.all_added') || 'Всі додані'}</p>
                            ) : (
                                <div className="add-widget-list">
                                    {removedWidgets.map(id => (
                                        <button key={id} className="add-widget-item" onClick={() => addWidget(id)}>
                                            <span className="add-widget-icon">＋</span>
                                            <span>{t(`admin.dashboard.widgets.${id}.title`, { defaultValue: id })}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Low Stock Modal */}
            {showLowStockModal && (
                <div className="modal-overlay" onClick={() => setShowLowStockModal(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>⚠️ {t('admin.dashboard.card.low_stock')}</h3>
                            <button className="modal-close-btn" onClick={() => setShowLowStockModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {stats.lowStockProducts.length === 0 ? (
                                <div className="no-data-text" style={{ textAlign: 'center', padding: '2rem' }}>🎉 {t('admin.dashboard.top_products.empty')}</div>
                            ) : (
                                <table className="orders-table">
                                    <thead>
                                        <tr>
                                            <th style={{ paddingLeft: '0.5rem' }}>{t('admin.customers.order_card.items.id') || 'ID'}</th>
                                            <th>{t('admin.dashboard.modals.low_stock.product')}</th>
                                            <th>{t('admin.dashboard.modals.low_stock.color')}</th>
                                            <th style={{ textAlign: 'right', paddingRight: '0.5rem' }}>{t('admin.dashboard.modals.low_stock.stock')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.lowStockProducts.map(p => (
                                            <tr key={p.variantId}>
                                                <td style={{ paddingLeft: '0.5rem' }}>
                                                    <div className="product-image-small">
                                                        {p.image ? (
                                                            <img src={p.image.startsWith('http') ? p.image : `${window.location.origin}${p.image}`} alt={p.productName} />
                                                        ) : (
                                                            <div className="no-image-placeholder">–</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="product-name-cell">{p.productName}</td>
                                                <td style={{ color: '#64748b', fontSize: '0.875rem' }}>{p.colorName}</td>
                                                <td style={{ textAlign: 'right', paddingRight: '0.5rem' }}>
                                                    <span className={`stock-badge ${p.stock === 0 ? 'stock-empty' : 'stock-low'}`}>{p.stock} {t('admin.common.units')}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
