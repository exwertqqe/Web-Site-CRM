import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { X, Printer, Package, ArrowUp, Map as MapIcon, ArrowDown, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './SmartStorekeeperModal.css';

interface Placement {
    shelf: { id: number; name: string };
    sector: { id: number; name: string };
    quantity: number;
    productName?: string;
    variant?: {
        id: number;
        colorName: string;
        colorCode: string | null;
        image: string | null;
    };
}

interface SmartStorekeeperModalProps {
    isOpen: boolean;
    onClose: () => void;
    action: 'PUT' | 'TAKE';
    placements: Placement[];
    productName: string;
}

const SECTOR_PALETTES = [
    { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', dot: '#3b82f6' },
    { bg: '#fdf4ff', border: '#d8b4fe', text: '#7e22ce', dot: '#a855f7' },
    { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316' },
    { bg: '#f0fdf4', border: '#86efac', text: '#15803d', dot: '#22c55e' },
    { bg: '#fff1f2', border: '#fda4af', text: '#be123c', dot: '#f43f5e' },
    { bg: '#f0fdfa', border: '#5eead4', text: '#0f766e', dot: '#14b8a6' },
    { bg: '#fefce8', border: '#fde047', text: '#a16207', dot: '#eab308' },
    { bg: '#faf5ff', border: '#c084fc', text: '#6b21a8', dot: '#9333ea' },
];

export const SmartStorekeeperModal = ({ isOpen, onClose, action, placements, productName }: SmartStorekeeperModalProps) => {
    const { t, i18n } = useTranslation();
    const [sectors, setSectors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRoute, setShowRoute] = useState(false);
    const [activeSectorId, setActiveSectorId] = useState<number | null>(null);
    const [selectedShelfId, setSelectedShelfId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setShowRoute(false);
            setSelectedShelfId(null);
            setActiveSectorId(null);
            setLoading(true);
            fetchWarehouse();
        }
    }, [isOpen]);

    const fetchWarehouse = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/warehouse/sectors', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSectors(res.data);
        } catch (e) {
            console.error('Error fetching warehouse:', e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        const at = action === 'PUT' ? t('admin.orders.storekeeper.modal.print.put') : t('admin.orders.storekeeper.modal.print.take');
        const date = new Date().toLocaleString(i18n.language === 'en' ? 'en-US' : 'uk-UA');
        w.document.write(`<html><head><title>Receipt</title><style>
            @page{size:80mm auto;margin:0}body{width:80mm;font-family:'Courier New',monospace;padding:5mm;font-size:13px}
            .c{text-align:center}.ln{border-top:1px dashed #000;margin:5px 0}.t{font-size:18px;font-weight:bold;margin:8px 0}
            .p{font-size:14px;font-weight:bold;border:1px solid #000;padding:4px;margin-bottom:8px}
            .it{margin-bottom:6px}.q{font-size:18px;font-weight:bold;border:2px solid #000;padding:1px 6px;display:inline-block}
            .foot{margin-top:12px;font-size:10px}
        </style></head><body>
            <div class="c"><div class="t">${at}</div><div>${date}</div></div>
            <div class="ln"></div>
            ${placements.map(p => `<div class="it">
                <div class="p">${p.productName || productName}</div>
                ${p.variant ? `<div><b>${t('admin.orders.storekeeper.modal.color').toUpperCase()}:</b> ${p.variant.colorName}</div>` : ''}
                <div><b>${t('admin.orders.storekeeper.modal.sector').toUpperCase()}:</b> ${p.sector.name}</div>
                <div><b>${t('admin.orders.storekeeper.modal.shelf').toUpperCase()}:</b> ${p.shelf.name}</div>
                <div>${t('admin.orders.storekeeper.modal.quantity').toUpperCase()}: <span class="q">${p.quantity} ${t('admin.orders.storekeeper.modal.units')}</span></div>
            </div><div class="ln"></div>`).join('')}
            <div class="c foot">${t('admin.orders.storekeeper.modal.print.footer')}</div>
            <script>window.onload=()=>{window.print();window.close()}</script>
        </body></html>`);
        w.document.close();
    };

    if (!isOpen) return null;

    // ── computed values ──────────────────────────────────────────────
    const targetShelfIds = placements.map(p => p.shelf.id);
    const targetSectorIds = [...new Set(placements.map(p => p.sector.id))];
    const isPut = action === 'PUT';

    // Group placements by variant for the steps list
    const variantGroups = useMemo(() => {
        const map = new Map<string, { productName: string; colorName: string; colorCode: string | null; image: string | null; total: number; steps: Placement[] }>();
        for (const p of placements) {
            const key = p.variant ? String(p.variant.id) : `nv-${p.shelf.id}`;
            const pName = p.productName || productName;
            const colorName = p.variant?.colorName ?? '—';
            const colorCode = p.variant?.colorCode ?? null;
            const image = p.variant?.image ?? null;
            if (!map.has(key)) map.set(key, { productName: pName, colorName, colorCode, image, total: 0, steps: [] });
            const g = map.get(key)!;
            g.total += p.quantity;
            g.steps.push(p);
        }
        return [...map.values()];
    }, [placements, productName]);

    const totalQty = placements.reduce((s, p) => s + p.quantity, 0);

    // Build sector color map (indexed by position in ALL sectors after fetch)
    const sectorColorMap = useMemo(() => {
        const m: Record<number, typeof SECTOR_PALETTES[0]> = {};
        sectors.forEach((s, i) => { m[s.id] = SECTOR_PALETTES[i % SECTOR_PALETTES.length]; });
        return m;
    }, [sectors]);

    // Selected sector for route view
    const displaySectorId = activeSectorId ?? targetSectorIds[0] ?? sectors[0]?.id ?? null;
    const displaySector = sectors.find(s => s.id === displaySectorId);

    // Info for clicked shelf
    const clickedPlacements = selectedShelfId
        ? placements.filter(p => p.shelf.id === selectedShelfId)
        : [];

    return (
        <div className="ssk-overlay" onClick={onClose}>
            <div className={`ssk-popup ${isPut ? 'ssk-put' : 'ssk-take'}`} onClick={e => e.stopPropagation()}>
                <div className="ssk-accent-bar" />

                <div className="ssk-header">
                    <div className="ssk-icon-wrap">
                        {isPut ? <ArrowDown size={22} strokeWidth={2.5} /> : <ArrowUp size={22} strokeWidth={2.5} />}
                    </div>
                    <div className="ssk-header-text">
                        <span className="ssk-action-label">{isPut ? t('admin.orders.storekeeper.modal.put_label') : t('admin.orders.storekeeper.modal.take_label')}</span>
                        <span className="ssk-product-name">{productName}</span>
                    </div>
                    <div className="ssk-header-btns">
                        <button className="ssk-icon-btn" onClick={handlePrint} title={t('admin.orders.storekeeper.modal.print_btn')}>
                            <Printer size={17} />
                        </button>
                        <button className="ssk-icon-btn ssk-close-btn" onClick={onClose}>
                            <X size={17} />
                        </button>
                    </div>
                </div>

                <div className="ssk-total-badge">
                    <Package size={14} />
                    <span>{t('admin.orders.storekeeper.modal.total')}: <strong>{totalQty} {t('admin.orders.storekeeper.modal.units')}</strong></span>
                    <span className="ssk-total-sep">·</span>
                    <span>{variantGroups.length} {variantGroups.length === 1 ? t('admin.orders.storekeeper.modal.variant') : t('admin.orders.storekeeper.modal.variants')}</span>
                    <span className="ssk-total-sep">·</span>
                    <span>{placements.length} {t('admin.orders.storekeeper.modal.locations')}</span>
                </div>

                <div className="ssk-steps">
                    {variantGroups.map((group, gi) => (
                        <div key={gi} className="ssk-variant-group">
                            <div className="ssk-variant-header">
                                {group.image ? (
                                    <img src={group.image} alt={group.colorName} className="ssk-variant-img" />
                                ) : (
                                    <div
                                        className="ssk-variant-color-dot"
                                        style={{ background: group.colorCode ?? '#e2e8f0' }}
                                    />
                                )}
                                <span className="ssk-variant-name">{group.productName}</span>
                                <span className="ssk-variant-total">{group.total} {t('admin.orders.storekeeper.modal.units')}</span>
                            </div>

                            {group.steps.map((p, si) => (
                                <div key={si} className="ssk-step">
                                    <div className="ssk-step-index">{si + 1}</div>
                                    <div className="ssk-step-body">
                                        <div className="ssk-step-product-info">
                                            {p.variant?.image ? (
                                                <img src={p.variant.image} alt="" className="ssk-step-thumb" />
                                            ) : (
                                                <div className="ssk-step-color-dot" style={{ background: p.variant?.colorCode ?? '#e2e8f0' }} />
                                            )}
                                            <div className="ssk-step-name-loc">
                                                <div className="ssk-step-name">{p.productName || productName}</div>
                                                <div className="ssk-step-loc">
                                                    <span className="ssk-badge-sector">{p.sector.name}</span>
                                                    <span className="ssk-arrow">›</span>
                                                    <span className="ssk-badge-shelf">{p.shelf.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ssk-step-qty">{p.quantity} {t('admin.orders.storekeeper.modal.units')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="ssk-footer">
                    <button className="ssk-route-btn" onClick={() => setShowRoute(true)}>
                        <MapIcon size={15} />
                        {t('admin.orders.storekeeper.modal.route_title')}
                    </button>
                    <button className="ssk-done-btn" onClick={onClose}>
                        <CheckCircle2 size={16} />
                        {t('admin.orders.storekeeper.modal.done')}
                    </button>
                </div>
            </div>

            {showRoute && (
                <div className="ssk-route-overlay" onClick={() => { setShowRoute(false); setSelectedShelfId(null); }}>
                    <div className="ssk-route-panel" onClick={e => e.stopPropagation()}>
                        <div className="ssk-route-header">
                            <div className="ssk-route-title">
                                <MapIcon size={18} />
                                <span>{t('admin.orders.storekeeper.modal.route_title')}</span>
                                <span className="ssk-route-subtitle">— {productName}</span>
                            </div>
                            <button className="ssk-icon-btn ssk-close-btn"
                                onClick={() => { setShowRoute(false); setSelectedShelfId(null); }}>
                                <X size={17} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="ssk-loading">
                                <div className="ssk-spinner" />
                                {t('admin.orders.storekeeper.modal.loading')}
                            </div>
                        ) : (
                            <>
                                <div className="ssk-sector-bar">
                                    {sectors.map(sector => {
                                        const isTarget = targetSectorIds.includes(sector.id);
                                        const isActive = sector.id === displaySectorId;
                                        const pal = sectorColorMap[sector.id] ?? SECTOR_PALETTES[0];
                                        const sectorQty = placements
                                            .filter(p => p.sector.id === sector.id)
                                            .reduce((s, p) => s + p.quantity, 0);
                                        return (
                                            <button
                                                key={sector.id}
                                                className={`ssk-sector-chip${isTarget ? ' ssk-sector-chip-target' : ''}${isActive ? ' ssk-sector-chip-active' : ''}`}
                                                style={isActive
                                                    ? { background: pal.bg, borderColor: pal.border, color: pal.text }
                                                    : undefined}
                                                onClick={() => { setActiveSectorId(sector.id); setSelectedShelfId(null); }}
                                            >
                                                <span className={`ssk-chip-dot${isTarget ? ' ssk-chip-dot-pulse' : ''}`}
                                                    style={{ background: pal.dot }} />
                                                {t('admin.orders.storekeeper.modal.sector')} {sector.name}
                                                {isTarget && (
                                                    <span className="ssk-chip-badge">{sectorQty} {t('admin.orders.storekeeper.modal.units')}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {clickedPlacements.length > 0 ? (
                                    <div className="ssk-shelf-info-box">
                                        <Info size={15} />
                                        <div className="ssk-shelf-info-items">
                                            {clickedPlacements.map((p, i) => (
                                                <div key={i} className="ssk-shelf-info-row">
                                                    {p.variant?.colorCode && (
                                                        <span className="ssk-info-color-dot"
                                                            style={{ background: p.variant.colorCode }} />
                                                    )}
                                                    {p.variant?.image && (
                                                        <img src={p.variant.image} alt="" className="ssk-info-thumb" />
                                                    )}
                                                    <span className="ssk-info-color-name">{p.productName || productName}</span>
                                                    <span className="ssk-info-qty">
                                                        {isPut ? '↓' : '↑'} {p.quantity} {t('admin.orders.storekeeper.modal.units')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="ssk-shelf-info-close" onClick={() => setSelectedShelfId(null)}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="ssk-shelf-hint">
                                        <Info size={13} />
                                        {t('admin.orders.storekeeper.modal.empty_route')}
                                    </div>
                                )}

                                <div className="ssk-route-body">
                                    {displaySector ? (
                                        <div className="ssk-shelves-grid">
                                            {displaySector.shelves.map((shelf: any) => {
                                                const isTarget = targetShelfIds.includes(shelf.id);
                                                const isSelected = shelf.id === selectedShelfId;
                                                const pal = sectorColorMap[displaySectorId!] ?? SECTOR_PALETTES[0];
                                                const shelfPlacements = placements.filter(p => p.shelf.id === shelf.id);
                                                const shelfQty = shelfPlacements.reduce((s, p) => s + p.quantity, 0);
                                                return (
                                                    <div
                                                        key={shelf.id}
                                                        className={`ssk-shelf-tile${isTarget ? ' ssk-shelf-tile-target' : ''}${isSelected ? ' ssk-shelf-tile-selected' : ''}`}
                                                        style={isTarget ? {
                                                            borderColor: pal.border,
                                                            background: pal.bg,
                                                        } : undefined}
                                                        onClick={() => isTarget && setSelectedShelfId(isSelected ? null : shelf.id)}
                                                    >
                                                        <div className="ssk-shelf-tile-icon" style={isTarget ? { color: pal.dot } : undefined}>
                                                            {isTarget ? (isPut ? '↓' : '↑') : '▦'}
                                                        </div>
                                                        <div className="ssk-shelf-tile-name"
                                                            style={isTarget ? { color: pal.text } : undefined}>
                                                            {shelf.name}
                                                        </div>
                                                        {isTarget && (
                                                            <div className="ssk-shelf-tile-qty"
                                                                style={{ background: pal.dot }}>
                                                                {shelfQty}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="ssk-no-sector">{t('admin.orders.storekeeper.modal.no_sector')}</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
