export type MessageRole = 'user' | 'assistant' | 'system'

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: 'running' | 'completed' | 'failed'
  result?: string
  error?: string
}

export interface PermissionRequest {
  id: string
  toolName: string
  description: string
  arguments: Record<string, unknown>
  state: 'pending' | 'approved' | 'rejected'
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  streaming?: boolean
  toolCalls?: ToolCall[]
  pendingPermission?: PermissionRequest
}

export interface SessionInfo {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChatAuth {
  username: string
  password?: string
}

export type OpenCodeEventType =
  | 'session.message.delta'
  | 'session.tool.start'
  | 'session.tool.finish'
  | 'session.permission.request'
  | 'session.status'

export interface OpenCodeEvent {
  type: OpenCodeEventType
  sessionId: string
  payload: Record<string, unknown>
}
