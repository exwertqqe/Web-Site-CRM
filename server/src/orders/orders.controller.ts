import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateItemWarrantyDto } from './dto/update-item-warranty.dto';
import { Query } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // Якщо користувач залогінений, беремо його ID з токена, інакше undefined
    const userId = req.user?.userId ? Number(req.user.userId) : undefined;
    return this.ordersService.create({ ...createOrderDto, userId });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  findAll(@Query('search') search?: string) {
    return this.ordersService.findAll(search);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  findMyOrders(@Req() req: any) {
    // Обов'язково перетворюємо в число, бо з токена може прийти рядок
    return this.ordersService.findAllByUser(Number(req.user.userId));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }

  @Patch('items/:itemId/warranty')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  updateItemWarranty(
    @Param('itemId') itemId: string,
    @Body() updateItemWarrantyDto: UpdateItemWarrantyDto,
  ) {
    return this.ordersService.updateItemWarranty(
      +itemId,
      updateItemWarrantyDto,
    );
  }
}
