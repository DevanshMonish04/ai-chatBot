
const groq = require("../config/llm");

const chatWithAI = async (req, res) => {
  try {
    const { messages } = req.body;

    // Validate conversation history
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please provide a valid conversation."
      });
    }

    // Validate individual messages
    const validMessages = messages.every((msg) =>
      msg &&
      ["user", "assistant"].includes(msg.role) &&
      typeof msg.content === "string" &&
      msg.content.trim().length > 0
    );

    if (!validMessages) {
      return res.status(400).json({
        error: "Invalid message format."
      });
    }

    // Request a streaming response from Groq
    const stream = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant. Explain things clearly."
        },
        ...messages
      ],
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      temperature: 0.7,
      stream: true
    });

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Send each generated chunk to the frontend
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;

      if (content) {
        res.write(content);
      }
    }

    // Finish the response
    res.end();

  } catch (error) {
    console.error("AI Streaming Error:", error.message);

    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({
        success: false,
        error: "Something went wrong while generating the AI response."
      });
    }
  }
};

module.exports = { chatWithAI };
