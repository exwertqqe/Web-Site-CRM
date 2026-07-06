import { Controller, Get, Patch, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('maintenance')
  async getMaintenanceStatus() {
    const isEnabled = await this.settingsService.getMaintenanceMode();
    return { enabled: isEnabled };
  }

  @Patch('maintenance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async setMaintenanceStatus(@Body('enabled') enabled: boolean) {
    await this.settingsService.setMaintenanceMode(enabled);
    return { success: true, enabled };
  }

  @Get('chat')
  async getChatStatus() {
    const isDisabled = await this.settingsService.getSupportChatDisabled();
    return { disabled: isDisabled };
  }

  @Patch('chat')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async setChatStatus(@Body('disabled') disabled: boolean) {
    await this.settingsService.setSupportChatDisabled(disabled);
    return { success: true, disabled };
  }

  @Get('purchases')
  async getPurchasesStatus() {
    const isDisabled = await this.settingsService.getPurchasesDisabled();
    return { disabled: isDisabled };
  }

  @Patch('purchases')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async setPurchasesStatus(@Body('disabled') disabled: boolean) {
    await this.settingsService.setPurchasesDisabled(disabled);
    return { success: true, disabled };
  }

  @Get('backup/sql')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async backupSql(@Res() res: Response) {
    const sql = await this.settingsService.getDatabaseBackup();
    const filename = `backup_${new Date().toISOString().split('T')[0]}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(sql);
  }

  @Get('backup/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async exportExcel(@Res() res: Response) {
    const buffer = await this.settingsService.exportProductsToExcel();
    const filename = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(buffer);
  }
}
