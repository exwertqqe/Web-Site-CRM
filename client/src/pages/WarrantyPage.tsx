import { ShieldAlert, Wrench, FileText, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './DeliveryPage.css'; // Reusing shared info page styles

export const WarrantyPage = () => {
    const { t } = useTranslation();

    return (
        <div className="info-page warranty-page">
            <div className="info-hero bg-gradient-warranty">
                <div className="info-hero-content">
                    <h1>{t('store.warranty_page.hero.title')}</h1>
                    <p>{t('store.warranty_page.hero.subtitle')}</p>
                </div>
            </div>

            <div className="info-container">
                <section className="info-section">
                    <div className="section-header">
                        <ShieldAlert className="section-icon text-green" size={32} />
                        <h2>{t('store.warranty_page.conditions.title')}</h2>
                    </div>

                    <div className="info-cards-grid">
                        <div className="info-card">
                            <div className="card-icon-wrapper bg-green-light">
                                <CheckCircle size={24} className="text-green-500" />
                            </div>
                            <h3>{t('store.warranty_page.conditions.manufacturer_title')}</h3>
                            <p>{t('store.warranty_page.conditions.manufacturer_desc')}</p>
                        </div>

                        <div className="info-card">
                            <div className="card-icon-wrapper bg-blue-light">
                                <FileText size={24} className="text-blue-500" />
                            </div>
                            <h3>{t('store.warranty_page.conditions.coupon_title')}</h3>
                            <p>{t('store.warranty_page.conditions.coupon_desc')}</p>
                        </div>
                    </div>
                </section>

                <div className="info-divider"></div>

                <section className="info-section">
                    <div className="section-header">
                        <Wrench className="section-icon text-orange" size={32} />
                        <h2>{t('store.warranty_page.centers.title')}</h2>
                    </div>

                    <div className="info-cards-grid">
                        <div className="info-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="card-icon-wrapper bg-orange-light">
                                <Wrench size={24} className="text-orange-500" />
                            </div>
                            <h3>{t('store.warranty_page.centers.where_title')}</h3>
                            <p>{t('store.warranty_page.centers.where_desc')}</p>
                            <ul className="info-list">
                                <li>{t('store.warranty_page.centers.list.package')}</li>
                                <li>{t('store.warranty_page.centers.list.coupon')}</li>
                                <li>{t('store.warranty_page.centers.list.receipt')}</li>
                                <li>{t('store.warranty_page.centers.list.seals')}</li>
                            </ul>
                            <p style={{ marginTop: '1rem', color: '#64748b' }}>{t('store.warranty_page.centers.footer')}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
