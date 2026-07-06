import { Truck, CreditCard, Wallet, MapPin, Package, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './DeliveryPage.css';

export const DeliveryPage = () => {
    const { t } = useTranslation();

    return (
        <div className="info-page delivery-page">
            <div className="info-hero bg-gradient-delivery">
                <div className="info-hero-content">
                    <h1>{t('store.delivery_page.hero.title')}</h1>
                    <p>{t('store.delivery_page.hero.subtitle')}</p>
                </div>
            </div>

            <div className="info-container">
                <section className="info-section">
                    <div className="section-header">
                        <Truck className="section-icon text-blue" size={32} />
                        <h2>{t('store.delivery_page.shipping.title')}</h2>
                    </div>

                    <div className="info-cards-grid">
                        <div className="info-card">
                            <div className="card-icon-wrapper bg-red-light">
                                <Package size={24} className="text-red-500" />
                            </div>
                            <h3>{t('store.delivery_page.shipping.np_branch_title')}</h3>
                            <p>{t('store.delivery_page.shipping.np_branch_desc')}</p>
                            <span className="card-price">{t('store.delivery_page.shipping.np_branch_price')}</span>
                        </div>

                        <div className="info-card">
                            <div className="card-icon-wrapper bg-blue-light">
                                <MapPin size={24} className="text-blue-500" />
                            </div>
                            <h3>{t('store.delivery_page.shipping.np_courier_title')}</h3>
                            <p>{t('store.delivery_page.shipping.np_courier_desc')}</p>
                            <span className="card-price">{t('store.delivery_page.shipping.np_courier_price')}</span>
                        </div>

                        <div className="info-card">
                            <div className="card-icon-wrapper bg-green-light">
                                <ShieldCheck size={24} className="text-green-500" />
                            </div>
                            <h3>{t('store.delivery_page.shipping.pickup_title')}</h3>
                            <p>{t('store.delivery_page.shipping.pickup_desc')}</p>
                            <span className="card-price text-green-600">{t('store.delivery_page.shipping.pickup_price')}</span>
                        </div>
                    </div>
                </section>

                <div className="info-divider"></div>

                <section className="info-section">
                    <div className="section-header">
                        <CreditCard className="section-icon text-purple" size={32} />
                        <h2>{t('store.delivery_page.payment.title')}</h2>
                    </div>

                    <div className="info-cards-grid">
                        <div className="info-card">
                            <div className="card-icon-wrapper bg-purple-light">
                                <CreditCard size={24} className="text-purple-500" />
                            </div>
                            <h3>{t('store.delivery_page.payment.online_title')}</h3>
                            <p>{t('store.delivery_page.payment.online_desc')}</p>
                            <ul className="info-list">
                                <li>{t('store.delivery_page.payment.online_list.pay')}</li>
                                <li>{t('store.delivery_page.payment.online_list.no_commission')}</li>
                                <li>{t('store.delivery_page.payment.online_list.instant')}</li>
                            </ul>
                        </div>

                        <div className="info-card">
                            <div className="card-icon-wrapper bg-orange-light">
                                <Wallet size={24} className="text-orange-500" />
                            </div>
                            <h3>{t('store.delivery_page.payment.cod_title')}</h3>
                            <p>{t('store.delivery_page.payment.cod_desc')}</p>
                            <ul className="info-list">
                                <li>{t('store.delivery_page.payment.cod_list.commission')}</li>
                                <li>{t('store.delivery_page.payment.cod_list.inspection')}</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
