
import { PortDataType } from '../../../types'; // Import PortDataType enum

export interface SubWorkflowInputOutputDefinition {
  id: string; // Internal ID within the subworkflow (e.g., the SubworkflowInputNode/SubworkflowOutputNode ID itself)
  name: string; // User-friendly name displayed on the SubworkflowNode's port
  dataType: PortDataType; // Changed from string to PortDataType
  isRequired: boolean; // To determine port shape (diamond if true, circle if false) for data ports
  // Potentially add 'description' or other metadata later
}

export interface SubWorkflowItem {
  id: string; // Unique ID for the sub-workflow definition
  name: string;
  description?: string;
  // These will be derived from the SubworkflowInputNode and SubworkflowOutputNode instances within its dedicated tab
  inputs: SubWorkflowInputOutputDefinition[]; // Updated to use new definition type
  outputs: SubWorkflowInputOutputDefinition[]; // Updated to use new definition type
  // Metadata like createdAt, updatedAt can be added later
}