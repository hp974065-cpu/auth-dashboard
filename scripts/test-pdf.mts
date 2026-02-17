
import pdf from "pdf-parse/lib/pdf-parse.js" // Test the specific import
import fs from "fs"

async function test() {
    console.log("Testing pdf-parse import...")
    try {
        const buffer = Buffer.from("Hypothetical PDF content")
        // This will likely fail parsing but prove import works
        try {
            await pdf(buffer)
        } catch (e: any) {
            console.log("Import worked, parsing failed (expected with bad buffer):", e.message)
        }
        console.log("✅ Import successful")
    } catch (e: any) {
        console.log("❌ Import failed:", e.message)
    }
}

test()
