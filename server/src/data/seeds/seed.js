/**
 * Seed script — inserts sample services and rules into MongoDB.
 * Run with: npm run seed  (from the server/ directory)
 *
 * WARNING: This will drop and recreate the Service and Rule collections.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../..', '.env') });
const mongoose = require('mongoose');
const Service = require('../../models/Service');
const Rule = require('../../models/Rule');

const connectDB = require('../../config/db');

const SERVICES = [
  {
    slug: 'ration-card',
    name: 'Ration Card Application',
    description: 'Apply for a new ration card or update an existing one under the National Food Security Act.',
    category: 'Food & Civil Supplies',
    officialUrl: 'https://nfsa.gov.in/',
    requiredDocumentTypes: ['aadhaar', 'residence_proof', 'income_certificate', 'passport_photo'],
  },
  {
    slug: 'scholarship-obc',
    name: 'OBC Post-Matric Scholarship',
    description: 'Central-sector scholarship for OBC students for post-matriculation education.',
    category: 'Education',
    officialUrl: 'https://scholarships.gov.in/',
    requiredDocumentTypes: ['aadhaar', 'caste_certificate', 'income_certificate', 'marksheet', 'bank_passbook'],
  },
  {
    slug: 'pm-awas-yojana',
    name: 'PM Awas Yojana (Urban)',
    description: 'Affordable housing scheme for economically weaker sections.',
    category: 'Housing',
    officialUrl: 'https://pmaymis.gov.in/',
    requiredDocumentTypes: ['aadhaar', 'income_certificate', 'residence_proof', 'bank_passbook'],
  },
];

async function seed() {
  await connectDB();
  console.log('🌱 Seeding database...');

  await Service.deleteMany({});
  await Rule.deleteMany({});

  for (const svcData of SERVICES) {
    const service = await Service.create(svcData);
    console.log(`  ✅ Service created: ${service.name} (${service._id})`);

    // Seed common rules for each service
    const rules = [
      {
        serviceId: service._id,
        type: 'consistency',
        field: 'name',
        description: 'Applicant name must be consistent across all submitted documents.',
        involvedDocuments: svcData.requiredDocumentTypes.filter((d) => d !== 'passport_photo'),
        sourceReference: svcData.officialUrl,
        severity: 'error',
        humanVerified: true,
      },
      {
        serviceId: service._id,
        type: 'consistency',
        field: 'date_of_birth',
        description: 'Date of birth must match across Aadhaar and other identity documents.',
        involvedDocuments: ['aadhaar', 'marksheet'].filter((d) => svcData.requiredDocumentTypes.includes(d)),
        sourceReference: svcData.officialUrl,
        severity: 'error',
        humanVerified: true,
      },
      ...svcData.requiredDocumentTypes.map((docType) => ({
        serviceId: service._id,
        type: 'presence',
        field: docType,
        requiredDocument: docType,
        description: `${docType.replace(/_/g, ' ')} is required for this service.`,
        sourceReference: svcData.officialUrl,
        severity: 'error',
        humanVerified: true,
      })),
    ];

    await Rule.insertMany(rules);
    console.log(`     📋 ${rules.length} rules inserted.`);
  }

  console.log('\n✅ Seeding complete.');
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
