
import { PortDataType } from './types'; 

export interface ModelConfigGroup {
  id: string;
  name: string;
  defaultModel: string; // Changed from 'model' to 'defaultModel' for clarity
  format: 'gemini' | 'openai';
  apiUrl?: string; 
  notes?: string;
}

export const DEFAULT_ENV_GEMINI_CONFIG_ID = "env_gemini_fixed";

export const PREDEFINED_MODEL_CONFIG_GROUPS: ModelConfigGroup[] = [
  {
    id: DEFAULT_ENV_GEMINI_CONFIG_ID,
    name: "Gemini (环境变量)",
    defaultModel: "gemini-2.5-flash-preview-04-17",
    format: 'gemini',
    // apiUrl not strictly needed as SDK handles it for Gemini with process.env.API_KEY
  },
  {
    id: "default_gemini_1",
    name: "Gemini API示例",
    defaultModel: "gemini-2.5-flash-preview-04-17",
    format: 'gemini',
    notes: " (需在全局设置中配置API密钥)"
    // apiUrl implies this could use a specific endpoint if needed, SDK handles default.
  },
  {
    id: "default_openai_1",
    name: "OpenAI API示例",
    defaultModel: "gpt-4o-mini", 
    format: 'openai',
    apiUrl: "https://api.openai.com/v1/chat/completions",
    notes: " (需在全局设置中配置API密钥)"
  },
  {
    id: "google_openai_compat_gemini",
    name: "Gemini (OpenAI兼容)",
    defaultModel: "gemini-2.5-flash-preview-04-17", 
    format: 'openai',
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", // Corrected apiUrl
    notes: " (Google Cloud AI Studio OpenAI 兼容端点, 需配置API密钥)"
  },
];
