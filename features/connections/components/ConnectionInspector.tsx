import React from 'react';
import { Connection } from '../types/connectionTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

interface ConnectionInspectorProps {
  connection: Connection;
}

const ConnectionInspector: React.FC<ConnectionInspectorProps> = ({ connection }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  return (
    <div className="space-y-3">
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>Connection ID</label>
        <p className={`text-sm ${inspectorTheme.valueText} break-all`}>{connection.id}</p>
      </div>
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>Source Node</label>
        <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>{connection.source.nodeId}</p>
      </div>
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>Source Port</label>
        <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>{connection.source.portId} ({connection.source.dataType}, {connection.source.portSide})</p>
      </div>
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>Target Node</label>
        <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>{connection.target.nodeId}</p>
      </div>
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>Target Port</label>
        <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>{connection.target.portId} ({connection.target.dataType}, {connection.target.portSide})</p>
      </div>
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>Color</label>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border border-gray-500" style={{ backgroundColor: connection.color }}></div>
          <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>{connection.color}</p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionInspector;
