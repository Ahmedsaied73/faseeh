/**
 * Agent Service — services/agentService.ts
 *
 * REST interface for the AI Admin Agent.
 * Used as the primary or fallback transport when the `/agent-ws` socket
 * is unavailable (e.g. serverless environments).
 */

import { apiClient } from '@/lib/api-client';
import type { AgentConversation, AgentMessage, AgentTurnResult } from '@/types/agent';

const CONVERSATIONS_TAKE = 30;

function toQuery(take: number): string {
  return take === CONVERSATIONS_TAKE ? '' : `?take=${encodeURIComponent(String(take))}`;
}

export async function listAgentConversations(
  take: number = CONVERSATIONS_TAKE,
): Promise<AgentConversation[]> {
  return apiClient.get<AgentConversation[]>(`/admin/agent/conversations${toQuery(take)}`);
}

export async function getAgentMessages(conversationId: number): Promise<AgentMessage[]> {
  return apiClient.get<AgentMessage[]>(`/admin/agent/conversations/${conversationId}/messages`);
}

export async function askAgentQuestion(input: {
  question: string;
  conversationId?: number | null;
  approvalId?: number | null;
}): Promise<AgentTurnResult> {
  const res = await apiClient.post<any>('/admin/agent/ask', input, { full: true });
  if (res && (res.answer !== undefined || res.ok !== undefined)) {
    return res as AgentTurnResult;
  }
  return (res?.data ?? res) as AgentTurnResult;
}

export async function decideAgentApproval(
  approvalId: number,
  approved: boolean,
): Promise<{ approvalId: number; status: 'APPROVED' | 'REJECTED' }> {
  return apiClient.post<{ approvalId: number; status: 'APPROVED' | 'REJECTED' }>(
    `/admin/agent/approvals/${approvalId}/decide`,
    { approved },
  );
}
