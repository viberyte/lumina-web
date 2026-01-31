import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runTest() {
    console.log("Running OpenAI Diagnostic Test (Final Attempt)...");
    try {
        const promptText = "Identify the cuisine for a romantic dinner spot named 'The Fancy Diner' that serves handmade pasta. Respond ONLY with a valid JSON object."; // ADDED 'Respond ONLY with a valid JSON object.'
        
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: promptText }],
            temperature: 0.1,
            // Requires the prompt to explicitly ask for JSON output
            response_format: { type: "json_object" } 
        });
        
        const content = response.choices[0].message.content;
        const parsed = JSON.parse(content);
        
        console.log("✅ SUCCESS: OpenAI Call Worked!");
        console.log("Response Snippet:", content.substring(0, 100) + '...');
        
    } catch (error) {
        console.error("❌ FATAL ERROR: OpenAI Call Failed.");
        if (error.response) {
            console.error("HTTP Status:", error.response.status);
            console.error("Response Data:", JSON.stringify(error.response.data));
        } else {
            console.error("Error Message:", error.message);
        }
    }
}

runTest();
