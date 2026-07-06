import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './Footer.css';

export const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-column">
                    <h3>{t('store.footer.about_us')}</h3>
                    <ul>
                        <li><Link to="/about">{t('store.footer.about_company')}</Link></li>
                    </ul>
                </div>
                <div className="footer-column">
                    <h3>{t('store.footer.for_customers')}</h3>
                    <ul>
                        <li><Link to="/delivery">{t('store.footer.delivery_payment')}</Link></li>
                        <li><Link to="/warranty">{t('store.footer.warranty')}</Link></li>
                        <li><Link to="/returns">{t('store.footer.returns')}</Link></li>
                    </ul>
                </div>
                <div className="footer-column">
                    <h3>{t('store.footer.contacts')}</h3>
                    <ul>
                        <li>0 800 500 000</li>
                        <li>support@technoshop.com</li>
                        <li>{t('store.footer.address')}</li>
                    </ul>
                </div>
            </div>
            <div className="footer-bottom">
                &copy; {new Date().getFullYear()} GravityShope.UA. {t('store.footer.rights_reserved')}
            </div>
        </footer>
    );
};
