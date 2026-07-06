import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(senderId: number, content: string, receiverId?: number) {
    return this.prisma.message.create({
      data: {
        content,
        senderId,
        receiverId: receiverId || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async getGeneralChatHistory() {
    return this.prisma.message.findMany({
      where: { receiverId: null },
      orderBy: { createdAt: 'asc' },
      take: 100, // Load last 100 messages
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async getDirectMessageHistory(user1Id: number, user2Id: number) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: user1Id, receiverId: user2Id },
          { senderId: user2Id, receiverId: user1Id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }
}
