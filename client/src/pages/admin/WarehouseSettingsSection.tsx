import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Package, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import './WarehouseSettingsSection.css';

interface Shelf {
    id: number;
    name: string;
    capacity: number;
    color?: string | null;
}

interface Sector {
    id: number;
    name: string;
    description: string | null;
    shelves: Shelf[];
}

export const WarehouseSettingsSection = () => {
    const { t } = useTranslation();
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [isForceDistributing, setIsForceDistributing] = useState(false);
    const [distributionProgress, setDistributionProgress] = useState<{ message: string } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [expandedSectors, setExpandedSectors] = useState<Set<number>>(new Set());

    // Creation form state
    const [sectorName, setSectorName] = useState('');
    const [rowCount, setRowCount] = useState(1);
    const [shelvesPerRow, setShelvesPerRow] = useState(5);
    const [shelfColor, setShelfColor] = useState('#3b82f6');
    const [isCreating, setIsCreating] = useState(false);

    const colorInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchSectors(); }, []);

    const fetchSectors = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/warehouse/sectors', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSectors(res.data);
        } catch (error) {
            console.error('Error fetching sectors:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedSectors(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleCreateSector = async () => {
        if (!sectorName.trim()) return;
        setIsCreating(true);
        try {
            const token = localStorage.getItem('token');
            // 1. Create sector
            const secRes = await axios.post('/api/warehouse/sectors',
                { name: sectorName.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const newSectorId: number = secRes.data.id;

            // 2. Bulk-create shelves using A-Row-Col pattern
            const createdShelves: Shelf[] = [];
            for (let row = 1; row <= rowCount; row++) {
                for (let col = 1; col <= shelvesPerRow; col++) {
                    const shelfName = `${sectorName.trim()}-${row}-${col}`;
                    const shRes = await axios.post('/api/warehouse/shelves', {
                        name: shelfName,
                        sectorId: newSectorId,
                        capacity: 1000,
                        color: shelfColor,
                    }, { headers: { Authorization: `Bearer ${token}` } });
                    createdShelves.push(shRes.data);
                }
            }

            const newSector: Sector = { ...secRes.data, shelves: createdShelves };
            setSectors(prev => [...prev, newSector]);
            setExpandedSectors(prev => new Set([...prev, newSectorId]));

            // Reset form
            setSectorName('');
            setRowCount(1);
            setShelvesPerRow(5);
        } catch (error) {
            console.error('Error creating sector with shelves:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteSector = async (id: number) => {
        if (!window.confirm(t('admin.warehouse_settings.delete_sector_confirm'))) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/warehouse/sectors/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSectors(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting sector', error);
        }
    };

    const handleDeleteShelf = async (id: number, sectorId: number) => {
        if (!window.confirm(t('admin.warehouse_settings.delete_shelf_confirm'))) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/warehouse/shelves/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSectors(prev => prev.map(s =>
                s.id === sectorId ? { ...s, shelves: s.shelves.filter(sh => sh.id !== id) } : s
            ));
        } catch (error) {
            console.error('Error deleting shelf', error);
        }
    };

    const handleForceDistribution = async () => {
        setShowConfirmModal(false);
        setShowProgressModal(true);
        setIsForceDistributing(true);
        setProgressPercent(0);
        setDistributionProgress({ message: t('admin.warehouse_settings.modals.progress.msg_init') });

        // Connect to real-time progress events
        const eventSource = new EventSource('/api/warehouse/distribution-progress');
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setProgressPercent(data.percent);
            setDistributionProgress({ message: data.message });
            
            if (data.percent === 100) {
                eventSource.close();
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/warehouse/force-distribution', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setProgressPercent(100);
            setDistributionProgress({ message: res.data.message });
            fetchSectors();
            setTimeout(() => {
                setShowProgressModal(false);
                setIsForceDistributing(false);
            }, 3000);
        } catch (error) {
            eventSource.close();
            console.error('Error force distributing:', error);
            setDistributionProgress({ message: t('admin.warehouse_settings.modals.progress.msg_error') });
            setIsForceDistributing(false);
        }
    };

    if (loading) return <div className="wh-loading">{t('admin.warehouse_settings.loading')}</div>;

    const totalShelves = sectors.reduce((acc, s) => acc + s.shelves.length, 0);
    const totalPreview = rowCount * shelvesPerRow;

    return (
        <div className="wh-root">

            {/* Header */}
            <div className="wh-header">
                <div className="wh-header-left">
                    <div>
                        <h3 className="wh-title">{t('admin.warehouse_settings.title')}</h3>
                        <p className="wh-subtitle">
                            {t('admin.warehouse_settings.subtitle', { sectors: sectors.length, shelves: totalShelves })}
                        </p>
                    </div>
                </div>
                <button
                    className="wh-distribute-btn"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isForceDistributing || sectors.length === 0}
                >
                    <Package size={16} />
                    {t('admin.warehouse_settings.btn_distribute')}
                </button>
            </div>

            {/* Sectors list */}
            {sectors.length === 0 ? (
                <div className="wh-empty">
                    <LayoutGrid size={40} />
                    <p>{t('admin.warehouse_settings.empty')}</p>
                </div>
            ) : (
                <div className="wh-sectors-list">
                    {sectors.map(sector => {
                        const isOpen = expandedSectors.has(sector.id);
                        const sectorColor = sector.shelves[0]?.color || '#cbd5e1';
                        return (
                            <div key={sector.id} className="wh-sector-block">
                                <div className="wh-sector-header" onClick={() => toggleExpand(sector.id)}>
                                    <div className="wh-sector-header-left">
                                        <span className="wh-sector-color-indicator" style={{ background: sectorColor }} />
                                        <span className="wh-sector-name">{t('admin.warehouse_settings.sector_label', { name: sector.name })}</span>
                                        <span className="wh-sector-badge">{t('admin.warehouse_settings.shelves_badge', { count: sector.shelves.length })}</span>
                                    </div>
                                    <div className="wh-sector-header-right">
                                        <button
                                            className="wh-btn-danger"
                                            onClick={e => { e.stopPropagation(); handleDeleteSector(sector.id); }}
                                            title={t('admin.warehouse_settings.delete_sector_title')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="wh-shelves-wrap">
                                        {sector.shelves.length === 0 ? (
                                            <p className="wh-shelves-empty">{t('admin.warehouse_settings.no_shelves')}</p>
                                        ) : (
                                            <div className="wh-shelves-grid">
                                                {sector.shelves.map(shelf => (
                                                    <div key={shelf.id} className="wh-shelf-chip">
                                                        <div className="wh-shelf-chip-inner">
                                                            {shelf.color && (
                                                                <span className="wh-shelf-color-dot" style={{ background: shelf.color }} />
                                                            )}
                                                            <span>{shelf.name}</span>
                                                        </div>
                                                        <button
                                                            className="wh-shelf-delete"
                                                            onClick={() => handleDeleteShelf(shelf.id, sector.id)}
                                                            title={t('admin.warehouse_settings.delete_shelf_title')}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Creation form */}
            <div className="wh-create-form-unified">
                <p className="wh-form-section-label">
                    <Plus size={14} /> {t('admin.warehouse_settings.form.title')}
                </p>

                <div className="wh-create-fields">
                    <div className="wh-field">
                        <label className="wh-field-label">{t('admin.warehouse_settings.form.sector_name')}</label>
                        <input
                            className="wh-input"
                            type="text"
                            placeholder={t('admin.warehouse_settings.form.sector_name_placeholder')}
                            value={sectorName}
                            onChange={e => setSectorName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateSector()}
                        />
                    </div>

                    <div className="wh-field wh-field-sm">
                        <label className="wh-field-label">{t('admin.warehouse_settings.form.rows_count')}</label>
                        <input
                            className="wh-input"
                            type="number"
                            min={1}
                            max={20}
                            value={rowCount}
                            onChange={e => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                    </div>

                    <div className="wh-field wh-field-sm">
                        <label className="wh-field-label">{t('admin.warehouse_settings.form.shelves_per_row')}</label>
                        <input
                            className="wh-input"
                            type="number"
                            min={1}
                            max={50}
                            value={shelvesPerRow}
                            onChange={e => setShelvesPerRow(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                    </div>

                    <div className="wh-field wh-field-color">
                        <label className="wh-field-label">{t('admin.warehouse_settings.form.sector_color')}</label>
                        <div
                            className="wh-color-trigger"
                            style={{ background: shelfColor }}
                            onClick={() => colorInputRef.current?.click()}
                            title={t('admin.warehouse_settings.form.color_hint')}
                        />
                        <input
                            ref={colorInputRef}
                            type="color"
                            value={shelfColor}
                            onChange={e => setShelfColor(e.target.value)}
                            className="wh-color-input-hidden"
                        />
                    </div>
                </div>

                <div className="wh-create-footer">
                    {sectorName.trim() && (
                        <span className="wh-preview-hint">
                            {t('admin.warehouse_settings.form.preview_hint', {
                                count: totalPreview,
                                rows: rowCount,
                                per_row: shelvesPerRow,
                                pattern: sectorName,
                                row_word: rowCount === 1 ? t('admin.warehouse_settings.form.row_plural.one') : t('admin.warehouse_settings.form.row_plural.other')
                            })}
                        </span>
                    )}
                    <button
                        className="wh-btn-add"
                        onClick={handleCreateSector}
                        disabled={!sectorName.trim() || isCreating}
                    >
                        {isCreating ? t('admin.warehouse_settings.form.creating') : <><Plus size={16} /> {t('admin.warehouse_settings.form.btn_create')}</>}
                    </button>
                </div>
            </div>

            {/* Progress modal */}
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="wh-modal-overlay">
                    <div className="wh-modal">
                        <div className="wh-modal-icon warning">
                            <Package size={36} />
                        </div>
                        <h3>{t('admin.warehouse_settings.modals.confirm.title')}</h3>
                        <p>{t('admin.warehouse_settings.modals.confirm.desc')}</p>
                        <div className="wh-modal-actions">
                            <button className="wh-btn-cancel" onClick={() => setShowConfirmModal(false)}>{t('admin.warehouse_settings.modals.confirm.cancel')}</button>
                            <button className="wh-btn-confirm" onClick={handleForceDistribution}>{t('admin.warehouse_settings.modals.confirm.submit')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Modal */}
            {showProgressModal && (
                <div className="wh-modal-overlay">
                    <div className="wh-modal">
                        <div className="wh-modal-icon">
                            <Package size={36} className={isForceDistributing ? "bounce-anim" : ""} />
                        </div>
                        <h3>{isForceDistributing ? t('admin.warehouse_settings.modals.progress.title_loading') : t('admin.warehouse_settings.modals.progress.title_done')}</h3>
                        <p>{isForceDistributing ? t('admin.warehouse_settings.modals.progress.desc_loading') : t('admin.warehouse_settings.modals.progress.desc_done')}</p>
                        
                        <div className="wh-progress-container">
                            <div className="wh-progress-circle-box">
                                <svg width="100" height="100" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="44" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                                    <circle
                                        cx="50" cy="50" r="44" fill="none" stroke="#2563eb" strokeWidth="6"
                                        strokeDasharray="276.5"
                                        strokeDashoffset={276.5 * (1 - progressPercent / 100)}
                                        style={{ transition: 'stroke-dashoffset 0.4s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="wh-progress-num">{progressPercent}%</div>
                            </div>
                        </div>

                        <p className="wh-progress-msg">
                            {progressPercent === 100 ? t('admin.warehouse_settings.modals.progress.msg_success') : (distributionProgress?.message ?? '')}
                        </p>

                        {!isForceDistributing && (
                            <button className="wh-btn-add" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}
                                onClick={() => setShowProgressModal(false)}>
                                {t('admin.warehouse_settings.modals.progress.btn_close')}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
