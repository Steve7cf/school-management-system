const axios = require('axios');

async function debugTeacherAttendance() {
    try {
        console.log('🧪 Debugging Teacher Attendance Access...\n');

        // Step 1: Login as teacher
        console.log('🔐 Logging in as teacher...');
        const loginResponse = await axios.post('http://localhost:3000/login/teacher', 
            new URLSearchParams({
                email: 'test.teacher@school.com',
                password: 'testpassword123'
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
            
            const cookies = loginResponse.headers['set-cookie'];
            if (!cookies) {
                console.log('❌ No cookies received from login');
                return;
            }

            const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
            console.log('✅ Got authentication cookies');

            // Step 2: Test dashboard access
            console.log('\n📊 Testing teacher dashboard access...');
            const dashboardResponse = await axios.get('http://localhost:3000/dashboard/teacher', {
                headers: {
                    'Cookie': cookieHeader
                },
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            });

            if (dashboardResponse.status === 200) {
                console.log('✅ Teacher dashboard loads successfully');
                
                // Check if user role is set correctly
                const hasTeacherRole = dashboardResponse.data.includes('teacher');
                const hasAttendanceLink = dashboardResponse.data.includes('/attendance');
                console.log(`   - Teacher role in page: ${hasTeacherRole ? '✅' : '❌'}`);
                console.log(`   - Attendance link present: ${hasAttendanceLink ? '✅' : '❌'}`);
            } else {
                console.log('❌ Teacher dashboard failed to load');
                console.log('Status:', dashboardResponse.status);
            }

            // Step 3: Test attendance access
            console.log('\n📝 Testing attendance access...');
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
                
                if (attendanceResponse.headers.location === '/attendance/take') {
                    console.log('🎉 Correctly redirected to take attendance!');
                } else if (attendanceResponse.headers.location === '/dashboard') {
                    console.log('❌ Incorrectly redirected to dashboard');
                } else {
                    console.log('⚠️  Redirected to:', attendanceResponse.headers.location);
                }
            } else if (attendanceResponse.status === 200) {
                console.log('✅ Attendance page loaded directly');
                
                // Check if it's the take attendance page
                const isTakeAttendance = attendanceResponse.data.includes('Take Attendance');
                const isAttendanceReport = attendanceResponse.data.includes('Attendance Report');
                const isMyAttendance = attendanceResponse.data.includes('My Attendance');
                
                console.log(`   - Take Attendance page: ${isTakeAttendance ? '✅' : '❌'}`);
                console.log(`   - Attendance Report page: ${isAttendanceReport ? '✅' : '❌'}`);
                console.log(`   - My Attendance page: ${isMyAttendance ? '✅' : '❌'}`);
            } else {
                console.log('❌ Attendance access failed');
                console.log('Status:', attendanceResponse.status);
            }

            // Step 4: Test direct access to take attendance
            console.log('\n📝 Testing direct access to take attendance...');
            const takeAttendanceResponse = await axios.get('http://localhost:3000/attendance/take', {
                headers: {
                    'Cookie': cookieHeader
                },
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            });

            if (takeAttendanceResponse.status === 200) {
                console.log('✅ Take attendance page loads successfully');
                const hasTakeAttendanceForm = takeAttendanceResponse.data.includes('Take Attendance');
                console.log(`   - Take Attendance form: ${hasTakeAttendanceForm ? '✅' : '❌'}`);
            } else if (takeAttendanceResponse.status === 302) {
                console.log('⚠️  Take attendance redirected');
                console.log('📍 Redirect location:', takeAttendanceResponse.headers.location);
            } else {
                console.log('❌ Take attendance access failed');
                console.log('Status:', takeAttendanceResponse.status);
            }

        } else {
            console.log('❌ Teacher login failed');
            console.log('Status:', loginResponse.status);
        }

        console.log('\n🎉 Teacher attendance debug completed!');

    } catch (error) {
        if (error.response) {
            console.log('❌ HTTP Error:', error.response.status);
            console.log('Response:', error.response.data);
        } else {
            console.log('❌ Network Error:', error.message);
        }
    }
}

// Run the debug
debugTeacherAttendance(); 