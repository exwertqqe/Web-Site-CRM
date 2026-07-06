import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Product, ProductVariant } from '../types';

export interface CartItem {
    product: Product;
    variant?: ProductVariant;
    quantity: number;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
    removeFromCart: (productId: number, variantId?: number) => void;
    updateQuantity: (productId: number, variantId: number | undefined, quantity: number) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
    purchasesDisabled: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // ініціалізуємо кошик з пам'яті браузера, якщо він там є
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [purchasesDisabled, setPurchasesDisabled] = useState(false);

    // при завантаженні перевіряємо, чи дозволені покупки на сайті взагалі
    useEffect(() => {
        const fetchPurchasesStatus = async () => {
            try {
                const res = await axios.get('/api/settings/purchases');
                setPurchasesDisabled(res.data.disabled);
            } catch (error) {
                console.error('Failed to fetch purchases status:', error);
            }
        };
        fetchPurchasesStatus();
    }, []);

    // зберігаємо кошик у пам'ять щоразу, коли він змінюється
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product: Product, quantity: number = 1, variant?: ProductVariant) => {
        // не даємо додати товар, якщо адмін вимкнув покупки на всьому сайті
        if (purchasesDisabled) {
            alert("Купівля товарів тимчасово недоступна.");
            return;
        }

        // не даємо додати товар, якого немає в наявності (нульовий залишок)
        const stockToCheck = variant ? variant.stock : product.stock;
        if (stockToCheck !== undefined && stockToCheck <= 0) return;

        setCartItems(prevItems => {
            const existingItem = prevItems.find(item =>
                item.product.id === product.id &&
                ((!variant && !item.variant) || (variant && item.variant && variant.id === item.variant.id))
            );

            if (existingItem) {
                // перевіряємо чи не хоче юзер більше, ніж є на складі
                const newQuantity = existingItem.quantity + quantity;
                if (stockToCheck !== undefined && newQuantity > stockToCheck) {
                    alert(`Вибачте, доступно лише ${stockToCheck} одиниць цього товару.`);
                    return prevItems; // не додаємо більше, ніж є по факту
                }

                return prevItems.map(item =>
                    (item.product.id === product.id && ((!variant && !item.variant) || (variant && item.variant && variant.id === item.variant.id)))
                        ? { ...item, quantity: newQuantity }
                        : item
                );
            }

            return [...prevItems, { product, variant, quantity }];
        });

        setIsCartOpen(true); // автоматично відкриваємо кошик після додавання
    };

    const removeFromCart = (productId: number, variantId?: number) => {
        setCartItems(prevItems => prevItems.filter(item =>
            !(item.product.id === productId &&
                ((!variantId && !item.variant) || (variantId && item.variant && variantId === item.variant.id)))
        ));
    };

    const updateQuantity = (productId: number, variantId: number | undefined, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId, variantId);
            return;
        }

        setCartItems(prevItems => {
            return prevItems.map(item => {
                if (item.product.id === productId && ((!variantId && !item.variant) || (variantId && item.variant && variantId === item.variant.id))) {
                    // знову ж таки, перевіряємо ліміт залишку
                    const stockToCheck = item.variant ? item.variant.stock : item.product.stock;
                    if (stockToCheck !== undefined && quantity > stockToCheck) {
                        alert(`Вибачте, доступно лише ${stockToCheck} одиниць цього товару.`);
                        return { ...item, quantity: stockToCheck };
                    }
                    return { ...item, quantity };
                }
                return item;
            });
        });
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartTotal = cartItems.reduce((total, item) => total + (Number(item.product.price) * item.quantity), 0);
    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotal,
            cartCount,
            isCartOpen,
            setIsCartOpen,
            purchasesDisabled
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
