import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, FolderTree } from 'lucide-react';
import { AddCategoryModal } from './AddCategoryModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import './AdminProductsPage.css'; // Reusing styles

interface Category {
    id: number;
    name: string;
    slug: string;
    isOversized?: boolean;
    _count?: {
        products: number;
    };
    children?: Category[];
    parent?: Category;
}

export const AdminCategoriesPage = () => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
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

    const handleDeleteClick = (category: Category) => {
        setCategoryToDelete(category);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;

        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert(t('admin.categories.delete_modal.auth_error'));
                setIsDeleting(false);
                return;
            }

            await axios.delete(`/api/categories/${categoryToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert(t('admin.categories.delete_modal.delete_error'));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingCategory(null);
    };

    const filteredCategories = categories.filter(cat =>
        cat.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-products-page">
            <div className="page-header">
                <h2>{t('admin.categories.title')}</h2>
                <button className="add-btn" onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={20} />
                    <span>{t('admin.categories.add_btn')}</span>
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder={t('admin.categories.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="products-table-container">
                <table className="products-table">
                    <thead>
                        <tr>
                            <th>{t('admin.categories.table.name')}</th>
                            <th>{t('admin.categories.table.slug')}</th>
                            <th>{t('admin.categories.table.parent')}</th>
                            <th>{t('admin.categories.table.products')}</th>
                            <th>{t('admin.categories.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories.map((category) => (
                            <tr key={category.id}>
                                <td className="product-name-cell">
                                    <div className="flex items-center gap-2">
                                        <FolderTree size={16} className="text-gray-400" />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{category.name}</span>
                                                {category.isOversized && (
                                                    <span className="oversized-badge">
                                                        {t('admin.categories.badge_oversized')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-gray-500 font-mono text-sm">{category.slug}</td>
                                <td>{category.parent?.name || '-'}</td>
                                <td>
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-600">
                                        {category._count?.products || 0}
                                    </span>
                                </td>
                                <td>
                                    <div className="actions-cell">
                                        <button className="icon-btn edit" title={t('admin.products.actions.edit')} onClick={() => handleEdit(category)}>
                                            <Pencil size={18} />
                                        </button>
                                        <button className="icon-btn delete" title={t('admin.products.actions.delete')} onClick={() => handleDeleteClick(category)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AddCategoryModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                onSuccess={fetchCategories}
                categoryToEdit={editingCategory}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('admin.categories.delete_modal.title')}
                message={categoryToDelete ? (
                    categoryToDelete._count?.products && categoryToDelete._count.products > 0
                        ? t('admin.categories.delete_modal.warning_message', { name: categoryToDelete.name, count: categoryToDelete._count.products })
                        : t('admin.categories.delete_modal.confirm_message', { name: categoryToDelete.name })
                ) : ''}
                isLoading={isDeleting}
            />
        </div>
    );
};
