const fs = require('fs');
const path = require('path');

async function uploadFile() {
    const filePath = path.join(__dirname, '../test-doc.txt');
    const fileContent = fs.readFileSync(filePath);
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'test-doc.txt');

    try {
        console.log('Uploading file...');
        const response = await fetch('http://localhost:3000/api/documents/upload', {
            method: 'POST',
            body: formData,
        });

        console.log(`Response status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        fs.writeFileSync('response.html', text);
        console.log('Response written to response.html');
        console.log('Response body:', text.substring(0, 500)); // Print first 500 chars
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

uploadFile();
