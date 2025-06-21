// Interfaces for workflow execution engines
import { PortDataCacheEntry, UpstreamSourceInfo } from './PropagationEngine'; // Assume these types will be exported from PropagationEngine

export interface InvocationRequest {
  nodeId: string;
  inputs: Record<string, any>; // The actual data values for the executor
  // Maps downstream input port ID to the specific source info (data or flow) that satisfied it for THIS invocation
  consumedSources: Map<string, PortDataCacheEntry | UpstreamSourceInfo>;
  executionContextId?: string; // Added for execution context tracking
}

export interface CheckNodeDependenciesResult {
  canExecute: boolean;
  inputs: Record<string, any> | null; // Inputs for the executor
  consumedSources?: Map<string, PortDataCacheEntry | UpstreamSourceInfo>; // Sources consumed for this potential invocation
  allSatisfiedInputPortIds?: string[]; // All port IDs that currently have data/signal (might be more than consumed if node is paused)
  missingDataInputPortIds?: string[];
  needsFlowSignal?: boolean;
  triggeringExecutionContextId?: string; // Added: The context ID derived from the inputs satisfying the check
}
