
import { CanvasSnapshot, NodeExecutionState, PortDataType } from '../../types'; 
import { DefinedArea } from '../areaDefinition/types/areaDefinitionTypes'; 

export enum HistoryActionType {
  ADD_NODE = 'ADD_NODE',
  DELETE_NODE = 'DELETE_NODE',
  DELETE_CONNECTION = 'DELETE_CONNECTION',
  COPY_NODE = 'COPY_NODE',
  CUT_NODE = 'CUT_NODE',
  PASTE_NODE = 'PASTE_NODE',
  ADD_CONNECTION = 'ADD_CONNECTION', 
  MOVE_NODE = 'MOVE_NODE',
  UPDATE_NODE_DATA = 'UPDATE_NODE_DATA',
  INITIAL_STATE = 'INITIAL_STATE', 

  // New types for multi-node operations
  MULTI_NODE_MOVE = 'MULTI_NODE_MOVE',
  MULTI_NODE_DELETE = 'MULTI_NODE_DELETE',
  MULTI_NODE_COPY = 'MULTI_NODE_COPY',
  MULTI_NODE_CUT = 'MULTI_NODE_CUT',
  MULTI_NODE_PASTE = 'MULTI_NODE_PASTE',
  MULTI_NODE_SELECT_MARQUEE = 'MULTI_NODE_SELECT_MARQUEE', 

  // Defined Area Actions
  ADD_DEFINED_AREA = 'ADD_DEFINED_AREA',
  DELETE_DEFINED_AREA = 'DELETE_DEFINED_AREA', 
  UPDATE_DEFINED_AREA = 'UPDATE_DEFINED_AREA', 

  // Node Group Actions
  CREATE_NODE_GROUP = 'CREATE_NODE_GROUP',
  PASTE_NODE_GROUP = 'PASTE_NODE_GROUP', // New

  // Program Interface Actions
  UPDATE_SUBWORKFLOW_INTERFACE_NAME = 'UPDATE_SUBWORKFLOW_INTERFACE_NAME', 
  UPDATE_SUBWORKFLOW_INTERFACE_DETAILS = 'UPDATE_SUBWORKFLOW_INTERFACE_DETAILS', 
  DELETE_LOGICAL_PROGRAM_INTERFACE_ITEM = 'DELETE_LOGICAL_PROGRAM_INTERFACE_ITEM',
  REORDER_LOGICAL_PROGRAM_INTERFACE_ITEM = 'REORDER_LOGICAL_PROGRAM_INTERFACE_ITEM', // New
}

export interface HistoryEntryNodeActionTarget {
  nodeId: string;         
  nodeType?: string;
  nodeTitle?: string;
  fromX?: number;         
  fromY?: number;         
  toX?: number;           
  toY?: number;           
  originalId?: string;    
  originalNodeType?: string; 
  originalNodeTitle?: string; 
}


export interface HistoryEntry {
  id: string;
  timestamp: number;
  actionType: HistoryActionType;
  description: string;
  details?: {
    // Single item fields
    nodeId?: string;
    nodeType?: string;
    nodeTitle?: string; 

    connectionId?: string;
    sourceNodeId?: string;
    sourcePortId?: string;
    sourceNodeTitle?: string; 
    targetNodeId?: string;
    targetPortId?: string;
    targetNodeTitle?: string; 

    originalNodeId?: string; 
    originalNodeTitle?: string; 
    originalNodeType?: string; 
    pastePositionX?: number; 
    pastePositionY?: number; 

    movedNodeId?: string;
    movedNodeTitle?: string;
    movedNodeType?: string;
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;

    // For UPDATE_NODE_DATA
    propertyKey?: string; // Also used for UPDATE_DEFINED_AREA
    oldValue?: any;     // Also used for UPDATE_DEFINED_AREA
    newValue?: any;     // Also used for UPDATE_DEFINED_AREA

    // --- Multi-item fields ---
    nodeActionTargets?: HistoryEntryNodeActionTarget[]; 
    count?: number; 
    
    // For MULTI_NODE_SELECT_MARQUEE
    selectedNodeIds?: string[]; 
    mode?: 'additive' | 'replace'; 
    
    // For Defined Area actions
    area?: DefinedArea; 
    areaId?: string; // Used for UPDATE_DEFINED_AREA as well
    deletedArea?: DefinedArea; 
    oldDefinedAreaValues?: Partial<Omit<DefinedArea, 'id'>>;
    newDefinedAreaValues?: Partial<Omit<DefinedArea, 'id'>>;

    // For Node Group actions
    nodeGroupId?: string;
    nodeGroupName?: string;
    nodeIdsInGroup?: string[]; // For CREATE_NODE_GROUP

    // For Program Interface actions
    interfaceType?: 'input' | 'output'; // Used by both name and details update
    interfaceName?: string; // Name of the interface being updated (for details update or logical delete)
    oldName?: string; // For name update
    newName?: string; // For name update
    dataType?: PortDataType; // Data type (for name update, details update, or logical delete)
    affectedNodeIds?: string[]; // Common for both name and details

    // For UPDATE_SUBWORKFLOW_INTERFACE_DETAILS
    updatedProperties?: { 
      dataType?: { old: PortDataType; new: PortDataType };
      isPortRequired?: { old: boolean; new: boolean };
    };
    
    // For REORDER_LOGICAL_PROGRAM_INTERFACE_ITEM
    itemId?: string;       // ID of the reordered item
    // interfaceName and interfaceType already exist and can be used for description
    oldIndex?: number;
    newIndex?: number;
  };
  snapshot: CanvasSnapshot; 
}