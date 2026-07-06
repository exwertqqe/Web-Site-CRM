import { Product } from '../types';
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const { t } = useTranslation();
    const { addToCart, purchasesDisabled } = useCart();
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

    const selectedVariant = product.variants?.find(v => v.id === selectedVariantId) || (product.variants && product.variants.length > 0 ? product.variants[0] : null);
    const currentImage = (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) ? selectedVariant.images[0] : 'https://via.placeholder.com/300?text=No+Image';
    const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
    const isOutOfStock = currentStock !== undefined && currentStock <= 0;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, 1, selectedVariant || undefined);
    };

    const handleVariantSelect = (e: React.MouseEvent, variantId: number) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedVariantId(variantId === selectedVariantId ? null : variantId);
    };

    return (
        <Link
            to={`/product/${product.slug}`}
            className={`product-card block no-underline text-inherit hover:no-underline ${isOutOfStock ? 'out-of-stock' : ''}`}
        >
            <div className="card-image">
                <img
                    src={currentImage}
                    alt={product.name}
                />
                {isOutOfStock && (
                    <div className="out-of-stock-overlay">
                        <span>{t('store.product_card.out_of_stock')}</span>
                    </div>
                )}
            </div>

            <div className="card-info">
                <div className="card-category">
                    {product.category?.name || t('store.product_card.category_placeholder')}
                </div>

                <h3 className="card-title">
                    {product.name}{selectedVariant ? ` (${selectedVariant.colorName})` : ''}
                </h3>

                {product.attributes && (
                    <div className="card-specs">
                        {(() => {
                            // Helper to extract leaf values for tags, limiting to 3 items
                            const allTags: string[] = [];
                            Object.values(product.attributes).forEach((value) => {
                                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                    Object.values(value).forEach(subValue => {
                                        if (String(subValue).length < 20) allTags.push(String(subValue));
                                    });
                                } else {
                                    if (String(value).length < 20) allTags.push(String(value));
                                }
                            });

                            return allTags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="spec-tag">
                                    {tag}
                                </span>
                            ));
                        })()}
                    </div>
                )}

                {product.variants && product.variants.length > 0 && (
                    <div className="card-colors">
                        {product.variants.map((v) => (
                            <div
                                key={v.id}
                                className={`color-dot ${selectedVariantId === v.id ? 'active' : ''}`}
                                style={{ backgroundColor: v.colorCode }}
                                onClick={(e) => handleVariantSelect(e, v.id)}
                                title={v.colorName}
                            />
                        ))}
                    </div>
                )}

                <div className="card-footer">
                    <span className="card-price">
                        {Number(product.price).toLocaleString()} {t('admin.dashboard.card.currency')}
                    </span>
                    {!isOutOfStock ? (
                        <button
                            className={`add-btn ${purchasesDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                            style={purchasesDisabled ? { backgroundColor: '#9ca3af', color: 'white' } : {}}
                            aria-label="Add to cart"
                            onClick={handleAddToCart}
                            disabled={purchasesDisabled}
                        >
                            <ShoppingCart size={16} />
                        </button>
                    ) : (
                        <span className="out-of-stock-text">{t('store.product_card.sold_out')}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
