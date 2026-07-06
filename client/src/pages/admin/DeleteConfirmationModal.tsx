import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react';
import './DeleteConfirmationModal.css';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isLoading?: boolean;
}

export const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    isLoading = false
}: DeleteConfirmationModalProps) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content delete-modal">
                <div className="modal-header">
                    <div className="flex items-center gap-2">
                        <Trash2 size={20} className="text-red-600" />
                        <h3>{title}</h3>
                    </div>
                    <button onClick={onClose} disabled={isLoading}>
                        <X size={24} />
                    </button>
                </div>

                <div className="delete-modal-body">
                    <p className="delete-message">{message}</p>
                    <div className="warning-notice">
                        {t('admin.common.delete_modal.warning')}
                    </div>
                </div>

                <div className="modal-actions">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="cancel-btn"
                        disabled={isLoading}
                    >
                        {t('admin.common.delete_modal.cancel')}
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        className="delete-submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? t('admin.common.delete_modal.deleting') : (confirmText || t('admin.common.delete_modal.confirm'))}
                    </button>
                </div>
            </div>
        </div>
    );
};
