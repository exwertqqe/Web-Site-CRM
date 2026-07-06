import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Clean up existing data FIRST
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Admin User
  const adminEmail = 'admin@gmail.com';
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: Role.ADMIN,
      name: 'Main Admin',
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Main Admin',
      role: Role.ADMIN,
    },
  });
  console.log('Admin user (admin@gmail.com) secured.');

  // Create Categories (Ukrainian)
  const catPhones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: { name: 'Смартфони' },
    create: { name: 'Смартфони', slug: 'smartphones' },
  });

  const catLaptops = await prisma.category.upsert({
    where: { slug: 'laptops' },
    update: { name: 'Ноутбуки' },
    create: { name: 'Ноутбуки', slug: 'laptops' },
  });

  const catAudio = await prisma.category.upsert({
    where: { slug: 'audio' },
    update: { name: 'Аудіотехніка' },
    create: { name: 'Аудіотехніка', slug: 'audio' },
  });

  console.log('Categories created (UA).');

  // Create Products (Smartphones)
  await prisma.product.create({
    data: {
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'The ultimate iPhone.',
      price: 1199.00,
      categoryId: catPhones.id,
      variants: {
        create: [
          {
            colorName: 'Natural Titanium',
            colorCode: '#BEBEBE',
            images: ['https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-15-pro-1.jpg'],
            stock: 50
          }
        ]
      },
      attributes: {
        brand: 'Apple',
        screen: '6.1 OLED',
        storage: '256GB',
        color: 'Natural Titanium',
        cpu: 'A17 Pro'
      },
    },
  });

  await prisma.product.create({
    data: {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-s24-ultra',
      description: 'Galaxy AI is here.',
      price: 1299.00,
      categoryId: catPhones.id,
      variants: {
        create: [
          {
            colorName: 'Titanium Grey',
            colorCode: '#808080',
            images: ['https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s24-ultra-5g-1.jpg'],
            stock: 30
          }
        ]
      },
      attributes: {
        brand: 'Samsung',
        screen: '6.8 Dynamic AMOLED',
        storage: '512GB',
        color: 'Titanium Grey',
        cpu: 'Snapdragon 8 Gen 3'
      },
    },
  });

  // Create Products (Laptops)
  await prisma.product.create({
    data: {
      name: 'MacBook Air 15 M3',
      slug: 'macbook-air-15-m3',
      description: 'Lean. Mean. M3 machine.',
      price: 1499.00,
      categoryId: catLaptops.id,
      variants: {
        create: [
          {
            colorName: 'Midnight',
            colorCode: '#191970',
            images: ['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba15-midnight-select-202306?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1684518479433'],
            stock: 20
          }
        ]
      },
      attributes: {
        brand: 'Apple',
        screen: '15.3 Liquid Retina',
        ram: '16GB',
        storage: '512GB',
        cpu: 'M3'
      },
    },
  });

  await prisma.product.create({
    data: {
      name: 'ASUS ROG Zephyrus G14',
      slug: 'asus-rog-zephyrus-g14',
      description: 'World’s Most Powerful 14-inch Gaming Laptop.',
      price: 1899.00,
      categoryId: catLaptops.id,
      variants: {
        create: [
          {
            colorName: 'Grey',
            colorCode: '#808080',
            images: ['https://dlcdnwebimgs.asus.com/gain/4B5A3C72-8C8A-4A85-8A5E-8C8A4A858A5E/w1000/h732'],
            stock: 15
          }
        ]
      },
      attributes: {
        brand: 'ASUS',
        screen: '14 OLED 120Hz',
        ram: '32GB',
        storage: '1TB SSD',
        gpu: 'RTX 4070'
      },
    },
  });

  // Create Products (Audio)
  await prisma.product.create({
    data: {
      name: 'Sony WH-1000XM5',
      slug: 'sony-wh-1000xm5',
      description: 'Industry-leading noise canceling.',
      price: 348.00,
      categoryId: catAudio.id,
      variants: {
        create: [
          {
            colorName: 'Black',
            colorCode: '#000000',
            images: ['https://m.media-amazon.com/images/I/51SKmu2G9FL._AC_UF894,1000_QL80_.jpg'],
            stock: 100
          }
        ]
      },
      attributes: {
        brand: 'Sony',
        type: 'Over-ear',
        anc: true,
        battery: '30h'
      },
    },
  });


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
