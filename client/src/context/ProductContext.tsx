import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { Product } from '../types';

export interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string;
}

interface ProductContextType {
    products: Product[];
    categories: Category[];
    loading: boolean;
    refreshProducts: () => void;
    refreshCategories: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProducts = async () => {
        try {
            const response = await axios.get('/api/products');
            setProducts(response.data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const init = async () => {
        setLoading(true);
        await Promise.all([fetchProducts(), fetchCategories()]);
        setLoading(false);
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <ProductContext.Provider value={{
            products,
            categories,
            loading,
            refreshProducts: fetchProducts,
            refreshCategories: fetchCategories
        }}>
            {children}
        </ProductContext.Provider>
    );
};

export const useProducts = () => {
    const context = useContext(ProductContext);
    if (context === undefined) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
};
