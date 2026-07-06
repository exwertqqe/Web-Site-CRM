import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WarehouseModule } from '../warehouse/warehouse.module';

@Module({
  imports: [PrismaModule, WarehouseModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
