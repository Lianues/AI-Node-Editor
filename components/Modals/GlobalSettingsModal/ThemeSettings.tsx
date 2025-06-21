
import React from 'react';
import { vscodeDarkTheme } from '../../../theme/vscodeDark'; // Assuming theme is accessible like this

export const ThemeSettings: React.FC = () => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;

  return (
    <div>
      <h3 className={`text-lg font-semibold ${inspectorTheme.headerText} mb-3`}>主题设置</h3>
      <p className={`${inspectorTheme.valueTextMuted}`}>此部分用于自定义应用程序的主题和外观。</p>
      <p className={`${inspectorTheme.valueTextMuted} mt-2`}>（当前为占位内容，未来可添加如字体选择、颜色主题切换等功能）</p>
      {/* Example placeholder for future settings */}
      <div className="mt-4 space-y-3">
        <div>
          <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>字体大小:</label>
          <select className={`w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md text-sm`} disabled>
            <option>默认</option>
            <option>中等</option>
            <option>大</option>
          </select>
        </div>
        <div>
          <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>颜色主题:</label>
          <select className={`w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md text-sm`} disabled>
            <option>VSCode暗色 (默认)</option>
            <option>亮色主题 (未来支持)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
