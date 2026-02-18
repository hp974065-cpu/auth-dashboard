
export function recursiveCharacterTextSplitter(
    text: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200
): string[] {
    if (text.length <= chunkSize) {
        return [text];
    }

    const result: string[] = [];
    let start = 0;

    while (start < text.length) {
        // If we are near the end
        if (start + chunkSize >= text.length) {
            result.push(text.slice(start));
            break;
        }

        let end = start + chunkSize;

        // Find the best break point looking backwards from 'end'
        // We want to maximize the chunk size but break at a semantic boundary
        const searchBuffer = text.slice(start, end);

        let splitIndex = -1;

        // Priority of separators
        const separators = ["\n\n", "\n", ". ", " "];

        for (const sep of separators) {
            const idx = searchBuffer.lastIndexOf(sep);
            if (idx !== -1 && idx > chunkSize * 0.3) { // Only break if we have at least 30% content
                splitIndex = idx;
                // Adjust splitIndex to include the separator if it's punctuation, or exclude if it's space
                if (sep === " ") {
                    // split right at the space (exclude it from end of this chunk? or include?)
                    // usually we split AT the space.
                } else {
                    splitIndex += sep.length;
                }
                break;
            }
        }

        let chunkEnd = end;
        if (splitIndex !== -1) {
            chunkEnd = start + splitIndex;
        }

        const chunk = text.slice(start, chunkEnd).trim();
        if (chunk) {
            result.push(chunk);
        }

        // Determine next start info
        const nextStart = Math.max(start + 1, chunkEnd - chunkOverlap);

        // Ensure we are always moving forward
        if (nextStart <= start) {
            start = start + 1;
        } else {
            start = nextStart;
        }
    }

    return result;
}
