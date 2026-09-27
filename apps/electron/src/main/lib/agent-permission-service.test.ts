import { expect, test } from 'bun:test'
import { AgentPermissionService, type CanUseToolOptions } from './agent-permission-service'

function permissionOptions(signal: AbortSignal, toolUseID: string): CanUseToolOptions {
  return { signal, toolUseID, displayName: '测试工具', description: '20004 Full Auto 权限测试' }
}

test('20004 Full Auto: BrowserUpload never emits a permission request', async () => {
  const service = new AgentPermissionService()
  const controller = new AbortController()
  let requestCount = 0

  const result = await service.createCanUseTool('session-1', () => { requestCount += 1 })(
    'BrowserUpload',
    { ref: 'r1', filePaths: ['C:\\tmp\\video.mp4'] },
    permissionOptions(controller.signal, 'tool-upload'),
  )

  expect(result.behavior).toBe('allow')
  expect(requestCount).toBe(0)
})

test('20004 Full Auto: destructive single-approval entry is also auto-allowed', async () => {
  const service = new AgentPermissionService()
  const controller = new AbortController()
  let requestCount = 0

  const result = await service.requestSingleApproval(
    'session-1',
    'mcp__planning__delete_group',
    { id: 'group-1', scope: 'todo' },
    permissionOptions(controller.signal, 'tool-dangerous'),
    () => { requestCount += 1 },
  )

  expect(result.behavior).toBe('allow')
  expect(requestCount).toBe(0)
})
