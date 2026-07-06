import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ProductCard } from '../components/ProductCard';
import { useProducts } from '../context/ProductContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './HomePage.css';

interface Banner {
    id: number;
    title: string | null;
    description: string | null;
    imageUrl: string;
    linkUrl: string | null;
}

export function HomePage() {
    const { t } = useTranslation();
    const { products, categories, loading: productsLoading } = useProducts();
    const [searchParams] = useSearchParams();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [bannersLoading, setBannersLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;
    const categorySlug = searchParams.get('category');

    const currentCategoryName = useMemo(() => {
        if (!categorySlug) return '';
        const cat = categories.find(c => c.slug === categorySlug);
        return cat?.name || categorySlug;
    }, [categories, categorySlug]);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = await axios.get('/api/banners');
                setBanners(res.data);
            } catch (error) {
                console.error('Error fetching banners:', error);
            } finally {
                setBannersLoading(false);
            }
        };
        fetchBanners();
    }, []);

    // Auto-slide
    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [banners]);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % banners.length);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length);

    const filteredProducts = useMemo(() => {
        const searchQuery = searchParams.get('q')?.toLowerCase();

        return products.filter(product => {
            // 0. Global Search Filter
            if (searchQuery) {
                const nameMatch = product.name.toLowerCase().includes(searchQuery);
                const descMatch = product.description?.toLowerCase().includes(searchQuery);
                if (!nameMatch && !descMatch) {
                    return false;
                }
            }

            // 1. Category Filter
            if (categorySlug && product.category?.slug !== categorySlug) {
                return false;
            }

            // 2. Attribute Filters
            for (const [key, value] of searchParams.entries()) {
                if (key === 'category' || key === 'q') continue;

                const productAttrs = product.attributes || {};

                const findAllValuesForKey = (obj: any, targetKey: string, results: string[] = []) => {
                    if (!obj || typeof obj !== 'object') return results;
                    if (obj[targetKey]) results.push(String(obj[targetKey]).trim());

                    for (const k in obj) {
                        if (typeof obj[k] === 'object') {
                            findAllValuesForKey(obj[k], targetKey, results);
                        }
                    }
                    return results;
                };

                const attrValues = findAllValuesForKey(productAttrs, key);
                if (!attrValues.includes(value.trim())) return false;
            }

            return true;
        });
    }, [products, searchParams, categorySlug]);

    useEffect(() => {
        setCurrentPage(1);
    }, [categorySlug, searchParams]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = window.location.origin;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    };

    return (
        <div className="home-page">
            {/* Banner Carousel */}
            <section className="hero-carousel">
                {bannersLoading ? (
                    <div className="banner-placeholder"></div>
                ) : banners.length > 0 ? (
                    <div className="carousel-container">
                        <div
                            className="carousel-track"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                            {banners.map(banner => (
                                <Link
                                    key={banner.id}
                                    to={banner.linkUrl || '#'}
                                    className="carousel-slide"
                                >
                                    <img 
                                        src={getImageUrl(banner.imageUrl)} 
                                        alt={banner.title || 'Promo'} 
                                    />
                                    {(banner.title || banner.description) && (
                                        <div className="banner-slide-content">
                                            {banner.title && <h2>{banner.title}</h2>}
                                            {banner.description && <p>{banner.description}</p>}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>

                        {banners.length > 1 && (
                            <>
                                <button className="carousel-nav-btn prev" onClick={prevSlide}>
                                    <ChevronLeft size={24} />
                                </button>
                                <button className="carousel-nav-btn next" onClick={nextSlide}>
                                    <ChevronRight size={24} />
                                </button>
                                <div className="carousel-dots">
                                    {banners.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`dot ${currentSlide === idx ? 'active' : ''}`}
                                            onClick={() => setCurrentSlide(idx)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="hero-banner static-fallback">
                        <div className="hero-content">
                            <h1>{t('store.home.hero.title')}</h1>
                            <p>{t('store.home.hero.subtitle')}</p>
                            <button className="cta-button">{t('store.home.hero.cta')}</button>
                        </div>
                    </div>
                )}
            </section>

            <section className="featured-products">
                <h2>
                    {searchParams.get('q') 
                        ? t('store.home.titles.search_results', { query: searchParams.get('q') }) 
                        : (categorySlug 
                            ? t('store.home.titles.category_results', { category: currentCategoryName }) 
                            : t('store.home.titles.popular'))}
                </h2>

                <div className="products-grid">
                    {productsLoading ? (
                        [...Array(8)].map((_, i) => (
                            <div key={i} className="product-card-placeholder"></div>
                        ))
                    ) : (
                        paginatedProducts.length > 0 ? (
                            paginatedProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                {t('store.home.empty_category')}
                            </div>
                        )
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button 
                            className="page-btn nav-btn"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            {t('store.home.pagination.prev')}
                        </button>
                        
                        <div className="page-numbers">
                            {(() => {
                                const pages = [];
                                const sidePages = 2; // Show 2 pages before and after current
                                
                                for (let i = 1; i <= totalPages; i++) {
                                    if (
                                        i === 1 || 
                                        i === totalPages || 
                                        (i >= currentPage - sidePages && i <= currentPage + sidePages)
                                    ) {
                                        pages.push(
                                            <button
                                                key={i}
                                                className={`page-btn num-btn ${currentPage === i ? 'active' : ''}`}
                                                onClick={() => handlePageChange(i)}
                                            >
                                                {i}
                                            </button>
                                        );
                                    } else if (
                                        i === currentPage - sidePages - 1 || 
                                        i === currentPage + sidePages + 1
                                    ) {
                                        pages.push(<span key={i} className="page-ellipsis">...</span>);
                                    }
                                }
                                return pages;
                            })()}
                        </div>

                        <button 
                            className="page-btn nav-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            {t('store.home.pagination.next')}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
