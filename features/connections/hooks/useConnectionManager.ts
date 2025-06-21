
import { useState, useCallback } from 'react';
import { Connection, ConnectionPortIdentifier, DraggingConnectionState } from '../types/connectionTypes';
import { isValidConnection } from '../validation/connectionValidation';
import { determineConnectionColor } from '../utils/connectionUtils'; 

interface UseConnectionManagerProps {
  onConnectionSelected: (connectionId: string | null) => void;
}

export interface SelectConnectionOptions {
  isContextMenu?: boolean;
}

export const useConnectionManager = ({ onConnectionSelected }: UseConnectionManagerProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [draggingConnection, setDraggingConnection] = useState<DraggingConnectionState | null>(null);

  const bringConnectionToTop = useCallback((connectionId: string) => {
    setConnections(prevConnections => {
      const itemIndex = prevConnections.findIndex(conn => conn.id === connectionId);
      if (itemIndex === -1 || itemIndex === prevConnections.length - 1) {
        return prevConnections; 
      }
      const item = prevConnections[itemIndex];
      const newItems = [
        ...prevConnections.slice(0, itemIndex),
        ...prevConnections.slice(itemIndex + 1),
        item,
      ];
      return newItems;
    });
  }, []);

  const completeConnection = useCallback((
    dragSource: ConnectionPortIdentifier,
    dragTarget: ConnectionPortIdentifier
  ): Connection | null => {
    let finalSource: ConnectionPortIdentifier;
    let finalTarget: ConnectionPortIdentifier;

    if (dragSource.portSide === 'input') {
      finalSource = dragTarget;
      finalTarget = dragSource;
    } else {
      finalSource = dragSource;
      finalTarget = dragTarget;
    }

    const connectionsForValidation = connections;

    const isNewConnectionValid = isValidConnection({
        source: finalSource,
        target: finalTarget,
        existingConnections: connectionsForValidation
    });

    if (isNewConnectionValid) {
      const color = determineConnectionColor(finalSource.dataType, finalTarget.dataType);
      const newConnection: Connection = {
        id: `conn_${finalSource.nodeId}:${finalSource.portId}_to_${finalTarget.nodeId}:${finalTarget.portId}_${Date.now()}`,
        source: finalSource,
        target: finalTarget,
        color: color,
        // lastTimingInfo: undefined, // Initially no timing info
      };
      setConnections(prevConnections => [...prevConnections, newConnection]);
      return newConnection;
    } else {
      return null;
    }
  }, [connections]);

  const selectConnection = useCallback((connectionId: string | null, options?: SelectConnectionOptions) => {
    const isContextMenu = options?.isContextMenu || false;
    const newSelectedId = (isContextMenu && connectionId)
      ? connectionId
      : (selectedConnectionId === connectionId ? null : connectionId);

    if (selectedConnectionId !== newSelectedId) {
      setSelectedConnectionId(newSelectedId);
      onConnectionSelected(newSelectedId);
      if (newSelectedId) {
        bringConnectionToTop(newSelectedId);
      }
    } else if (newSelectedId && isContextMenu) {
      bringConnectionToTop(newSelectedId);
    }
  }, [selectedConnectionId, onConnectionSelected, bringConnectionToTop]);

  const deleteConnection = useCallback((connectionIdToDelete: string) => {
    setConnections(prevConnections => prevConnections.filter(conn => conn.id !== connectionIdToDelete));
    if (selectedConnectionId === connectionIdToDelete) {
      setSelectedConnectionId(null);
      onConnectionSelected(null);
    }
  }, [selectedConnectionId, onConnectionSelected]);

  const deleteConnectionsForNode = useCallback((nodeIdToDelete: string) => {
    setConnections(prevConnections => {
      const remainingConnections = prevConnections.filter(conn =>
        conn.source.nodeId !== nodeIdToDelete && conn.target.nodeId !== nodeIdToDelete
      );
      if (selectedConnectionId) {
        const selectedConnStillExists = remainingConnections.some(conn => conn.id === selectedConnectionId);
        if (!selectedConnStillExists) {
          setSelectedConnectionId(null);
          onConnectionSelected(null);
        }
      }
      return remainingConnections;
    });
  }, [selectedConnectionId, onConnectionSelected]);

  const deleteConnectionsForNodeAndPort = useCallback((nodeId: string, portId: string) => {
    setConnections(prevConnections => {
      const remainingConnections = prevConnections.filter(conn =>
        !(conn.source.nodeId === nodeId && conn.source.portId === portId) &&
        !(conn.target.nodeId === nodeId && conn.target.portId === portId)
      );
      if (selectedConnectionId && !remainingConnections.find(c => c.id === selectedConnectionId)) {
        setSelectedConnectionId(null);
        onConnectionSelected(null);
      }
      return remainingConnections;
    });
  }, [selectedConnectionId, onConnectionSelected]);

  const clearAllConnectionsAndState = useCallback(() => {
    setConnections([]);
    setSelectedConnectionId(null);
    setDraggingConnection(null);
    onConnectionSelected(null);
  }, [onConnectionSelected]);

  const setConnectionsDirectly = useCallback((newConnections: Connection[]) => {
    setConnections(newConnections);
    setSelectedConnectionId(null);
    setDraggingConnection(null);
    onConnectionSelected(null);
  }, [onConnectionSelected]);

  const updateConnectionProperties = useCallback((connectionId: string, updates: Partial<Connection>) => {
    setConnections(prevConns =>
      prevConns.map(conn =>
        conn.id === connectionId ? { ...conn, ...updates } : conn
      )
    );
  }, []);


  return {
    connections,
    getConnections: () => connections,
    selectedConnectionId,
    getSelectedConnectionId: () => selectedConnectionId,
    draggingConnection,
    setDraggingConnection,
    completeConnection,
    selectConnection,
    deleteConnection,
    deleteConnectionsForNode,
    deleteConnectionsForNodeAndPort, 
    clearAllConnectionsAndState,
    setConnectionsDirectly,
    bringConnectionToTop,
    updateConnectionProperties, // Expose new function
  };
};
