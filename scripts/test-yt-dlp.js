const YtDlpWrap = require('yt-dlp-exec');
const fs = require('fs');

async function testVideo(url, label) {
    console.log(`\n--- Testing ${label}: ${url} ---`);
    try {
        // Try fetching ANY subtitles (auto or manual)
        const output = await YtDlpWrap(url, {
            writeSub: true,
            writeAutoSub: true,
            skipDownload: true,
            // subLang: 'en', // Commented out to fetch ALL
            output: `test-${label}-%(id)s`,
            noWarnings: true,
            noCheckCertificate: true,
        });

        console.log('Command finished.');

        const files = fs.readdirSync('.');
        const vttFiles = files.filter(f => f.startsWith(`test-${label}-`) && f.endsWith('.vtt'));

        console.log('VTT files found:', vttFiles);

        if (vttFiles.length > 0) {
            console.log(`[SUCCESS] Found ${vttFiles.length} subtitle files.`);
            vttFiles.forEach(f => {
                console.log(`File: ${f}`);
                // fs.unlinkSync(f);
            });
        } else {
            console.error('[FAIL] No subtitle file generated.');
        }

    } catch (error) {
        console.error('[FAIL] yt-dlp error:', error.message);
    }
}

async function main() {
    await testVideo('https://www.youtube.com/watch?v=jNQXAC9IVRw', 'baseline'); // Me at the zoo
    await testVideo('https://www.youtube.com/watch?v=ad79nYk2keg', 'candidate'); // AI in 5 mins
}

main();
