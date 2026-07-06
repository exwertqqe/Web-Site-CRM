import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, Copy } from 'lucide-react';
import { AddProductModal } from './AddProductModal';
import './AdminProductsPage.css';

interface Product {
    id: number;
    name: string;
    price: number;
    category: { name: string };
    description: string;
    categoryId: number;
    variants: any[];
    attributes: any;
}

export const AdminProductsPage = () => {
    const { t } = useTranslation();
    const [products, setProducts] = useState<Product[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [copyingProduct, setCopyingProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<string>('DEFAULT');

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get('/api/products');
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('admin.products.actions.confirm_delete'))) {
            try {
                const token = localStorage.getItem('token');

                await axios.delete(`/api/products/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                fetchProducts();
            } catch (error: any) {
                console.error('Error deleting product:', error);
                const errorMessage = error.response?.data?.message || error.message || t('admin.products.actions.delete_error');
                alert(`${t('admin.products.actions.delete_error')}: ${errorMessage}`);
            }
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setCopyingProduct(null);
        setIsAddModalOpen(true);
    };

    const handleCopy = (product: Product) => {
        // Find the full product details from the array or assuming it has enough data
        // For a full copy, we might need all attributes if they aren't fully loaded in the list,
        // but typically the list fetches everything needed. We pass it to the modal.
        setCopyingProduct(product);
        setEditingProduct(null);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingProduct(null);
        setCopyingProduct(null);
    };

    let filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedCategory !== 'ALL') {
        filteredProducts = filteredProducts.filter(product => product.categoryId === Number(selectedCategory));
    }

    filteredProducts.sort((a, b) => {
        if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
        if (sortBy === 'NAME_DESC') return b.name.localeCompare(a.name);
        if (sortBy === 'PRICE_ASC') return a.price - b.price;
        if (sortBy === 'PRICE_DESC') return b.price - a.price;
        
        const getStock = (p: Product) => p.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
        
        if (sortBy === 'STOCK_ASC') return getStock(a) - getStock(b);
        if (sortBy === 'STOCK_DESC') return getStock(b) - getStock(a);
        
        return 0; // DEFAULT
    });

    return (
        <div className="admin-products-page">
            <div className="page-header">
                <h2>{t('admin.products.title')}</h2>
                <button className="add-btn" onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={20} />
                    <span>{t('admin.products.add_btn')}</span>
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder={t('admin.products.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <select 
                    className="filter-select"
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="ALL">{t('admin.products.filter_all_categories')}</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>

                <select 
                    className="filter-select"
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="DEFAULT">{t('admin.products.sort_default')}</option>
                    <option value="NAME_ASC">{t('admin.products.sort_name_asc')}</option>
                    <option value="NAME_DESC">{t('admin.products.sort_name_desc')}</option>
                    <option value="PRICE_ASC">{t('admin.products.sort_price_asc')}</option>
                    <option value="PRICE_DESC">{t('admin.products.sort_price_desc')}</option>
                    <option value="STOCK_ASC">{t('admin.products.sort_stock_asc')}</option>
                    <option value="STOCK_DESC">{t('admin.products.sort_stock_desc')}</option>
                </select>
            </div>

            <div className="products-table-container">
                <table className="products-table">
                    <thead>
                        <tr>
                            <th>{t('admin.products.table.name')}</th>
                            <th>{t('admin.products.table.category')}</th>
                            <th>{t('admin.products.table.price')}</th>
                            <th>{t('admin.products.table.stock')}</th>
                            <th>{t('admin.products.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((product) => (
                            <tr key={product.id}>
                                <td className="product-name-cell">{product.name}</td>
                                <td>{product.category?.name || '-'}</td>
                                <td>₴ {product.price}</td>
                                <td>
                                    {(() => {
                                        const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
                                        
                                        let badgeClass = 'out-of-stock';
                                        let badgeText = t('admin.products.stock.out_of_stock');
                                        
                                        if (totalStock >= 20) {
                                            badgeClass = 'in-stock';
                                            badgeText = `${t('admin.products.stock.in_stock')} (${totalStock})`;
                                        } else if (totalStock > 0) {
                                            badgeClass = 'low-stock';
                                            badgeText = `${t('admin.products.stock.low_stock')} (${totalStock})`;
                                        }

                                        return (
                                            <span className={`stock-badge ${badgeClass}`}>
                                                {badgeText}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td>
                                    <div className="actions-cell">
                                        <button className="icon-btn edit" title={t('admin.products.actions.edit')} onClick={() => handleEdit(product)}>
                                            <Pencil size={18} />
                                        </button>
                                        <button className="icon-btn copy" title={t('admin.products.actions.copy')} onClick={() => handleCopy(product)} style={{ color: '#8b5cf6' }}>
                                            <Copy size={18} />
                                        </button>
                                        <button className="icon-btn delete" title={t('admin.products.actions.delete')} onClick={() => handleDelete(product.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                onSuccess={fetchProducts}
                productToEdit={editingProduct}
                productToCopy={copyingProduct}
            />
        </div>
    );
};
