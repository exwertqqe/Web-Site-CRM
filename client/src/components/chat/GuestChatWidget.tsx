import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { MessageCircle, X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './GuestChatWidget.css';

interface SupportMessage {
    id: number;
    content: string;
    isFromAdmin: boolean;
    createdAt: string;
}

export const GuestChatWidget = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [ticketId, setTicketId] = useState<number | null>(null);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isStarted, setIsStarted] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // перевіряємо, чи є вже відкритий тікет у пам'яті браузера
    useEffect(() => {
        const storedTicketId = localStorage.getItem('supportTicketId');
        if (storedTicketId) {
            setTicketId(Number(storedTicketId));
            setIsStarted(true);
            fetchMessages(Number(storedTicketId));
        }
    }, []);

    // підключаємося до сокетів, коли чат активний (щоб отримувати повідомлення миттєво)
    useEffect(() => {
        if (!ticketId) return;

        const newSocket = io();
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Guest connected to support chat');
            newSocket.emit('joinSupportTicket', { ticketId });
        });

        newSocket.on('newSupportMessage', (msg: SupportMessage) => {
            setMessages((prev) => [...prev, msg]);
        });

        newSocket.on('supportTicketClosed', () => {
            setIsClosed(true);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [ticketId]);

    // автоматично прокручуємо чат вниз до останнього повідомлення
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const fetchMessages = async (id: number) => {
        try {
            // Check status first by starting again with same email? No, we don't have email.
            // Let's rely on the messages fetch to succeed.
            // Actually, we need to know if it's closed. Let's add a check if needed, or assume open unless closing event fires.
            // Better: update backend to return ticket status with messages OR just add a separate check if we had more time. 
            // For now, if they refresh after it's closed, they will see messages but it might not be marked closed until admin does it again?
            // Wait, we can modify the backend to return ticket info alongside messages, but for simplicity:
            const res = await axios.get(`/api/support/tickets/${id}/messages`);

            if (res.data && res.data.ticket) {
                setMessages(res.data.messages);
                setIsClosed(res.data.ticket.isClosed);
            } else if (res.data && Array.isArray(res.data)) {
                // Fallback if backend hasn't restarted yet and returns just an array of messages
                setMessages(res.data);
            }

            // If there's a better way to check closed status on load, we'll do it later.
            // For now, we assume if messages load, we show them. 
        } catch (error) {
            console.error('Failed to fetch messages', error);
            // If ticket not found or error, we might want to clear it
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                localStorage.removeItem('supportTicketId');
                setIsStarted(false);
                setTicketId(null);
            }
        }
    };

    const handleStartChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        try {
            const res = await axios.post('/api/support/start', { email, name });
            const newTicket = res.data;
            setTicketId(newTicket.id);
            localStorage.setItem('supportTicketId', newTicket.id.toString());
            setIsStarted(true);
            setIsClosed(newTicket.isClosed);

            if (newTicket.messages && newTicket.messages.length > 0) {
                setMessages(newTicket.messages);
            }
        } catch (error) {
            console.error('Failed to start chat', error);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !ticketId) return;

        socket.emit('sendSupportMessage', {
            ticketId,
            content: newMessage,
            isFromAdmin: false
        });

        setNewMessage('');
    };

    const handleStartNewTicket = () => {
        localStorage.removeItem('supportTicketId');
        setTicketId(null);
        setIsStarted(false);
        setIsClosed(false);
        setMessages([]);
        setNewMessage('');
    };

    const formatTime = (isoDate: string) => {
        return new Date(isoDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="guest-chat-wrapper">
            {/* сама плаваюча кнопка чату */}
            <button
                className={`guest-chat-toggle ${isOpen ? 'hidden' : ''}`}
                onClick={() => setIsOpen(true)}
                aria-label="Open support chat"
            >
                <MessageCircle size={28} />
            </button>

            {/* саме вікно чату */}
            {isOpen && (
                <div className="guest-chat-window">
                    <div className="guest-chat-header">
                        <div className="header-info">
                            <h3>{t('guest_chat.title')}</h3>
                            <p>{t('guest_chat.subtitle')}</p>
                        </div>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    {!isStarted ? (
                        <div className="guest-chat-start-form">
                            <p className="start-prompt">{t('guest_chat.start_prompt')}</p>
                            <form onSubmit={handleStartChat}>
                                <input
                                    type="text"
                                    placeholder={t('guest_chat.name_placeholder')}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="chat-input-field"
                                />
                                <input
                                    type="email"
                                    placeholder={t('guest_chat.email_placeholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="chat-input-field"
                                />
                                <button type="submit" className="start-btn">{t('guest_chat.start_btn')}</button>
                            </form>
                        </div>
                    ) : (
                        <>
                            <div className="guest-chat-messages">
                                {messages.length === 0 ? (
                                    <div className="empty-messages">
                                        <div className="greeting-bubble">
                                            {t('guest_chat.greeting')}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div key={idx} className={`guest-msg-wrapper ${!msg.isFromAdmin ? 'mine' : 'theirs'}`}>
                                            <div className="guest-msg-bubble">
                                                {msg.content}
                                                <span className="guest-msg-time">{formatTime(msg.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isClosed && (
                                    <div className="empty-messages" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                        <div className="greeting-bubble" style={{ alignSelf: 'center', textAlign: 'center', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                            {t('guest_chat.session_finished')}
                                        </div>
                                        <button
                                            onClick={handleStartNewTicket}
                                            style={{
                                                background: '#2563eb',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                marginTop: '0.5rem'
                                            }}
                                        >
                                            {t('guest_chat.start_new')}
                                        </button>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="guest-chat-input" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder={isClosed ? t('guest_chat.closed_placeholder') : t('guest_chat.input_placeholder')}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={isClosed}
                                />
                                <button type="submit" disabled={!newMessage.trim() || isClosed}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
