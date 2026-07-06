import { CornerDownLeft, RefreshCcw, HandCoins, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './DeliveryPage.css'; // Reusing shared info page styles

export const ReturnsPage = () => {
    const { t } = useTranslation();

    return (
        <div className="info-page returns-page">
            <div className="info-hero bg-gradient-returns">
                <div className="info-hero-content">
                    <h1>{t('store.returns_page.hero.title')}</h1>
                    <p>{t('store.returns_page.hero.subtitle')}</p>
                </div>
            </div>

            <div className="info-container">
                <section className="info-section">
                    <div className="section-header">
                        <CornerDownLeft className="section-icon text-red" size={32} />
                        <h2>{t('store.returns_page.conditions.title')}</h2>
                    </div>

                    <div className="info-cards-grid">
                        <div className="info-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="card-icon-wrapper bg-red-light">
                                <AlertTriangle size={24} className="text-red-500" />
                            </div>
                            <h3>{t('store.returns_page.conditions.rules_title')}</h3>
                            <p>{t('store.returns_page.conditions.rules_desc')}</p>

                            <p><strong>{t('store.returns_page.conditions.must_be_met')}</strong></p>
                            <ul className="info-list">
                                <li>{t('store.returns_page.conditions.list.usage')}</li>
                                <li>{t('store.returns_page.conditions.list.package')}</li>
                                <li>{t('store.returns_page.conditions.list.labels')}</li>
                                <li>{t('store.returns_page.conditions.list.receipt')}</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <div className="info-divider"></div>

                <section className="info-section">
                    <div className="section-header">
                        <RefreshCcw className="section-icon text-orange" size={32} />
                        <h2>{t('store.returns_page.how_to.title')}</h2>
                    </div>

                    <div className="info-cards-grid">
                        <div className="info-card">
                            <div className="card-icon-wrapper bg-blue-light">
                                <RefreshCcw size={24} className="text-blue-500" />
                            </div>
                            <h3>{t('store.returns_page.how_to.step1_title')}</h3>
                            <p>{t('store.returns_page.how_to.step1_desc')}</p>
                        </div>

                        <div className="info-card">
                            <div className="card-icon-wrapper bg-green-light">
                                <HandCoins size={24} className="text-green-500" />
                            </div>
                            <h3>{t('store.returns_page.how_to.step2_title')}</h3>
                            <p>{t('store.returns_page.how_to.step2_desc')}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
