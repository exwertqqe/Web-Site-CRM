import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, ShieldCheck, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../context/ProductContext';
import Logo from '../../assets/Logo.png';
import './Header.css';

interface HeaderProps {
    toggleSidebar: () => void;
    onLoginClick: () => void;
}

export const Header = ({ toggleSidebar, onLoginClick }: HeaderProps) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { cartCount, setIsCartOpen } = useCart();
    const { t, i18n } = useTranslation();
    
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const { products } = useProducts();

    useEffect(() => {
        setSearchTerm(searchParams.get('q') || '');
    }, [searchParams]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userStr = localStorage.getItem('user');    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'MANAGER');

    const handleUserClick = () => {
        const token = localStorage.getItem('token');
        if (token && userStr) {
            navigate('/profile');
        } else {
            onLoginClick();
        }
    };

    const handleAdminClick = () => {
        navigate('/admin');
    };
    
    const handleSearch = (e?: React.MouseEvent | React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsDropdownOpen(false);
        const query = searchTerm.trim();
        if (query) {
            navigate(`/?q=${encodeURIComponent(query)}`);
        } else {
            navigate('/');
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch(e);
        }
    };


    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const query = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.description && p.description.toLowerCase().includes(query))
        ).slice(0, 5); // Limit to 5 results
    }, [products, searchTerm]);

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = window.location.origin;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    };

    const handleProductClick = (slug: string) => {
        setIsDropdownOpen(false);
        navigate(`/product/${slug}`);
    };

    const toggleLanguage = () => {
        const isEn = i18n.language && i18n.language.startsWith('en');
        i18n.changeLanguage(isEn ? 'uk' : 'en');
    };

    return (
        <header className="header">
            <div className="header-logo">
                <button className="action-btn" onClick={toggleSidebar}>
                    <Menu size={24} />
                </button>
                <Link to="/" className="header-logo-link">
                    <img src={Logo} alt="Gravity Logo" className="logo-icon" />
                    <span className="logo-text">GravityShope.UA</span>
                </Link>
            </div>

            <div className="header-search" ref={searchRef}>
                <Search className="search-icon" size={20} onClick={handleSearch} style={{ cursor: 'pointer' }} />
                <input
                    type="text"
                    placeholder={t('store.header.search_placeholder')}
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                />
                
                {/* Live Search Dropdown */}
                {isDropdownOpen && searchTerm.trim() !== '' && (
                    <div className="search-dropdown">
                        {searchResults.length > 0 ? (
                            <>
                                {searchResults.map((product) => {
                                    // Get first image from variant
                                    const imagePath = product.variants?.[0]?.images?.[0] || '';
                                    return (
                                        <div 
                                            key={product.id} 
                                            className="search-result-item"
                                            onClick={() => handleProductClick(product.slug)}
                                        >
                                            <div className="search-result-image">
                                                {imagePath ? (
                                                    <img src={getImageUrl(imagePath)} alt={product.name} />
                                                ) : (
                                                    <div className="search-result-placeholder">{t('store.header.no_photo')}</div>
                                                )}
                                            </div>
                                            <div className="search-result-info">
                                                <div className="search-result-title">{product.name}</div>
                                                <div className="search-result-price">{product.price} {t('admin.dashboard.card.currency')}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="search-results-all" onClick={(e) => handleSearch(e)}>
                                    {t('store.header.all_results')} ({searchResults.length}+)
                                </div>
                            </>
                        ) : (
                            <div className="search-result-empty">
                                {t('store.header.no_results')}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="header-actions">
                <button className="action-btn" onClick={toggleLanguage} title={i18n.language && i18n.language.startsWith('en') ? 'English' : 'Українська'} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Globe size={24} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{i18n.language && i18n.language.startsWith('en') ? 'EN' : 'UK'}</span>
                </button>
                {isAdmin && (
                    <button className="action-btn" onClick={handleAdminClick} title={t('store.header.admin_panel')}>
                        <ShieldCheck size={24} />
                    </button>
                )}
                <button className="action-btn" onClick={handleUserClick} title={t('store.header.profile')}>
                    <User size={24} />
                </button>
                <button className="action-btn" onClick={() => setIsCartOpen(true)} title={t('store.header.cart')}>
                    <ShoppingCart size={24} />
                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                </button>
            </div>
        </header>
    );
};
