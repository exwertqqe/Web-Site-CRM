import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import './AddProductModal.css'; // Reusing modal styles

interface Category {
    id: number;
    name: string;
}

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categoryToEdit?: any;
}

export const AddCategoryModal = ({ isOpen, onClose, onSuccess, categoryToEdit }: AddCategoryModalProps) => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        parentId: '',
        slug: '',
        isOversized: false,
    });
    const [isManualSlug, setIsManualSlug] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            if (categoryToEdit) {
                setFormData({
                    name: categoryToEdit.name,
                    parentId: categoryToEdit.parentId || '',
                    slug: categoryToEdit.slug || '',
                    isOversized: categoryToEdit.isOversized || false,
                });
                setIsManualSlug(true);
            } else {
                setFormData({ name: '', parentId: '', slug: '', isOversized: false });
                setIsManualSlug(false);
            }
        }
    }, [isOpen, categoryToEdit]);

    const handleNameChange = (name: string) => {
        const updates: any = { name };
        if (!isManualSlug) {
            updates.slug = generateSlug(name);
        }
        setFormData({ ...formData, ...updates });
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/categories');
            // Filter out self if editing to prevent cyclic dependency
            const available = categoryToEdit
                ? response.data.filter((c: any) => c.id !== categoryToEdit.id)
                : response.data;
            setCategories(available);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const generateSlug = (text: string) => {
        const cyrillicToLatinMap: Record<string, string> = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie', 'ж': 'zh',
            'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
            'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia',
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye', 'Ж': 'Zh',
            'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
            'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
            'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
        };

        return text
            .split('')
            .map(char => cyrillicToLatinMap[char] || char)
            .join('')
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]/g, '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                slug: formData.slug || generateSlug(formData.name),
                parentId: formData.parentId ? Number(formData.parentId) : null,
                isOversized: formData.isOversized,
            };

            const token = localStorage.getItem('token');
            if (!token) {
                alert(t('admin.add_category_modal.errors.auth_error'));
                return;
            }

            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            if (categoryToEdit) {
                await axios.patch(`/api/categories/${categoryToEdit.id}`, payload, config);
            } else {
                await axios.post('/api/categories', payload, config);
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving category:', error);
            const message = error.response?.data?.message || t('admin.add_category_modal.errors.save_error');
            alert(Array.isArray(message) ? message.join(', ') : message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content product-modal" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3>{categoryToEdit ? t('admin.add_category_modal.title_edit') : t('admin.add_category_modal.title_new')}</h3>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('admin.add_category_modal.form.name')}</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => handleNameChange(e.target.value)}
                            placeholder={t('admin.add_category_modal.form.name_placeholder')}
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('admin.add_category_modal.form.slug')}</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                required
                                value={formData.slug}
                                onChange={e => {
                                    setFormData({ ...formData, slug: e.target.value });
                                    setIsManualSlug(true);
                                }}
                                placeholder={t('admin.add_category_modal.form.slug_placeholder')}
                                className="font-mono text-sm"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                            {isManualSlug && (
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsManualSlug(false);
                                        setFormData({ ...formData, slug: generateSlug(formData.name) });
                                    }}
                                    className="text-xs text-blue-600 hover:underline px-2"
                                >
                                    {t('admin.add_category_modal.form.slug_reset')}
                                </button>
                            )}
                        </div>
                        <small className="text-gray-500 block mt-1">
                            {t('admin.add_category_modal.form.slug_url', { slug: formData.slug || '...' })}
                        </small>
                    </div>

                    <div className="form-group">
                        <label>{t('admin.add_category_modal.form.parent')}</label>
                        <select
                            value={formData.parentId}
                            onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                            className="w-full p-2 border rounded"
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        >
                            <option value="">{t('admin.add_category_modal.form.parent_none')}</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group custom-toggle-group" style={{ 
                        marginTop: '24px', 
                        padding: '16px', 
                        backgroundColor: formData.isOversized ? '#fff7ed' : '#f9fafb', 
                        border: `2px solid ${formData.isOversized ? '#ffedd5' : '#f1f5f9'}`,
                        borderRadius: '16px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                    }} onClick={() => setFormData({ ...formData, isOversized: !formData.isOversized })}>
                        <div style={{ flex: 1 }}>
                            <label style={{ margin: 0, fontWeight: '800', cursor: 'pointer', color: formData.isOversized ? '#9a3412' : '#374151', fontSize: '1rem', display: 'block' }}>
                                {t('admin.add_category_modal.form.is_oversized')}
                            </label>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: formData.isOversized ? '#c2410c' : '#64748b', lineHeight: '1.4' }}>
                                {t('admin.add_category_modal.form.is_oversized_desc')}
                            </p>
                        </div>
                        
                        <div className={`premium-toggle ${formData.isOversized ? 'active' : ''}`}>
                            <div className="toggle-dot"></div>
                        </div>
                        
                        <input
                            type="checkbox"
                            checked={formData.isOversized}
                            onChange={() => {}} // Handled by parent div onClick
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="modal-actions" style={{ marginTop: '20px' }}>
                        <button type="button" onClick={onClose} className="cancel-btn">{t('admin.add_category_modal.actions.cancel')}</button>
                        <button type="submit" className="submit-btn">{categoryToEdit ? t('admin.add_category_modal.actions.save') : t('admin.add_category_modal.actions.create')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
