/**
 * Database seed script — creates default users for development/testing.
 *
 * Usage: npx prisma db seed
 *        or: node prisma/seed.js
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Default Users ──────────────────────────────────
  const users = [
    {
      name: 'System Admin',
      email: 'admin@ghanagas.com',
      password: 'admin123',
      role: 'ADMIN',
      staff_id: 'ADM-001',
    },
    {
      name: 'Fleet Manager',
      email: 'manager@ghanagas.com',
      password: 'manager123',
      role: 'MANAGER',
      staff_id: 'MGR-001',
    },
    {
      name: 'Kwame Asante',
      email: 'kwame@ghanagas.com',
      password: 'driver123',
      role: 'DRIVER',
      staff_id: 'DRV-001',
    },
    {
      name: 'Ama Mensah',
      email: 'ama@ghanagas.com',
      password: 'driver123',
      role: 'DRIVER',
      staff_id: 'DRV-002',
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const password_hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          password_hash,
          role: u.role,
          approved: true,
          staff_id: u.staff_id || null,
          permissions: u.role === 'DRIVER' ? ['dashboard', 'my-vehicle', 'mileage', 'alerts', 'maintenance'] : [],
        },
      });
      console.log(`  ✅ Created user: ${user.name} (${user.role}) — ${user.email}`);
    } else {
      console.log(`  ⏭️  User already exists: ${u.email}`);
    }
  }

  // ── Default Vehicles ───────────────────────────────
  const drivers = await prisma.user.findMany({ where: { role: 'DRIVER' } });

  const vehicles = [
    { registration_number: 'GR-1234-22', driver_email: 'kwame@ghanagas.com' },
    { registration_number: 'GR-5678-22', driver_email: 'ama@ghanagas.com' },
    { registration_number: 'GR-9012-23', driver_email: null },
    { registration_number: 'GR-3456-23', driver_email: null },
  ];

  for (const v of vehicles) {
    const existing = await prisma.vehicle.findUnique({
      where: { registration_number: v.registration_number },
    });
    if (!existing) {
      const driver = v.driver_email
        ? drivers.find((d) => d.email === v.driver_email)
        : null;

      const vehicle = await prisma.vehicle.create({
        data: {
          registration_number: v.registration_number,
          assigned_driver_id: driver?.id || null,
          mileage_limit: 5000,
        },
      });
      console.log(`  ✅ Created vehicle: ${vehicle.registration_number}`);
    } else {
      console.log(`  ⏭️  Vehicle already exists: ${v.registration_number}`);
    }
  }

  console.log('\n🌱 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
