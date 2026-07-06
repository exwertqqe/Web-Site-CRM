import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: true }
  });
  
  console.log(`Знайдено ${products.length} товарів. Починаємо оновлення залишків...`);

  let updatedVariantsCount = 0;

  for (const product of products) {
    if (product.variants.length === 0) continue;

    // Визначаємо загальну кількість для всього товару (від 0 до 100)
    let remainingStock = Math.floor(Math.random() * 101); 

    // Розподіляємо цю загальну кількість між всіма варіантами (кольорами/розмірами) цього товару
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      let assignedStock = 0;

      if (i === product.variants.length - 1) {
        // Останньому варіанту віддаємо весь залишок, що залишився
        assignedStock = remainingStock;
      } else {
        // Іншим даємо випадкову частину від поточного залишку
        assignedStock = Math.floor(Math.random() * (remainingStock + 1));
        remainingStock -= assignedStock;
      }

      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: assignedStock },
      });
      
      updatedVariantsCount++;
    }
  }

  console.log(`✅ Оновлення завершено! Розподілено залишки для ${updatedVariantsCount} варіантів.`);
  console.log(`Тепер сумарна кількість всіх варіантів будь-якого товару не перевищує 100 шт.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
