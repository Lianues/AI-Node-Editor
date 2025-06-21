
import { Node, NodeTypeDefinition, NodeExecutionState, WorkflowServices, PortDataType, RegisteredAiTool } from '../../types'; 
import { Connection, ConnectionTimingInfo } from '../connections/types/connectionTypes'; 
import { START_NODE_TYPE_KEY } from '../../nodes/Start/Definition';
import { InvocationRequest, CheckNodeDependenciesResult } from './engine/executionEngineTypes';
import { executeNodeAtomically } from './engine/NodeExecutionEngine';
import { propagateOutputsAndPrepareConnectedNodeRequests, PortDataCacheEntry, UpstreamSourceInfo } from './engine/PropagationEngine'; 
import { UpstreamNodeVisualStateManager } from './engine/UpstreamNodeVisualStateManager';
import { checkAndPrepareSelfTriggerRequest } from './engine/NodeSelfTriggerEngine';
import { finalizeWorkflowNodeStates } from './engine/WorkflowFinalizationEngine'; 
import { ExecutionContextService } from './services/ExecutionContextService'; 
import { checkNodeDependencies } from './engine/DependencyEngine'; 

const TIMING_DISPLAY_DURATION_MS = 5000; // Display timing info for 5 seconds

export class WorkflowExecutionManager {
  private services: WorkflowServices;
  public portDataCache: Map<string, PortDataCacheEntry[]>; // Made public for SubWEM access
  public activeFlowSignals: Map<string, UpstreamSourceInfo[]>; // Made public for SubWEM access
  private upstreamVisualStateManager: UpstreamNodeVisualStateManager;
  public executionContextService: ExecutionContextService;  // Made public for SubWEM access
  private onConnectionUpdate?: (updatedConnection: Connection) => void; 
  private isTerminationRequested: boolean = false;

  // Node-level execution control
  private nodeExecutionInProgress = new Set<string>();
  private nodeSpecificInvocationQueues = new Map<string, InvocationRequest[]>();


  constructor(services: WorkflowServices) {
    this.services = services;
    this.portDataCache = new Map();
    this.activeFlowSignals = new Map();
    this.upstreamVisualStateManager = new UpstreamNodeVisualStateManager();
    this.executionContextService = new ExecutionContextService(); 
  }

  public requestTermination(): void {
    this.isTerminationRequested = true;
    console.log("[WEM] Termination requested.");
  }

  public initializeRun(
    getNodes: () => Node[], 
    getConnections: () => Connection[], 
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
    onConnectionUpdate?: (updatedConnection: Connection) => void 
  ) {
    this.isTerminationRequested = false; 
    this.portDataCache.clear();
    this.activeFlowSignals.clear();
    this.upstreamVisualStateManager.clearStates();
    this.onConnectionUpdate = onConnectionUpdate; 
    this.nodeExecutionInProgress.clear();
    this.nodeSpecificInvocationQueues.clear();

    const currentNodes = getNodes();
    currentNodes.forEach(node => {
      const existingDetails = node.executionState?.executionDetails;
      onNodeStateChange(node.id, {
        status: 'idle',
        executionDetails: { 
            ...(existingDetails || {}),
            lastExecutionContextId: undefined, 
        },
        satisfiedInputPortIds: undefined,
        missingInputs: undefined,
        needsFlowSignal: false,
        portSpecificErrors: undefined,
        error: undefined,
        activeExecutionContextId: undefined, 
      });
    });

    if (this.onConnectionUpdate) {
      const currentConnections = getConnections();
      currentConnections.forEach(conn => {
        if (conn.lastTimingInfo) {
          this.onConnectionUpdate!({ ...conn, lastTimingInfo: undefined });
        }
      });
    }
  }

  public clearAllNodeExecutionHighlights(
    nodes: Node[], 
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void
  ) {
    this.upstreamVisualStateManager.clearStates(); 

    nodes.forEach(node => {
      const existingDetails = node.executionState?.executionDetails;
      
      onNodeStateChange(node.id, {
        status: 'idle',
        error: undefined,
        warningMessage: undefined,
        missingInputs: undefined,
        needsFlowSignal: false,
        satisfiedInputPortIds: undefined,
        portSpecificErrors: undefined,
        executionDetails: existingDetails, 
        activeExecutionContextId: undefined, 
      });
    });
  }


  private _consumeInputsForInvocation(
    request: InvocationRequest, 
    getConnections: () => Connection[] 
  ): void {
    const { nodeId, consumedSources, executionContextId } = request;
    const logPrefix = `[WEM Node:${nodeId} Ctx:${executionContextId}]`;
    const consumptionTimestamp = Date.now();
    const currentConnections = getConnections();
    
    for (const [downstreamInputPortId, sourceInfo] of consumedSources.entries()) {
      const portKey = `${nodeId}-${downstreamInputPortId}`;

      this.upstreamVisualStateManager.notifySpecificLinkConsumption(
        sourceInfo.upstreamNodeId,
        sourceInfo.upstreamOutputPortId,
        nodeId, 
        downstreamInputPortId
      );

      if (this.onConnectionUpdate && 'sendTimestamp' in sourceInfo && typeof sourceInfo.sendTimestamp === 'number') {
        const originatingSendTimestamp = sourceInfo.sendTimestamp;
        const connectionToUpdate = currentConnections.find(c =>
          c.source.nodeId === sourceInfo.upstreamNodeId &&
          c.source.portId === sourceInfo.upstreamOutputPortId &&
          c.target.nodeId === nodeId && 
          c.target.portId === downstreamInputPortId
        );

        if (connectionToUpdate) {
          const timeToConsumption = consumptionTimestamp - originatingSendTimestamp;
          const updatedTimingInfo: ConnectionTimingInfo = {
            ...(connectionToUpdate.lastTimingInfo || {}), 
            consumptionTimestamp,
            timeToConsumption,
            displayUntil: Date.now() + TIMING_DISPLAY_DURATION_MS,
          };
          this.onConnectionUpdate({ ...connectionToUpdate, lastTimingInfo: updatedTimingInfo });
        }
      }

      const cacheToUpdate = ('value' in sourceInfo) ? this.portDataCache : this.activeFlowSignals;
      const entriesArray = cacheToUpdate.get(portKey) as Array<UpstreamSourceInfo | PortDataCacheEntry> | undefined;

      if (entriesArray) {
        const indexToRemove = entriesArray.findIndex(s =>
          s.upstreamNodeId === sourceInfo.upstreamNodeId && 
          s.upstreamOutputPortId === sourceInfo.upstreamOutputPortId &&
          s.executionContextId === sourceInfo.executionContextId 
        );
        if (indexToRemove > -1) {
          entriesArray.splice(indexToRemove, 1);
          if (entriesArray.length === 0) {
            cacheToUpdate.delete(portKey);
          }
        }
      }
    }
  }

  private async _orchestrateSingleNodeExecution(
    request: InvocationRequest,
    getNodes: () => Node[], 
    getConnections: () => Connection[], 
    getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
    onNodeDataChange: (nodeId: string, dataUpdates: Record<string, any>) => void, 
    completedOrErroredInThisRun: Set<string>,
    customTools?: RegisteredAiTool[] 
  ): Promise<{ outputs: Record<string, any> | null, dataUpdates?: Record<string, any>, sendTimestamp: number }> { 
    const nodeToExecuteInstance = getNodes().find(n => n.id === request.nodeId);
    const logPrefix = `[WEM._orchestrate Node:${request.nodeId}]`;
    const sendTimestamp = Date.now(); 
    let finalState: NodeExecutionState | undefined; 

    if (!nodeToExecuteInstance) {
      return { outputs: null, sendTimestamp };
    }
    
    const definition = getNodeDefinition(nodeToExecuteInstance.type);
    if (!definition) {
      const errorMsg = `Definition not found for node type: ${nodeToExecuteInstance.type}`;
      finalState = {
        status: 'error', error: errorMsg, 
        executionDetails: { lastRunError: errorMsg, lastExecutionContextId: request.executionContextId },
        activeExecutionContextId: undefined, 
      };
      onNodeStateChange(nodeToExecuteInstance.id, finalState);
      completedOrErroredInThisRun.add(nodeToExecuteInstance.id);
      return { outputs: null, sendTimestamp };
    }

    const previousDetails = nodeToExecuteInstance.executionState?.executionDetails;
    const runningState: NodeExecutionState = {
      status: 'running',
      executionDetails: previousDetails, 
      satisfiedInputPortIds: Array.from(request.consumedSources.keys()),
      activeExecutionContextId: request.executionContextId, 
    };
    onNodeStateChange(request.nodeId, runningState);

    this._consumeInputsForInvocation(request, getConnections); 

    let executionResult;
    try {
      executionResult = await executeNodeAtomically(
        nodeToExecuteInstance,
        definition,
        request.inputs,
        this.services,
        request.executionContextId,
        customTools 
      );
      
      if (executionResult.dataUpdates && Object.keys(executionResult.dataUpdates).length > 0) {
        onNodeDataChange(request.nodeId, executionResult.dataUpdates);
      }

      let finalStatus: NodeExecutionState['status'] = 'completed';
      let finalErrorMsg = executionResult.error;
      const portErrors = executionResult.executionDetails?.portSpecificErrors;

      if (finalErrorMsg) finalStatus = 'error';
      else if (portErrors && portErrors.length > 0) finalErrorMsg = "Node completed with port errors.";
      
      const mergedExecutionDetails: NodeExecutionState['executionDetails'] = {
          ...(previousDetails || {}), 
          ...(executionResult.executionDetails || {}), 
          lastExecutionContextId: request.executionContextId, 
          ...(finalErrorMsg && { lastRunError: finalErrorMsg }), 
      };

      finalState = {
        status: finalStatus, error: finalErrorMsg, executionDetails: mergedExecutionDetails,
        portSpecificErrors: portErrors, activeExecutionContextId: undefined, 
      };
    } catch (e: any) {
      const errorMsg = `Unhandled error during node execution: ${e.message || String(e)}`;
      finalState = {
        status: 'error', error: errorMsg,
        executionDetails: { lastRunError: errorMsg, lastExecutionContextId: request.executionContextId },
        activeExecutionContextId: undefined,
      };
      executionResult = { outputs: null, dataUpdates: undefined }; 
    } finally {
      const nodeAfterExec = getNodes().find(n => n.id === request.nodeId);
      if (this.isTerminationRequested && nodeAfterExec?.executionState?.status === 'running') {
         onNodeStateChange(request.nodeId, {
            status: 'paused',
            error: "运行已由用户终止。",
            executionDetails: nodeAfterExec.executionState.executionDetails,
            activeExecutionContextId: undefined,
        });
      } else if (finalState) { 
        onNodeStateChange(request.nodeId, finalState);
      }
      completedOrErroredInThisRun.add(request.nodeId);
    }
    
    if (finalState?.status === 'error' && !executionResult?.outputs) return { outputs: null, dataUpdates: executionResult?.dataUpdates, sendTimestamp };
    
    return { outputs: executionResult?.outputs || null, dataUpdates: executionResult?.dataUpdates, sendTimestamp };
  }

  // Making this public for SubworkflowExecutionService (or refactor WEM)
  public async _scheduleOrExecuteNodeRecursively(
    request: InvocationRequest,
    getNodes: () => Node[],
    getConnections: () => Connection[],
    getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
    onNodeDataChange: (nodeId: string, dataUpdates: Record<string, any>) => void,
    completedOrErroredInThisRun: Set<string>,
    customTools?: RegisteredAiTool[]
  ): Promise<void> {
    if (this.isTerminationRequested) {
      console.log(`[WEM] Termination requested, skipping schedule/execution of node: ${request.nodeId}`);
      return;
    }

    const { nodeId: nodeIdToExecute } = request;

    if (this.nodeExecutionInProgress.has(nodeIdToExecute)) {
      if (!this.nodeSpecificInvocationQueues.has(nodeIdToExecute)) {
        this.nodeSpecificInvocationQueues.set(nodeIdToExecute, []);
      }
      this.nodeSpecificInvocationQueues.get(nodeIdToExecute)!.push(request);
      return;
    }

    this.nodeExecutionInProgress.add(nodeIdToExecute);

    try {
      const nodeJustExecuted = getNodes().find(n => n.id === nodeIdToExecute);
      if (!nodeJustExecuted) return;

      const { outputs: executionOutputs, dataUpdates: nodeDataUpdates, sendTimestamp } = await this._orchestrateSingleNodeExecution(
        request, getNodes, getConnections, getNodeDefinition, onNodeStateChange,
        onNodeDataChange, completedOrErroredInThisRun, customTools
      );

      if (this.isTerminationRequested) {
        console.log(`[WEM] Termination requested after executing node: ${nodeIdToExecute}, skipping propagation.`);
        return;
      }

      if (executionOutputs && this.onConnectionUpdate) {
        const currentConnections = getConnections();
        for (const outputPortId in executionOutputs) {
          currentConnections.forEach(conn => {
            if (conn.source.nodeId === nodeJustExecuted.id && conn.source.portId === outputPortId) {
              const arrivalTimestamp = Date.now();
              const updatedTimingInfo: ConnectionTimingInfo = {
                ...(conn.lastTimingInfo || {}),
                sendTimestamp,
                arrivalTimestamp,
                timeToArrival: arrivalTimestamp - sendTimestamp,
                displayUntil: Date.now() + TIMING_DISPLAY_DURATION_MS,
              };
              this.onConnectionUpdate({ ...conn, lastTimingInfo: updatedTimingInfo });
            }
          });
        }
      }

      const nodeDef = getNodeDefinition(nodeJustExecuted.type);
      if (nodeDef) {
        const selfTriggerRequest = checkAndPrepareSelfTriggerRequest(
          nodeJustExecuted, nodeDef, getConnections, this.portDataCache,
          this.activeFlowSignals, request.executionContextId, 
          getNodes, getNodeDefinition 
        );
        if (selfTriggerRequest) {
          this._scheduleOrExecuteNodeRecursively(
            selfTriggerRequest, getNodes, getConnections, getNodeDefinition,
            onNodeStateChange, onNodeDataChange, completedOrErroredInThisRun, customTools
          ).catch(err => console.error(`[WEM] Error in self-trigger for ${nodeJustExecuted.id}: ${err}`));
        }
      }

      if (executionOutputs !== null) {
        const connectedNodeRequests = propagateOutputsAndPrepareConnectedNodeRequests(
          nodeJustExecuted, executionOutputs, sendTimestamp,
          getConnections, getNodes, getNodeDefinition, this.portDataCache,
          this.activeFlowSignals, onNodeStateChange,
          this.nodeExecutionInProgress, 
          this.upstreamVisualStateManager, request.executionContextId
        );
        await this._processBatchOfRequests(
            connectedNodeRequests, getNodes, getConnections, getNodeDefinition, 
            onNodeStateChange, onNodeDataChange, completedOrErroredInThisRun, customTools
        );
      }
    } catch (err) {
      const nodeInst = getNodes().find(n => n.id === nodeIdToExecute);
      if (nodeInst) {
        const errorMsg = `Unhandled error in execution chain for ${nodeIdToExecute}: ${err instanceof Error ? err.message : String(err)}`;
        onNodeStateChange(nodeIdToExecute, {
          status: 'error', error: errorMsg,
          executionDetails: { lastRunError: errorMsg, lastExecutionContextId: request.executionContextId },
          activeExecutionContextId: undefined,
        });
        completedOrErroredInThisRun.add(nodeIdToExecute);
      }
    } finally {
      this.nodeExecutionInProgress.delete(nodeIdToExecute);
      const queuedRequests = this.nodeSpecificInvocationQueues.get(nodeIdToExecute);
      if (queuedRequests && queuedRequests.length > 0) {
        const nextRequest = queuedRequests.shift()!;
        if (queuedRequests.length === 0) {
          this.nodeSpecificInvocationQueues.delete(nodeIdToExecute);
        }
        this._scheduleOrExecuteNodeRecursively(
          nextRequest, getNodes, getConnections, getNodeDefinition,
          onNodeStateChange, onNodeDataChange, completedOrErroredInThisRun, customTools
        ).catch(err => console.error(`[WEM] Error processing queued request for ${nodeIdToExecute}: ${err}`));
      }
    }
  }

  public getUpstreamNodeVisualStateManager(): UpstreamNodeVisualStateManager {
    return this.upstreamVisualStateManager;
  }

  public getQueuedDataForInputPort(downstreamNodeId: string, downstreamInputPortId: string): PortDataCacheEntry[] | undefined {
    const portKey = `${downstreamNodeId}-${downstreamInputPortId}`;
    return this.portDataCache.get(portKey);
  }

  public getQueuedFlowSignalsForInputPort(downstreamNodeId: string, downstreamInputPortId: string): UpstreamSourceInfo[] | undefined {
    const portKey = `${downstreamNodeId}-${downstreamInputPortId}`;
    return this.activeFlowSignals.get(portKey);
  }
  
  public propagateInitialOutputsAndPrepareRequests(
    sourceNode: Node,
    outputs: Record<string, any>,
    sendTimestamp: number, 
    getConnections: () => Connection[], 
    getNodes: () => Node[], 
    getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
    parentExecutionContextId?: string 
  ): InvocationRequest[] {
    
    const connectedNodeRequests = propagateOutputsAndPrepareConnectedNodeRequests( 
      sourceNode, outputs, sendTimestamp, getConnections, getNodes,
      getNodeDefinition, this.portDataCache, this.activeFlowSignals,
      onNodeStateChange, 
      this.nodeExecutionInProgress, 
      this.upstreamVisualStateManager, parentExecutionContextId
    );
    return connectedNodeRequests; 
  }

  // Making this public for SubworkflowExecutionService (or refactor WEM)
  public async _processBatchOfRequests(
    requestsToProcess: InvocationRequest[],
    getNodes: () => Node[], 
    getConnections: () => Connection[], 
    getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
    onNodeDataChange: (nodeId: string, dataUpdates: Record<string, any>) => void, 
    completedOrErroredInThisRun: Set<string>,
    customTools?: RegisteredAiTool[]
  ): Promise<void> {
    if (this.isTerminationRequested && requestsToProcess.length > 0) {
      console.log("[WEM] Termination requested, skipping batch processing.");
      return;
    }
    const executionPromises = requestsToProcess.map(request =>
      this._scheduleOrExecuteNodeRecursively( 
        request, getNodes, getConnections, getNodeDefinition, onNodeStateChange,
        onNodeDataChange, completedOrErroredInThisRun, customTools
      )
    );
    await Promise.all(executionPromises);
  }

  // Making this public for SubworkflowExecutionService (or refactor WEM)
  public finalizeWorkflowNodeStates(
    getNodes: () => Node[], 
    getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
    getConnections: () => Connection[], 
    portDataCache: Map<string, PortDataCacheEntry[]>,
    activeFlowSignals: Map<string, UpstreamSourceInfo[]>,
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
    completedOrErroredInThisRun: Set<string>
  ): void {
    finalizeWorkflowNodeStates(
        getNodes, getNodeDefinition, getConnections, portDataCache, 
        activeFlowSignals, onNodeStateChange, completedOrErroredInThisRun
    );
  }


  public async runWorkflow(
    getNodesFunction: () => Node[], 
    getConnectionsFunction: () => Connection[], 
    getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
    onNodeDataChange: (nodeId: string, dataUpdates: Record<string, any>) => void, 
    onConnectionUpdate: (updatedConnection: Connection) => void, 
    customTools?: RegisteredAiTool[] 
  ): Promise<void> {
    this.isTerminationRequested = false; 
    this.initializeRun(getNodesFunction, getConnectionsFunction, onNodeStateChange, onConnectionUpdate); 
    const completedOrErroredInThisRun = new Set<string>();
    const currentNodes = getNodesFunction(); 

    const startNodes = currentNodes.filter(node => node.type === START_NODE_TYPE_KEY);
    if (startNodes.length === 0) {
      currentNodes.forEach(n => {
        const errorState: NodeExecutionState = {
          status: 'error', error: "No StartNode found.", activeExecutionContextId: undefined,
          executionDetails: { lastRunError: "No StartNode found."}
        };
        onNodeStateChange(n.id, errorState);
      });
      return;
    }

    if (this.isTerminationRequested) { 
        console.log("[WEM] Workflow terminated during initialization.");
        this.finalizeWorkflowNodeStates(
            getNodesFunction, getNodeDefinition, getConnectionsFunction, this.portDataCache,
            this.activeFlowSignals, onNodeStateChange, completedOrErroredInThisRun
        );
        return;
    }

    const initialRequests: InvocationRequest[] = [];
    startNodes.forEach(startNode => {
      const currentExecutionContextId = this.executionContextService.generateContextId(startNode.id);
      initialRequests.push({
        nodeId: startNode.id, inputs: {}, consumedSources: new Map(),
        executionContextId: currentExecutionContextId,
      });
    });
    
    await this._processBatchOfRequests( 
        initialRequests, getNodesFunction, getConnectionsFunction, getNodeDefinition, onNodeStateChange,
        onNodeDataChange, completedOrErroredInThisRun, customTools
    );
        
    this.finalizeWorkflowNodeStates(
      getNodesFunction, getNodeDefinition, getConnectionsFunction, this.portDataCache, 
      this.activeFlowSignals, onNodeStateChange, completedOrErroredInThisRun
    );
  }

  public async triggerCustomNodeOutput(
    nodeId: string,
    portId: string,
    data: any,
    getNodes: () => Node[], 
    getConnections: () => Connection[], 
    getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
    onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
    onNodeDataChange: (nodeId: string, dataUpdates: Record<string, any>) => void,
    customTools?: RegisteredAiTool[]
  ): Promise<void> {
    if (this.isTerminationRequested) {
        console.log(`[WEM] Termination requested, skipping triggerCustomNodeOutput for ${nodeId}:${portId}`);
        return;
    }
    const nodeToTrigger = getNodes().find(n => n.id === nodeId);
    if (!nodeToTrigger) return;
    const nodeDefinition = getNodeDefinition(nodeToTrigger.type);
    if (!nodeDefinition) return;
    const outputPortDef = nodeToTrigger.outputs.find(p => p.id === portId);
    if (!outputPortDef) return;
    
    let dataForPropagation = data;
    if (outputPortDef.dataType === PortDataType.FLOW && typeof data === 'string') {
      try {
        const parsedData = JSON.parse(data);
        if (typeof parsedData === 'object' && parsedData !== null && parsedData.flowSignal === true) {
          dataForPropagation = parsedData; 
        }
      } catch (e) { /* Keep as string */ }
    }

    const eventContextId = this.executionContextService.generateContextId(nodeId + "_ui_event");
    const outputsMap = { [portId]: dataForPropagation };
    const sendTimestampForCustomOutput = Date.now(); 

    onNodeStateChange(nodeId, { status: 'running', activeExecutionContextId: eventContextId });
    onNodeDataChange(nodeId, {
      lastCustomUiOutput: { portId, data, timestamp: Date.now(), contextId: eventContextId },
      lastReceivedInputs: nodeToTrigger.data?.lastReceivedInputs,
    });

    if (this.onConnectionUpdate) {
        const currentConnections = getConnections(); 
        currentConnections.forEach(conn => {
            if (conn.source.nodeId === nodeId && conn.source.portId === portId) {
                const arrivalTimestamp = Date.now();
                const updatedTimingInfo: ConnectionTimingInfo = {
                    ...(conn.lastTimingInfo || {}),
                    sendTimestamp: sendTimestampForCustomOutput,
                    arrivalTimestamp,
                    timeToArrival: arrivalTimestamp - sendTimestampForCustomOutput,
                    displayUntil: Date.now() + TIMING_DISPLAY_DURATION_MS,
                };
                this.onConnectionUpdate({ ...conn, lastTimingInfo: updatedTimingInfo });
            }
        });
    }

    const connectedNodeRequests = this.propagateInitialOutputsAndPrepareRequests( 
      nodeToTrigger, outputsMap, sendTimestampForCustomOutput, 
      getConnections, getNodes, getNodeDefinition, 
      onNodeStateChange, eventContextId
    );

    const completedOrErroredForThisEvent = new Set<string>([nodeId]);
    await this._processBatchOfRequests( 
      connectedNodeRequests, getNodes, getConnections, getNodeDefinition, 
      onNodeStateChange, onNodeDataChange, completedOrErroredForThisEvent, customTools
    );

    onNodeStateChange(nodeId, { status: 'completed', activeExecutionContextId: undefined });
    this.finalizeWorkflowNodeStates(
      getNodes, getNodeDefinition, getConnections, this.portDataCache, 
      this.activeFlowSignals, onNodeStateChange, completedOrErroredForThisEvent
    );
  }
}
