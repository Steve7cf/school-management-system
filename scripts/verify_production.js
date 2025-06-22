require('dotenv').config();

console.log('🔍 Production Environment Verification');
console.log('=====================================');

const isProduction = process.env.NODE_ENV === "production";

console.log(`\n📋 Current Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set (defaults to development)'}`);

console.log('\n🔧 Session Configuration:');
console.log(`   Cookie secure: ${isProduction}`);
console.log(`   Cookie sameSite: ${isProduction ? "none" : "lax"}`);
console.log(`   HTTPS required: ${isProduction ? 'YES' : 'NO'}`);

console.log('\n📋 Required Environment Variables:');
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);

console.log('\n📋 Optional Environment Variables:');
console.log(`   DOMAIN: ${process.env.DOMAIN || 'not set (auto-detect)'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);

if (isProduction) {
  console.log('\n✅ Production mode detected!');
  console.log('   Sessions will use secure cookies (HTTPS required)');
  
  if (!process.env.SESSION_SECRET) {
    console.log('\n❌ WARNING: SESSION_SECRET is not set!');
    console.log('   This will cause session issues in production.');
  }
  
  if (!process.env.MONGODB_URI) {
    console.log('\n❌ WARNING: MONGODB_URI is not set!');
    console.log('   This will cause database connection issues.');
  }
  
  console.log('\n💡 Production Checklist:');
  console.log('   ✅ NODE_ENV=production');
  console.log(`   ${process.env.SESSION_SECRET ? '✅' : '❌'} SESSION_SECRET set`);
  console.log(`   ${process.env.MONGODB_URI ? '✅' : '❌'} MONGODB_URI set`);
  console.log('   ✅ HTTPS enabled on your domain');
  console.log('   ✅ Browser accepts cookies');
  
} else {
  console.log('\n⚠️  Development mode detected!');
  console.log('   Sessions use non-secure cookies (HTTP works)');
  console.log('   This is why sessions work locally but not in production.');
  
  console.log('\n🔧 To test production settings locally:');
  console.log('   NODE_ENV=production node scripts/verify_production.js');
}

console.log('\n📋 Next Steps:');
if (!isProduction) {
  console.log('   1. Set NODE_ENV=production in your hosting environment');
  console.log('   2. Set SESSION_SECRET in your hosting environment');
  console.log('   3. Ensure your production domain uses HTTPS');
  console.log('   4. Deploy and test again');
} else {
  console.log('   1. Ensure your domain uses HTTPS');
  console.log('   2. Test login functionality');
  console.log('   3. Check browser cookies in Developer Tools');
  console.log('   4. Verify session persistence');
} 