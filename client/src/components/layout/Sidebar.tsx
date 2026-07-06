import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Home, Smartphone, Laptop, Tv, Speaker, Watch, Grid, 
    ChevronRight, ChevronDown, ChevronUp, Search,
    Headphones, Gamepad2, BatteryCharging, Zap, Monitor,
    Keyboard, Cpu, Tablet, Camera, Plug, Snowflake, Waves
} from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useProducts } from '../../context/ProductContext';
import './Sidebar.css';

interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string;
}

export const Sidebar = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentCategory = searchParams.get('category');

    // Get products and categories from context
    const { products, categories } = useProducts();
    const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({});
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
    const location = useLocation();

    // Auto-expand categories if we leave a filtered view (e.g. go to product page or clear filters)
    useEffect(() => {
        if (!currentCategory) {
            setIsCategoriesExpanded(true);
        }
    }, [currentCategory, location.pathname]);

    const handleCategoryClick = (slug: string | null) => {
        if (slug) {
            setSearchParams({ category: slug });
            setIsCategoriesExpanded(false); // Collapse on selection
        } else {
            setSearchParams({});
            setIsCategoriesExpanded(true); // Re-expand when viewing all
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleFilter = (name: string) => {
        setExpandedFilters(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // Calculate available filters AND counts
    const availableFilters = (() => {
        if (!currentCategory) return [];

        const categoryProducts = products.filter(p => p.category?.slug === currentCategory);
        const filters: Record<string, Map<string, number>> = {}; // Value -> Count

        categoryProducts.forEach(product => {
            if (!product.attributes) return;

            const processAttributes = (obj: any) => {
                if (!obj) return;
                Object.entries(obj).forEach(([key, value]) => {
                    const trimmedKey = key.trim();
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        processAttributes(value);
                    } else if (typeof value === 'string' || typeof value === 'number') {
                        if (!filters[trimmedKey]) filters[trimmedKey] = new Map();
                        const strVal = String(value).trim();
                        if (strVal) {
                            filters[trimmedKey].set(strVal, (filters[trimmedKey].get(strVal) || 0) + 1);
                        }
                    }
                });
            };

            processAttributes(product.attributes);
        });

        return Object.entries(filters)
            .map(([key, valuesMap]) => ({
                name: key,
                values: Array.from(valuesMap.entries()) // [["Red", 5], ["Blue", 2]]
                    .sort((a, b) => a[0].localeCompare(b[0]))
            }))
            .filter(f => f.values.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name));
    })();

    // Initialize expanded state for new filters
    useEffect(() => {
        if (availableFilters.length > 0) {
            setExpandedFilters(prev => {
                const next = { ...prev };
                availableFilters.forEach(f => {
                    if (next[f.name] === undefined) next[f.name] = true; // Default open
                });
                return next;
            });
        }
    }, [availableFilters.length, currentCategory]);

    const handleFilterChange = (key: string, value: string, checked: boolean) => {
        const newParams = new URLSearchParams(searchParams);
        if (checked) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Helper to pick an icon
    const getIcon = (category: Category) => {
        const icons: Record<string, any> = {
            Smartphone: <Smartphone className="nav-icon" />,
            Laptop: <Laptop className="nav-icon" />,
            Tv: <Tv className="nav-icon" />,
            Speaker: <Speaker className="nav-icon" />,
            Watch: <Watch className="nav-icon" />,
            Headphones: <Headphones className="nav-icon" />,
            Gamepad2: <Gamepad2 className="nav-icon" />,
            BatteryCharging: <BatteryCharging className="nav-icon" />,
            Zap: <Zap className="nav-icon" />,
            Monitor: <Monitor className="nav-icon" />,
            Keyboard: <Keyboard className="nav-icon" />,
            Cpu: <Cpu className="nav-icon" />,
            Tablet: <Tablet className="nav-icon" />,
            Camera: <Camera className="nav-icon" />,
            Plug: <Plug className="nav-icon" />,
            Snowflake: <Snowflake className="nav-icon" />,
            Waves: <Waves className="nav-icon" />,
        };

        return icons[category.icon || ''] || <Grid className="nav-icon" />;
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                {t('store.sidebar.catalog')}
            </div>
            <ul className="nav-list">
                <li className={`nav-item ${!currentCategory ? 'active' : ''}`}>
                    <div className="nav-link" onClick={() => handleCategoryClick(null)}>
                        <Home className="nav-icon" />
                        <span>{t('store.sidebar.all_products')}</span>
                        {!currentCategory && <ChevronRight size={16} className="ml-auto opacity-50" />}
                    </div>
                </li>

                <li className="sidebar-separator"></li>
                <li className="sidebar-section-title clickable" onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}>
                    <span>{t('store.sidebar.categories')}</span>
                    {isCategoriesExpanded ? <ChevronUp size={14} className="ml-auto opacity-50" /> : <ChevronDown size={14} className="ml-auto opacity-50" />}
                </li>

                <div className={`categories-wrapper ${isCategoriesExpanded ? 'expanded' : 'collapsed'}`}>
                    {categories.map(category => (
                        <li key={category.id} className={`nav-item ${currentCategory === category.slug ? 'active' : ''}`}>
                            <div className="nav-link" onClick={() => handleCategoryClick(category.slug)}>
                                {getIcon(category)}
                                <span>{category.name}</span>
                                {currentCategory === category.slug && <ChevronRight size={16} className="ml-auto opacity-50" />}
                            </div>
                        </li>
                    ))}
                </div>

                {/* Dynamic Filters Section */}
                {currentCategory && availableFilters.length > 0 && (
                    <>
                        <li className="sidebar-separator"></li>
                        <li className="sidebar-section-title">{t('store.sidebar.filters')}</li>

                        <div className="filters-container mt-2">
                            {availableFilters.map(filter => {
                                const isExpanded = expandedFilters[filter.name];
                                return (
                                    <div key={filter.name} className="filter-group">
                                        <div className="filter-header" onClick={() => toggleFilter(filter.name)}>
                                            <span className="filter-title">{filter.name}</span>
                                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                        </div>

                                        {isExpanded && (
                                            <div className="filter-list custom-scrollbar">
                                                {filter.values.length > 5 && (
                                                    <div className="relative mb-2 w-full">
                                                        <input type="text" placeholder={t('store.sidebar.search_placeholder')} className="filter-search" />
                                                        <Search size={14} className="absolute right-3 top-3 text-gray-400" />
                                                    </div>
                                                )}

                                                {filter.values.map(([val, count]) => {
                                                    const isActive = searchParams.get(filter.name) === val;
                                                    return (
                                                        <label key={val} className="filter-checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={isActive}
                                                                onChange={(e) => handleFilterChange(filter.name, val, e.target.checked)}
                                                            />
                                                            <span className="flex-1 truncate">{val}</span>
                                                            <span className="filter-count">({count})</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </ul>
        </aside>
    );
};
