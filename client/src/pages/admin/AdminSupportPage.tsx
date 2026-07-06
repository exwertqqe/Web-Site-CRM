import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { Send, User, Clock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './AdminSupportPage.css';

interface SupportTicket {
    id: number;
    clientEmail: string;
    clientName: string | null;
    isClosed: boolean;
    createdAt: string;
    updatedAt: string;
}

interface SupportMessage {
    id: number;
    ticketId: number;
    content: string;
    isFromAdmin: boolean;
    createdAt: string;
}

export const AdminSupportPage = () => {
    const { t, i18n } = useTranslation();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [activeTicket, setActiveTicket] = useState<number | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Socket.io and initial load
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        fetchTickets();

        const newSocket = io();
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to admin support Chat');
            newSocket.emit('authenticate', { token });
        });

        // Listen for new messages across all tickets
        newSocket.on('newSupportMessageAdmin', (data: { ticketId: number, message: SupportMessage }) => {
            // Update messages if this ticket is active
            if (activeTicket === data.ticketId) {
                setMessages((prev) => [...prev, data.message]);
            }
            // Update ticket list to show recent activity
            setTickets((prevTickets) => {
                const existing = prevTickets.find(t => t.id === data.ticketId);
                if (existing) {
                    return prevTickets.map(t =>
                        t.id === data.ticketId ? { ...t, updatedAt: data.message.createdAt } : t
                    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                } else {
                    // Fetch full list again if it's a new ticket
                    fetchTickets();
                    return prevTickets;
                }
            });
        });

        return () => {
            newSocket.disconnect();
        };
    }, [activeTicket]);

    // Fetch messages when active ticket changes
    useEffect(() => {
        if (!activeTicket) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await axios.get(`/api/support/tickets/${activeTicket}/messages`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data && res.data.messages) {
                    setMessages(res.data.messages);
                } else {
                    setMessages(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch ticket messages", err);
            }
        };

        fetchMessages();
    }, [activeTicket]);

    // Auto-scroll
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchTickets = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('/api/support/tickets', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTickets(res.data);
        } catch (err) {
            console.error("Failed to fetch open tickets", err);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !activeTicket) return;

        socket.emit('sendSupportMessage', {
            ticketId: activeTicket,
            content: newMessage,
            isFromAdmin: true
        });

        setNewMessage('');
    };

    const handleCloseTicket = async () => {
        if (!activeTicket) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            await axios.patch(`/api/support/tickets/${activeTicket}/close`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Notify guest that ticket is closed
            if (socket) {
                socket.emit('closeSupportTicketAdmin', { ticketId: activeTicket });
            }

            setActiveTicket(null);
            fetchTickets();
        } catch (err) {
            console.error("Failed to close ticket", err);
        }
    };

    const formatTime = (isoDate: string) => {
        return new Date(isoDate).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'uk-UA', { hour: '2-digit', minute: '2-digit' });
    };

    const activeTicketData = tickets.find(t => t.id === activeTicket);

    return (
        <div className="admin-chat-container">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <h2>{t('admin.support.title')}</h2>
                </div>

                <div className="chat-list">
                    <div className="chat-section-title">{t('admin.support.active_tickets')}</div>

                    {tickets.length === 0 ? (
                        <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
                            {t('admin.support.no_tickets')}
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <div
                                key={ticket.id}
                                className={`chat-list-item ${activeTicket === ticket.id ? 'active' : ''}`}
                                onClick={() => setActiveTicket(ticket.id)}
                            >
                                <div className="chat-avatar" style={{ background: '#bfdbfe', color: '#1d4ed8' }}>
                                    <User size={20} />
                                </div>
                                <div className="chat-info">
                                    <span className="chat-name">{ticket.clientName || t('admin.support.guest')}</span>
                                    <span className="chat-role" style={{ fontSize: '0.75rem' }}>{ticket.clientEmail}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main">
                {activeTicket ? (
                    <>
                        <div className="chat-main-header">
                            <div className="current-chat-title">
                                <div className="chat-avatar small-avatar" style={{ background: '#bfdbfe', color: '#1d4ed8' }}>
                                    <User size={18} />
                                </div>
                                <div>
                                    <h3>{activeTicketData?.clientName || t('admin.support.guest')}</h3>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{activeTicketData?.clientEmail}</span>
                                </div>
                            </div>
                             <button
                                onClick={handleCloseTicket}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', color: '#334155', fontWeight: 600 }}
                            >
                                <CheckCircle size={16} /> {t('admin.support.close_ticket')}
                            </button>
                        </div>

                        <div className="chat-messages support-messages-area">
                            {messages.length === 0 ? (
                                <div className="empty-chat-state">
                                    <p>{t('admin.chats.no_chats')}.</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isMine = msg.isFromAdmin;
                                    return (
                                        <div key={msg.id} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                                            {!isMine && (
                                                <div className="message-avatar">
                                                    <div className="avatar-placeholder bg-blue-100 text-blue-600">
                                                        <User size={16} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="message-bubble">
                                                <div className="message-content" style={{ color: isMine ? '#fff' : '#1e293b' }}>
                                                    {msg.content}
                                                </div>
                                                <div className="message-time">
                                                    <Clock size={10} /> {formatTime(msg.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={endOfMessagesRef} />
                        </div>

                        <div className="chat-input-area">
                            <form onSubmit={handleSendMessage} className="chat-input-form">
                                <input
                                    type="text"
                                    placeholder={t('admin.support.reply_placeholder')}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" disabled={!newMessage.trim()} className="btn-send" title={t('admin.support.send')}>
                                    <Send size={22} color="white" strokeWidth={2.5} style={{ marginLeft: '2px' }} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
                        {t('admin.chats.select_chat')}
                    </div>
                )}
            </div>
        </div>
    );
};
