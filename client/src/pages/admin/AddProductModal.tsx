import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2 } from 'lucide-react';
import { SmartStorekeeperModal } from '../../components/admin/SmartStorekeeperModal';
import './AddProductModal.css';

interface Category {
    id: number;
    name: string;
}

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: any;
    productToCopy?: any;
}

export const AddProductModal = ({ isOpen, onClose, onSuccess, productToEdit, productToCopy }: AddProductModalProps) => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        categoryId: '',
        variants: [] as { colorName: string, colorCode: string, stock: string, images: string[] }[]
    });
    const [attributes, setAttributes] = useState<{ name: string, items: { key: string, value: string }[] }[]>([]);

    const [storekeeperData, setStorekeeperData] = useState<{ isOpen: boolean, action: 'PUT'|'TAKE', placements: any[], productName: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            const sourceProduct = productToEdit || productToCopy;

            if (sourceProduct) {
                // Populate form for editing or copying
                setFormData({
                    name: sourceProduct.name + (productToCopy ? t('admin.add_product_modal.copy_suffix') : ''),
                    price: sourceProduct.price,
                    description: sourceProduct.description,
                    categoryId: sourceProduct.categoryId,
                    variants: sourceProduct.variants ? sourceProduct.variants.map((v: any) => ({
                        colorName: v.colorName,
                        colorCode: v.colorCode || '#ffffff',
                        stock: String(v.stock),
                        images: v.images && v.images.length > 0 ? [...v.images] : ['']
                    })) : []
                });

                // Parse attributes
                if (sourceProduct.attributes) {
                    const parsedAttrs: { name: string, items: { key: string, value: string }[] }[] = [];
                    Object.entries(sourceProduct.attributes).forEach(([sectionName, sectionValue]) => {
                        if (typeof sectionValue === 'object' && sectionValue !== null) {
                            const items = Object.entries(sectionValue).map(([k, v]) => ({ key: k, value: String(v) }));
                            parsedAttrs.push({ name: sectionName, items });
                        }
                    });
                    setAttributes(parsedAttrs);
                }
            } else {
                // Reset form for creating
                setFormData({ name: '', price: '', description: '', categoryId: '', variants: [] });
                setAttributes([]);
            }
        }
    }, [isOpen, productToEdit, productToCopy]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/categories');
            setCategories(response.data);
            if (response.data.length > 0 && !formData.categoryId && !productToEdit && !productToCopy) {
                setFormData(prev => ({ ...prev, categoryId: response.data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const addVariant = () => {
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { colorName: '', colorCode: '#ffffff', stock: '0', images: [''] }]
        }));
    };

    const removeVariant = (index: number) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== index)
        }));
    };

    const updateVariant = (index: number, field: string, value: any) => {
        const newVariants = [...formData.variants];
        (newVariants[index] as any)[field] = value;
        setFormData({ ...formData, variants: newVariants });
    };

    const handleVariantImageChange = (vIdx: number, iIdx: number, value: string) => {
        const newVariants = [...formData.variants];
        newVariants[vIdx].images[iIdx] = value;
        setFormData({ ...formData, variants: newVariants });
    };

    const addVariantImageField = (vIdx: number) => {
        const newVariants = [...formData.variants];
        newVariants[vIdx].images.push('');
        setFormData({ ...formData, variants: newVariants });
    };

    const removeVariantImageField = (vIdx: number, iIdx: number) => {
        const newVariants = [...formData.variants];
        if (newVariants[vIdx].images.length === 1) {
            newVariants[vIdx].images[0] = '';
        } else {
            newVariants[vIdx].images = newVariants[vIdx].images.filter((_, i) => i !== iIdx);
        }
        setFormData({ ...formData, variants: newVariants });
    };

    const addSection = () => {
        setAttributes([...attributes, { name: '', items: [{ key: '', value: '' }] }]);
    };

    const removeSection = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const updateSectionName = (index: number, name: string) => {
        const newAttrs = [...attributes];
        newAttrs[index].name = name;
        setAttributes(newAttrs);
    };

    const addItem = (sectionIndex: number) => {
        const newAttrs = [...attributes];
        newAttrs[sectionIndex].items.push({ key: '', value: '' });
        setAttributes(newAttrs);
    };

    const removeItem = (sectionIndex: number, itemIndex: number) => {
        const newAttrs = [...attributes];
        newAttrs[sectionIndex].items = newAttrs[sectionIndex].items.filter((_, i) => i !== itemIndex);
        setAttributes(newAttrs);
    };

    const updateItem = (sectionIndex: number, itemIndex: number, field: 'key' | 'value', val: string) => {
        const newAttrs = [...attributes];
        newAttrs[sectionIndex].items[itemIndex][field] = val;
        setAttributes(newAttrs);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // If it's a new product or copied product, we append timestamp to make slug unique
            const isCreatingNew = !productToEdit;
            const slug = formData.name.toLowerCase().replace(/ /g, '-').replace(/[^\u0400-\u04FF\w-]/g, '') + (isCreatingNew ? '-' + Date.now() : '');

            // Convert attributes array to nested JSON object
            const attributesJson: Record<string, Record<string, string>> = {};
            attributes.forEach(section => {
                if (section.name.trim()) {
                    attributesJson[section.name] = {};
                    section.items.forEach(item => {
                        if (item.key.trim()) {
                            attributesJson[section.name][item.key] = item.value;
                        }
                    });
                }
            });

            const payload = {
                name: formData.name,
                description: formData.description,
                price: Number(formData.price),
                categoryId: Number(formData.categoryId),
                slug: slug,
                attributes: attributesJson,
                variants: formData.variants.map(v => ({
                    ...v,
                    stock: Number(v.stock),
                    images: v.images.filter(img => img.trim() !== '')
                }))
            };

            const token = localStorage.getItem('token');
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            let res;
            if (productToEdit) {
                res = await axios.patch(`/api/products/${productToEdit.id}`, payload, config);
            } else {
                res = await axios.post('/api/products', payload, config);
            }

            if (res.data.placements && res.data.placements.length > 0) {
                setStorekeeperData({
                    isOpen: true,
                    action: 'PUT',
                    placements: res.data.placements,
                    productName: formData.name
                });
            } else {
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            console.error('Error saving product:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
            alert(`${t('add_product_modal.errors.save_error')}: ${Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg}`);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content product-modal">
                <div className="modal-header">
                    <h3>{productToEdit ? t('admin.add_product_modal.title_edit') : (productToCopy ? t('admin.add_product_modal.title_copy') : t('admin.add_product_modal.title_new'))}</h3>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('admin.add_product_modal.form.name')}</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('admin.add_product_modal.form.price')}</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>{t('admin.add_product_modal.form.category')}</label>
                            <select
                                value={formData.categoryId}
                                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                required
                                className="w-full p-2 border rounded"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            >
                                <option value="" disabled>{t('admin.add_product_modal.form.select_category')}</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <label style={{ fontWeight: 600, fontSize: '1rem' }}>{t('admin.add_product_modal.form.variants_title')}</label>
                            <button
                                type="button"
                                onClick={addVariant}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', borderRadius: '4px', backgroundColor: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                <Plus size={16} /> {t('admin.add_product_modal.form.add_variant')}
                            </button>
                        </div>

                        <div className="variants-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {formData.variants.map((variant, vIdx) => (
                                <div key={vIdx} className="variant-item" style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', flex: 1, alignItems: 'flex-end' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('admin.add_product_modal.form.color_name')}</label>
                                                <input
                                                    placeholder={t('admin.add_product_modal.form.color_name_placeholder')}
                                                    value={variant.colorName}
                                                    onChange={e => updateVariant(vIdx, 'colorName', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div style={{ width: '80px' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('admin.add_product_modal.form.color_code')}</label>
                                                <input
                                                    type="color"
                                                    value={variant.colorCode}
                                                    onChange={e => updateVariant(vIdx, 'colorCode', e.target.value)}
                                                    style={{ width: '100%', height: '38px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                                                />
                                            </div>
                                            <div style={{ width: '100px' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>{t('admin.add_product_modal.form.stock')}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={variant.stock}
                                                    onChange={e => updateVariant(vIdx, 'stock', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeVariant(vIdx)} 
                                            style={{ color: '#ef4444', marginLeft: '1rem', padding: '8px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title={t('admin.add_product_modal.actions.delete_variant')}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="variant-images">
                                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>{t('admin.add_product_modal.form.variant_images')}</label>
                                        {variant.images.map((img, iIdx) => (
                                            <div key={iIdx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                                <input
                                                    type="url"
                                                    placeholder={t('admin.add_product_modal.form.image_url_placeholder')}
                                                    value={img}
                                                    onChange={e => handleVariantImageChange(vIdx, iIdx, e.target.value)}
                                                    style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeVariantImageField(vIdx, iIdx)} 
                                                    style={{ color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                    title={t('admin.add_product_modal.actions.delete_image')}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addVariantImageField(vIdx)}
                                            style={{ fontSize: '0.8rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Plus size={14} /> {t('admin.add_product_modal.form.add_image')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {formData.variants.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', margin: '1rem 0' }}>{t('admin.add_product_modal.form.no_variants')}</p>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{t('admin.add_product_modal.form.description')}</label>
                        <textarea
                            rows={4}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('admin.add_product_modal.form.attributes_title')}</label>
                        <div className="attributes-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {attributes.map((section, sIdx) => (
                                <div key={sIdx} className="attribute-section" style={{ border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <input
                                            placeholder={t('admin.add_product_modal.form.section_placeholder')}
                                            value={section.name}
                                            onChange={e => updateSectionName(sIdx, e.target.value)}
                                            style={{ fontWeight: 'bold' }}
                                        />
                                        <button type="button" onClick={() => removeSection(sIdx)} style={{ color: '#ef4444' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div style={{ paddingLeft: '1rem' }}>
                                        {section.items.map((item, iIdx) => (
                                            <div key={iIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <input
                                                    placeholder={t('admin.add_product_modal.form.attribute_name_placeholder')}
                                                    value={item.key}
                                                    onChange={e => updateItem(sIdx, iIdx, 'key', e.target.value)}
                                                />
                                                <input
                                                    placeholder={t('admin.add_product_modal.form.attribute_value_placeholder')}
                                                    value={item.value}
                                                    onChange={e => updateItem(sIdx, iIdx, 'value', e.target.value)}
                                                />
                                                <button type="button" onClick={() => removeItem(sIdx, iIdx)} style={{ color: '#9ca3af' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addItem(sIdx)}
                                            style={{ fontSize: '0.85rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            {t('admin.add_product_modal.form.add_attribute')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addSection}
                                className="add-image-btn"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    color: '#2563eb', background: 'none', border: 'none',
                                    fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} />
                                <span>{t('admin.add_product_modal.form.add_section')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-btn">{t('admin.add_product_modal.actions.cancel')}</button>
                        <button type="submit" className="submit-btn">{productToEdit ? t('admin.add_product_modal.actions.save') : t('admin.add_product_modal.actions.create')}</button>
                    </div>
                </form>
            </div>

            {storekeeperData && (
                <SmartStorekeeperModal
                    isOpen={storekeeperData.isOpen}
                    onClose={() => {
                        setStorekeeperData(null);
                        onSuccess();
                        onClose();
                    }}
                    action={storekeeperData.action}
                    placements={storekeeperData.placements}
                    productName={storekeeperData.productName}
                />
            )}
        </div>
    );
};
