import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Trash2, Calendar, User, Package } from 'lucide-react';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import './AdminReviewsPage.css';

interface Review {
    id: number;
    rating: number;
    comment: string | null;
    userName: string;
    createdAt: string;
    productId: number;
    product: {
        id: number;
        name: string;
        variants: {
            images: string[];
        }[];
    };
}

export const AdminReviewsPage = () => {
    const { t, i18n } = useTranslation();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/reviews', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviews(res.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching reviews:', err);
            setError(t('admin.reviews.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('admin.reviews.delete_confirm'))) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/reviews/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviews(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error('Error deleting review:', err);
            alert(t('admin.reviews.delete_error'));
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="review-stars-display">
                {[...Array(5)].map((_, i) => (
                    <Star 
                        key={i} 
                        size={16} 
                        className={i < rating ? "star-active" : "star-inactive"} 
                        fill={i < rating ? "currentColor" : "none"}
                    />
                ))}
            </div>
        );
    };

    if (loading) return <div className="admin-reviews-loading">{t('admin.reviews.loading')}</div>;

    return (
        <div className="admin-reviews-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('admin.reviews.title')}</h1>
                    <p className="page-subtitle">{t('admin.reviews.subtitle')}</p>
                </div>
                <div className="reviews-count">
                    {t('admin.reviews.total', { count: reviews.length })}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="reviews-list">
                {reviews.map(review => {
                    const productImage = review.product.variants[0]?.images[0] || '/placeholder-product.png';
                    
                    return (
                        <div key={review.id} className="review-card">
                            <div className="review-card-header">
                                <div className="product-info">
                                    <div className="product-thumbnail">
                                        <img src={productImage} alt={review.product.name} />
                                    </div>
                                    <div className="product-details">
                                        <span className="product-label"><Package size={12} /> {t('admin.reviews.product_label')}</span>
                                        <h4 className="product-name">{review.product.name}</h4>
                                    </div>
                                </div>
                                <div className="review-actions">
                                    <button 
                                        className="delete-review-btn" 
                                        onClick={() => handleDelete(review.id)}
                                        title={t('admin.reviews.delete_btn')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="review-card-body">
                                <div className="user-meta">
                                    <div className="user-info">
                                        <User size={14} className="meta-icon" />
                                        <span className="user-name">{review.userName}</span>
                                    </div>
                                    <div className="review-date">
                                        <Calendar size={14} className="meta-icon" />
                                        <span>{format(new Date(review.createdAt), 'dd MMMM yyyy, HH:mm', { locale: i18n.language === 'en' ? enUS : uk })}</span>
                                    </div>
                                </div>
                                
                                <div className="rating-row">
                                    {renderStars(review.rating)}
                                    <span className="rating-number">{review.rating}/5</span>
                                </div>

                                <div className="review-comment">
                                    {review.comment ? (
                                        <p>{review.comment}</p>
                                    ) : (
                                        <span className="no-comment">{t('admin.reviews.no_comment')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {reviews.length === 0 && !loading && (
                    <div className="empty-state">
                        <div className="empty-icon">⭐</div>
                        <h3>{t('admin.reviews.empty_state.title')}</h3>
                        <p>{t('admin.reviews.empty_state.desc')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
