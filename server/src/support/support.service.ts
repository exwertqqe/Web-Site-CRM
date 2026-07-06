import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async startSupportTicket(email: string, name?: string) {
    // Try to find an existing open ticket for this email
    let ticket = await this.prisma.supportTicket.findFirst({
      where: { clientEmail: email, isClosed: false },
      include: { messages: true },
    });

    if (!ticket) {
      ticket = await this.prisma.supportTicket.create({
        data: { clientEmail: email, clientName: name },
        include: { messages: true },
      });
    }
    return ticket;
  }

  async getOpenTickets() {
    return this.prisma.supportTicket.findMany({
      where: { isClosed: false },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTicketMessages(ticketId: number) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: { ticket: true },
    });

    return { ticket, messages };
  }

  async closeTicket(id: number) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { isClosed: true },
    });
  }

  async saveMessage(
    ticketId: number,
    content: string,
    isFromAdmin: boolean,
    adminId?: number,
  ) {
    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        content,
        isFromAdmin,
        adminId,
      },
    });

    // Update ticket's updatedAt timestamp
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}
