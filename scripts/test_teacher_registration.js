const axios = require('axios');

async function testTeacherRegistration() {
    try {
        console.log('🧪 Testing Teacher Registration Flow...\n');

        // Step 1: Test teacher registration
        console.log('📝 Testing teacher registration...');
        
        const teacherData = {
            firstName: 'Test',
            lastName: 'Teacher',
            email: `test.teacher.${Date.now()}@school.com`,
            password: 'testpassword123'
        };

        console.log('📧 Registering teacher with email:', teacherData.email);

        const registrationResponse = await axios.post('http://localhost:3000/register/teacher', 
            new URLSearchParams(teacherData),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            }
        );

        if (registrationResponse.status === 302) {
            console.log('✅ Teacher registration successful (redirected)');
            console.log('📍 Redirect location:', registrationResponse.headers.location);
            
            // Check if redirected to success page with teacher ID
            if (registrationResponse.headers.location && registrationResponse.headers.location.includes('/registration-success')) {
                console.log('🎉 Registration redirected to success page!');
                
                // Extract teacher ID from redirect URL
                const redirectUrl = registrationResponse.headers.location;
                const teacherIdMatch = redirectUrl.match(/teacherId=([^&]+)/);
                const teacherId = teacherIdMatch ? decodeURIComponent(teacherIdMatch[1]) : null;
                
                if (teacherId) {
                    console.log('🆔 Teacher ID generated:', teacherId);
                    
                    // Step 2: Test success page
                    console.log('\n📄 Testing success page...');
                    const successPageResponse = await axios.get(`http://localhost:3000${redirectUrl}`);
                    
                    if (successPageResponse.status === 200) {
                        console.log('✅ Success page loads successfully');
                        
                        // Check if teacher ID is displayed on the page
                        const hasTeacherId = successPageResponse.data.includes(teacherId);
                        const hasTeacherSection = successPageResponse.data.includes('teacherId');
                        const hasTeacherIcon = successPageResponse.data.includes('chalkboard-teacher');
                        
                        console.log(`   - Teacher ID displayed: ${hasTeacherId ? '✅' : '❌'}`);
                        console.log(`   - Teacher section present: ${hasTeacherSection ? '✅' : '❌'}`);
                        console.log(`   - Teacher icon present: ${hasTeacherIcon ? '✅' : '❌'}`);
                        
                        if (hasTeacherId && hasTeacherSection) {
                            console.log('🎉 Success page correctly displays teacher ID!');
                        } else {
                            console.log('⚠️  Success page may not be displaying teacher ID correctly');
                        }
                    } else {
                        console.log('❌ Success page failed to load');
                    }
                } else {
                    console.log('❌ No teacher ID found in redirect URL');
                }
            } else {
                console.log('❌ Registration did not redirect to success page');
                console.log('Redirected to:', registrationResponse.headers.location);
            }
        } else {
            console.log('❌ Teacher registration failed');
            console.log('Status:', registrationResponse.status);
            console.log('Response:', registrationResponse.data);
        }

        // Step 3: Test teacher login with the registered account
        console.log('\n🔐 Testing teacher login...');
        
        const loginResponse = await axios.post('http://localhost:3000/login/teacher', 
            new URLSearchParams({
                email: teacherData.email,
                password: teacherData.password
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            }
        );

        if (loginResponse.status === 302) {
            console.log('✅ Teacher login successful (redirected)');
            console.log('📍 Redirect location:', loginResponse.headers.location);
            
            if (loginResponse.headers.location === '/dashboard/teacher') {
                console.log('🎉 Teacher successfully redirected to dashboard!');
            } else {
                console.log('⚠️  Teacher redirected to:', loginResponse.headers.location);
            }
        } else {
            console.log('❌ Teacher login failed');
            console.log('Status:', loginResponse.status);
        }

        console.log('\n🎉 Teacher registration test completed!');

    } catch (error) {
        if (error.response) {
            console.log('❌ HTTP Error:', error.response.status);
            console.log('Response:', error.response.data);
        } else {
            console.log('❌ Network Error:', error.message);
        }
    }
}

// Run the test
testTeacherRegistration(); 