import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WarehouseModule } from '../warehouse/warehouse.module';

@Module({
  imports: [PrismaModule, WarehouseModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
