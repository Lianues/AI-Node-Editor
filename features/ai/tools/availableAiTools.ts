
import { GeminiFunctionDeclaration, GeminiType } from '../../../types';
import { outputGeneratedTextFunctionDeclaration, EXPECTED_FUNCTION_ARG_NAME as TEXT_OUTPUT_ARG_NAME } from './definitions/textOutputTool';
import { finiteChoiceSelectionToolDeclaration, FINITE_CHOICE_SELECTION_TOOL_NAME, FINITE_CHOICE_SELECTION_ARG_NAME } from './definitions/finiteChoiceSelectionTool'; // New import

export interface RegisteredAiTool {
  declaration: GeminiFunctionDeclaration;
  expectedArgName: string;
  systemInstructionSuffix?: string; 
}

export const AVAILABLE_AI_TOOLS: RegisteredAiTool[] = [
  {
    declaration: outputGeneratedTextFunctionDeclaration,
    expectedArgName: TEXT_OUTPUT_ARG_NAME,
    systemInstructionSuffix: "你必须使用名为 'output_generated_text' 的函数来提供你的主要响应内容。",
  },
  // 新注册的有限选项选择工具
  {
    declaration: finiteChoiceSelectionToolDeclaration,
    expectedArgName: FINITE_CHOICE_SELECTION_ARG_NAME,
    systemInstructionSuffix: "你必须使用名为 'select_from_finite_options_tool' 的函数，并从提供的选项中选择来回答。",
  },
  // Add other tools here as they are defined.
];
