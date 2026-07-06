import { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import './AdminKanbanPage.css';

interface User {
    id: number;
    name: string | null;
    email: string;
}

interface Comment {
    id: number;
    text: string;
    createdAt: string;
    author: User;
}

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    order: number;
    deadline: string | null;
    assignedToId: number | null;
    assignedTo: User | null;
    lastModifiedById: number | null;
    lastModifiedBy: User | null;
    comments: Comment[];
    createdAt: string;
}

const COLUMNS = [
    { id: 'TODO', title: 'До роботи' },
    { id: 'IN_PROGRESS', title: 'В процесі' },
    { id: 'DONE', title: 'Виконано' }
];

export const AdminKanbanPage = () => {
    const { t } = useTranslation();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/tasks', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Perform optimistic update
        const sourceStatus = source.droppableId as 'TODO' | 'IN_PROGRESS' | 'DONE';
        const destStatus = destination.droppableId as 'TODO' | 'IN_PROGRESS' | 'DONE';

        const newTasks = Array.from(tasks);

        const sourceColumnTasks = newTasks.filter(t => t.status === sourceStatus).sort((a, b) => a.order - b.order);
        const destColumnTasks = sourceStatus === destStatus ? sourceColumnTasks : newTasks.filter(t => t.status === destStatus).sort((a, b) => a.order - b.order);

        const movedTaskIndex = newTasks.findIndex(t => t.id === parseInt(draggableId));
        const movedTask = newTasks[movedTaskIndex];

        // Remove from source array visually
        sourceColumnTasks.splice(source.index, 1);
        if (sourceStatus === destStatus) {
            sourceColumnTasks.splice(destination.index, 0, movedTask);
        } else {
            destColumnTasks.splice(destination.index, 0, movedTask);
        }

        // Calculate new order
        let newOrder = movedTask.order;
        if (destColumnTasks.length === 1) { // It's the only item
            newOrder = 1000;
        } else if (destination.index === 0) { // Top of the list
            const nextItemOrder = destColumnTasks[1].order;
            newOrder = nextItemOrder - 1000;
        } else if (destination.index === destColumnTasks.length - 1) { // Bottom of the list
            const prevItemOrder = destColumnTasks[destColumnTasks.length - 2].order;
            newOrder = prevItemOrder + 1000;
        } else { // Between two items
            const prevItemOrder = destColumnTasks[destination.index - 1].order;
            const nextItemOrder = destColumnTasks[destination.index + 1].order;
            newOrder = (prevItemOrder + nextItemOrder) / 2.0;
        }

        movedTask.status = destStatus;
        movedTask.order = newOrder;

        setTasks(newTasks); // Update UI immediately

        try {
            const token = localStorage.getItem('token');
            await axios.patch('/api/tasks/positions', [{
                id: movedTask.id,
                status: destStatus,
                order: newOrder
            }], {
                headers: { Authorization: `Bearer ${token}` }
            });
            // re-fetch to get 'lastModifiedBy' updated correctly
            fetchTasks();
        } catch (error) {
            console.error('Error updating task position:', error);
            fetchTasks(); // Revert on failure
        }
    };

    const getTasksByStatus = (status: string) => {
        return tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
    };

    const openTaskModal = (task: Task | null) => {
        setCurrentTask(task);
        setIsTaskModalOpen(true);
    };



    if (loading) {
        return <div className="kanban-page"><div className="loading">{t('admin.kanban.loading')}</div></div>;
    }

    return (
        <div className="kanban-page">
            <div className="page-header">
                <h1 className="page-title">{t('admin.kanban.title')}</h1>
                <button className="btn-primary" onClick={() => openTaskModal(null)}>
                    <Plus size={20} /> {t('admin.kanban.add_task')}
                </button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-board">
                    {COLUMNS.map(column => (
                        <div key={column.id} className="kanban-column">
                            <h3 className="column-title">
                                {t(`admin.kanban.columns.${column.id}`, { defaultValue: column.title })}
                                <span className="task-count">{getTasksByStatus(column.id).length}</span>
                            </h3>
                            <Droppable droppableId={column.id}>
                                {(provided, snapshot) => (
                                    <div
                                        className={`droppable-area ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        {getTasksByStatus(column.id).map((task, index) => (
                                            <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        className={`task-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => openTaskModal(task)}
                                                        style={{ ...provided.draggableProps.style }}
                                                    >
                                                        <div className="task-header">
                                                            <h4 className="task-title">{task.title}</h4>
                                                        </div>
                                                        <div className="task-meta">
                                                            {task.assignedTo && (
                                                                <div className="task-assignee" title={t('admin.kanban.task.assignee', { name: task.assignedTo.name || task.assignedTo.email })}>
                                                                    {task.assignedTo.name?.[0].toUpperCase() || task.assignedTo.email[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="task-indicators">
                                                                {task.comments.length > 0 && (
                                                                    <span className="task-icon"><MessageSquare size={14} /> {task.comments.length}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {task.lastModifiedBy && (
                                                            <div className="task-last-modified">
                                                                {t('admin.dashboard.recent_orders.table.status')}: {task.lastModifiedBy.name || task.lastModifiedBy.email.split('@')[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* A placeholder for TaskModal - normally this would be a separate component but implemented here for simplicity */}
            {isTaskModalOpen && (
                <TaskModal
                    task={currentTask}
                    onClose={() => setIsTaskModalOpen(false)}
                    onTaskCreated={(newTask) => {
                        setTasks(prev => [...prev, newTask]);
                        setIsTaskModalOpen(false);
                    }}
                    onTaskUpdated={(updatedTask) => {
                        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                        setIsTaskModalOpen(false);
                    }}
                    onTaskDeleted={(taskId) => {
                        setTasks(prev => prev.filter(t => t.id !== taskId));
                        setIsTaskModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

/* Simplified Inline Modal Component */
const TaskModal = ({ task, onClose, onTaskCreated, onTaskUpdated, onTaskDeleted }: { task: Task | null, onClose: () => void, onTaskCreated: (t: Task) => void, onTaskUpdated: (t: Task) => void, onTaskDeleted: (id: number) => void }) => {
    const { t, i18n } = useTranslation();
    const isNew = !task;
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [commentText, setCommentText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) {
            alert(t('admin.dashboard.unknown_error'));
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (isNew) {
                const res = await axios.post('/api/tasks', { title, description }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                onTaskCreated(res.data);
            } else {
                const res = await axios.patch(`/api/tasks/${task!.id}`, { title, description }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                onTaskUpdated(res.data);
            }
        } catch (error) {
            console.error('Error saving task:', error);
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!task || !window.confirm(t('admin.reviews.delete_confirm'))) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/tasks/${task.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onTaskDeleted(task.id);
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const handleAddComment = async () => {
        if (!task || !commentText.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`/api/tasks/${task.id}/comments`, { text: commentText }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedTask = { ...task, comments: [...task.comments, res.data] };
            onTaskUpdated(updatedTask as Task);
            setCommentText('');
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    return (
        <div className="task-modal-overlay">
            <div className="task-modal">
                <div className="task-modal-header">
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="task-modal-title-input"
                        placeholder={t('admin.kanban.search_tasks')}
                        autoFocus
                    />
                    <button className="close-btn" onClick={onClose} title={t('admin.reviews.empty_state.desc')}>
                        <X size={24} />
                    </button>
                </div>

                <div className="task-modal-body">
                    <div className="task-details-section">
                        <label>{t('admin.add_product_modal.form.description')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={t('admin.add_product_modal.form.description')}
                            className="task-desc-input"
                        />
                        <div className="task-actions">
                            <button className="btn-save" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? t('admin.settings.banners.form.uploading') : (isNew ? t('admin.kanban.add_task') : t('admin.settings.banners.form.save'))}
                            </button>
                            {!isNew && (
                                <button className="btn-danger-outline" onClick={handleDelete}><Trash2 size={16} /> {t('admin.products.actions.delete')}</button>
                            )}
                        </div>
                    </div>

                    {!isNew && (
                        <div className="task-comments-section">
                            <h4>{t('admin.reviews.title')}</h4>
                            <div className="comments-list">
                                {task.comments.map(comment => (
                                    <div key={comment.id} className="comment-item">
                                        <div className="comment-header">
                                            <strong>{comment.author.name || comment.author.email.split('@')[0]}</strong>
                                            <span className="comment-time">{format(new Date(comment.createdAt), 'dd MMM HH:mm', { locale: i18n.language === 'en' ? enUS : uk })}</span>
                                        </div>
                                        <div className="comment-text">{comment.text}</div>
                                    </div>
                                ))}
                                {task.comments.length === 0 && <div className="no-comments">{t('admin.reviews.no_comment')}</div>}
                            </div>
                            <div className="comment-input-area">
                                <input
                                    type="text"
                                    placeholder={t('admin.chats.type_message')}
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                />
                                <button className="btn-primary" onClick={handleAddComment}>{t('admin.chats.send')}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
