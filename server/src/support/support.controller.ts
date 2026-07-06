import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Public endpoint for guests
  @Post('start')
  async startTicket(@Body() body: { email: string; name?: string }) {
    return this.supportService.startSupportTicket(body.email, body.name);
  }

  // Admin endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Get('tickets')
  async getTickets() {
    return this.supportService.getOpenTickets();
  }

  // Доступно всім (і гостям для історії, і адмінам для відповіді)
  @Get('tickets/:id/messages')
  async getTicketMessages(@Param('id') id: string) {
    return this.supportService.getTicketMessages(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Patch('tickets/:id/close')
  async closeTicket(@Param('id') id: string) {
    const ticket = await this.supportService.closeTicket(Number(id));
    // We need a way to emit the socket event.
    // A cleaner way is to inject ChatGateway here or emit an event to an event emitter.
    // Let's use the simplest approach here: return the ticket.
    // Wait, the client calling this is the admin. The admin needs to notify the guest.
    // We will make the admin's frontend emit a socket event right after this succeeds.
    return ticket;
  }
}
