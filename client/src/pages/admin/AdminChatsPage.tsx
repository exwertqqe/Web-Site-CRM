import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { Send, Users, User, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './AdminChatsPage.css';

interface Message {
    id: number;
    content: string;
    senderId: number;
    receiverId: number | null;
    createdAt: string;
    sender: {
        id: number;
        name: string | null;
        email: string;
        avatar: string | null;
    };
}

interface ChatUser {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
    role: string;
}

export const AdminChatsPage = () => {
    const { t, i18n } = useTranslation();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [activeChat, setActiveChat] = useState<number | 'general'>('general');
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Initial setup
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            const parsed = JSON.parse(storedUser);
            setCurrentUser(parsed);

            // Connect to Socket.IO
            const newSocket = io();
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('Connected to chat server');
                // Authenticate
                newSocket.emit('authenticate', { token });
            });

            newSocket.on('newMessage', (msg: Message) => {
                setMessages((prev) => [...prev, msg]);
            });

            return () => {
                newSocket.disconnect();
            };
        }
    }, []);

    // Fetch users for sidebar
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await axios.get('/api/users', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Filter out the current user and only keep ADMIN
                const chatEligibleUsers = res.data.filter((u: ChatUser) =>
                    u.id !== currentUser?.id && u.role === 'ADMIN'
                );
                setUsers(chatEligibleUsers);
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser]);

    // Fetch chat history when active chat changes
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                let url = '/api/chat/general';
                if (activeChat !== 'general') {
                    url = `/api/chat/dm/${activeChat}`;
                }

                const res = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data);
            } catch (err) {
                console.error("Failed to fetch chat history", err);
            }
        };
        fetchHistory();
    }, [activeChat]);

    // Auto-scroll to bottom
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const payload = {
            content: newMessage,
            receiverId: activeChat === 'general' ? undefined : activeChat
        };

        socket.emit('sendMessage', payload);
        setNewMessage('');
    };

    const formatTime = (isoDate: string) => {
        return new Date(isoDate).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'uk-UA', { hour: '2-digit', minute: '2-digit' });
    };

    // Filter messages to show only relevant ones (since WebSocket broadcasts to DMs and General, 
    // we need to ensure the UI only shows messages belonging to the active tab)
    const displayedMessages = messages.filter(msg => {
        if (activeChat === 'general') {
            return msg.receiverId === null;
        } else {
            return msg.receiverId === activeChat || (msg.senderId === activeChat && msg.receiverId === currentUser?.id);
        }
    });

    const activeUser = users.find(u => u.id === activeChat);

    return (
        <div className="admin-chat-container">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <h2>{t('admin.chats.title')}</h2>
                </div>

                <div className="chat-list">
                    <div
                        className={`chat-list-item ${activeChat === 'general' ? 'active' : ''}`}
                        onClick={() => setActiveChat('general')}
                    >
                        <div className="chat-avatar general-avatar">
                            <Users size={20} />
                        </div>
                        <div className="chat-info">
                            <span className="chat-name">{t('admin.chats.general_chat') || 'Загальний чат'}</span>
                            <span className="chat-role">{t('admin.settings.users.roles.ADMIN')}</span>
                        </div>
                    </div>

                    <div className="chat-section-title">{t('admin.chats.dm_section') || 'Особисті повідомлення'}</div>

                    {users.map(user => (
                        <div
                            key={user.id}
                            className={`chat-list-item ${activeChat === user.id ? 'active' : ''}`}
                            onClick={() => setActiveChat(user.id)}
                        >
                            <div className="chat-avatar">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name || user.email} />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>
                            <div className="chat-info">
                                <span className="chat-name">{user.name || user.email.split('@')[0]}</span>
                                <span className="chat-role badge-role">{t(`admin.settings.users.roles.${user.role}`, { defaultValue: user.role })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main">
                <div className="chat-main-header">
                    <div className="current-chat-title">
                        {activeChat === 'general' ? (
                            <>
                                <Users size={24} className="text-blue-500" />
                                <h3>{t('admin.chats.general_chat_full') || 'Загальний чат команди'}</h3>
                            </>
                        ) : (
                            <>
                                <div className="chat-avatar small-avatar">
                                    {activeUser?.avatar ? (
                                        <img src={activeUser.avatar} alt="Avatar" />
                                    ) : (
                                        <User size={18} />
                                    )}
                                </div>
                                <h3>{activeUser?.name || activeUser?.email.split('@')[0]}</h3>
                            </>
                        )}
                    </div>
                </div>

                <div className="chat-messages">
                    {displayedMessages.length === 0 ? (
                        <div className="empty-chat-state">
                            <p>{t('admin.chats.no_chats')}. {t('admin.chats.start_talking') || 'Почніть спілкування першим!'}</p>
                        </div>
                    ) : (
                        displayedMessages.map(msg => {
                            const isMine = msg.senderId === currentUser?.id;
                            return (
                                <div key={msg.id} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                                    {!isMine && (
                                        <div className="message-avatar">
                                            {msg.sender.avatar ? (
                                                <img src={msg.sender.avatar} alt="Avatar" title={msg.sender.name || ''} />
                                            ) : (
                                                <div className="avatar-placeholder">{msg.sender.name?.[0]?.toUpperCase() || 'U'}</div>
                                            )}
                                        </div>
                                    )}
                                    <div className="message-bubble">
                                        {!isMine && activeChat === 'general' && (
                                            <div className="message-sender-name">
                                                {msg.sender.name || msg.sender.email.split('@')[0]}
                                            </div>
                                        )}
                                        <div className="message-content">{msg.content}</div>
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
                            placeholder={t('admin.chats.type_message')}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button type="submit" disabled={!newMessage.trim()} className="btn-send" title={t('admin.chats.send')}>
                            <Send size={22} color="white" strokeWidth={2.5} style={{ marginLeft: '2px' }} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
