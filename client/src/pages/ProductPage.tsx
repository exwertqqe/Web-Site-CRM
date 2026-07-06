import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation, Trans } from 'react-i18next';
import { Product } from '../types';
import {
    ShoppingCart, CreditCard, ShieldCheck, Check,
    MessageCircle, Star, Info, Truck, Store,
    ChevronLeft, ChevronRight, RefreshCcw, MessageSquare,
    Monitor, HardDrive, Cpu, Camera, Battery, Settings
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import './ProductPage.css';

export function ProductPage() {
    const { t, i18n } = useTranslation();
    const { slug } = useParams<{ slug: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'about' | 'specs' | 'reviews'>('about');
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', userName: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const { addToCart, purchasesDisabled } = useCart();

    const fetchReviews = async (productId: number) => {
        try {
            const response = await axios.get(`/api/reviews/${productId}`);
            setReviews(response.data);
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
        }
    };

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(`/api/products/${slug}`);
                setProduct(response.data);
                if (response.data.id) fetchReviews(response.data.id);

                // Select first variant by default if available
                if (response.data.variants && response.data.variants.length > 0) {
                    setSelectedVariantId(response.data.variants[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch product:', error);
            } finally {
                setLoading(false);
            }
        };

        if (slug) fetchProduct();
    }, [slug]);

    if (loading) return <div className="product-page">{t('store.product.loading')}</div>;
    if (!product) return <div className="product-page">{t('store.product.not_found')}</div>;

    const selectedVariant = product.variants?.find(v => v.id === selectedVariantId) || (product.variants && product.variants.length > 0 ? product.variants[0] : null);
    const currentImages = (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) ? selectedVariant.images : ['https://via.placeholder.com/600x600?text=No+Image'];
    const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

    const handleAddToCart = () => {
        addToCart(product, 1, selectedVariant || undefined);
    };

    const handleVariantSelect = (variantId: number) => {
        setSelectedVariantId(variantId);
        setSelectedImageIndex(0);
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;
        setSubmittingReview(true);
        try {
            await axios.post(`/api/reviews/${product.id}`, reviewForm);
            setReviewForm({ rating: 5, comment: '', userName: '' });
            fetchReviews(product.id);
        } catch (error) {
            console.error('Failed to submit review:', error);
        } finally {
            setSubmittingReview(false);
        }
    };

    const nextImage = () => setSelectedImageIndex(prev => (prev + 1) % currentImages.length);
    const prevImage = () => setSelectedImageIndex(prev => (prev - 1 + currentImages.length) % currentImages.length);

    return (
        <div className="product-page">
            <div className="breadcrumbs">
                <Link to="/">{t('store.product.breadcrumbs.home')}</Link> / <span>{product.category?.name || t('store.product.breadcrumbs.catalog')}</span> / <span>{product.name}</span>
            </div>

            <div className="product-content">
                {/* Header Tabs (Global) */}
                <div className="product-header-tabs">
                    <span className={`tab-link ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>{t('store.product.tabs.about')}</span>
                    <span className={`tab-link ${activeTab === 'specs' ? 'active' : ''}`} onClick={() => setActiveTab('specs')}>{t('store.product.tabs.specs')}</span>
                    <span className={`tab-link ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>{t('store.product.tabs.reviews')}</span>
                </div>

                {/* Left Column: Gallery & Description */}
                <div className="product-main-info">
                    <h1 className="product-title">{product.name} {selectedVariant ? ` (${selectedVariant.colorName})` : ''}</h1>
                    <div className="product-meta">
                        {reviews.length > 0 ? (
                            <div className="rating-stars">
                                {[...Array(5)].map((_, i) => {
                                    const avgRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
                                    return (
                                        <Star
                                            key={i}
                                            size={16}
                                            fill={i < Math.round(avgRating) ? "#fbbf24" : "none"}
                                            color={i < Math.round(avgRating) ? "#fbbf24" : "#94a3b8"}
                                        />
                                    );
                                })}
                                <span className="ml-1 text-gray-400">
                                    {(reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)} ({t('store.product.meta.reviews_count', { count: reviews.length })})
                                </span>
                            </div>
                        ) : (
                            <div className="text-gray-400">{t('store.product.meta.no_reviews')}</div>
                        )}
                        <div className="product-code">{t('store.product.meta.code', { code: 100000 + (product.id % 99999) })}</div>
                        <div className={`flex items-center gap-1 ${currentStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            <Check size={16} /> {currentStock > 0 ? t('store.product.meta.in_stock') : t('store.product.meta.out_of_stock')}
                        </div>
                    </div>

                    {activeTab === 'about' && (
                        <>
                            <div className="product-gallery">
                                <div className="thumbnails">
                                    {currentImages.map((img, i) => (
                                        <img
                                            key={i}
                                            src={img}
                                            className={`thumbnail-image ${selectedImageIndex === i ? 'selected' : ''}`}
                                            alt={`thumb-${i}`}
                                            onMouseEnter={() => setSelectedImageIndex(i)}
                                            onClick={() => setSelectedImageIndex(i)}
                                        />
                                    ))}
                                </div>

                                <div className="main-image-container group">
                                    {currentImages.length > 1 && (
                                        <button className="nav-arrow left" onClick={prevImage}><ChevronLeft size={24} /></button>
                                    )}
                                    <img src={currentImages[selectedImageIndex]} alt={product.name} className="main-image" />
                                    {currentImages.length > 1 && (
                                        <button className="nav-arrow right" onClick={nextImage}><ChevronRight size={24} /></button>
                                    )}
                                </div>
                            </div>

                            <div className="description">
                                <h2 className="specs-title">{t('store.product.specs.title')}</h2>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {product.description}
                                </p>
                            </div>
                        </>
                    )}

                    {activeTab === 'specs' && (
                        <div className="specs-full">
                            <h2 className="specs-title">{t('store.product.specs.specs_title', { name: product.name })}</h2>
                            <div className="specs-list">
                                {product.attributes ? Object.entries(product.attributes).map(([section, content]: [string, any]) => {
                                    // Helper to get icons for common sections
                                    const getSectionIcon = (name: string) => {
                                        const lowerName = name.toLowerCase();
                                        if (lowerName.includes('екран') || lowerName.includes('дисплей') || lowerName.includes('screen') || lowerName.includes('display')) return <Monitor size={20} />;
                                        if (lowerName.includes('пам\'ять') || lowerName.includes('диск') || lowerName.includes('memory') || lowerName.includes('storage')) return <HardDrive size={20} />;
                                        if (lowerName.includes('процесор') || lowerName.includes('чіп') || lowerName.includes('processor') || lowerName.includes('cpu')) return <Cpu size={20} />;
                                        if (lowerName.includes('камера') || lowerName.includes('camera')) return <Camera size={20} />;
                                        if (lowerName.includes('акумулятор') || lowerName.includes('батарея') || lowerName.includes('battery')) return <Battery size={20} />;
                                        return <Settings size={20} />;
                                    };

                                    return (
                                        <div key={section} className="spec-section">
                                            <h3>{getSectionIcon(section)} {section}</h3>
                                            {Object.entries(content).map(([key, value]: [string, any]) => (
                                                <div key={key} className="spec-row">
                                                    <span className="spec-name">{key}</span>
                                                    <span className={`spec-value ${(key === 'Виробник' || key === 'Бренд' || key === 'Manufacturer' || key === 'Brand') ? 'link' : ''}`}>
                                                        {String(value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }) : (
                                    <div className="bg-white p-12 rounded-xl text-center border-2 border-dashed border-gray-100">
                                        <p className="text-gray-500">{t('store.product.specs.empty')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="reviews-section">
                            <h2 className="specs-title flex items-center gap-2 text-2xl mb-8"><MessageCircle /> {t('store.product.reviews.title')}</h2>

                            <div className="add-review-form">
                                <h3 className="review-form-title">{t('store.product.reviews.add_title')}</h3>
                                <form onSubmit={handleReviewSubmit}>
                                    <div className="review-form-content">
                                        <div className="form-group">
                                            <label>{t('store.product.reviews.name_label')}</label>
                                            <input
                                                type="text"
                                                required
                                                value={reviewForm.userName}
                                                onChange={(e) => setReviewForm({ ...reviewForm, userName: e.target.value })}
                                                placeholder={t('store.product.reviews.name_label')}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>{t('store.product.reviews.comment_label')}</label>
                                            <textarea
                                                required
                                                value={reviewForm.comment}
                                                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                                placeholder={t('store.product.reviews.comment_label')}
                                            />
                                        </div>

                                        <div className="rating-vertical-box">
                                            <span className="rating-box-title">{t('store.product.reviews.rating_label')}</span>
                                            <div className="rating-stars-input">
                                                {[1, 2, 3, 4, 5].map((num) => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => setReviewForm({ ...reviewForm, rating: num })}
                                                        className={`rating-btn ${reviewForm.rating >= num ? 'active' : ''}`}
                                                    >
                                                        <Star size={28} fill={reviewForm.rating >= num ? "currentColor" : "none"} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="review-form-actions">
                                        <button
                                            type="submit"
                                            disabled={submittingReview}
                                            className="btn-publish"
                                        >
                                            {submittingReview ? t('store.product.reviews.publishing') : t('store.product.reviews.publish')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReviewForm({ rating: 5, comment: '', userName: '' })}
                                            className="btn-cancel"
                                        >
                                            {t('store.product.reviews.cancel')}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="review-list-header mt-12">
                                <h3 className="text-xl font-bold text-slate-800 border-b pb-4 mb-2">{t('store.product.reviews.all_reviews', { count: reviews.length })}</h3>
                                {reviews.length > 0 ? (
                                    <div className="review-feed-container">
                                        {reviews.map((review, i) => (
                                            <div key={i} className="review-feed-item">
                                                <div className="review-item-header">
                                                    <div className="review-user-info">
                                                        <div className="review-avatar-circle">
                                                            {review.userName.charAt(0)}
                                                        </div>
                                                        <span className="review-user-name">{review.userName}</span>
                                                        <span className="review-product-meta">{product.name}</span>
                                                    </div>
                                                    <div className="review-stars-orange">
                                                        {[...Array(5)].map((_, starIdx) => (
                                                            <Star key={starIdx} size={16} fill={starIdx < review.rating ? "currentColor" : "none"} />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="review-item-body">
                                                    <p className="review-text">{review.comment}</p>
                                                </div>

                                                <div className="review-item-footer">
                                                    <div className="review-date">
                                                        {new Date(review.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'uk-UA')}
                                                    </div>
                                                    <div className="review-actions">
                                                        <span className="action-link">{t('store.product.reviews.comment_link')}</span>
                                                        <div className="comments-count">
                                                            <MessageSquare size={16} />
                                                            <span>{t('store.product.reviews.comments_count', { count: 0 })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white p-12 rounded-xl text-center border-2 border-dashed border-gray-100 mt-6">
                                        <p className="text-gray-500">{t('store.product.reviews.empty')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Buy Block & Delivery */}
                <div className="product-sidebar">
                    <div className="buy-block">
                        {product.variants && product.variants.length > 0 && (
                            <div className="color-selection">
                                <div className="color-title">
                                    {t('store.product.buy.color')} <span className="text-blue-600 font-bold ml-1">{selectedVariant?.colorName}</span>
                                </div>
                                <div className="color-swatches-grid">
                                    {product.variants.map((v) => (
                                        <div
                                            key={v.id}
                                            className={`color-swatch-wrapper ${selectedVariantId === v.id ? 'active' : ''}`}
                                            onClick={() => handleVariantSelect(v.id)}
                                            title={v.colorName}
                                        >
                                            <div className="color-swatch" style={{ backgroundColor: v.colorCode }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="price-container">
                            <div className="price-label">{t('store.product.buy.price_label')}</div>
                            <div className="current-price-row">
                                <span className="main-price">{Number(product.price).toLocaleString()}</span>
                                <span className="main-currency">{t('admin.dashboard.card.currency')}</span>
                            </div>
                            <div className="cashback-info">
                                <Trans i18nKey="store.product.buy.cashback" values={{ amount: Math.floor(Number(product.price) * 0.01), currency: t('admin.dashboard.card.currency') }}>
                                    <Info size={14} /> bonus <span className="cashback-amount">0 ₴</span> on purchase
                                </Trans>
                            </div>
                        </div>

                        <div className="buy-actions">
                            <button
                                className={`btn-primary-buy ${purchasesDisabled || (currentStock <= 0) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                disabled={purchasesDisabled || (currentStock <= 0)}
                                onClick={handleAddToCart}
                            >
                                <ShoppingCart size={24} />
                                {purchasesDisabled ? t('store.product.buy.unavailable') : (currentStock > 0 ? t('store.product.buy.buy_btn') : t('store.product.buy.out_of_stock'))}
                            </button>
                            <button className="btn-secondary-credit" disabled={purchasesDisabled}>
                                <CreditCard size={20} /> {t('store.product.buy.credit')}
                            </button>
                        </div>

                        <div className="feature-icons">
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><Truck size={24} /></div>
                                <div className="feature-text">{t('store.product.features.shipping')}</div>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><Store size={24} /></div>
                                <div className="feature-text">{t('store.product.features.delivery')}</div>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><RefreshCcw size={24} /></div>
                                <div className="feature-text">{t('store.product.features.exchange')}</div>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><ShieldCheck size={24} /></div>
                                <div className="feature-text">{t('store.product.features.warranty')}</div>
                            </div>
                        </div>
                    </div>

                    <div className="delivery-section">
                        <div className="delivery-title">
                            {t('store.product.delivery.title')}
                        </div>
                        <div className="delivery-methods">
                            <div className="delivery-item">
                                <div className="method-info">
                                    <Store size={18} className="text-gray-400" />
                                    <span>{t('store.product.delivery.pickup')}</span>
                                </div>
                                <span className="method-price">{t('store.product.delivery.free')}</span>
                            </div>
                            <div className="delivery-item">
                                <div className="method-info">
                                    <Truck size={18} className="text-gray-400" />
                                    <span>{t('store.product.delivery.nova_poshta')}</span>
                                </div>
                                <span className="method-price">{t('store.product.delivery.free')}</span>
                            </div>
                            <div className="delivery-item">
                                <div className="method-info">
                                    <Truck size={18} className="text-gray-400" />
                                    <span>{t('store.product.delivery.courier')}</span>
                                </div>
                                <span className="method-price paid">{t('store.product.delivery.from', { price: 150, currency: t('admin.dashboard.card.currency') })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductPage;
