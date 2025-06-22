const axios = require('axios');

async function debugStudentEdit() {
    try {
        console.log('🔍 Debugging Student Edit Functionality...\n');

        // Step 1: Login as admin to get session
        console.log('🔐 Logging in as admin...');
        const loginResponse = await axios.post('http://localhost:3000/login/admin', {
            email: 'admin@school.com',
            password: 'admin123'
        }, {
            withCredentials: true,
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });

        const cookies = loginResponse.headers['set-cookie'];
        if (!cookies) {
            console.log('❌ No cookies received from login');
            return;
        }

        const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('✅ Login successful, got cookies');

        // Step 2: Get students list
        console.log('\n📋 Getting students list...');
        const studentsResponse = await axios.get('http://localhost:3000/students', {
            headers: {
                'Cookie': cookieHeader
            },
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });

        if (studentsResponse.status === 200) {
            console.log('✅ Students page loaded successfully');
            
            // Extract student ID from the page
            const studentMatch = studentsResponse.data.match(/\/students\/edit\/([a-f0-9]{24})/);
            if (studentMatch) {
                const studentId = studentMatch[1];
                console.log(`📝 Found student ID: ${studentId}`);

                // Step 3: Get edit form
                console.log('\n📝 Loading edit form...');
                const editFormResponse = await axios.get(`http://localhost:3000/students/edit/${studentId}`, {
                    headers: {
                        'Cookie': cookieHeader
                    },
                    maxRedirects: 0,
                    validateStatus: function (status) {
                        return status >= 200 && status < 400;
                    }
                });

                if (editFormResponse.status === 200) {
                    console.log('✅ Edit form loaded successfully');
                    
                    // Check form fields
                    const formContent = editFormResponse.data;
                    const fieldChecks = [
                        { name: 'firstName', pattern: 'name="firstName"' },
                        { name: 'lastName', pattern: 'name="lastName"' },
                        { name: 'studentId', pattern: 'name="studentId"' },
                        { name: 'section', pattern: 'name="section"' },
                        { name: 'dateOfBirth', pattern: 'name="dateOfBirth"' },
                        { name: 'address', pattern: 'name="address"' },
                        { name: 'subjects', pattern: 'name="subjects"' },
                        { name: 'guardianName', pattern: 'name="guardianName"' },
                        { name: 'guardianRelation', pattern: 'name="guardianRelation"' },
                        { name: 'guardianPhone', pattern: 'name="guardianPhone"' },
                        { name: 'guardianEmail', pattern: 'name="guardianEmail"' }
                    ];

                    console.log('\n📋 Form field analysis:');
                    fieldChecks.forEach(field => {
                        const hasField = formContent.includes(field.pattern);
                        console.log(`   - ${field.name}: ${hasField ? '✅' : '❌'}`);
                    });

                    // Step 4: Test form submission
                    console.log('\n📤 Testing form submission...');
                    
                    // Extract current values from form
                    const firstNameMatch = formContent.match(/name="firstName"[^>]*value="([^"]*)"/);
                    const lastNameMatch = formContent.match(/name="lastName"[^>]*value="([^"]*)"/);
                    const studentIdMatch = formContent.match(/name="studentId"[^>]*value="([^"]*)"/);
                    const sectionMatch = formContent.match(/name="section"[^>]*value="([^"]*)"/);
                    const dateOfBirthMatch = formContent.match(/name="dateOfBirth"[^>]*value="([^"]*)"/);
                    const addressMatch = formContent.match(/name="address"[^>]*>([^<]*)</);

                    const formData = {
                        firstName: firstNameMatch ? firstNameMatch[1] + '_test' : 'TestFirstName',
                        lastName: lastNameMatch ? lastNameMatch[1] + '_test' : 'TestLastName',
                        studentId: studentIdMatch ? studentIdMatch[1] + '_test' : 'TEST123',
                        section: 'A',
                        dateOfBirth: dateOfBirthMatch ? dateOfBirthMatch[1] : '2000-01-01',
                        address: 'Test Address Updated',
                        subjects: [],
                        guardianName: 'Test Guardian',
                        guardianRelation: 'Father',
                        guardianPhone: '1234567890',
                        guardianEmail: 'test.guardian@example.com'
                    };

                    console.log('📝 Submitting form with data:', formData);

                    const submitResponse = await axios.post(`http://localhost:3000/students/edit/${studentId}`, 
                        new URLSearchParams(formData),
                        {
                            headers: {
                                'Cookie': cookieHeader,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            maxRedirects: 0,
                            validateStatus: function (status) {
                                return status >= 200 && status < 400;
                            }
                        }
                    );

                    if (submitResponse.status === 302) {
                        console.log('✅ Form submission successful (redirected)');
                        console.log('📍 Redirect location:', submitResponse.headers.location);
                        
                        // Check if redirected to students list (success)
                        if (submitResponse.headers.location === '/students') {
                            console.log('🎉 Student edit completed successfully!');
                        } else {
                            console.log('⚠️  Redirected to:', submitResponse.headers.location);
                        }
                    } else {
                        console.log('❌ Form submission failed');
                        console.log('Status:', submitResponse.status);
                        console.log('Response:', submitResponse.data);
                    }

                } else {
                    console.log('❌ Edit form failed to load');
                    console.log('Status:', editFormResponse.status);
                }
            } else {
                console.log('❌ No student edit links found on students page');
            }
        } else {
            console.log('❌ Students page failed to load');
            console.log('Status:', studentsResponse.status);
        }

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
debugStudentEdit(); 