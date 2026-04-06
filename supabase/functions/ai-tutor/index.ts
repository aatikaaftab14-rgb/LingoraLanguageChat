import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, language } = await req.json();

    if (!message || !language) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: message, language" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tutorResponse = generateTutorResponse(message, language);

    return new Response(
      JSON.stringify({ response: tutorResponse }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateTutorResponse(message: string, language: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("grammar") || lowerMessage.includes("correct")) {
    return `In ${language}, it's important to pay attention to grammar structure. Based on your message, here are some tips: Make sure subject and verb agree, watch your tense consistency, and remember proper word order. Would you like me to explain a specific grammar rule?`;
  }

  if (lowerMessage.includes("vocabulary") || lowerMessage.includes("word")) {
    return `Great question about ${language} vocabulary! To build your vocabulary effectively, try using new words in context, practice with flashcards, and read materials at your level. What specific words or topics would you like to explore?`;
  }

  if (lowerMessage.includes("help") || lowerMessage.includes("how")) {
    return `I'm here to help you with ${language}! I can assist with grammar corrections, vocabulary questions, pronunciation tips, and provide example sentences. Just mention @tutor in your message and ask away!`;
  }

  if (lowerMessage.includes("example") || lowerMessage.includes("sentence")) {
    return `Here's an example in ${language}: Practice makes perfect! Try creating your own sentences and I'll provide feedback. Remember to use vocabulary you've learned and apply proper grammar rules.`;
  }

  if (lowerMessage.includes("pronunciation") || lowerMessage.includes("speak")) {
    return `Pronunciation in ${language} can be challenging! Focus on listening to native speakers, repeat phrases out loud, and don't be afraid to make mistakes. Practice regularly and you'll improve steadily.`;
  }

  return `That's a great question about ${language}! I'm here to help with grammar, vocabulary, pronunciation, and more. Feel free to ask specific questions like "How do I use this word?" or "Is this sentence correct?" and I'll provide detailed guidance.`;
}
