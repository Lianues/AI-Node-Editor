
import { GeminiFunctionDeclaration, GeminiType } from '../../../../types';

export const FINITE_CHOICE_SELECTION_TOOL_NAME = 'select_from_finite_options_tool';
export const FINITE_CHOICE_SELECTION_ARG_NAME = 'selected_choices';

export const finiteChoiceSelectionToolDeclaration: GeminiFunctionDeclaration = {
  name: FINITE_CHOICE_SELECTION_TOOL_NAME,
  description: '从提供的有限选项列表中选择一项或多项。',
  parameters: {
    type: GeminiType.OBJECT,
    properties: {
      [FINITE_CHOICE_SELECTION_ARG_NAME]: {
        type: GeminiType.ARRAY,
        description: '从提供的列表中选择的选项。',
        items: {
          type: GeminiType.STRING,
          description: '一个选定的选项。',
          // 初始枚举值，实际使用时节点可能会动态提供
          enum: ["对", "错"],
        },
      },
    },
    required: [FINITE_CHOICE_SELECTION_ARG_NAME],
  },
};
