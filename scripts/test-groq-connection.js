const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    const apiKey = process.env.GROQ_API_KEY;
    const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
    });

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: 'Reply with "Connection Successful" only.' }],
            model: 'llama-3.1-8b-instant',
        });

        console.log('Response:', completion.choices[0].message.content);
    } catch (error) {
        console.error('Error connecting to Groq API:', error);
    }
}

main();
