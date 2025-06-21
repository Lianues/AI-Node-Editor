
import { useMemo } from 'react';
import { WorkflowServices, NodeTypeDefinition, WorkflowState } from '../../types';

export interface UseWorkflowServicesInitializerProps {
  baseWorkflowServices: Omit<WorkflowServices, 'getNodeDefinition' | 'getGraphDefinition' | 'subworkflowHost'>;
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined;
  getGraphDefinition: (workflowId: string) => Promise<WorkflowState | null>;
}

export const useWorkflowServicesInitializer = ({
  baseWorkflowServices,
  getNodeDefinition,
  getGraphDefinition,
}: UseWorkflowServicesInitializerProps): WorkflowServices => {
  const workflowServices = useMemo<WorkflowServices>(() => ({
    ...baseWorkflowServices,
    getNodeDefinition,
    getGraphDefinition,
    // subworkflowHost will be added dynamically by WorkflowExecutionManager if needed for a subworkflow run
  }), [baseWorkflowServices, getNodeDefinition, getGraphDefinition]);

  return workflowServices;
};
