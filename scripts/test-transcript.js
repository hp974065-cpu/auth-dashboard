const { YoutubeTranscript } = require('youtube-transcript');
const { Innertube, UniversalCache } = require('youtubei.js');

async function testAndroidInnerTube(videoId) {
    console.log(`Testing Android InnerTube (Fetch) for ${videoId}...`);
    try {
        const playerResponse = await fetch(
            "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip",
                    "X-YouTube-Client-Name": "3",
                    "X-YouTube-Client-Version": "19.09.37",
                },
                body: JSON.stringify({
                    videoId,
                    context: {
                        client: {
                            clientName: "ANDROID",
                            clientVersion: "19.09.37",
                            androidSdkVersion: 34,
                            hl: "en",
                            gl: "US",
                            userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip",
                        },
                    },
                    contentCheckOk: true,
                    racyCheckOk: true,
                }),
            }
        );

        const playerData = await playerResponse.json();
        const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (captionTracks && captionTracks.length > 0) {
            console.log(`[SUCCESS] Android InnerTube found tracks: ${captionTracks.map(t => t.languageCode).join(', ')}`);
            return true;
        } else {
            console.log(`[FAIL] Android InnerTube: No caption tracks found.`);
        }

    } catch (e) {
        console.error(`[FAIL] Android InnerTube: ${e.message}`);
    }
    return false;
}

async function main() {
    const candidate = 'ad79nYk2keg'; // AI in 5 minutes

    console.log(`\n--- Testing Candidate: ${candidate} ---`);
    await testAndroidInnerTube(candidate);
}

main();
