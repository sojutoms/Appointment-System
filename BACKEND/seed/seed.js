// Seeds the database with an admin account, sample services and staff.
// Usage: npm run seed          -> adds missing sample data (safe to re-run)
//        npm run seed -- --reset -> wipes services, staff and appointments first
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Appointment from '../models/Appointment.js';

const services = [
  { name: 'General Consultation', description: 'A one-on-one consultation to discuss your concerns.', durationMinutes: 30, price: 500 },
  { name: 'Follow-up Visit', description: 'Short check-in after a previous appointment.', durationMinutes: 30, price: 300 },
  { name: 'Comprehensive Check-up', description: 'Full assessment with a detailed report.', durationMinutes: 60, price: 1500 },
  { name: 'Counseling Session', description: 'Private counseling session.', durationMinutes: 60, price: 1000 },
  { name: 'Quick Assessment', description: 'Fast screening for simple concerns.', durationMinutes: 15, price: 200 },
];

const staff = [
  {
    name: 'Dr. Maria Santos',
    specialization: 'General Practitioner',
    email: 'maria.santos@example.com',
    serviceNames: ['General Consultation', 'Follow-up Visit', 'Comprehensive Check-up', 'Quick Assessment'],
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
  },
  {
    name: 'Dr. Jose Reyes',
    specialization: 'Specialist',
    email: 'jose.reyes@example.com',
    serviceNames: ['Comprehensive Check-up', 'Follow-up Visit'],
    workingDays: [1, 3, 5, 6],
    startTime: '10:00',
    endTime: '18:00',
  },
  {
    name: 'Ana Cruz',
    specialization: 'Counselor',
    email: 'ana.cruz@example.com',
    serviceNames: ['Counseling Session', 'Quick Assessment'],
    workingDays: [2, 4, 6],
    startTime: '08:00',
    endTime: '15:00',
  },
];

async function seed() {
  await connectDB();

  if (process.argv.includes('--reset')) {
    await Promise.all([Appointment.deleteMany({}), Staff.deleteMany({}), Service.deleteMany({})]);
    console.log('Cleared services, staff and appointments.');
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.warn('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set; skipping admin account.');
  } else if (await User.exists({ email: adminEmail })) {
    console.log(`Admin ${adminEmail} already exists.`);
  } else {
    await User.create({ name: 'System Admin', email: adminEmail, password: adminPassword, role: 'admin' });
    console.log(`Created admin ${adminEmail}.`);
  }

  const serviceIds = {};
  for (const data of services) {
    const doc = await Service.findOneAndUpdate({ name: data.name }, { $setOnInsert: data }, { upsert: true, returnDocument: 'after' });
    serviceIds[doc.name] = doc._id;
  }
  console.log(`Services ready: ${services.length}`);

  for (const { serviceNames, ...data } of staff) {
    await Staff.findOneAndUpdate(
      { name: data.name },
      { $setOnInsert: { ...data, services: serviceNames.map((n) => serviceIds[n]) } },
      { upsert: true }
    );
  }
  console.log(`Staff ready: ${staff.length}`);
  console.log(`Done (timezone: ${config.timezone}).`);
}

try {
  await seed();
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
