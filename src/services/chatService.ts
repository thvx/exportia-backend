import { logger } from "../utils/logger.js";
import { ChatMessage, ChatSession, User } from "../types/index.js";
import axios from "axios";

/**
 * Chat Service
 * Handles AI-powered chat with LLM proxy
 */

export class ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private llmEndpoint: string = "https://api.openai.com/v1/chat/completions"; // Configurable

  /**
   * Create a new chat session
   */
  async createSession(userId: string, topic?: string): Promise<ChatSession> {
    const session: ChatSession = {
      id: `session-${Date.now()}`,
      user_id: userId,
      messages: [],
      topic: topic || "general",
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.sessions.set(session.id, session);
    logger.info(`Chat session created for user: ${userId}`);
    return session;
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    sessionId: string,
    userMessage: string,
    userId: string
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      user_id: userId,
      content: userMessage,
      role: "user",
      created_at: new Date(),
    };

    session.messages.push(userMsg);

    // Get AI response
    try {
      const aiResponse = await this.queryLLM(session.messages, session.topic);

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        user_id: "system",
        content: aiResponse,
        role: "assistant",
        created_at: new Date(),
      };

      session.messages.push(assistantMsg);
      session.updated_at = new Date();
      this.sessions.set(sessionId, session);

      logger.info(`Message processed for session: ${sessionId}`);
      return assistantMsg;
    } catch (err) {
      logger.error("LLM query error", err);
      throw new Error("Failed to get AI response");
    }
  }

  /**
   * Get chat session history
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Retrieve all sessions for a user
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return Array.from(this.sessions.values()).filter((s) => s.user_id === userId);
  }

  /**
   * Query the LLM for a response
   * In production, this would call Claude, GPT, or your internal LLM
   */
  private async queryLLM(messages: ChatMessage[], context?: string): Promise<string> {
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // System prompt with export context
    const systemPrompt = `You are an expert assistant for international trade and export/import regulations.
You help users navigate WTO regulations, customs procedures, market trends, and logistics for ${context || "general export-import"} activities.
Provide clear, actionable advice based on current trade regulations and market data.`;

    try {
      // Make request to LLM endpoint (CloudFlare Workers, OpenAI, or internal LLM)
      // For now, return a mock response
      return this.getMockLLMResponse(messages[messages.length - 1].content);
    } catch (err) {
      logger.error("LLM endpoint error", err);
      // Graceful fallback
      return "I'm unable to process your request at the moment. Please try again later or contact support.";
    }
  }

  /**
   * Mock LLM response for development
   */
  private getMockLLMResponse(userInput: string): string {
    const responses: Record<string, string> = {
      coffee:
        "For coffee exports, ensure your SPS (Sanitary and Phytosanitary) compliance is current. Check for recent TBT notifications on pesticide residue limits.",
      quota: "Quotas are typically managed at the import country level. Check our Facility section for the latest quota restrictions.",
      tariff:
        "Tariff rates vary by HS code and bilateral trade agreements. Use the Markets section to compare tariff impacts across destinations.",
      documents:
        "Required export documents usually include: Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin, and Phytosanitary Certificate (for agricultural products).",
    };

    const lowerInput = userInput.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (lowerInput.includes(key)) {
        return response;
      }
    }

    return "I can help you with export regulations, market trends, customs procedures, and quotas. What specific aspect would you like to know about?";
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      logger.info(`Chat session deleted: ${sessionId}`);
    }
    return deleted;
  }
}

export const chatService = new ChatService();
