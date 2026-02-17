try {
    const pdf = require('pdf-parse/lib/pdf-parse');
    console.log('Successfully required pdf-parse/lib/pdf-parse');
    console.log('Type:', typeof pdf);
} catch (error) {
    console.error('Error requiring pdf-parse/lib/pdf-parse:', error);
}

try {
    const pdfWithExt = require('pdf-parse/lib/pdf-parse.js');
    console.log('Successfully required pdf-parse/lib/pdf-parse.js');
} catch (error) {
    console.error('Error requiring pdf-parse/lib/pdf-parse.js:', error);
}
