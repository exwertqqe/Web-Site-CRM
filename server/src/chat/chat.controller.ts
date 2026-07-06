import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('general')
  @Roles('ADMIN', 'MANAGER')
  async getGeneralChat() {
    return this.chatService.getGeneralChatHistory();
  }

  @Get('dm/:userId')
  @Roles('ADMIN', 'MANAGER')
  async getDirectMessages(
    @Req() req: any,
    @Param('userId') otherUserId: string,
  ) {
    const currentUserId = req.user.userId;
    return this.chatService.getDirectMessageHistory(
      currentUserId,
      Number(otherUserId),
    );
  }
}
