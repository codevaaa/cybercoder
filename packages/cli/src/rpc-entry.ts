/**
 * Standalone entry point for the RPC server binary.
 * This is compiled separately from the interactive CLI (no Ink/React dependency)
 * so bun can compile it to a standalone binary without UI framework issues.
 */
import { startRpcServer } from './rpc-server.js'

startRpcServer()
