require('dotenv').config();

console.log('🔍 Testing Production Mode Session Configuration');
console.log('==============================================');

// Test different environment configurations
const testConfigs = [
  { name: 'Development (Current)', NODE_ENV: 'development' },
  { name: 'Production (Target)', NODE_ENV: 'production' }
];

testConfigs.forEach(config => {
  console.log(`\n📋 ${config.name}:`);
  
  const isProduction = config.NODE_ENV === "production";
  const domain = process.env.DOMAIN || undefined;
  
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   Cookie secure: ${isProduction}`);
  console.log(`   Cookie sameSite: ${isProduction ? "none" : "lax"}`);
  console.log(`   Domain: ${domain || 'auto'}`);
  console.log(`   HTTPS required: ${isProduction ? 'YES' : 'NO'}`);
  
  if (isProduction) {
    console.log(`   ⚠️  WARNING: In production mode, cookies will only work with HTTPS!`);
    console.log(`   ⚠️  If your production site uses HTTP, cookies won't be set.`);
  } else {
    console.log(`   ✅ In development mode, cookies work with HTTP.`);
  }
});

console.log('\n🔧 To fix production sessions:');
console.log('   1. Ensure your production domain uses HTTPS');
console.log('   2. Set NODE_ENV=production in your hosting environment');
console.log('   3. Set SESSION_SECRET in your hosting environment');
console.log('   4. Set MONGODB_URI in your hosting environment');

console.log('\n📋 Environment Variables Checklist:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set (defaults to development)'}`);
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
console.log(`   DOMAIN: ${process.env.DOMAIN || 'not set'}`);

console.log('\n💡 Quick Test:');
console.log('   Run this with NODE_ENV=production to see production settings:');
console.log('   NODE_ENV=production node scripts/test_production_mode.js'); 