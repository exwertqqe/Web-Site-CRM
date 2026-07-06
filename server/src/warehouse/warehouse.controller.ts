import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Sse('distribution-progress')
  distributionProgress(): Observable<MessageEvent> {
    return fromEvent(
      this.warehouseService.getProgressEmitter(),
      'progress',
    ).pipe(map((data: any) => ({ data: JSON.stringify(data) })));
  }

  @Get('sectors')
  getSectors() {
    return this.warehouseService.getSectors();
  }

  @Post('sectors')
  createSector(@Body() createDto: { name: string; description?: string }) {
    return this.warehouseService.createSector(createDto);
  }

  @Delete('sectors/:id')
  deleteSector(@Param('id') id: string) {
    return this.warehouseService.deleteSector(+id);
  }

  @Post('shelves')
  createShelf(
    @Body()
    createDto: {
      name: string;
      sectorId: number;
      capacity?: number;
      color?: string;
    },
  ) {
    return this.warehouseService.createShelf(createDto);
  }

  @Delete('shelves/:id')
  deleteShelf(@Param('id') id: string) {
    return this.warehouseService.deleteShelf(+id);
  }

  @Get('inventory-logs')
  getInventoryLogs() {
    return this.warehouseService.getInventoryLogs();
  }

  @Post('force-distribution')
  forceDistribution() {
    return this.warehouseService.forceDistribution();
  }

  @Get('order-placements/:orderId')
  getOrderPlacements(@Param('orderId') orderId: string) {
    return this.warehouseService.getOrderPlacements(+orderId);
  }
}
