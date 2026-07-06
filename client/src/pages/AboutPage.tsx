import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Star, ShieldCheck, Truck, Clock, Users, ArrowRight } from 'lucide-react';
import Logo from '../assets/Logo.png';
import './AboutPage.css';

export const AboutPage = () => {
    const { t } = useTranslation();

    return (
        <div className="about-page">
            {/* Hero Section */}
            <section className="about-hero">
                <div className="hero-background-elements">
                    <div className="hero-blob blob-1"></div>
                    <div className="hero-blob blob-2"></div>
                </div>
                <div className="about-hero-content">
                    <div className="hero-text">
                        <span className="hero-subtitle">{t('store.about.hero.subtitle')}</span>
                        <h1>
                            <Trans i18nKey="store.about.hero.title">
                                Більше ніж просто <span className="text-gradient">інтернет-магазин</span>
                            </Trans>
                        </h1>
                        <p>{t('store.about.hero.description')}</p>
                        <Link to="/" className="hero-btn">
                            {t('store.about.hero.btn')} <ArrowRight size={20} />
                        </Link>
                    </div>
                    <div className="hero-image-wrapper">
                        <div className="glass-card">
                            <img src={Logo} alt="Gravity Logo" className="about-hero-logo" />
                            <h2>Gravity</h2>
                            <p>{t('store.about.hero.tagline')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="about-stats">
                <div className="stats-container">
                    <div className="stat-item">
                        <span className="stat-number">5+</span>
                        <span className="stat-label">{t('store.about.stats.years')}</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-number">50 {t('store.about.hero.tagline').includes('лучшее') ? 'тыс.' : 'тис.'}</span>
                        <span className="stat-label">{t('store.about.stats.customers')}</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-number">10k+</span>
                        <span className="stat-label">{t('store.about.stats.products')}</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-number">24/7</span>
                        <span className="stat-label">{t('store.about.stats.support')}</span>
                    </div>
                </div>
            </section>

            {/* Features/Values Section */}
            <section className="about-values">
                <div className="section-heading text-center">
                    <h2>
                        <Trans i18nKey="store.about.values.title">
                            Чому обирають <span className="text-blue">Gravity</span>?
                        </Trans>
                    </h2>
                    <p>{t('store.about.values.subtitle')}</p>
                </div>

                <div className="values-grid">
                    <div className="value-card">
                        <div className="value-icon-wrapper bg-blue">
                            <ShieldCheck size={32} />
                        </div>
                        <h3>{t('store.about.values.quality_title')}</h3>
                        <p>{t('store.about.values.quality_desc')}</p>
                    </div>

                    <div className="value-card">
                        <div className="value-icon-wrapper bg-gradient">
                            <Truck size={32} />
                        </div>
                        <h3>{t('store.about.values.delivery_title')}</h3>
                        <p>{t('store.about.values.delivery_desc')}</p>
                    </div>

                    <div className="value-card">
                        <div className="value-icon-wrapper bg-purple">
                            <Star size={32} />
                        </div>
                        <h3>{t('store.about.values.service_title')}</h3>
                        <p>{t('store.about.values.service_desc')}</p>
                    </div>

                    <div className="value-card">
                        <div className="value-icon-wrapper bg-orange">
                            <Clock size={32} />
                        </div>
                        <h3>{t('store.about.values.time_title')}</h3>
                        <p>{t('store.about.values.time_desc')}</p>
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section className="about-mission">
                <div className="mission-content">
                    <div className="mission-text">
                        <div className="mission-badge">
                            <Users size={18} /> {t('store.about.mission.badge')}
                        </div>
                        <h2>{t('store.about.mission.title')}</h2>
                        <p>{t('store.about.mission.desc1')}</p>
                        <p>{t('store.about.mission.desc2')}</p>
                    </div>
                    <div className="mission-visual">
                        <div className="visual-grid">
                            <div className="vg-item img-1"></div>
                            <div className="vg-item img-2"></div>
                            <div className="vg-item img-3 bg-secondary">
                                <h3>{t('store.about.mission.innovation')}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
