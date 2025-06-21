
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node as AppNode, NodeTypeDefinition, NodeExecutionState, PortDataType, NodePort as AppNodePort, GeminiFunctionDeclaration, NodePortConfig, RegisteredAiTool, AiServiceConfig } from '../../../../types'; // Added RegisteredAiTool
import { vscodeDarkTheme } from '../../../../theme/vscodeDark';
import { CustomHeaderColorInspector } from './CustomHeaderColorInspector';
import { CustomHeaderTextColorInspector } from './CustomHeaderTextColorInspector';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../../../nodes/SubworkflowOutput/Definition';
import { FINITE_CHOICE_NODE_TYPE_KEY } from '../../../../nodes/FiniteChoiceNode/Definition'; 
import { DATA_SPLIT_NODE_TYPE_KEY } from '../../../../nodes/DataSplitNode/Definition'; 
import { DATA_COMBINATION_NODE_TYPE_KEY } from '../../../../nodes/DataCombinationNode/Definition'; 
import { CUSTOM_UI_NODE_TYPE_KEY } from '../../../../nodes/CustomUiNode/Definition'; 
import { CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY } from '../../../../nodes/CustomDataProcessingNode/Definition'; 
import { DATA_SYNCHRONIZATION_NODE_TYPE_KEY } from '../../../../nodes/DataSynchronizationNode/Definition'; // Import new node type
import { ArrowDownTrayIcon } from '../../../../components/icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from '../../../../components/icons/ArrowUpTrayIcon';
import { ChevronDownIcon } from '../../../../components/icons/ChevronDownIcon';
import { ChevronRightIcon } from '../../../../components/icons/ChevronRightIcon';
import { DiamondIcon } from '../../../../components/icons/DiamondIcon';
import { PlusIcon } from '../../../../components/icons/PlusIcon';
import { ToolCircleIcon } from '../../../../components/icons/ToolCircleIcon';
import { AVAILABLE_AI_TOOLS } from '../../../ai/tools/availableAiTools';
import { PREDEFINED_MODEL_CONFIG_GROUPS, DEFAULT_ENV_GEMINI_CONFIG_ID, ModelConfigGroup } from '../../../../globalModelConfigs';
import { useContextMenu } from '../../../../components/ContextMenu/useContextMenu';
import { ContextMenu } from '../../../../components/ContextMenu/ContextMenu';
import { ContextMenuItem } from '../../../../components/ContextMenu/contextMenuTypes';


interface BaseNodeInspectorProps {
  node: AppNode;
  updateNodeData?: (nodeId: string, data: Record<string, any>) => void;
  nodeDefinition: NodeTypeDefinition;
  executionDetails?: NodeExecutionState['executionDetails'] | null;
  children?: React.ReactNode;
  customTools?: RegisteredAiTool[]; 
}

interface EditablePortState extends AppNodePort {
  originalId: string; 
  isChoiceOptionUIState?: boolean; 
  sourceJsonPortLabelUIState?: string; 
  isAlwaysActiveUIState?: boolean; // Added for flow input "always active" UI state
}

const getTypeSpecificBadgeStyles = (dataType: PortDataType): { bgClass: string; textClass: string } => {
  const themePorts = vscodeDarkTheme.ports.dataTypeColors;
  const defaultLightText = 'text-slate-100';
  const defaultDarkText = 'text-zinc-900';

  let bgClass = themePorts[PortDataType.UNKNOWN]?.output.bg || 'bg-gray-500';
  let textClass = defaultLightText;

  const typeColors = themePorts[dataType]?.output; 
  if (typeColors) {
    bgClass = typeColors.bg;
    switch (dataType) {
      case PortDataType.FLOW: 
      case PortDataType.AI_CONFIG: 
      case PortDataType.DATA_COLLECTION: 
        textClass = defaultDarkText;
        break;
      default:
        textClass = defaultLightText;
        break;
    }
  }
  return { bgClass, textClass };
};

const generateUniquePortLabel = (existingPorts: AppNodePort[], baseLabel: string): string => {
  let counter = 1;
  let newLabel = `${baseLabel} ${counter}`;
  while (existingPorts.some(p => p.label === newLabel)) {
    counter++;
    newLabel = `${baseLabel} ${counter}`;
  }
  return newLabel;
};


export const BaseNodeInspector: React.FC<BaseNodeInspectorProps> = ({
  node,
  updateNodeData,
  nodeDefinition,
  executionDetails,
  children,
  customTools, 
}) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const buttonTheme = vscodeDarkTheme.topBar;
  const [editableTitle, setEditableTitle] = useState(node.title);

  const [editableInputPorts, setEditableInputPorts] = useState<EditablePortState[]>(
    () => node.inputs.map(p => ({ 
      ...p, 
      originalId: p.id,
      isDataRequiredOnConnection: p.isDataRequiredOnConnection === undefined ? true : p.isDataRequiredOnConnection,
      isAlwaysActiveUIState: p.dataType === PortDataType.FLOW ? (node.data?.portConfigs?.[p.id]?.isAlwaysActive ?? false) : undefined,
    }))
  );
  const [editableOutputPorts, setEditableOutputPorts] = useState<EditablePortState[]>(
    () => node.outputs.map(p => ({ 
      ...p, 
      originalId: p.id,
      isDataRequiredOnConnection: p.isDataRequiredOnConnection === undefined ? true : p.isDataRequiredOnConnection,
      isChoiceOptionUIState: node.type === FINITE_CHOICE_NODE_TYPE_KEY 
        ? (node.data?.portConfigs?.[p.id]?.isChoiceOption ?? false)
        : undefined,
      sourceJsonPortLabelUIState: node.type === DATA_SPLIT_NODE_TYPE_KEY
        ? (node.data?.portConfigs?.[p.id]?.sourceJsonPortLabel ?? '')
        : undefined,
    }))
  );
  const [expandedPortIds, setExpandedPortIds] = useState<Record<string, boolean>>({});
  const [portIdValidationMessages, setPortIdValidationMessages] = useState<Record<string, string | null>>({});

  const [draggingPortInfo, setDraggingPortInfo] = useState<{ id: string; type: 'inputs' | 'outputs'; originalIndex: number } | null>(null);
  const [dropTargetPortInfo, setDropTargetPortInfo] = useState<{ id: string; type: 'inputs' | 'outputs'; position: 'before' | 'after' } | null>(null);

  const { menuConfig: portMenuConfig, openContextMenu: openPortContextMenu, closeContextMenu: closePortContextMenu } = useContextMenu();


  const allToolsForDropdown = useMemo(() => {
    return [...AVAILABLE_AI_TOOLS, ...(customTools || [])];
  }, [customTools]);

  const isCustomAiNode = node.type.startsWith('custom_ai_node_');
  const initialCustomAiConfig = node.data?.customAiConfig || {};
  const [customAiModelGroupId, setCustomAiModelGroupId] = useState(initialCustomAiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID);
  const [customAiModel, setCustomAiModel] = useState(initialCustomAiConfig.model || "gemini-2.5-flash-preview-04-17");
  const [customAiDefaultPrompt, setCustomAiDefaultPrompt] = useState(initialCustomAiConfig.defaultPrompt || '');
  const [customAiSystemInstruction, setCustomAiSystemInstruction] = useState(initialCustomAiConfig.systemInstruction || '你是一个乐于助人的助手。');
  const [customAiTemperature, setCustomAiTemperature] = useState<string | number>(initialCustomAiConfig.temperature ?? 0.7);
  const [customAiTopP, setCustomAiTopP] = useState<string | number>(initialCustomAiConfig.topP ?? 0.9);
  const [customAiTopK, setCustomAiTopK] = useState<string | number>(initialCustomAiConfig.topK ?? 40);
  const [customAiThinkingBudget, setCustomAiThinkingBudget] = useState<string | number>(initialCustomAiConfig.thinkingConfig?.thinkingBudget ?? '');
  const [customAiIncludeThoughts, setCustomAiIncludeThoughts] = useState<boolean>(initialCustomAiConfig.thinkingConfig?.includeThoughts ?? false);


  useEffect(() => {
    setEditableTitle(node.title);
    setEditableInputPorts(prevEditable => node.inputs.map(p => {
      const existingEditable = prevEditable.find(ep => ep.originalId === p.id);
      const initialIsAlwaysActiveUIState = p.dataType === PortDataType.FLOW 
        ? (node.data?.portConfigs?.[p.id]?.isAlwaysActive ?? false)
        : undefined;
      return { 
        ...(existingEditable || { ...p, originalId: p.id, isDataRequiredOnConnection: p.isDataRequiredOnConnection === undefined ? true : p.isDataRequiredOnConnection, isAlwaysActiveUIState: initialIsAlwaysActiveUIState }), 
        ...p, 
        originalId: p.id, 
        isDataRequiredOnConnection: p.isDataRequiredOnConnection === undefined ? true : p.isDataRequiredOnConnection,
        isAlwaysActiveUIState: initialIsAlwaysActiveUIState,
      };
    }));
    setEditableOutputPorts(prevEditable => node.outputs.map(p => {
      const existingEditable = prevEditable.find(ep => ep.originalId === p.id);
      const initialChoiceOptionUIState = node.type === FINITE_CHOICE_NODE_TYPE_KEY
        ? (node.data?.portConfigs?.[p.id]?.isChoiceOption ?? false)
        : undefined;
      const initialSourceJsonPortLabelUIState = node.type === DATA_SPLIT_NODE_TYPE_KEY
        ? (node.data?.portConfigs?.[p.id]?.sourceJsonPortLabel ?? '')
        : undefined;
      return { 
        ...(existingEditable || { 
            ...p, 
            originalId: p.id,
            isDataRequiredOnConnection: p.isDataRequiredOnConnection === undefined ? true : p.isDataRequiredOnConnection,
            isChoiceOptionUIState: initialChoiceOptionUIState, 
            sourceJsonPortLabelUIState: initialSourceJsonPortLabelUIState 
        }), 
        ...p, 
        originalId: p.id,
        isDataRequiredOnConnection: p.isDataRequiredOnConnection === undefined ? true : p.isDataRequiredOnConnection,
        isChoiceOptionUIState: initialChoiceOptionUIState,
        sourceJsonPortLabelUIState: initialSourceJsonPortLabelUIState,
      };
    }));
    setPortIdValidationMessages({});

    if (isCustomAiNode) {
      const config = node.data?.customAiConfig || {};
      setCustomAiModelGroupId(config.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID);
      setCustomAiModel(config.model || PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === (config.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID))?.defaultModel || "gemini-2.5-flash-preview-04-17");
      setCustomAiDefaultPrompt(config.defaultPrompt || '');
      setCustomAiSystemInstruction(config.systemInstruction || '你是一个乐于助人的助手。');
      setCustomAiTemperature(config.temperature ?? 0.7);
      setCustomAiTopP(config.topP ?? 0.9);
      setCustomAiTopK(config.topK ?? 40);
      setCustomAiThinkingBudget(config.thinkingConfig?.thinkingBudget ?? '');
      setCustomAiIncludeThoughts(config.thinkingConfig?.includeThoughts ?? false);
    }

  }, [node.title, node.id, node.inputs, node.outputs, node.data?.customAiConfig, node.data?.portConfigs, node.type, isCustomAiNode]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditableTitle(event.target.value);
  };

  const handleTitleBlur = () => {
    if (updateNodeData && node.title !== editableTitle.trim()) {
      updateNodeData(node.id, { title: editableTitle.trim() || nodeDefinition.defaultTitle });
    } else if (updateNodeData && !editableTitle.trim() && node.title !== nodeDefinition.defaultTitle) {
      updateNodeData(node.id, { title: nodeDefinition.defaultTitle });
      setEditableTitle(nodeDefinition.defaultTitle);
    }
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleTitleBlur();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setEditableTitle(node.title);
      event.currentTarget.blur();
    }
  };

  const handleTogglePortExpansion = (portOriginalId: string) => {
    setExpandedPortIds(prev => ({
      ...Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>),
      [portOriginalId]: !prev[portOriginalId],
    }));
  };

  const isPortIdUnique = useCallback((newIdCandidate: string, editingPortOriginalId: string, portType: 'inputs' | 'outputs'): boolean => {
    const allPortsOfSameType = portType === 'inputs' ? editableInputPorts : editableOutputPorts;
    return !allPortsOfSameType.some(p => p.originalId !== editingPortOriginalId && p.id === newIdCandidate.trim());
  }, [editableInputPorts, editableOutputPorts]);

  const handlePortPropertyChange = (
    portOriginalId: string,
    portType: 'inputs' | 'outputs',
    field: keyof EditablePortState | 'useTool' | 'toolName' | 'isChoiceOptionUIState' | 'sourceJsonPortLabelUIState' | 'isDataRequiredOnConnection' | 'isAlwaysActiveUIState',
    value: any
  ) => {
    if (field === 'useTool' || field === 'toolName') {
      if (updateNodeData && portType === 'outputs') { 
        const currentPortToolConfigAll = { ...(node.data?.portToolConfig || {}) };
        const portSpecificConfig = { ...(currentPortToolConfigAll[portOriginalId] || {}) };

        if (field === 'useTool') {
          portSpecificConfig.useTool = value as boolean;
          if (!portSpecificConfig.useTool) {
            delete portSpecificConfig.toolName; 
          } else if (!portSpecificConfig.toolName && allToolsForDropdown.length > 0) {
            portSpecificConfig.toolName = allToolsForDropdown[0].declaration.name;
          }
        } else if (field === 'toolName') {
          portSpecificConfig.toolName = value as string;
        }
        currentPortToolConfigAll[portOriginalId] = portSpecificConfig;
        updateNodeData(node.id, { ...node.data, portToolConfig: currentPortToolConfigAll });
      }
      return;
    }
    
    const portListUpdater = portType === 'inputs' ? setEditableInputPorts : setEditableOutputPorts;
    let portModifiedInUpdater = false;

    portListUpdater(prevPorts => {
      const newPorts = prevPorts.map(p => {
        if (p.originalId === portOriginalId) {
          portModifiedInUpdater = true;
          let updatedPort = { ...p };

          if (field === 'isChoiceOptionUIState' && node.type === FINITE_CHOICE_NODE_TYPE_KEY && portType === 'outputs') {
            updatedPort.isChoiceOptionUIState = value as boolean;
            if (updatedPort.isChoiceOptionUIState) {
              updatedPort.dataType = PortDataType.FLOW;
              updatedPort.isPortRequired = true;
              updatedPort.isDataRequiredOnConnection = true; 
            } else {
              updatedPort.dataType = PortDataType.ANY; 
              updatedPort.isPortRequired = false;
              updatedPort.isDataRequiredOnConnection = true; 
            }
          } else if (field === 'isAlwaysActiveUIState' && portType === 'inputs' && updatedPort.dataType === PortDataType.FLOW) {
            updatedPort.isAlwaysActiveUIState = value as boolean;
            // No direct changes to other port props like dataType/isRequired based on this for now
          } else if (field === 'sourceJsonPortLabelUIState' && node.type === DATA_SPLIT_NODE_TYPE_KEY && portType === 'outputs') {
            updatedPort.sourceJsonPortLabelUIState = String(value);
          } else if (field === 'isPortRequired') {
            updatedPort.isPortRequired = value as boolean;
            if (updatedPort.isPortRequired && updatedPort.dataType !== PortDataType.FLOW) {
                updatedPort.isDataRequiredOnConnection = true;
            }
          } else if (field === 'isDataRequiredOnConnection') {
            if (!updatedPort.isPortRequired && updatedPort.dataType !== PortDataType.FLOW) {
                updatedPort.isDataRequiredOnConnection = value as boolean;
            }
          } else if (field === 'dataType') {
            updatedPort.dataType = value as PortDataType;
            if (updatedPort.dataType === PortDataType.FLOW) {
                updatedPort.isDataRequiredOnConnection = true;
                // If changing to FLOW, isAlwaysActive might become relevant.
                // If changing FROM FLOW, ensure isAlwaysActiveUIState is reset.
                if (updatedPort.dataType !== PortDataType.FLOW) {
                  updatedPort.isAlwaysActiveUIState = undefined;
                }
            }
          } else if (field === 'id') {
            updatedPort = { ...updatedPort, id: String(value) }; // Keep as string for local state
            const trimmedNewId = String(value).trim();
            if (!trimmedNewId) {
              setPortIdValidationMessages(prev => ({ ...prev, [portOriginalId]: "ID 不能为空。" }));
            } else if (!isPortIdUnique(trimmedNewId, portOriginalId, portType)) {
              setPortIdValidationMessages(prev => ({ ...prev, [portOriginalId]: "此 ID 已存在。" }));
            } else {
              setPortIdValidationMessages(prev => ({ ...prev, [portOriginalId]: null }));
            }
          } else { // label or other fields
            updatedPort = { ...updatedPort, [field]: value };
          }
          
          // Centralized Shape determination logic
          const finalDataType = updatedPort.dataType;
          const finalIsPortRequired = !!updatedPort.isPortRequired;
          // Default isDataRequiredOnConnection to true if undefined
          const finalIsDataRequiredOnConnection = updatedPort.isDataRequiredOnConnection === undefined ? true : updatedPort.isDataRequiredOnConnection;

          if (finalDataType === PortDataType.FLOW) {
            updatedPort.shape = finalIsPortRequired ? 'diamond' : 'circle';
          } else { // Data ports
            if (finalIsPortRequired) { // Must connect, must have data
              updatedPort.shape = 'diamond';
            } else { // Optional connection
              if (finalIsDataRequiredOnConnection) { // Optional connect, but if connected, data is required
                updatedPort.shape = 'circle';
              } else { // Optional connect, and if connected, data is also optional (can be undefined)
                updatedPort.shape = 'square';
              }
            }
          }
          return updatedPort;
        }
        return p;
      });

      // --- Immediate Update Logic for isPortRequired or isDataRequiredOnConnection or isAlwaysActiveUIState ---
      if (portModifiedInUpdater && updateNodeData && (field === 'isPortRequired' || field === 'isDataRequiredOnConnection' || field === 'isAlwaysActiveUIState')) {
        const originalNodePorts = portType === 'inputs' ? node.inputs : node.outputs;
        
        const finalNewPortsArrayForUpdate = newPorts
          .map(({originalId, isChoiceOptionUIState: choiceUIState, sourceJsonPortLabelUIState: srcJsonLabel, isAlwaysActiveUIState: alwaysActive, ...rest}) => rest as AppNodePort);

        let dataPayloadForUpdate: Record<string, any> = { [portType]: finalNewPortsArrayForUpdate };
        
        // Handle portConfigs update for isAlwaysActive
        if (field === 'isAlwaysActiveUIState' && portType === 'inputs') {
          let portConfigsForNodeData = { ...(node.data?.portConfigs || {}) };
          const portToUpdateFromState = newPorts.find(p => p.originalId === portOriginalId);
          if (portToUpdateFromState) {
            const portIdToUseForConfig = portToUpdateFromState.id;
            const currentPortConfig = portConfigsForNodeData[portIdToUseForConfig] || {};
            const newIsAlwaysActive = portToUpdateFromState.isAlwaysActiveUIState ?? false;
            if (currentPortConfig.isAlwaysActive !== newIsAlwaysActive) {
              portConfigsForNodeData[portIdToUseForConfig] = { ...currentPortConfig, isAlwaysActive: newIsAlwaysActive };
              dataPayloadForUpdate.portConfigs = portConfigsForNodeData;
            }
            if (!newIsAlwaysActive && portConfigsForNodeData[portIdToUseForConfig] && Object.keys(portConfigsForNodeData[portIdToUseForConfig]).length === 1 && portConfigsForNodeData[portIdToUseForConfig].hasOwnProperty('isAlwaysActive')) {
               delete portConfigsForNodeData[portIdToUseForConfig];
               if (Object.keys(portConfigsForNodeData).length === 0) delete dataPayloadForUpdate.portConfigs;
               else dataPayloadForUpdate.portConfigs = portConfigsForNodeData;
            }
          }
        }


        const needsNodeUpdate = JSON.stringify(originalNodePorts) !== JSON.stringify(finalNewPortsArrayForUpdate) ||
                                (dataPayloadForUpdate.portConfigs && JSON.stringify(node.data?.portConfigs || {}) !== JSON.stringify(dataPayloadForUpdate.portConfigs));

        if (needsNodeUpdate) {
          updateNodeData(node.id, dataPayloadForUpdate);
        }
      }
      // --- End of Immediate Update Logic ---
      return newPorts;
    });
  };


  const handlePortUpdateConfirm = (portOriginalId: string, portType: 'inputs' | 'outputs') => {
    if (!updateNodeData) return;

    const currentEditablePorts = portType === 'inputs' ? editableInputPorts : editableOutputPorts;
    const originalNodePorts = portType === 'inputs' ? node.inputs : node.outputs;

    let updatedPortFromState = currentEditablePorts.find(p => p.originalId === portOriginalId);
    if (!updatedPortFromState) return;

    const trimmedId = updatedPortFromState.id.trim();
    let finalIdToSave = trimmedId;
    let idWasReverted = false;

    if (!trimmedId) {
      finalIdToSave = portOriginalId; 
      idWasReverted = true;
      setPortIdValidationMessages(prev => ({ ...prev, [portOriginalId]: "ID 不能为空，已恢复为原始ID。" }));
    } else if (!isPortIdUnique(trimmedId, portOriginalId, portType)) {
      finalIdToSave = portOriginalId; 
      idWasReverted = true;
      setPortIdValidationMessages(prev => ({ ...prev, [portOriginalId]: "此 ID 已存在，已恢复为原始ID。" }));
    } else {
      setPortIdValidationMessages(prev => ({ ...prev, [portOriginalId]: null }));
    }
    
    if (idWasReverted) {
      const portListUpdater = portType === 'inputs' ? setEditableInputPorts : setEditableOutputPorts;
      portListUpdater(prevPorts =>
        prevPorts.map(p => (p.originalId === portOriginalId ? { ...p, id: finalIdToSave } : p))
      );
      // Re-fetch the port from state as its 'id' might have been reverted
      updatedPortFromState = (portType === 'inputs' ? editableInputPorts : editableOutputPorts).find(p => p.originalId === portOriginalId);
      if (!updatedPortFromState) return; // Should not happen
    }


    const { originalId: oId, isChoiceOptionUIState, sourceJsonPortLabelUIState, isAlwaysActiveUIState, ...portToSaveBase } = updatedPortFromState;
    const portToSave: AppNodePort = { ...portToSaveBase, id: finalIdToSave }; // Ensure finalIdToSave is used

    const finalNewPortsArray = (portType === 'inputs' ? editableInputPorts : editableOutputPorts)
      .map(p => {
          if (p.originalId === portOriginalId) return portToSave; // Use the potentially ID-reverted port
          const {originalId, isChoiceOptionUIState: choiceUIState, sourceJsonPortLabelUIState: srcJsonLabel, isAlwaysActiveUIState: alwaysActive, ...rest} = p;
          return rest as AppNodePort;
      });


    let dataPayload: Record<string, any> = { [portType]: finalNewPortsArray };
    let needsUpdate = JSON.stringify(originalNodePorts) !== JSON.stringify(finalNewPortsArray);


    let portConfigsForNodeData = { ...(node.data?.portConfigs || {}) };
    let portConfigChanged = false;

    const currentEditablePortsForConfig = portType === 'inputs' ? editableInputPorts : editableOutputPorts;
    currentEditablePortsForConfig.forEach(editablePort => {
        const portIdToUseForConfig = editablePort.id; // Use the current ID (which might have been edited and validated/reverted)
        
        if (node.type === FINITE_CHOICE_NODE_TYPE_KEY && portType === 'outputs') {
          const currentPortConfig = portConfigsForNodeData[portIdToUseForConfig] || {};
          const newIsChoiceOptionForData = editablePort.isChoiceOptionUIState ?? currentPortConfig.isChoiceOption ?? false;
          if (currentPortConfig.isChoiceOption !== newIsChoiceOptionForData) {
            portConfigsForNodeData[portIdToUseForConfig] = { ...currentPortConfig, isChoiceOption: newIsChoiceOptionForData };
            portConfigChanged = true;
          }
          // Clean up if no longer a choice option and no other configs exist for this port
          if (!newIsChoiceOptionForData && portConfigsForNodeData[portIdToUseForConfig] && Object.keys(portConfigsForNodeData[portIdToUseForConfig]).length === 1 && portConfigsForNodeData[portIdToUseForConfig].hasOwnProperty('isChoiceOption')) {
             delete portConfigsForNodeData[portIdToUseForConfig];
             portConfigChanged = true;
          }
        }
        if (node.type === DATA_SPLIT_NODE_TYPE_KEY && portType === 'outputs') {
          const currentPortConfig = portConfigsForNodeData[portIdToUseForConfig] || {};
          const newSourceJsonPortLabel = editablePort.sourceJsonPortLabelUIState === undefined ? currentPortConfig.sourceJsonPortLabel : editablePort.sourceJsonPortLabelUIState.trim();
          
          if (currentPortConfig.sourceJsonPortLabel !== newSourceJsonPortLabel) {
            portConfigsForNodeData[portIdToUseForConfig] = { ...currentPortConfig, sourceJsonPortLabel: newSourceJsonPortLabel || undefined };
            portConfigChanged = true;
          }
           // Clean up if label is empty and no other configs exist
          if ((newSourceJsonPortLabel === undefined || newSourceJsonPortLabel === '') && portConfigsForNodeData[portIdToUseForConfig] && Object.keys(portConfigsForNodeData[portIdToUseForConfig]).length === 1 && portConfigsForNodeData[portIdToUseForConfig].hasOwnProperty('sourceJsonPortLabel')) {
             delete portConfigsForNodeData[portIdToUseForConfig];
             portConfigChanged = true;
          }
        }
        // Handle isAlwaysActive for flow input ports
        if (portType === 'inputs' && editablePort.dataType === PortDataType.FLOW) {
          const currentPortConfig = portConfigsForNodeData[portIdToUseForConfig] || {};
          const newIsAlwaysActiveForData = editablePort.isAlwaysActiveUIState ?? currentPortConfig.isAlwaysActive ?? false;
          if (currentPortConfig.isAlwaysActive !== newIsAlwaysActiveForData) {
            portConfigsForNodeData[portIdToUseForConfig] = { ...currentPortConfig, isAlwaysActive: newIsAlwaysActiveForData };
            portConfigChanged = true;
          }
          if (!newIsAlwaysActiveForData && portConfigsForNodeData[portIdToUseForConfig] && Object.keys(portConfigsForNodeData[portIdToUseForConfig]).length === 1 && portConfigsForNodeData[portIdToUseForConfig].hasOwnProperty('isAlwaysActive')) {
             delete portConfigsForNodeData[portIdToUseForConfig];
             portConfigChanged = true;
          }
        }
    });
    
    if (Object.keys(portConfigsForNodeData).length === 0 && node.data?.portConfigs && Object.keys(node.data.portConfigs).length > 0) {
      // If all port configs were removed, explicitly set portConfigs to undefined in payload to remove it from node.data
      dataPayload.portConfigs = undefined; 
      portConfigChanged = true; // Ensure update happens if this was the only change
    } else if (Object.keys(portConfigsForNodeData).length > 0) {
       dataPayload.portConfigs = portConfigsForNodeData;
    }


    if (portConfigChanged) needsUpdate = true;


    if (needsUpdate) {
      updateNodeData(node.id, dataPayload);
    }
  };

  const handlePortInputKeyDown = (event: React.KeyboardEvent, portOriginalId: string, portType: 'inputs' | 'outputs') => {
    if (event.key === 'Enter') {
      handlePortUpdateConfirm(portOriginalId, portType);
      (event.target as HTMLElement).blur();
    } else if (event.key === 'Escape') {
      const originalPortList = portType === 'inputs' ? node.inputs : node.outputs;
      const originalPort = originalPortList.find(p => p.id === portOriginalId); 
      if (originalPort) {
        const portListUpdater = portType === 'inputs' ? setEditableInputPorts : setEditableOutputPorts;
        const currentChoiceState = portType === 'outputs' && node.type === FINITE_CHOICE_NODE_TYPE_KEY 
          ? node.data?.portConfigs?.[portOriginalId]?.isChoiceOption ?? false 
          : undefined;
        const currentSourceJsonLabel = portType === 'outputs' && node.type === DATA_SPLIT_NODE_TYPE_KEY
          ? node.data?.portConfigs?.[portOriginalId]?.sourceJsonPortLabel ?? ''
          : undefined;
        const currentIsAlwaysActive = portType === 'inputs' && originalPort.dataType === PortDataType.FLOW
          ? node.data?.portConfigs?.[portOriginalId]?.isAlwaysActive ?? false
          : undefined;

        portListUpdater(prevPorts => prevPorts.map(p => 
          p.originalId === portOriginalId 
            ? { ...originalPort, originalId: portOriginalId, isChoiceOptionUIState: currentChoiceState, sourceJsonPortLabelUIState: currentSourceJsonLabel, isAlwaysActiveUIState: currentIsAlwaysActive, isDataRequiredOnConnection: originalPort.isDataRequiredOnConnection === undefined ? true : originalPort.isDataRequiredOnConnection } 
            : p
        ));
        setPortIdValidationMessages(prev => ({ ...prev, [portOriginalId]: null }));
      }
      (event.target as HTMLElement).blur();
    }
  };

  const handlePortDragStart = (event: React.DragEvent<HTMLLIElement>, port: EditablePortState, type: 'inputs' | 'outputs', index: number) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ id: port.originalId, type, originalIndex: index }));
    event.dataTransfer.effectAllowed = 'move';
    setDraggingPortInfo({ id: port.originalId, type, originalIndex: index });
    setExpandedPortIds({});
  };

  const handlePortDragOver = (event: React.DragEvent<HTMLLIElement>, targetPort: EditablePortState, targetType: 'inputs' | 'outputs') => {
    event.preventDefault();
    if (!draggingPortInfo || draggingPortInfo.type !== targetType || draggingPortInfo.id === targetPort.originalId) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetPortInfo && dropTargetPortInfo.id !== targetPort.originalId) setDropTargetPortInfo(null);
      return;
    }
    event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = event.clientY < midY ? 'before' : 'after';
    if (!dropTargetPortInfo || dropTargetPortInfo.id !== targetPort.originalId || dropTargetPortInfo.position !== position) {
      setDropTargetPortInfo({ id: targetPort.originalId, type: targetType, position });
    }
  };

  const handlePortDragLeave = (event: React.DragEvent<HTMLLIElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) {
      setDropTargetPortInfo(null);
    }
  };

  const handlePortDrop = (event: React.DragEvent<HTMLLIElement>, targetPort: EditablePortState, targetType: 'inputs' | 'outputs') => {
    event.preventDefault();
    if (!draggingPortInfo || !dropTargetPortInfo || draggingPortInfo.type !== targetType || dropTargetPortInfo.type !== targetType || draggingPortInfo.id === targetPort.originalId) {
      setDraggingPortInfo(null);
      setDropTargetPortInfo(null);
      return;
    }

    const currentPorts = targetType === 'inputs' ? [...editableInputPorts] : [...editableOutputPorts];

    const draggedItem = currentPorts.find(p => p.originalId === draggingPortInfo!.id);
    if (!draggedItem) {
      setDraggingPortInfo(null);
      setDropTargetPortInfo(null);
      return;
    }

    const filteredPorts = currentPorts.filter(p => p.originalId !== draggingPortInfo!.id);
    let targetIndex = filteredPorts.findIndex(p => p.originalId === targetPort.originalId);

    if (targetIndex === -1) {
      targetIndex = filteredPorts.length;
    } else {
      if (dropTargetPortInfo.position === 'after') {
        targetIndex += 1;
      }
    }

    filteredPorts.splice(targetIndex, 0, draggedItem);

    if (updateNodeData) {
      const portsToSave = filteredPorts.map(({ originalId, isChoiceOptionUIState, sourceJsonPortLabelUIState, isAlwaysActiveUIState, ...rest }) => rest as AppNodePort);
      let dataPayload: Record<string, any> = { [targetType]: portsToSave };
      updateNodeData(node.id, dataPayload);
    }

    setDraggingPortInfo(null);
    setDropTargetPortInfo(null);
  };

  const handlePortDragEnd = () => {
    setDraggingPortInfo(null);
    setDropTargetPortInfo(null);
  };

  const handleAddPort = (portType: 'inputs' | 'outputs') => {
    if (!updateNodeData || isSubWorkflowInterfaceNode) return;
    if (node.type === DATA_COMBINATION_NODE_TYPE_KEY && portType !== 'inputs') return;
    if (node.type === DATA_SPLIT_NODE_TYPE_KEY && portType !== 'outputs') return;
    if (node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY && portType !== 'inputs') return; // Only allow adding inputs for sync node


    const newPortId = `port_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existingPortsForNameCheck = portType === 'inputs' ? node.inputs : node.outputs;
    const newPortLabel = generateUniquePortLabel(existingPortsForNameCheck, "新端口");

    const newPort: AppNodePort = {
      id: newPortId,
      label: newPortLabel,
      dataType: PortDataType.ANY,
      shape: 'circle', 
      isPortRequired: false,
      isDataRequiredOnConnection: true, 
    };
    // For Data Synchronization Node, ensure new input ports are "data required if connected"
    if (node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY && portType === 'inputs') {
      newPort.isDataRequiredOnConnection = true;
    }


    const currentPorts = portType === 'inputs' ? node.inputs : node.outputs;
    const updatedPorts = [newPort, ...currentPorts]; 

    let dataPayload: Record<string, any> = { [portType]: updatedPorts };

    if (node.type === FINITE_CHOICE_NODE_TYPE_KEY && portType === 'outputs') {
      const newPortConfigs = { 
        ...(node.data?.portConfigs || {}), 
        [newPortId]: { isChoiceOption: false } 
      };
      dataPayload.portConfigs = newPortConfigs;
    }
    if (node.type === DATA_SPLIT_NODE_TYPE_KEY && portType === 'outputs') {
        const newPortConfigs = {
            ...(node.data?.portConfigs || {}),
            [newPortId]: { sourceJsonPortLabel: '' } 
        };
        dataPayload.portConfigs = newPortConfigs;
    }
    // For Flow Input on any node (except subworkflow interfaces which are read-only here)
    if (portType === 'inputs' && newPort.dataType === PortDataType.FLOW) {
        const newPortConfigs = {
            ...(node.data?.portConfigs || {}),
            [newPortId]: { isAlwaysActive: false } // Default to not always active
        };
        dataPayload.portConfigs = newPortConfigs;
    }
    
    updateNodeData(node.id, dataPayload);

    setExpandedPortIds(prev => ({
      ...Object.keys(prev).reduce((acc, key) => { acc[key] = false; return acc; }, {} as Record<string, boolean>),
      [newPortId]: true, 
    }));
    setPortIdValidationMessages(prev => ({ ...prev, [newPortId]: null }));
  };

  const handleDeletePort = useCallback((portOriginalId: string, portType: 'inputs' | 'outputs') => {
    if (!updateNodeData) return;

    const portListUpdater = portType === 'inputs' ? setEditableInputPorts : setEditableOutputPorts;
    let portEffectiveIdToDelete: string | undefined;

    portListUpdater(prevPorts => {
      const portToDelete = prevPorts.find(p => p.originalId === portOriginalId);
      portEffectiveIdToDelete = portToDelete?.id;
      return prevPorts.filter(p => p.originalId !== portOriginalId);
    });

    const finalPortsArray = (portType === 'inputs' ? editableInputPorts : editableOutputPorts)
      .filter(p => p.originalId !== portOriginalId) // Ensure the port is removed from the array being saved
      .map(({ originalId, isChoiceOptionUIState, sourceJsonPortLabelUIState, isAlwaysActiveUIState, ...rest }) => rest as AppNodePort);

    const dataPayload: Record<string, any> = { [portType]: finalPortsArray };

    // Clean up portConfigs and portToolConfig
    let currentPortConfigs = { ...(node.data?.portConfigs || {}) };
    let currentPortToolConfig = { ...(node.data?.portToolConfig || {}) };
    let dataFieldsChanged = false;

    if (portEffectiveIdToDelete) {
      if (currentPortConfigs.hasOwnProperty(portEffectiveIdToDelete)) {
        delete currentPortConfigs[portEffectiveIdToDelete];
        dataFieldsChanged = true;
      }
      if (portType === 'outputs' && currentPortToolConfig.hasOwnProperty(portEffectiveIdToDelete)) {
        delete currentPortToolConfig[portEffectiveIdToDelete];
        dataFieldsChanged = true;
      }
    }
    
    if (dataFieldsChanged) {
      dataPayload.data = { ...node.data }; // Start with existing data
      if (Object.keys(currentPortConfigs).length > 0) {
        dataPayload.data.portConfigs = currentPortConfigs;
      } else {
        delete dataPayload.data.portConfigs; // Remove if empty
      }
      if (Object.keys(currentPortToolConfig).length > 0) {
        dataPayload.data.portToolConfig = currentPortToolConfig;
      } else {
        delete dataPayload.data.portToolConfig; // Remove if empty
      }
    } else if (Object.keys(dataPayload).length === 1 && dataPayload.hasOwnProperty(portType)) {
      // If only port array changed, and no data fields, ensure existing node.data isn't overwritten with undefined
      if(node.data) dataPayload.data = {...node.data};
    }


    updateNodeData(node.id, dataPayload);
    closePortContextMenu();
  }, [node.id, node.data, updateNodeData, editableInputPorts, editableOutputPorts, closePortContextMenu]);


  const handleCustomAiConfigUpdate = useCallback((field: string, value: any) => {
    if (!updateNodeData || !isCustomAiNode) return;
    
    const currentCustomAiConfig = JSON.parse(JSON.stringify(node.data?.customAiConfig || {})) as AiServiceConfig & { model?: string, aiModelConfigGroupId?: string };
    currentCustomAiConfig.thinkingConfig = currentCustomAiConfig.thinkingConfig || {};
    
    if (field === 'aiModelConfigGroupId') {
      currentCustomAiConfig.aiModelConfigGroupId = value;
      const selectedGroup = PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === value);
      if (selectedGroup) {
        currentCustomAiConfig.model = selectedGroup.defaultModel;
        setCustomAiModel(selectedGroup.defaultModel); 
      }
    } else if (field === 'model') {
      currentCustomAiConfig.model = value;
    } else if (field === 'thinkingBudget') {
      currentCustomAiConfig.thinkingConfig.thinkingBudget = value === '' ? undefined : Number(value);
    } else if (field === 'includeThoughts') {
      currentCustomAiConfig.thinkingConfig.includeThoughts = value as boolean;
    } else {
      (currentCustomAiConfig as any)[field] = value;
    }
    
    updateNodeData(node.id, { ...node.data, customAiConfig: currentCustomAiConfig });
  }, [node.id, node.data, isCustomAiNode, updateNodeData]);


  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  const valueClass = `text-sm ${inspectorTheme.valueText} break-all`;
  const mutedValueClass = `text-sm ${inspectorTheme.valueTextMuted} break-all`;
  const sectionSeparatorClass = `my-3 py-3 border-t border-b border-zinc-700`;
  const portDetailLabelClass = `text-xs ${inspectorTheme.labelText}`;
  const portDetailValueClass = `text-xs ${inspectorTheme.valueTextMuted}`;
  const portEditableInputClass = `w-full text-xs px-1 py-0.5 ${inspectorTheme.valueText} bg-zinc-600 border border-zinc-500 rounded focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none`;
  const portEditableSelectClass = `${portEditableInputClass} appearance-none pr-7`;
  const checkboxClass = `h-3.5 w-3.5 rounded border-zinc-500 text-sky-400 focus:ring-sky-400 bg-zinc-600`;
  const validationMessageClass = `text-xs text-red-400 mt-0.5`;

  const lastExecCtxId = executionDetails?.lastExecutionContextId;
  const availablePortDataTypes = Object.values(PortDataType).filter(type => type !== PortDataType.UNKNOWN);
  const isSubWorkflowInterfaceNode = node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY || node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY;
  
  // Specific conditions for DataSynchronizationNode
  const isDataSynchronizationNode = node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY;

  const canManageInputs = !isSubWorkflowInterfaceNode && (node.type !== DATA_SPLIT_NODE_TYPE_KEY); 
  const canManageOutputs = !isSubWorkflowInterfaceNode && 
                           (node.type !== DATA_COMBINATION_NODE_TYPE_KEY) &&
                           !isDataSynchronizationNode; // Outputs are derived for DataSynchronizationNode

  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  const renderPortItem = (port: EditablePortState, type: 'inputs' | 'outputs', index: number) => {
    const isPortReadOnly = isSubWorkflowInterfaceNode || 
                           (node.type === DATA_SPLIT_NODE_TYPE_KEY && type === 'inputs') ||
                           (node.type === DATA_COMBINATION_NODE_TYPE_KEY && type === 'outputs') ||
                           (isDataSynchronizationNode && type === 'outputs' && port.id.startsWith('data_out_')); // Read-only for derived outputs
    const isExpanded = !!expandedPortIds[port.originalId];
    const PortIcon = type === 'inputs' ? ArrowDownTrayIcon : ArrowUpTrayIcon;
    const ChevronIcon = isExpanded ? ChevronDownIcon : ChevronRightIcon;
    const { bgClass: badgeBgClass, textClass: badgeTextClass } = getTypeSpecificBadgeStyles(port.dataType);
    const portDisplayName = port.label;
    
    let effectivePortShape = port.shape;
    if (port.dataType === PortDataType.FLOW) {
        effectivePortShape = port.isPortRequired ? 'diamond' : 'circle';
    } else {
        if (port.isPortRequired) {
            effectivePortShape = 'diamond';
        } else {
            effectivePortShape = (port.isDataRequiredOnConnection === undefined || port.isDataRequiredOnConnection) ? 'circle' : 'square';
        }
    }
    const showDiamondIcon = effectivePortShape === 'diamond';

    const isBeingDragged = draggingPortInfo?.id === port.originalId && draggingPortInfo?.type === type;
    let dropIndicatorClass = '';
    if (dropTargetPortInfo?.id === port.originalId && dropTargetPortInfo?.type === type) {
      dropIndicatorClass = dropTargetPortInfo.position === 'before' ? `border-t-2 ${panelTheme.categoryDropIndicatorBorder}` : `border-b-2 ${panelTheme.categoryDropIndicatorBorder}`;
    }
    const listItemClasses = `bg-zinc-700 rounded-md relative ${isBeingDragged ? 'opacity-50' : ''} ${dropIndicatorClass}`;
    const validationMessage = portIdValidationMessages[port.originalId];

    const portToolConfig = node.data?.portToolConfig?.[port.originalId] || {};
    const useToolChecked = !!portToolConfig.useTool;
    const currentToolName = portToolConfig.toolName;
    const selectedToolDef = allToolsForDropdown.find(t => t.declaration.name === currentToolName)?.declaration;

    const isChoiceOptionActive = node.type === FINITE_CHOICE_NODE_TYPE_KEY && type === 'outputs' && !!port.isChoiceOptionUIState;
    const isDataSplitOutputPort = node.type === DATA_SPLIT_NODE_TYPE_KEY && type === 'outputs';
    const dataRequiredDisabled = isPortReadOnly || !updateNodeData || port.dataType === PortDataType.FLOW || !!port.isPortRequired;
    
    const isDeletionDisabled = (isDataSynchronizationNode && type === 'outputs' && port.dataType !== PortDataType.FLOW) || false; // Can't delete derived data outputs

    const portContextMenuHandler = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (isPortReadOnly || !updateNodeData) return;

      const items: ContextMenuItem[] = [
        {
          id: `delete-port-${port.originalId}`,
          label: '删除端口',
          onClick: () => handleDeletePort(port.originalId, type),
          disabled: isDeletionDisabled, 
        },
      ];
      openPortContextMenu(event, items);
    };


    return (
      <li
        key={port.originalId}
        className={listItemClasses}
        draggable={!isPortReadOnly && !!updateNodeData}
        onDragStart={(e) => !isPortReadOnly && updateNodeData && handlePortDragStart(e, port, type, index)}
        onDragOver={(e) => !isPortReadOnly && updateNodeData && handlePortDragOver(e, port, type)}
        onDragLeave={(e) => !isPortReadOnly && updateNodeData && handlePortDragLeave(e)}
        onDrop={(e) => !isPortReadOnly && updateNodeData && handlePortDrop(e, port, type)}
        onDragEnd={() => !isPortReadOnly && updateNodeData && handlePortDragEnd()}
        style={{ cursor: (!isPortReadOnly && !!updateNodeData && draggingPortInfo) ? 'grabbing' : (!isPortReadOnly && !!updateNodeData ? 'grab' : 'default') }}
        onContextMenu={portContextMenuHandler}
      >
        <div
          className={`flex items-center p-2 cursor-pointer hover:bg-zinc-600 rounded-t-md ${isExpanded ? 'bg-zinc-600 rounded-b-none' : 'rounded-b-md'}`}
          onClick={() => handleTogglePortExpansion(port.originalId)}
          title={isPortReadOnly ? "此端口属性由节点特定设置管理" : `${portDisplayName} (${port.dataType}) - 点击${isExpanded ? '收起' : '展开'}编辑${(!isPortReadOnly && !!updateNodeData) ? '，可拖拽排序或右键删除' : ''}`}
        >
          <ChevronIcon className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${inspectorTheme.labelText}`} />
          <PortIcon className={`w-4 h-4 mr-1.5 shrink-0 ${inspectorTheme.labelText}`} />
          <span className="flex-grow truncate text-sm font-medium">{portDisplayName}</span>
          {showDiamondIcon && <DiamondIcon className={`w-3 h-3 shrink-0 ${inspectorTheme.labelText} text-sky-400 mr-1.5`} iconTitle="此端口为必需端口"/>}
          {type === 'outputs' && useToolChecked && (
             <ToolCircleIcon className={`w-3 h-3 shrink-0 ${inspectorTheme.labelText} text-teal-400 mr-1.5`} iconTitle="此端口配置为调用AI工具"/>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${badgeBgClass} ${badgeTextClass} opacity-90`}>
            {port.dataType.charAt(0).toUpperCase() + port.dataType.slice(1)}
          </span>
        </div>

        {isExpanded && (
          <div className="p-2 border-t border-zinc-600 space-y-2 relative">
            {isPortReadOnly && (
              <div className="absolute inset-0 bg-zinc-700 bg-opacity-60 z-10 flex items-center justify-center cursor-not-allowed rounded-b-md" title="此端口属性由节点特定设置管理">
                <span className="text-xs text-zinc-300 bg-zinc-800 px-2 py-1 rounded shadow">特定于节点</span>
              </div>
            )}
            {node.type === FINITE_CHOICE_NODE_TYPE_KEY && type === 'outputs' && updateNodeData && (
              <div className="flex items-center">
                <input
                  id={`port-isChoiceOption-${port.originalId}`}
                  type="checkbox"
                  className={`${checkboxClass} mr-2`}
                  checked={!!port.isChoiceOptionUIState}
                  onChange={(e) => handlePortPropertyChange(port.originalId, type, 'isChoiceOptionUIState', e.target.checked)}
                  onBlur={() => handlePortUpdateConfirm(port.originalId, type)} 
                  onMouseDown={stopPropagationMouseDown}
                  disabled={isPortReadOnly || !updateNodeData}
                />
                <label htmlFor={`port-isChoiceOption-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>
                  用作AI选项
                </label>
              </div>
            )}
            {isDataSplitOutputPort && (
                <div>
                    <label htmlFor={`port-sourceJsonLabel-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>源JSON集合项标签:</label>
                    <input
                        id={`port-sourceJsonLabel-${port.originalId}`}
                        type="text"
                        value={port.sourceJsonPortLabelUIState || ''}
                        onChange={(e) => handlePortPropertyChange(port.originalId, type, 'sourceJsonPortLabelUIState', e.target.value)}
                        onBlur={() => handlePortUpdateConfirm(port.originalId, type)}
                        onKeyDown={(e) => handlePortInputKeyDown(e, port.originalId, type)}
                        onMouseDown={stopPropagationMouseDown}
                        className={portEditableInputClass}
                        placeholder="输入源JSON项的标签"
                        disabled={isPortReadOnly || !updateNodeData}
                    />
                </div>
            )}
            {type === 'inputs' && port.dataType === PortDataType.FLOW && updateNodeData && (
              <div className="flex items-center">
                <input
                  id={`port-isAlwaysActive-${port.originalId}`}
                  type="checkbox"
                  className={`${checkboxClass} mr-2`}
                  checked={port.isAlwaysActiveUIState ?? false}
                  onChange={(e) => handlePortPropertyChange(port.originalId, type, 'isAlwaysActiveUIState', e.target.checked)}
                  // onBlur for this one is handled by onChange directly calling updateNodeData
                  onMouseDown={stopPropagationMouseDown}
                  disabled={isPortReadOnly || !updateNodeData}
                />
                <label htmlFor={`port-isAlwaysActive-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>
                  始终激活
                </label>
              </div>
            )}
            <div>
              <label htmlFor={`port-id-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>ID:</label>
              <input
                id={`port-id-${port.originalId}`}
                type="text"
                value={port.id}
                onChange={(e) => handlePortPropertyChange(port.originalId, type, 'id', e.target.value)}
                onBlur={() => handlePortUpdateConfirm(port.originalId, type)}
                onKeyDown={(e) => handlePortInputKeyDown(e, port.originalId, type)}
                onMouseDown={stopPropagationMouseDown}
                className={`${portEditableInputClass} ${validationMessage ? 'border-red-500' : ''}`}
                disabled={isPortReadOnly || !updateNodeData}
                aria-describedby={validationMessage ? `port-id-validation-${port.originalId}` : undefined}
              />
              {validationMessage && <p id={`port-id-validation-${port.originalId}`} className={validationMessageClass} role="alert">{validationMessage}</p>}
            </div>
            <div>
              <label htmlFor={`port-label-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>标签:</label>
              <input
                id={`port-label-${port.originalId}`}
                type="text"
                value={port.label}
                onChange={(e) => handlePortPropertyChange(port.originalId, type, 'label', e.target.value)}
                onBlur={() => handlePortUpdateConfirm(port.originalId, type)}
                onKeyDown={(e) => handlePortInputKeyDown(e, port.originalId, type)}
                onMouseDown={stopPropagationMouseDown}
                className={portEditableInputClass}
                disabled={isPortReadOnly || !updateNodeData}
              />
            </div>
            <div>
              <label htmlFor={`port-datatype-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>数据类型:</label>
              <div className="relative w-full">
                <select
                  id={`port-datatype-${port.originalId}`}
                  value={port.dataType} 
                  onChange={(e) => handlePortPropertyChange(port.originalId, type, 'dataType', e.target.value as PortDataType)}
                  onBlur={() => handlePortUpdateConfirm(port.originalId, type)}
                  onKeyDown={(e) => handlePortInputKeyDown(e, port.originalId, type)}
                  onMouseDown={stopPropagationMouseDown}
                  className={portEditableSelectClass}
                  disabled={isPortReadOnly || !updateNodeData || isChoiceOptionActive || (type === 'inputs' && port.dataType === PortDataType.FLOW && port.isAlwaysActiveUIState)} // Disable if always active for flow inputs
                >
                  {availablePortDataTypes.map(dt => {
                    const displayLabel = dt.length > 0 ? dt.charAt(0).toUpperCase() + dt.substring(1) : dt;
                    return (<option key={dt} value={dt}>{displayLabel}</option>);
                  })}
                </select>
                <ChevronDownIcon className="absolute top-1/2 right-2 transform -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center">
               <input
                id={`port-required-${port.originalId}`}
                type="checkbox"
                checked={!!port.isPortRequired}
                onChange={(e) => handlePortPropertyChange(port.originalId, type, 'isPortRequired', e.target.checked)}
                onBlur={() => handlePortUpdateConfirm(port.originalId, type)}
                onMouseDown={stopPropagationMouseDown}
                className={`${checkboxClass} mr-2`} 
                disabled={isPortReadOnly || !updateNodeData || isChoiceOptionActive}
              />
              <label htmlFor={`port-required-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>
                是否必须连接
              </label>
            </div>
            {port.dataType !== PortDataType.FLOW && (
                <div className="flex items-center">
                    <input
                        id={`port-data-required-${port.originalId}`}
                        type="checkbox"
                        checked={port.isPortRequired || (port.isDataRequiredOnConnection === undefined ? true : port.isDataRequiredOnConnection)}
                        onChange={(e) => handlePortPropertyChange(port.originalId, type, 'isDataRequiredOnConnection', e.target.checked)}
                        onBlur={() => handlePortUpdateConfirm(port.originalId, type)}
                        onMouseDown={stopPropagationMouseDown}
                        className={`${checkboxClass} mr-2`}
                        disabled={dataRequiredDisabled || isChoiceOptionActive}
                    />
                    <label htmlFor={`port-data-required-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>
                        连接时是否必须有数据
                    </label>
                </div>
            )}


            {type === 'outputs' && !isPortReadOnly && updateNodeData && !isChoiceOptionActive && !isDataSplitOutputPort && (
              <div className="pt-2 mt-2 border-t border-zinc-600">
                <div className="flex items-center mb-1.5">
                  <input
                    id={`port-use-tool-${port.originalId}`}
                    type="checkbox"
                    className={`${checkboxClass} mr-2`}
                    checked={useToolChecked}
                    onChange={(e) => handlePortPropertyChange(port.originalId, type, 'useTool', e.target.checked)}
                    onMouseDown={stopPropagationMouseDown}
                  />
                  <label htmlFor={`port-use-tool-${port.originalId}`} className={`${portDetailLabelClass} font-medium`}>
                    是否调用工具
                  </label>
                </div>
                {useToolChecked && (
                  <div className="pl-2 space-y-1">
                    <label className={portDetailLabelClass} htmlFor={`port-tool-select-${port.originalId}`}>
                      AI 工具:
                    </label>
                    <div className="relative">
                      <select
                        id={`port-tool-select-${port.originalId}`}
                        className={`${portEditableSelectClass} text-xs`}
                        value={currentToolName || (allToolsForDropdown.length > 0 ? allToolsForDropdown[0].declaration.name : "")}
                        onChange={(e) => handlePortPropertyChange(port.originalId, type, 'toolName', e.target.value)}
                        onMouseDown={stopPropagationMouseDown}
                        aria-label={`AI Tool for port ${port.label}`}
                      >
                        {allToolsForDropdown.map(toolRegEntry => (
                          <option key={toolRegEntry.declaration.name} value={toolRegEntry.declaration.name}>
                            {toolRegEntry.declaration.name}
                            {customTools?.some(ct => ct.declaration.name === toolRegEntry.declaration.name) ? " (自定义)" : ""}
                          </option>
                        ))}
                        {allToolsForDropdown.length === 0 && (
                          <option value="" disabled>无可用工具</option>
                        )}
                      </select>
                      <ChevronDownIcon className="absolute top-1/2 right-2 transform -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                    </div>
                    {selectedToolDef && (
                      <p className={`${portDetailValueClass} text-xs mt-0.5`} title={selectedToolDef.description}>
                        描述: {selectedToolDef.description.length > 60 ? selectedToolDef.description.substring(0, 57) + '...' : selectedToolDef.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isPortReadOnly && (port.id !== port.originalId || !isSubWorkflowInterfaceNode) && (
              <div className="pt-1 border-t border-zinc-600 mt-1.5">
                <span className={portDetailLabelClass}>原始ID (不可编辑):</span> <span className={portDetailValueClass}>{port.originalId}</span>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`node-main-title-${node.id}`} className={labelClass}>主标题</label>
        <input
          id={`node-main-title-${node.id}`}
          type="text"
          className={inputBaseClass}
          value={editableTitle}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          onMouseDown={stopPropagationMouseDown}
          aria-label="Node main title"
        />
      </div>

      {children && <div className="my-3 py-3 border-t border-b border-zinc-700">{children}</div>}
      
      {isCustomAiNode && updateNodeData && (
        <div className={sectionSeparatorClass}>
          <h3 className={`${labelClass} font-semibold mb-2`}>自定义 AI 配置</h3>
          <div className="space-y-3">
            <div>
              <label className={labelClass} htmlFor={`custom-ai-modelGroupId-${node.id}`}>模型配置组:</label>
              <div className="relative">
                <select
                  id={`custom-ai-modelGroupId-${node.id}`}
                  className={`${inputBaseClass} appearance-none pr-7`}
                  value={customAiModelGroupId}
                  onChange={(e) => {
                    const newGroupId = e.target.value;
                    setCustomAiModelGroupId(newGroupId);
                    handleCustomAiConfigUpdate('aiModelConfigGroupId', newGroupId);
                  }}
                  onMouseDown={stopPropagationMouseDown}
                >
                  {PREDEFINED_MODEL_CONFIG_GROUPS.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}{group.notes || ''}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute top-1/2 right-2 transform -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor={`custom-ai-model-${node.id}`}>AI 模型:</label>
              <input id={`custom-ai-model-${node.id}`} type="text" className={inputBaseClass} value={customAiModel} onChange={(e) => setCustomAiModel(e.target.value)} onBlur={() => handleCustomAiConfigUpdate('model', customAiModel)} onMouseDown={stopPropagationMouseDown}/>
            </div>
            <div>
              <label className={labelClass} htmlFor={`custom-ai-defaultPrompt-${node.id}`}>默认提示词:</label>
              <textarea
                id={`custom-ai-defaultPrompt-${node.id}`}
                className={`${inputBaseClass} min-h-[60px] resize-y`}
                value={customAiDefaultPrompt}
                onChange={(e) => setCustomAiDefaultPrompt(e.target.value)}
                onBlur={() => handleCustomAiConfigUpdate('defaultPrompt', customAiDefaultPrompt)}
                onMouseDown={stopPropagationMouseDown}
              />
            </div>
             <div>
              <label className={labelClass} htmlFor={`custom-ai-systemInstruction-${node.id}`}>系统指令:</label>
              <textarea
                id={`custom-ai-systemInstruction-${node.id}`}
                className={`${inputBaseClass} min-h-[60px] resize-y`}
                value={customAiSystemInstruction}
                onChange={(e) => setCustomAiSystemInstruction(e.target.value)}
                onBlur={() => handleCustomAiConfigUpdate('systemInstruction', customAiSystemInstruction)}
                onMouseDown={stopPropagationMouseDown}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass} htmlFor={`custom-ai-temperature-${node.id}`}>Temperature:</label><input id={`custom-ai-temperature-${node.id}`} type="number" step="0.01" className={inputBaseClass} value={customAiTemperature} onChange={(e) => setCustomAiTemperature(e.target.value)} onBlur={() => handleCustomAiConfigUpdate('temperature', parseFloat(String(customAiTemperature)))} onMouseDown={stopPropagationMouseDown}/></div>
              <div><label className={labelClass} htmlFor={`custom-ai-topP-${node.id}`}>Top P:</label><input id={`custom-ai-topP-${node.id}`} type="number" step="0.01" className={inputBaseClass} value={customAiTopP} onChange={(e) => setCustomAiTopP(e.target.value)} onBlur={() => handleCustomAiConfigUpdate('topP', parseFloat(String(customAiTopP)))} onMouseDown={stopPropagationMouseDown}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass} htmlFor={`custom-ai-topK-${node.id}`}>Top K:</label><input id={`custom-ai-topK-${node.id}`} type="number" step="1" className={inputBaseClass} value={customAiTopK} onChange={(e) => setCustomAiTopK(e.target.value)} onBlur={() => handleCustomAiConfigUpdate('topK', parseInt(String(customAiTopK), 10))} onMouseDown={stopPropagationMouseDown}/></div>
              <div><label className={labelClass} htmlFor={`custom-ai-thinkingBudget-${node.id}`}>思考预算 (ms):</label><input id={`custom-ai-thinkingBudget-${node.id}`} type="number" step="100" min="0" placeholder="0或留空禁用" className={inputBaseClass} value={customAiThinkingBudget} onChange={(e) => setCustomAiThinkingBudget(e.target.value)} onBlur={() => handleCustomAiConfigUpdate('thinkingBudget', customAiThinkingBudget === '' ? undefined : parseInt(String(customAiThinkingBudget), 10))} onMouseDown={stopPropagationMouseDown}/></div>
            </div>
            <div className="flex items-center"><input id={`custom-ai-includeThoughts-${node.id}`} type="checkbox" className={checkboxClass} checked={customAiIncludeThoughts} onChange={(e) => { setCustomAiIncludeThoughts(e.target.checked); handleCustomAiConfigUpdate('includeThoughts', e.target.checked);}} onMouseDown={stopPropagationMouseDown}/><label htmlFor={`custom-ai-includeThoughts-${node.id}`} className={`${labelClass} ml-2 mb-0`}>包含思考过程</label></div>
          </div>
        </div>
      )}

      {updateNodeData && (canManageInputs || canManageOutputs) && (
        <div className={sectionSeparatorClass}>
          <h3 className={`${labelClass} font-semibold mb-2`}>端口管理</h3>
          <div className="space-y-3">
            {canManageInputs && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`${labelClass} font-medium text-sky-400`}>输入端口 ({editableInputPorts.length})</h4>
                  <button onClick={() => handleAddPort('inputs')} className={`p-1 rounded-md ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${vscodeDarkTheme.icons.nodeListPlus} transition-colors`} title="添加输入端口" aria-label="添加输入端口">
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                {editableInputPorts.length > 0 ? (
                  <ul className="space-y-1.5 pl-1 max-h-60 overflow-y-auto">{editableInputPorts.map((p, index) => renderPortItem(p, 'inputs', index))}</ul>
                ) : (
                  <p className={`${mutedValueClass} text-xs italic pl-2`}>无输入端口</p>
                )}
              </div>
            )}
            {canManageOutputs && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`${labelClass} font-medium text-sky-400`}>输出端口 ({editableOutputPorts.filter(p => node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY ? p.dataType === PortDataType.FLOW : true).length})</h4>
                  {/* For DataSynchronizationNode, only allow adding FLOW output ports */}
                  {(node.type !== DATA_SYNCHRONIZATION_NODE_TYPE_KEY || (node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY /* && allowAddingFlowOutput */)) && (
                    <button 
                      onClick={() => handleAddPort('outputs')} 
                      className={`p-1 rounded-md ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${vscodeDarkTheme.icons.nodeListPlus} transition-colors`} 
                      title={node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY ? "添加流程输出端口" : "添加输出端口"} 
                      aria-label={node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY ? "添加流程输出端口" : "添加输出端口"}
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {editableOutputPorts.filter(p => node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY ? p.dataType === PortDataType.FLOW : true).length > 0 ? (
                  <ul className="space-y-1.5 pl-1 max-h-60 overflow-y-auto">
                    {editableOutputPorts
                      .filter(p => node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY ? p.dataType === PortDataType.FLOW : true)
                      .map((p, index) => renderPortItem(p, 'outputs', index))}
                  </ul>
                ) : (
                  <p className={`${mutedValueClass} text-xs italic pl-2`}>
                    {node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY ? "无自定义流程输出端口" : "无输出端口"}
                  </p>
                )}
                {node.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY && editableOutputPorts.some(p => p.dataType !== PortDataType.FLOW) && (
                  <p className={`${mutedValueClass} text-xs italic pl-2 mt-1`}>
                    (数据输出端口根据输入端口自动管理)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {updateNodeData && <CustomHeaderColorInspector node={node} updateNodeData={updateNodeData} />}
      {updateNodeData && <CustomHeaderTextColorInspector node={node} updateNodeData={updateNodeData} />}
      
      {lastExecCtxId && (
        <div className="pt-1 my-3 py-3 border-t border-b border-zinc-700">
          <label className={labelClass}>最后执行上下文ID</label>
          <p className={mutedValueClass} title={lastExecCtxId}>
            ...{lastExecCtxId.slice(-12)}
          </p>
        </div>
      )}

      {(updateNodeData || lastExecCtxId) && (
        <hr className={`border-t ${vscodeDarkTheme.contextMenu.separator} my-3`} />
      )}

      <div className="space-y-1 pt-2">
        {nodeDefinition.description && (
          <div>
            <label className={labelClass}>描述</label>
            <p className={mutedValueClass}>{nodeDefinition.description}</p>
          </div>
        )}
        <div>
          <label className={labelClass}>类型</label>
          <p className={valueClass}>{nodeDefinition.label} ({node.type})</p>
        </div>
        <div>
          <label className={labelClass}>ID</label>
          <p className={mutedValueClass}>{node.id}</p>
        </div>
        <div>
          <label className={labelClass}>位置</label>
          <p className={mutedValueClass}>X: {node.x.toFixed(0)}, Y: {node.y.toFixed(0)}</p>
        </div>
      </div>
      <ContextMenu menuConfig={portMenuConfig} onClose={closePortContextMenu} />
    </div>
  );
};

export default BaseNodeInspector;
