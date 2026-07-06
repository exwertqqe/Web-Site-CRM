import { useState, useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { CheckCircle, User, Truck, CreditCard, ChevronDown, Banknote } from 'lucide-react';
import novaPoshtaIcon from '../assets/novaposhtacicon.png';
import ukrPoshtaIcon from '../assets/ukrposhaicon.png';
import './CheckoutPage.css';

export function CheckoutPage() {
    const { t } = useTranslation();
    const { cartItems, cartTotal, clearCart, purchasesDisabled } = useCart();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        city: '',
        deliveryMethod: 'nova_poshta_branch',
        deliveryAddress: '',
        paymentMethod: 'cash_on_delivery',
        cardNumber: '',
        cardExpiry: '',
        cardCvc: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Custom Delivery Dropdown State
    const [isDeliveryDropdownOpen, setIsDeliveryDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Custom Payment Dropdown State
    const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
    const dropdownPaymentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDeliveryDropdownOpen(false);
            }
            if (dropdownPaymentRef.current && !dropdownPaymentRef.current.contains(event.target as Node)) {
                setIsPaymentDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (purchasesDisabled) {
            alert(t('store.checkout.error_disabled'));
            navigate('/');
            return;
        }

        if (cartItems.length === 0) {
            alert(t('store.checkout.error_empty'));
            return;
        }

        setIsSubmitting(true);

        try {
            // Mapping delivery method to a readable address string to save in DB
            let finalAddress = '';
            if (formData.deliveryMethod === 'nova_poshta_branch') finalAddress = `${t('store.checkout.delivery_methods.nova_poshta_branch')}: ${formData.deliveryAddress}`;
            else if (formData.deliveryMethod === 'nova_poshta_courier') finalAddress = `${t('store.checkout.delivery_methods.nova_poshta_courier')}: ${formData.deliveryAddress}`;
            else if (formData.deliveryMethod === 'ukrposhta') finalAddress = `${t('store.checkout.delivery_methods.ukrposhta')}: ${formData.deliveryAddress}`;
            else if (formData.deliveryMethod === 'nova_poshta_postomat') finalAddress = `${t('store.checkout.delivery_methods.nova_poshta_postomat')}: ${formData.deliveryAddress}`;

            let userId: number | undefined;
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const parsedUser = JSON.parse(userStr);
                    if (parsedUser && parsedUser.id) {
                        userId = parsedUser.id;
                    }
                } catch (e) {
                    console.error('Failed to parse user from localStorage', e);
                }
            }

            const orderPayload = {
                userId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                email: formData.email,
                city: formData.city,
                address: finalAddress,
                items: cartItems.map(item => ({
                    productId: item.product.id,
                    variantId: item.variant?.id,
                    quantity: item.quantity,
                    price: Number(item.product.price)
                }))
            };

            await axios.post('/api/orders', orderPayload);

            setShowSuccessModal(true);
            clearCart();
        } catch (error) {
            console.error('Checkout error:', error);
            alert(t('store.checkout.error_generic'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        navigate('/');
    };

    if (cartItems.length === 0 && !showSuccessModal) {
        return (
            <div className="checkout-empty">
                <h2>{t('store.checkout.title')}</h2>
                <p>{t('store.checkout.empty')}</p>
                <button className="btn-primary" onClick={() => navigate('/')}>{t('store.checkout.back_to_shopping')}</button>
            </div>
        );
    }

    const deliveryOptions = [
        { value: 'nova_poshta_branch', label: t('store.checkout.delivery_methods.nova_poshta_branch'), icon: novaPoshtaIcon },
        { value: 'nova_poshta_courier', label: t('store.checkout.delivery_methods.nova_poshta_courier'), icon: novaPoshtaIcon },
        { value: 'nova_poshta_postomat', label: t('store.checkout.delivery_methods.nova_poshta_postomat'), icon: novaPoshtaIcon },
        { value: 'ukrposhta', label: t('store.checkout.delivery_methods.ukrposhta'), icon: ukrPoshtaIcon }
    ];
    const selectedDelivery = deliveryOptions.find(opt => opt.value === formData.deliveryMethod) || deliveryOptions[0];

    const paymentOptions = [
        { value: 'cash_on_delivery', label: t('store.checkout.payment_methods.cash_on_delivery'), icon: <Banknote size={24} className="payment-icon" /> },
        { value: 'card', label: t('store.checkout.payment_methods.card'), icon: <CreditCard size={24} className="payment-icon" /> }
    ];
    const selectedPayment = paymentOptions.find(opt => opt.value === formData.paymentMethod) || paymentOptions[0];

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <div className="checkout-main">
                    <h2 className="checkout-title">{t('store.checkout.title')}</h2>

                    <form className="checkout-form" onSubmit={handleSubmit}>
                        {/* 1. Контактні дані */}
                        <div className="form-section">
                            <h3 className="section-title"><User className="section-icon" /> {t('store.checkout.sections.contacts')}</h3>
                            <div className="form-grid spaced-grid">
                                <div className="form-group">
                                    <label>{t('store.checkout.form.first_name')}</label>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>{t('store.checkout.form.last_name')}</label>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>{t('store.checkout.form.phone')}</label>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>{t('store.checkout.form.email')}</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        {/* 2. Доставка */}
                        <div className="form-section">
                            <h3 className="section-title"><Truck className="section-icon" /> {t('store.checkout.sections.delivery')}</h3>
                            <div className="form-grid stack-grid">
                                <div className="form-group full-width">
                                    <label>{t('store.checkout.form.city')}</label>
                                    <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                                </div>
                                <div className="form-group full-width" ref={dropdownRef} style={{ position: 'relative' }}>
                                    <label>{t('store.checkout.form.delivery_method')}</label>
                                    <div
                                        className={`custom-dropdown-select ${isDeliveryDropdownOpen ? 'open' : ''}`}
                                        onClick={() => setIsDeliveryDropdownOpen(!isDeliveryDropdownOpen)}
                                    >
                                        <div className="custom-dropdown-value">
                                            <img src={selectedDelivery.icon} alt="icon" className="delivery-icon" />
                                            <span>{selectedDelivery.label}</span>
                                        </div>
                                        <ChevronDown size={20} className="custom-dropdown-arrow" />
                                    </div>

                                    {isDeliveryDropdownOpen && (
                                        <div className="custom-dropdown-menu">
                                            {deliveryOptions.map(option => (
                                                <div
                                                    key={option.value}
                                                    className={`custom-dropdown-item ${formData.deliveryMethod === option.value ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, deliveryMethod: option.value, deliveryAddress: '' }));
                                                        setIsDeliveryDropdownOpen(false);
                                                    }}
                                                >
                                                    <img src={option.icon} alt="icon" className="delivery-icon" />
                                                    <span>{option.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {formData.deliveryMethod === 'nova_poshta_branch' && (
                                    <div className="form-group full-width slide-down">
                                        <label>{t('store.checkout.form.delivery_address')}</label>
                                        <input type="text" name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} required placeholder={t('store.checkout.placeholders.branch')} />
                                    </div>
                                )}
                                {formData.deliveryMethod === 'nova_poshta_courier' && (
                                    <div className="form-group full-width slide-down">
                                        <label>{t('store.checkout.form.delivery_address_courier')}</label>
                                        <input type="text" name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} required placeholder={t('store.checkout.placeholders.courier')} />
                                    </div>
                                )}
                                {formData.deliveryMethod === 'nova_poshta_postomat' && (
                                    <div className="form-group full-width slide-down">
                                        <label>{t('store.checkout.form.delivery_address_postomat')}</label>
                                        <input type="text" name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} required placeholder={t('store.checkout.placeholders.postomat')} />
                                    </div>
                                )}
                                {formData.deliveryMethod === 'ukrposhta' && (
                                    <div className="form-group full-width slide-down">
                                        <label>{t('store.checkout.form.delivery_address_ukrposhta')}</label>
                                        <input type="text" name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} required placeholder={t('store.checkout.placeholders.ukrposhta')} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Оплата */}
                        <div className="form-section">
                            <h3 className="section-title"><CreditCard className="section-icon" /> {t('store.checkout.sections.payment')}</h3>
                            <div className="form-grid stack-grid">
                                <div className="form-group full-width" ref={dropdownPaymentRef} style={{ position: 'relative' }}>
                                    <label>{t('store.checkout.form.payment_method')}</label>
                                    <div
                                        className={`custom-dropdown-select ${isPaymentDropdownOpen ? 'open' : ''}`}
                                        onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                                    >
                                        <div className="custom-dropdown-value">
                                            {selectedPayment.icon}
                                            <span>{selectedPayment.label}</span>
                                        </div>
                                        <ChevronDown size={20} className="custom-dropdown-arrow" />
                                    </div>

                                    {isPaymentDropdownOpen && (
                                        <div className="custom-dropdown-menu">
                                            {paymentOptions.map(option => (
                                                <div
                                                    key={option.value}
                                                    className={`custom-dropdown-item ${formData.paymentMethod === option.value ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, paymentMethod: option.value }));
                                                        setIsPaymentDropdownOpen(false);
                                                    }}
                                                >
                                                    {option.icon}
                                                    <span>{option.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {formData.paymentMethod === 'card' && (
                                    <div className="card-payment-details full-width slide-down">
                                        <div className="form-group">
                                            <label>{t('store.checkout.form.card_number')}</label>
                                            <input type="text" name="cardNumber" value={formData.cardNumber} onChange={handleChange} placeholder={t('store.checkout.placeholders.card')} required={formData.paymentMethod === 'card'} maxLength={19} />
                                        </div>
                                        <div className="form-grid" style={{ marginTop: '1rem', gap: '1.5rem' }}>
                                            <div className="form-group">
                                                <label>{t('store.checkout.form.card_expiry')}</label>
                                                <input type="text" name="cardExpiry" value={formData.cardExpiry} onChange={handleChange} placeholder="MM/YY" required={formData.paymentMethod === 'card'} maxLength={5} />
                                            </div>
                                            <div className="form-group">
                                                <label>{t('store.checkout.form.card_cvc')}</label>
                                                <input type="password" name="cardCvc" value={formData.cardCvc} onChange={handleChange} placeholder="CVC" required={formData.paymentMethod === 'card'} maxLength={3} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`submit-order-btn ${purchasesDisabled ? 'opacity-50 cursor-not-allowed bg-gray-400' : ''}`}
                            disabled={isSubmitting || purchasesDisabled}
                        >
                            {purchasesDisabled ? t('store.checkout.disabled') : (isSubmitting ? t('store.checkout.processing') : t('store.checkout.submit'))}
                        </button>
                    </form>
                </div>

                <div className="checkout-sidebar">
                    <div className="order-summary-box">
                        <h3 className="summary-title">{t('store.checkout.summary.title')}</h3>

                        <div className="summary-items">
                            {cartItems.map(item => {
                                const key = item.variant ? `${item.product.id}-${item.variant.id}` : item.product.id.toString();
                                const displayName = item.variant ? `${item.product.name} (${item.variant.colorName})` : item.product.name;
                                const displayImage = item.variant && item.variant.images.length > 0 ? item.variant.images[0] : item.product.images?.[0];

                                return (
                                    <div key={key} className="summary-item">
                                        <div className="item-details-with-img">
                                            <div className="summary-img-wrapper">
                                                <img src={displayImage} alt={displayName} className="summary-item-img" />
                                                <span className="summary-item-qty-badge">{item.quantity}</span>
                                            </div>
                                            <div className="item-details">
                                                <span className="item-name">{displayName}</span>
                                            </div>
                                        </div>
                                        <span className="item-price">{(item.quantity * Number(item.product.price)).toFixed(0)} {t('admin.dashboard.card.currency')}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="summary-totals">
                            <div className="total-row">
                                <span>{t('store.checkout.summary.delivery')}</span>
                                <span>{t('store.checkout.summary.delivery_tariff')}</span>
                            </div>
                            <div className="total-row grand-total">
                                <span>{t('store.checkout.summary.total')}</span>
                                <span className="highlight-price">{cartTotal.toFixed(0)} {t('admin.dashboard.card.currency')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal">
                        <CheckCircle size={64} className="success-icon" />
                        <h2>{t('store.checkout.success.title')}</h2>
                        <p>{t('store.checkout.success.message')}</p>
                        <button className="btn-primary" onClick={handleCloseSuccessModal}>
                            {t('store.checkout.success.back_home')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
