export interface Category {
    id: number;
    name: string;
    slug: string;
}

export interface ProductVariant {
    id: number;
    colorName: string;
    colorCode: string;
    images: string[];
    stock: number;
    productId: number;
}

export interface Product {
    id: number;
    name: string;
    slug: string;
    description: string;
    price: string;
    stock: number;
    categoryId: number;
    category?: Category;
    attributes?: Record<string, any>;
    variants?: ProductVariant[];
    images?: string[];
}
