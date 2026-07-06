import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CartSlideOver.css';

export function CartSlideOver() {
    const { t } = useTranslation();
    const { isCartOpen, setIsCartOpen, cartItems, cartTotal, removeFromCart, updateQuantity, purchasesDisabled } = useCart();
    const navigate = useNavigate();

    if (!isCartOpen) return null;

    const handleCheckout = () => {
        if (purchasesDisabled) return;
        setIsCartOpen(false);
        navigate('/checkout');
    };

    return (
        <>
            <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />
            <div className={`cart-slide-over ${isCartOpen ? 'open' : ''}`}>
                <div className="cart-header">
                    <h2>{t('store.cart.title')}</h2>
                    <button className="close-btn" onClick={() => setIsCartOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <div className="cart-content">
                    {cartItems.length === 0 ? (
                        <div className="empty-cart">
                            <ShoppingBag size={48} className="empty-icon" />
                            <h3>{t('store.cart.empty')}</h3>
                            <p>{t('store.cart.empty_hint')}</p>
                            <button className="continue-shopping" onClick={() => setIsCartOpen(false)}>
                                {t('store.cart.continue_shopping')}
                            </button>
                        </div>
                    ) : (
                        <div className="cart-items-list">
                            {cartItems.map(item => {
                                const key = item.variant ? `${item.product.id}-${item.variant.id}` : item.product.id.toString();
                                const displayName = item.variant ? `${item.product.name} (${item.variant.colorName})` : item.product.name;
                                const displayImage = item.variant && item.variant.images.length > 0 ? item.variant.images[0] : item.product.images?.[0];

                                return (
                                    <div key={key} className="cart-item">
                                        <img src={displayImage} alt={displayName} className="cart-item-img" />
                                        <div className="cart-item-info">
                                            <h4 className="cart-item-title">{displayName}</h4>
                                            <div className="cart-item-price">{Number(item.product.price).toFixed(0)} {t('admin.dashboard.card.currency')}</div>

                                            <div className="cart-item-actions">
                                                <div className="quantity-controls">
                                                    <button onClick={() => updateQuantity(item.product.id, item.variant?.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                                                        <Minus size={14} />
                                                    </button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.product.id, item.variant?.id, item.quantity + 1)}>
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <button className="remove-btn" onClick={() => removeFromCart(item.product.id, item.variant?.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <div className="cart-footer">
                        <div className="cart-total">
                            <span>{t('store.cart.total')}</span>
                            <span className="total-price">{cartTotal.toFixed(0)} {t('admin.dashboard.card.currency')}</span>
                        </div>
                        <button
                            className={`checkout-btn ${purchasesDisabled ? 'opacity-50 cursor-not-allowed bg-gray-400' : ''}`}
                            onClick={handleCheckout}
                            disabled={purchasesDisabled}
                        >
                            {purchasesDisabled ? t('store.cart.checkout_disabled') : t('store.cart.checkout')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
