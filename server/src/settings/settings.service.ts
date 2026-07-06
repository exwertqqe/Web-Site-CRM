import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as ExcelJS from 'exceljs';

const execAsync = promisify(exec);

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    return setting ? setting.value : null;
  }

  async updateSetting(key: string, value: string): Promise<any> {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getMaintenanceMode(): Promise<boolean> {
    const value = await this.getSetting('maintenance_mode');
    return value === 'true';
  }

  async setMaintenanceMode(enabled: boolean): Promise<any> {
    return this.updateSetting('maintenance_mode', enabled.toString());
  }

  async getSupportChatDisabled(): Promise<boolean> {
    const value = await this.getSetting('support_chat_disabled');
    // за замовчуванням (якщо в базі пусто), чат НЕ вимкнений
    return value === 'true';
  }

  async setSupportChatDisabled(disabled: boolean): Promise<any> {
    return this.updateSetting('support_chat_disabled', disabled.toString());
  }

  async getPurchasesDisabled(): Promise<boolean> {
    const value = await this.getSetting('purchases_disabled');
    // за замовчуванням (якщо в базі пусто), покупки дозволені
    return value === 'true';
  }

  async setPurchasesDisabled(disabled: boolean): Promise<any> {
    return this.updateSetting('purchases_disabled', disabled.toString());
  }

  async getDatabaseBackup(): Promise<string> {
    try {
      // використовуємо pg_dump всередині докер-контейнера
      // пароль передаємо через змінну PGPASSWORD, щоб не вилазило вікно запиту
      const { stdout } = await execAsync(
        `PGPASSWORD=adminpassword docker exec crm_postgres pg_dump -U admin -d crm_db`,
        { maxBuffer: 1024 * 1024 * 50 }, // 50MB buffer
      );
      return stdout;
    } catch (error) {
      console.error('Database backup failed:', error);
      throw new Error('Failed to generate database backup');
    }
  }

  async exportProductsToExcel(): Promise<Buffer> {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        variants: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    // додаємо заголовки стовпців для Excel-файлу
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Назва', key: 'name', width: 30 },
      { header: 'Категорія', key: 'category', width: 20 },
      { header: 'Ціна (₴)', key: 'price', width: 15 },
      { header: 'Slug', key: 'slug', width: 20 },
      { header: 'Опис', key: 'description', width: 50 },
      { header: 'Варіанти', key: 'variants', width: 50 },
      { header: 'Загальний залишок', key: 'totalStock', width: 15 },
      { header: 'Створено', key: 'createdAt', width: 20 },
    ];

    // робимо перший рядок (заголовки) жирним та з сірим фоном
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // заповнюємо таблицю даними про товари
    products.forEach((p) => {
      const variantsStr = p.variants
        .map((v) => `${v.colorName} (${v.stock} шт.)`)
        .join(', ');
      const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);

      worksheet.addRow({
        id: p.id,
        name: p.name,
        category: p.category?.name || 'Н/Д',
        price: Number(p.price),
        slug: p.slug,
        description: p.description || '',
        variants: variantsStr,
        totalStock: totalStock,
        createdAt: p.createdAt.toLocaleString('uk-UA'),
      });
    });

    // додаємо фільтри для зручності пошуку в Excel
    worksheet.autoFilter = 'A1:I1';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
