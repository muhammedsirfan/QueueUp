// Seeds baseline categories/subcategories plus a handful of demo accounts so the platform
// is browsable immediately after `make db-setup`. Safe to re-run: skips rows that already exist.
const { sequelize, User, Category, Subcategory, ProfessionalProfile, BusinessHours, UserRole } = require('./models');
const { hashPassword } = require('./utils/auth');
const { slugify } = require('./utils/slug');

const CATEGORY_TREE = [
  { name: 'Healthcare', subcategories: ['General Physician', 'Pediatrician', 'Dermatologist', 'Dentist', 'Orthopedic', 'Physiotherapist', 'Psychologist'] },
  { name: 'Legal', subcategories: ['Advocate', 'Family Lawyer', 'Corporate Lawyer'] },
  { name: 'Finance', subcategories: ['Chartered Accountant', 'Tax Consultant', 'Financial Advisor'] },
  { name: 'Beauty & Wellness', subcategories: ['Salon', 'Barber', 'Makeup Artist', 'Skin Clinic'] },
  { name: 'Consulting', subcategories: ['Career Consultant', 'Business Consultant', 'Education Consultant'] }
];

const DEMO_PROFESSIONALS = [
  { email: 'admin@queueup.app', full_name: 'Platform Admin', role: UserRole.ADMIN },
  {
    email: 'dr.mehta@queueup.app', full_name: 'Dr. Aditi Mehta', role: UserRole.PROFESSIONAL,
    profile: { business_name: 'Dr. Aditi Mehta Clinic', category: 'Healthcare', subcategory: 'General Physician', professional_title: 'MBBS, MD (General Medicine)', qualifications: 'MBBS, MD', years_of_experience: 12, about: 'General physician with a decade of experience treating everyday illness and chronic conditions.', consultation_fee: 500, city: 'Mumbai', languages_spoken: 'English,Hindi', slot_duration_minutes: 15, is_featured: true }
  },
  {
    email: 'contact@glowsalon.app', full_name: 'Riya Kapoor', role: UserRole.PROFESSIONAL,
    profile: { business_name: 'Glow Salon & Spa', category: 'Beauty & Wellness', subcategory: 'Salon', professional_title: 'Senior Stylist', years_of_experience: 8, about: 'Full-service salon offering haircuts, styling, and spa treatments.', consultation_fee: 300, city: 'Bengaluru', languages_spoken: 'English,Kannada', slot_duration_minutes: 30, is_featured: true }
  },
  {
    email: 'adv.sharma@queueup.app', full_name: 'Vikram Sharma', role: UserRole.PROFESSIONAL,
    profile: { business_name: 'Sharma & Associates', category: 'Legal', subcategory: 'Advocate', professional_title: 'Advocate, High Court', years_of_experience: 15, about: 'Handles civil and corporate litigation.', consultation_fee: 1000, city: 'Delhi', languages_spoken: 'English,Hindi', slot_duration_minutes: 30 }
  },
  {
    email: 'ca.patel@queueup.app', full_name: 'Neha Patel', role: UserRole.PROFESSIONAL,
    profile: { business_name: 'Patel Tax & Accounting', category: 'Finance', subcategory: 'Chartered Accountant', professional_title: 'Chartered Accountant', years_of_experience: 10, about: 'Tax filing, audits, and financial advisory for individuals and small businesses.', consultation_fee: 800, city: 'Ahmedabad', languages_spoken: 'English,Gujarati,Hindi', slot_duration_minutes: 20 }
  },
  {
    email: 'coach.raghav@queueup.app', full_name: 'Raghav Nair', role: UserRole.PROFESSIONAL,
    profile: { business_name: 'Raghav Career Coaching', category: 'Consulting', subcategory: 'Career Consultant', professional_title: 'Certified Career Coach', years_of_experience: 6, about: 'Helps students and professionals plan career transitions.', consultation_fee: 600, city: 'Pune', languages_spoken: 'English,Hindi,Marathi', slot_duration_minutes: 30 }
  }
];

const DEMO_CUSTOMER = { email: 'customer@queueup.app', full_name: 'Sample Customer', role: UserRole.CUSTOMER, phone_number: '9876543210' };
const DEMO_PASSWORD = 'password123';

async function ensureCategory(name) {
  const slug = slugify(name);
  let category = await Category.findOne({ where: { slug } });
  if (!category) category = await Category.create({ name, slug });
  return category;
}

async function ensureSubcategory(category, name) {
  const slug = slugify(name);
  let subcategory = await Subcategory.findOne({ where: { category_id: category.id, slug } });
  if (!subcategory) subcategory = await Subcategory.create({ category_id: category.id, name, slug });
  return subcategory;
}

async function ensureUser({ email, full_name, role, phone_number }) {
  let user = await User.findOne({ where: { email } });
  if (!user) user = await User.create({ email, full_name, role, phone_number: phone_number || null, password_hash: await hashPassword(DEMO_PASSWORD) });
  return user;
}

async function run() {
  await sequelize.sync({ force: false });

  const categoryByName = {};
  const subcategoryByName = {};
  for (const entry of CATEGORY_TREE) {
    const category = await ensureCategory(entry.name);
    categoryByName[entry.name] = category;
    for (const subName of entry.subcategories) {
      subcategoryByName[`${entry.name}::${subName}`] = await ensureSubcategory(category, subName);
    }
  }
  console.log(`Categories ready: ${Object.keys(categoryByName).length}`);

  for (const demo of DEMO_PROFESSIONALS) {
    const user = await ensureUser(demo);
    if (demo.profile) {
      const existingProfile = await ProfessionalProfile.findOne({ where: { user_id: user.id } });
      if (!existingProfile) {
        const category = categoryByName[demo.profile.category];
        const subcategory = subcategoryByName[`${demo.profile.category}::${demo.profile.subcategory}`];
        const profile = await ProfessionalProfile.create({
          user_id: user.id, category_id: category.id, subcategory_id: subcategory?.id || null,
          business_name: demo.profile.business_name, professional_title: demo.profile.professional_title || null,
          qualifications: demo.profile.qualifications || null, years_of_experience: demo.profile.years_of_experience || null,
          about: demo.profile.about || null, contact_number: '9000000000', contact_email: demo.email,
          city: demo.profile.city, country: 'India', consultation_fee: demo.profile.consultation_fee,
          languages_spoken: demo.profile.languages_spoken, slot_duration_minutes: demo.profile.slot_duration_minutes,
          is_featured: demo.profile.is_featured || false
        });
        // Mon-Sat 09:00-18:00, closed Sunday.
        await BusinessHours.bulkCreate([0, 1, 2, 3, 4, 5, 6].map(weekday => ({
          professional_profile_id: profile.id, weekday,
          start_time: '09:00', end_time: '18:00', is_working_day: weekday !== 0
        })));
        console.log(`Created professional profile: ${demo.profile.business_name}`);
      }
    }
  }

  await ensureUser(DEMO_CUSTOMER);
  console.log('Demo customer ready: customer@queueup.app / password123');
  console.log('Demo professional login example: dr.mehta@queueup.app / password123');
  console.log('Admin login: admin@queueup.app / password123');
}

run()
  .then(() => sequelize.close())
  .catch(err => { console.error(err); process.exit(1); });
