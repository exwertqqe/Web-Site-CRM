import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { History, Box, User, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import './AdminInventoryLogPage.css';

interface Log {
    id: number;
    action: 'ADD' | 'REMOVE' | 'SALE' | 'RETURN' | 'MOVE' | 'MANUAL_CHANGE';
    quantity: number;
    variant: {
        colorName: string;
        product: {
            name: string;
        }
    };
    user: {
        name: string;
    } | null;
    notes: string;
    createdAt: string;
}

export const AdminInventoryLogPage = () => {
    const { t, i18n } = useTranslation();
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/warehouse/inventory-logs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionBadge = (action: string) => {
        return <span className={`log-badge badge-${action}`}>{t(`admin.inventory_log.actions.${action}`, { defaultValue: action })}</span>;
    };

    const getDateLocale = () => {
        return i18n.language === 'en' ? enUS : uk;
    };

    if (loading) return <div className="inventory-log-page"><div className="loading-state">{t('admin.inventory_log.loading')}</div></div>;

    return (
        <div className="inventory-log-page">
            <header className="log-header">
                <div className="log-title-row">
                    <div className="log-icon-box">
                        <History size={32} />
                    </div>
                    <div>
                        <h2>{t('admin.inventory_log.title')}</h2>
                        <p>{t('admin.inventory_log.subtitle')}</p>
                    </div>
                </div>
            </header>

            <div className="log-card">
                <div className="log-list">
                    {logs.map(log => (
                        <div key={log.id} className={`log-item ${log.action}`}>
                            <div className="log-main-info">
                                <div className="action-icon-circle">
                                    <ArrowRightLeft size={24} />
                                </div>
                                <div className="log-details-core">
                                    <div className="log-top-line">
                                        {getActionBadge(log.action)}
                                        <span className="product-name-bold">{log.variant.product.name}</span>
                                        <span className="color-variant-tag">({log.variant.colorName})</span>
                                    </div>
                                    <div className="log-meta-row">
                                        {(() => {
                                            let isPositive = log.action === 'ADD' || log.action === 'RETURN';
                                            let typeLabel = isPositive ? t('admin.inventory_log.type.positive') : t('admin.inventory_log.type.negative');
                                            
                                            if (log.action === 'MANUAL_CHANGE') {
                                                const match = log.notes.match(/(\d+) -> (\d+)/);
                                                if (match) {
                                                    isPositive = parseInt(match[2]) > parseInt(match[1]);
                                                    typeLabel = isPositive ? t('admin.inventory_log.type.positive') : t('admin.inventory_log.type.negative');
                                                }
                                            }

                                            return (
                                                <div className={`qty-pill ${isPositive ? 'positive' : 'negative'}`}>
                                                    <span className="qty-type-label">{typeLabel}</span>
                                                    {isPositive ? '+' : '-'}{t('admin.inventory_log.qty_unit', { count: log.quantity })}
                                                </div>
                                            );
                                        })()}
                                        <div className="comment-box">
                                            <span className="comment-label">{t('admin.inventory_log.comment_label')}</span>
                                            {log.notes || '---'}
                                        </div>
                                        {log.user && (
                                            <div className="user-pill">
                                                <User size={14} /> {log.user.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="log-time-column">
                                <div className="time-val">
                                    {format(new Date(log.createdAt), 'HH:mm', { locale: getDateLocale() })}
                                </div>
                                <div className="date-val">
                                    {format(new Date(log.createdAt), 'dd MMMM yyyy', { locale: getDateLocale() })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {logs.length === 0 && (
                        <div className="empty-logs">
                            <Box size={64} style={{ opacity: 0.2 }} />
                            <p>{t('admin.inventory_log.empty')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
