const axios = require('axios');

async function testParentAttendance() {
    console.log('🧪 Testing Parent Attendance Navigation...\n');

    try {
        // Step 1: Test parent login
        console.log('📝 Step 1: Testing parent login...');
        const loginData = {
            email: 'parent@test.com', // Replace with actual parent email
            password: 'password123'   // Replace with actual password
        };

        const loginResponse = await axios.post('http://localhost:3000/login/parent', loginData, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });

        if (loginResponse.status === 302) {
            console.log('✅ Parent login successful (redirected)');
            console.log('📍 Redirect location:', loginResponse.headers.location);
            
            const cookies = loginResponse.headers['set-cookie'];
            if (!cookies) {
                console.log('❌ No cookies received from login');
                return;
            }

            const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
            console.log('✅ Got authentication cookies');

            // Step 2: Test attendance access
            console.log('\n📊 Step 2: Testing attendance access...');
            const attendanceResponse = await axios.get('http://localhost:3000/attendance', {
                headers: {
                    'Cookie': cookieHeader
                },
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            });

            if (attendanceResponse.status === 302) {
                console.log('✅ Attendance route redirected');
                console.log('📍 Redirect location:', attendanceResponse.headers.location);
                
                if (attendanceResponse.headers.location === '/attendance/child-attendance') {
                    console.log('🎉 Correctly redirected to child attendance!');
                } else if (attendanceResponse.headers.location === '/dashboard') {
                    console.log('❌ Incorrectly redirected to dashboard');
                } else {
                    console.log('⚠️  Redirected to:', attendanceResponse.headers.location);
                }
            } else if (attendanceResponse.status === 200) {
                console.log('✅ Attendance page loaded directly');
            }

            // Step 3: Test child attendance page
            console.log('\n👶 Step 3: Testing child attendance page...');
            const childAttendanceResponse = await axios.get('http://localhost:3000/attendance/child-attendance', {
                headers: {
                    'Cookie': cookieHeader
                },
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            });

            if (childAttendanceResponse.status === 200) {
                console.log('✅ Child attendance page loads successfully');
                
                // Check if page contains expected content
                const hasStudentInfo = childAttendanceResponse.data.includes('Student Information');
                const hasAttendanceTable = childAttendanceResponse.data.includes('Attendance History');
                const hasAttendanceRate = childAttendanceResponse.data.includes('Attendance Rate');
                
                console.log(`   - Student info section: ${hasStudentInfo ? '✅' : '❌'}`);
                console.log(`   - Attendance table: ${hasAttendanceTable ? '✅' : '❌'}`);
                console.log(`   - Attendance rate: ${hasAttendanceRate ? '✅' : '❌'}`);
            } else if (childAttendanceResponse.status === 302) {
                console.log('⚠️  Child attendance page redirected');
                console.log('📍 Redirect location:', childAttendanceResponse.headers.location);
            } else {
                console.log('❌ Child attendance page failed to load');
                console.log('Status:', childAttendanceResponse.status);
            }

        } else {
            console.log('❌ Parent login failed');
            console.log('Status:', loginResponse.status);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
    }
}

// Run the test
testParentAttendance(); 