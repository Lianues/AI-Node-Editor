
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { CustomUiNodeContent } from './CustomUiNodeContent';
import CustomUiNodeInspector from './Inspector';
import { HEADER_HEIGHT } from '../../components/renderingConstants';
import { executeCustomUiNode } from './Executor';

export const CUSTOM_UI_NODE_TYPE_KEY = 'custom-ui-node';

const inputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_in_1', label: '聊天记录 (JSON)', shape: 'circle', dataType: PortDataType.STRING, isPortRequired: false },
];

const outputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_out_1', label: '用户问题', shape: 'circle', dataType: PortDataType.STRING, isPortRequired: false },
];

const fixedButtonAreaHeight = 40;
const defaultNodeHeight = calculateNodeHeight(inputs, outputs, HEADER_HEIGHT, fixedButtonAreaHeight, undefined);

export const customUiNodeDefinition = {
  type: CUSTOM_UI_NODE_TYPE_KEY,
  label: '自定义界面节点',
  description: '允许开发者使用HTML、CSS和JavaScript创建自定义交互界面。节点上提供“查看界面”按钮以全屏预览该界面。\n\n核心功能与注意事项：\n- **界面逻辑**: 在检查器中编写HTML、CSS和内联 `<script>`。HTML中的JavaScript可以通过 `window.aiStudioBridge.sendOutput(nodeId, portId, data)` 将数据发送到节点的某个输出端口。`nodeId` 必须是当前节点的ID，`portId` 必须与节点定义的输出端口ID匹配。\n- **动态内容**: HTML模板中可以使用 `{{node_id}}` 占位符，它在渲染时会被替换为当前节点的实际ID。任何连接到此节点输入端口（如 `data_in_1`）的数据，可以在HTML中通过对应的占位符 `{{data_in_1}}` 访问（通常是JSON字符串）。这些输入数据也会被传递到节点内部的 `node.data.lastReceivedInputs` 对象，供界面内的JavaScript在运行时访问。\n- **执行流程**: 当此节点的“开始”流程端口被触发执行时，它会处理并存储所有输入端口的数据到 `node.data.lastReceivedInputs`。之后，节点将等待自定义UI通过 `aiStudioBridge.sendOutput()` 来触发其输出端口（包括流程端口如 `flow_end`）。如果UI不主动触发输出，节点将保持等待状态。\n- **全屏预览高度**: 可以在检查器中配置全屏预览时界面内容的显示高度。',
  defaultTitle: '自定义界面',
  width: 300,
  height: defaultNodeHeight,
  headerColor: 'bg-lime-700',
  bodyColor: 'bg-slate-800',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    customHtml: `
<div id="chatContainer-{{node_id}}" style="display: flex; flex-direction: column; height: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background-color: #1e293b; color: #e2e8f0; padding: 12px; gap: 10px;">

  <div id="historyArea-{{node_id}}" style="flex-grow: 1; overflow-y: auto; padding-right: 8px; display: flex; flex-direction: column; gap: 10px;">
    <!-- Chat messages will be appended here by JavaScript -->
  </div>

  <div id="inputArea-{{node_id}}" style="display: flex; gap: 8px; align-items: flex-end; border-top: 1px solid #334155; padding-top: 10px;">
    <textarea
      id="userInput-{{node_id}}"
      rows="1"
      style="flex-grow: 1; padding: 10px 12px; border-radius: 18px; border: 1px solid #475569; background-color: #334155; color: #e2e8f0; font-size: 0.9em; resize: none; line-height: 1.4; outline: none; transition: border-color 0.2s; min-height: 38px; max-height: 120px;"
      placeholder="输入您的问题..."
      onfocus="this.style.borderColor='#60a5fa';"
      onblur="this.style.borderColor='#475569';"
    ></textarea>
    <button
      id="sendButton-{{node_id}}"
      style="padding: 0 16px; background-color: #3b82f6; color: white; border: none; border-radius: 18px; cursor: pointer; font-size: 0.9em; font-weight: 500; height: 38px; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s ease;"
      onmouseover="this.style.backgroundColor='#2563eb'"
      onmouseout="this.style.backgroundColor='#3b82f6'"
    >
      发送
    </button>
  </div>

  <div style="font-size: 0.7em; color: #64748b; text-align: center; padding-top: 4px;">
    节点 ID: <strong style="color: #94a3b8;">{{node_id}}</strong>. 按 Esc 关闭。
  </div>
  
  <script>
    (function() {
      const nodeIdScript = '{{node_id}}';
      const historyArea = document.getElementById('historyArea-' + nodeIdScript);
      const userInput = document.getElementById('userInput-' + nodeIdScript);
      const sendButton = document.getElementById('sendButton-' + nodeIdScript);

      if (!historyArea || !userInput || !sendButton) {
        console.error('Chat UI elements not found for node ' + nodeIdScript);
        if(historyArea) historyArea.innerHTML = '<p style="color: #f87171;">脚本错误: UI元素缺失，请检查控制台。</p>';
        return;
      }

      function appendMessage(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.style.padding = '8px 12px';
        messageDiv.style.borderRadius = '12px';
        messageDiv.style.maxWidth = '75%';
        messageDiv.style.wordBreak = 'break-word';
        messageDiv.style.fontSize = '0.9em';
        messageDiv.style.lineHeight = '1.5';
        
        const textNode = document.createElement('p');
        textNode.style.margin = '0';
        textNode.textContent = text;
        messageDiv.appendChild(textNode);

        if (role === 'user') {
          messageDiv.style.backgroundColor = '#3b82f6'; // Blue for user
          messageDiv.style.color = 'white';
          messageDiv.style.alignSelf = 'flex-end';
          messageDiv.style.marginLeft = 'auto';
        } else { // model
          messageDiv.style.backgroundColor = '#475569'; // Slate for model
          messageDiv.style.color = '#e2e8f0';
          messageDiv.style.alignSelf = 'flex-start';
          messageDiv.style.marginRight = 'auto';
        }
        historyArea.appendChild(messageDiv);
        historyArea.scrollTop = historyArea.scrollHeight; // Auto-scroll to bottom
      }

      function renderHistory(historyArray) {
        historyArea.innerHTML = ''; // Clear previous history
        if (Array.isArray(historyArray)) {
          historyArray.forEach(item => {
            if (item && item.role && Array.isArray(item.parts) && item.parts.length > 0 && item.parts[0].text) {
              appendMessage(item.role, item.parts[0].text);
            }
          });
        } else {
           appendMessage('model', '聊天记录格式无效或为空。');
        }
      }
      
      // Process initial history from data_in_1 placeholder
      const encodedHistoryString = '{{data_in_1}}';
      let initialHistory = [];
      if (encodedHistoryString && encodedHistoryString !== '[data_in_1 - 无数据]' && encodedHistoryString.trim() !== '') {
        try {
          // Create a temporary div to decode HTML entities
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = encodedHistoryString;
          const historyJsonString = tempDiv.textContent || tempDiv.innerText || "";
          if (historyJsonString.trim()) {
             initialHistory = JSON.parse(historyJsonString);
          }
        } catch (e) {
          console.error('Error parsing initial history JSON for node ' + nodeIdScript + ':', e, 'Raw string:', encodedHistoryString);
          appendMessage('model', '无法加载历史记录，格式错误。');
        }
      }
      renderHistory(initialHistory);

      userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        let newHeight = this.scrollHeight;
        const maxHeight = parseInt(this.style.maxHeight) || 120;
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
        this.style.height = newHeight + 'px';
      });
      
      userInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          sendButton.click();
        }
      });

      sendButton.onclick = function() {
        const question = userInput.value;
        if (!question.trim()) return;
        
        if (window.aiStudioBridge && typeof window.aiStudioBridge.sendOutput === 'function') {
          // appendMessage('user', question); // Optimistically display user message
          window.aiStudioBridge.sendOutput(nodeIdScript, 'data_out_1', question);
          window.aiStudioBridge.sendOutput(nodeIdScript, 'flow_end', JSON.stringify({ flowSignal: true }));
          userInput.value = '';
          userInput.style.height = 'auto';
          userInput.dispatchEvent(new Event('input')); // Trigger resize
        } else {
          appendMessage('model', '错误: 无法连接到工作流引擎。');
        }
      };
      
      // Initial resize for textarea
      userInput.dispatchEvent(new Event('input'));

    })();
  </script>
</div>`,
    uiHeight: 500, // Default height for the full-screen modal content
  },
  customContentRenderer: CustomUiNodeContent,
  customContentHeight: fixedButtonAreaHeight,
  inspector: CustomUiNodeInspector,
  executor: executeCustomUiNode,
};
