
import { PortDataType } from '../../../types';
import { ConnectionPortIdentifier, Connection } from '../types/connectionTypes';

interface ValidationOptions {
  source: ConnectionPortIdentifier; // Port where drag started (can be input or output)
  target: ConnectionPortIdentifier; // Port where drag might end (can be input or output)
  existingConnections: Connection[];
}

/**
 * Checks if a potential connection is valid based on several rules.
 * Handles drags initiated from either an input or an output port.
 */
export const isValidConnection = ({
  source: dragSource,
  target: dragTarget,
  existingConnections,
}: ValidationOptions): boolean => {
  // 1. Rule: No self-connections (port to another port on the same node) - Rule REMOVED
  // if (dragSource.nodeId === dragTarget.nodeId) {
  //   // console.log("Validation Fail: Self-connection");
  //   return false;
  // }

  // 2. Rule: Valid port pairings (one output, one input)
  const isOutputToInput = dragSource.portSide === 'output' && dragTarget.portSide === 'input';
  const isInputToOutput = dragSource.portSide === 'input' && dragTarget.portSide === 'output';

  if (!isOutputToInput && !isInputToOutput) {
    // console.log(`Validation Fail: Connection must be between an Output and an Input port. Sides: ${dragSource.portSide} to ${dragTarget.portSide}`);
    return false;
  }

  // 3. Rule: Data type matching.
  const dS_isFlow = dragSource.dataType === PortDataType.FLOW;
  const dT_isFlow = dragTarget.dataType === PortDataType.FLOW;
  const dS_isAny = dragSource.dataType === PortDataType.ANY;
  const dT_isAny = dragTarget.dataType === PortDataType.ANY;

  if (dS_isFlow && dT_isFlow) {
    // FLOW to FLOW: OK
  } else if ((dS_isFlow && dT_isAny) || (dS_isAny && dT_isFlow)) {
    // FLOW to ANY (or ANY to FLOW): OK. This allows DataViewerNode's ANY port to connect to FLOW.
  } else if (dS_isFlow || dT_isFlow) {
    // One is FLOW, the other is NOT FLOW and NOT ANY: DISALLOW
    // console.log("Validation Fail: FLOW can only connect to FLOW or ANY.");
    return false;
  } else if (dS_isAny || dT_isAny) {
    // One is ANY (and neither is FLOW as per above checks): OK
    // This covers ANY to specific data type (non-FLOW) and ANY to ANY.
  } else {
    // Neither is FLOW, neither is ANY. So, specific data types must match.
    if (dragSource.dataType !== dragTarget.dataType) {
      // console.log(`Validation Fail: Data type mismatch (${dragSource.dataType} to ${dragTarget.dataType})`);
      return false;
    }
  }


  // 4. Rule: No duplicate connections.
  //    Determine what the normalized source (output-side) and target (input-side) would be.
  let normalizedSourcePort: ConnectionPortIdentifier;
  let normalizedTargetPort: ConnectionPortIdentifier;

  if (isOutputToInput) {
    normalizedSourcePort = dragSource;
    normalizedTargetPort = dragTarget;
  } else { // isInputToOutput
    normalizedSourcePort = dragTarget; // The output port drag ended on becomes the source
    normalizedTargetPort = dragSource; // The input port drag started from becomes the target
  }

  const isDuplicate = existingConnections.some(conn =>
    (conn.source.nodeId === normalizedSourcePort.nodeId && conn.source.portId === normalizedSourcePort.portId &&
     conn.target.nodeId === normalizedTargetPort.nodeId && conn.target.portId === normalizedTargetPort.portId)
  );
  if (isDuplicate) {
    // console.log("Validation Fail: Duplicate connection (checked against normalized form)");
    return false;
  }
  
  // All checks passed
  return true;
};
