/**
 * AI Student Service — services/aiStudentService.ts
 *
 * Provides typed access to the student AI assistant endpoint:
 * POST /ai-student/chat
 */

import { apiClient } from '@/lib/api-client';

export interface AiStudentChatRequest {
  sessionId: string;
  message: string;
}

export interface AiStudentChatResponse {
  reply: string;
}

export const aiStudentService = {
  /**
   * Sends a message to the AI teacher for the current session.
   * Requires authentication (throws AuthError / 401 if unauthenticated).
   */
  async sendMessage(data: AiStudentChatRequest): Promise<AiStudentChatResponse> {
    return apiClient.post<AiStudentChatResponse>('/ai-student/chat', data, {
      skipAuthRedirect: true,
    });
  },
};
