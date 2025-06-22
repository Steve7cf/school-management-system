const fs = require('fs');
const path = require('path');

// Setup uploads directory
const setupUploads = () => {
    try {
        const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
        const avatarsDir = path.join(uploadsDir, 'avatars');
        
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('✅ Created uploads directory');
        }
        
        // Create avatars directory if it doesn't exist
        if (!fs.existsSync(avatarsDir)) {
            fs.mkdirSync(avatarsDir, { recursive: true });
            console.log('✅ Created avatars directory');
        }
        
        // Set proper permissions (readable and writable)
        try {
            fs.chmodSync(uploadsDir, 0o755);
            fs.chmodSync(avatarsDir, 0o755);
            console.log('✅ Set proper permissions for upload directories');
        } catch (permError) {
            console.warn('⚠️  Could not set permissions (this is normal on Windows)');
        }
        
        // Create a .gitkeep file to ensure the directory is tracked in git
        const gitkeepFile = path.join(avatarsDir, '.gitkeep');
        if (!fs.existsSync(gitkeepFile)) {
            fs.writeFileSync(gitkeepFile, '');
            console.log('✅ Created .gitkeep file');
        }
        
        console.log('🎉 Uploads directory setup complete!');
        console.log(`📁 Uploads directory: ${uploadsDir}`);
        console.log(`🖼️  Avatars directory: ${avatarsDir}`);
        
    } catch (error) {
        console.error('❌ Error setting up uploads directory:', error);
        process.exit(1);
    }
};

// Run setup if this file is executed directly
if (require.main === module) {
    setupUploads();
}

module.exports = setupUploads; 