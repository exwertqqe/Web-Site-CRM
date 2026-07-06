import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Box, Search, X, Package } from 'lucide-react';
import './AdminWarehousePage.css';

interface Variant {
    id: number;
    colorName: string;
    product: {
        name: string;
        category: {
            isOversized: boolean;
        } | null;
    };
}

interface Stock {
    id: number;
    quantity: number;
    variant: Variant;
}

interface Shelf {
    id: number;
    name: string;
    capacity: number;
    color?: string | null;
    stocks: Stock[];
}

interface Sector {
    id: number;
    name: string;
    shelves: Shelf[];
}

export const AdminWarehousePage = () => {
    const { t } = useTranslation();
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
    const [activeSectorId, setActiveSectorId] = useState<number | null>(null);

    useEffect(() => {
        fetchWarehouse();
    }, []);

    const fetchWarehouse = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/warehouse/sectors', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSectors(res.data);
            if (res.data.length > 0 && !activeSectorId) {
                setActiveSectorId(res.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching warehouse:', error);
        } finally {
            setLoading(false);
        }
    };

    const getShelfStatus = (shelf: Shelf) => {
        let usedSlots = 0;
        let isHighlighted = false;

        shelf.stocks.forEach(stock => {
            const isOversized = stock.variant.product.category?.isOversized;
            usedSlots += stock.quantity * (isOversized ? 200 : 1);
            
            if (searchQuery && (
                stock.variant.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                shelf.name.toLowerCase().includes(searchQuery.toLowerCase())
            )) {
                isHighlighted = true;
            }
        });

        const fillPercentage = (usedSlots / shelf.capacity) * 100;
        let occColor = '#22c55e'; // Green (empty)
        
        if (fillPercentage > 90) occColor = '#ef4444'; // Red (full)
        else if (fillPercentage > 1) occColor = '#eab308'; // Yellow (partial)

        if (isHighlighted) {
            occColor = '#2563eb'; // Blue (highlighted)
        }

        return { fillPercentage, occColor, usedSlots, isHighlighted };
    };

    const getTotalStats = () => {
        let totalUsed = 0;
        let totalCapacity = 0;
        let totalItems = 0;

        sectors.forEach(s => {
            s.shelves.forEach(sh => {
                totalCapacity += sh.capacity;
                sh.stocks.forEach(st => {
                    totalItems += st.quantity;
                    totalUsed += st.quantity * (st.variant.product.category?.isOversized ? 200 : 1);
                });
            });
        });

        return { totalUsed, totalCapacity, totalItems };
    };

    if (loading) return <div className="warehouse-page"><div className="loading-state">{t('admin.warehouse.loading')}</div></div>;

    const stats = getTotalStats();
    const activeSector = sectors.find(s => s.id === activeSectorId);

    return (
        <div className="warehouse-page">
            <header className="warehouse-header">
                <div className="header-info">
                    <h2>{t('admin.warehouse.title')}</h2>
                    <p>{t('admin.warehouse.subtitle')}</p>
                </div>
                
                <div className="search-container">
                    <Search className="search-icon" size={18} />
                    <input 
                        type="text" 
                        placeholder={t('admin.warehouse.search_placeholder')} 
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <section className="stats-grid">
                <div className="stats-card">
                    <div className="stats-label">{t('admin.warehouse.stats.fill_level')}</div>
                    <div className="stats-value blue">
                        {stats.totalCapacity > 0 ? Math.round((stats.totalUsed / stats.totalCapacity) * 100) : 0}%
                        <span className="stats-subtext">({t('admin.warehouse.stats.slots_unit', { used: stats.totalUsed, total: stats.totalCapacity })})</span>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${stats.totalCapacity > 0 ? (stats.totalUsed / stats.totalCapacity) * 100 : 0}%` }}></div>
                    </div>
                </div>
                <div className="stats-card">
                    <div className="stats-label">{t('admin.warehouse.stats.sectors')}</div>
                    <div className="stats-value">{sectors.length}</div>
                    <div className="stats-subtext">{t('admin.warehouse.stats.sectors_subtext')}</div>
                </div>
                <div className="stats-card">
                    <div className="stats-label">{t('admin.warehouse.stats.items')}</div>
                    <div className="stats-value">{stats.totalItems} <span className="stats-subtext">{t('admin.warehouse.units_label')}</span></div>
                    <div className="stats-subtext">{t('admin.warehouse.stats.items_subtext')}</div>
                </div>
            </section>

            {/* Horizontal Tabs for Sectors */}
            <div className="wh-sectors-tabs">
                {sectors.map(sector => {
                    const isActive = activeSectorId === sector.id;
                    const sectorColor = sector.shelves[0]?.color || '#cbd5e1';
                    return (
                        <div 
                            key={sector.id} 
                            className={`wh-sector-tab ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveSectorId(sector.id)}
                            style={{ '--tab-color': sectorColor } as any}
                        >
                            <span className="wh-tab-color-dot" style={{ background: sectorColor }} />
                            {t('admin.warehouse.sector_tab', { name: sector.name })}
                        </div>
                    );
                })}
            </div>

            <div className="active-sector-view">
                {activeSector && (
                    <div className="sector-block">
                        <div className="sector-title-bar">
                            <h3>{t('admin.warehouse.sector_tab', { name: activeSector.name })}</h3>
                            <span className="shelf-count">{t('admin.warehouse.shelves_count', { count: activeSector.shelves.length })}</span>
                        </div>
                        
                        <div className="shelf-grid">
                            {activeSector.shelves.map(shelf => {
                                const status = getShelfStatus(shelf);
                                return (
                                    <div 
                                        key={shelf.id} 
                                        className={`shelf-card-new ${status.isHighlighted ? 'highlighted' : ''}`}
                                        style={{ borderColor: status.occColor, background: `${status.occColor}10` }}
                                        onClick={() => setSelectedShelf(shelf)}
                                    >
                                        <div className="shelf-card-main">
                                            <span className="shelf-occ-dot" style={{ background: status.occColor }}></span>
                                            <span className="shelf-name">#{shelf.name}</span>
                                        </div>
                                        <div className="shelf-card-meta">
                                            <span className="shelf-percent" style={{ color: status.occColor }}>{Math.round(status.fillPercentage)}%</span>
                                        </div>
                                        <div className="shelf-mini-progress">
                                            <div className="shelf-mini-fill" style={{ width: `${status.fillPercentage}%`, background: status.occColor }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <footer className="legend-bar">
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#22c55e' }}></div> 
                    <span>{t('admin.warehouse.legend.empty')}</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#eab308' }}></div> 
                    <span>{t('admin.warehouse.legend.filling')}</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#ef4444' }}></div> 
                    <span>{t('admin.warehouse.legend.full')}</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#2563eb' }}></div> 
                    <span>{t('admin.warehouse.legend.search')}</span>
                </div>
            </footer>

            {selectedShelf && (
                <div className="modal-overlay" onClick={() => setSelectedShelf(null)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <header className="modal-header">
                            <div className="modal-header-text">
                                <h3>{t('admin.warehouse.modal.title', { name: selectedShelf.name })}</h3>
                                <p>{t('admin.warehouse.modal.subtitle')}</p>
                            </div>
                            <button onClick={() => setSelectedShelf(null)} className="close-btn">
                                <X size={24} />
                            </button>
                        </header>
                        
                        <div className="modal-body">
                            <div className="shelf-info-grid">
                                <div className="info-box blue">
                                    <div className="info-label">{t('admin.warehouse.modal.fill_level')}</div>
                                    <div className="info-value">
                                        {Math.round((getShelfStatus(selectedShelf).usedSlots / selectedShelf.capacity) * 100)}%
                                    </div>
                                    <div className="progress-track" style={{ background: 'rgba(0,0,0,0.05)' }}>
                                        <div className="progress-fill" style={{ width: `${(getShelfStatus(selectedShelf).usedSlots / selectedShelf.capacity) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="info-box gray">
                                    <div className="info-label">{t('admin.warehouse.modal.free_space')}</div>
                                    <div className="info-value">
                                        {selectedShelf.capacity - getShelfStatus(selectedShelf).usedSlots}
                                    </div>
                                    <div className="stats-subtext">{t('admin.warehouse.modal.total_slots', { count: selectedShelf.capacity })}</div>
                                </div>
                            </div>

                            <h4 className="stock-list-title">
                                <Box className="text-blue-600" size={22} />
                                {t('admin.warehouse.modal.items_on_shelf')}
                            </h4>
                            
                            {selectedShelf.stocks.length === 0 ? (
                                <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '1.5rem', border: '2px dashed #e2e8f0' }}>
                                    <Box size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                                    <p style={{ color: '#94a3b8', fontWeight: 600 }}>{t('admin.warehouse.modal.empty_shelf')}</p>
                                </div>
                            ) : (
                                <div className="stock-list">
                                    {selectedShelf.stocks.map(stock => (
                                        <div key={stock.id} className="stock-item">
                                            <div className="stock-main">
                                                <div className="stock-icon">
                                                    <Package size={24} />
                                                </div>
                                                <div className="stock-details">
                                                    <h5>{stock.variant.product.name}</h5>
                                                    <div className="stock-meta">
                                                        <span className="badge-gray">{stock.variant.colorName}</span>
                                                        {stock.variant.product.category?.isOversized && (
                                                            <span className="badge-oversized">{t('admin.warehouse.modal.oversized')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="stock-qty">
                                                <div className="qty-val">{stock.quantity} <span className="qty-unit">шт.</span></div>
                                                <div className="slots-val">
                                                    {t('admin.warehouse.modal.slots_count', { count: stock.quantity * (stock.variant.product.category?.isOversized ? 200 : 1) })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <footer className="modal-footer">
                            <button onClick={() => setSelectedShelf(null)} className="primary-btn">
                                {t('admin.warehouse.modal.close_btn')}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};
