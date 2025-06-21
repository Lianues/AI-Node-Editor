
import { GoogleGenAI, GenerateContentResponse, FunctionCall } from "@google/genai"; // Removed Content and Part import
import { AiServiceConfig, GeminiServiceFunctionCallResult, GeminiFunctionDeclaration, Tool, OpenAIChatCompletion, OpenAIToolCall, EditableAiModelConfig, GeminiHistoryItem, OpenAIMessageForHistory, OpenAIChatMessage, GeminiContent, AppTextPart } from "../types"; // Use app-defined GeminiContent, AppTextPart
import { DEFAULT_ENV_GEMINI_CONFIG_ID, PREDEFINED_MODEL_CONFIG_GROUPS, ModelConfigGroup } from '../globalModelConfigs';
import { convertGeminiSchemaToJsonSchema } from '../features/ai/utils/convertGeminiSchemaToJsonSchema';

let defaultGeminiClient: GoogleGenAI | null = null;
let defaultApiKeyStatus: 'uninitialized' | 'valid' | 'missing' = 'uninitialized';

try {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    defaultApiKeyStatus = 'missing';
  } else {
    defaultGeminiClient = new GoogleGenAI({ apiKey });
    defaultApiKeyStatus = 'valid';
  }
} catch (error) {
  defaultApiKeyStatus = 'missing';
}

const getEffectiveModelConfig = (
  config: AiServiceConfig 
): { model: string; apiFormat: 'gemini' | 'openai'; apiUrl?: string; apiKey?: string } => {
  const groupId = config.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID;
  
  let apiKeyToUse = config.apiKey;
  let apiUrlFromConfig = config.apiUrl;
  let modelFromConfig = config.model;
  let formatFromConfig = config.apiFormat;

  if (!modelFromConfig || !formatFromConfig) {
    const groupInfo = PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === groupId);
    if (groupInfo) {
      modelFromConfig = modelFromConfig || groupInfo.defaultModel;
      formatFromConfig = formatFromConfig || groupInfo.format;
      apiUrlFromConfig = apiUrlFromConfig || groupInfo.apiUrl; 
    }
  }
  
  const finalModel = modelFromConfig || "gemini-2.5-flash-preview-04-17";
  const finalFormat = formatFromConfig || 'gemini';
  
  return {
    model: finalModel,
    apiFormat: finalFormat,
    apiUrl: apiUrlFromConfig, 
    apiKey: apiKeyToUse,     
  };
};


const _prepareGeminiRequest = (
  promptOrContents: string | GeminiContent[], 
  config: AiServiceConfig, 
  modelToUse: string, 
  tools?: Tool[] 
) => {
  const generationConfigInternal: any = {};
  if (config?.temperature !== undefined) generationConfigInternal.temperature = config.temperature;
  if (config?.topP !== undefined) generationConfigInternal.topP = config.topP;
  if (config?.topK !== undefined) generationConfigInternal.topK = config.topK;
  if (config?.systemInstruction) generationConfigInternal.systemInstruction = config.systemInstruction;
  
  if (config?.thinkingConfig) {
    generationConfigInternal.thinkingConfig = {};
    if (config.thinkingConfig.thinkingBudget !== undefined) {
      generationConfigInternal.thinkingConfig.thinkingBudget = config.thinkingConfig.thinkingBudget;
    }
    if (config.thinkingConfig.includeThoughts === true) {
      generationConfigInternal.thinkingConfig.includeThoughts = true;
    }
  }

  const requestParameters: any = {
      model: modelToUse, 
      contents: typeof promptOrContents === 'string' 
                ? [{role: 'user', parts: [{text: promptOrContents} as AppTextPart]}] // Use AppTextPart structure
                : promptOrContents, // promptOrContents is AppGeminiContent[], parts are AppPart[]
  };

  if (Object.keys(generationConfigInternal).length > 0) {
      requestParameters.config = generationConfigInternal;
  }

  if (tools && tools.length > 0) { 
      requestParameters.config = { ...(requestParameters.config || {}), tools: tools };
  }
  return requestParameters;
};


const _generateTextViaGeminiSdk = async (
  promptOrContents: string | GeminiContent[], 
  config: AiServiceConfig, 
  tools?: Tool[] 
): Promise<{ response: GenerateContentResponse | null; tokenCount?: number; thoughts?: string; error?: string } | null> => {
  
  const { model: modelToUse, apiKey: apiKeyForCall } = getEffectiveModelConfig(config);
  
  let clientToUse = defaultGeminiClient;
  let clientStatus = defaultApiKeyStatus;

  if (apiKeyForCall && config.aiModelConfigGroupId !== DEFAULT_ENV_GEMINI_CONFIG_ID) { 
    try {
      clientToUse = new GoogleGenAI({ apiKey: apiKeyForCall });
      clientStatus = 'valid';
    } catch (error) {
      clientStatus = 'missing'; 
      return { response: null, error: `Failed to initialize Gemini client with provided API key: ${error instanceof Error ? error.message : String(error)}`};
    }
  } else if (!apiKeyForCall && config.aiModelConfigGroupId !== DEFAULT_ENV_GEMINI_CONFIG_ID) {
     return { response: null, error: `Gemini API key for group '${config.aiModelConfigGroupId}' not configured or passed to service.` };
  } else if (config.aiModelConfigGroupId === DEFAULT_ENV_GEMINI_CONFIG_ID && defaultApiKeyStatus !== 'valid') {
     return { response: null, error: "Gemini API key (from ENV) not configured or AI client not initialized." };
  }

  if (clientStatus !== 'valid' || !clientToUse) {
    return { response: null, error: "Gemini AI client not initialized or API key invalid." };
  }

  try {
    const requestParameters = _prepareGeminiRequest(promptOrContents, config, modelToUse, tools);
    console.log('[GeminiService SDK Request]', JSON.stringify(requestParameters, null, 2));
    const geminiResponse: GenerateContentResponse = await clientToUse.models.generateContent(requestParameters);
    console.log('[GeminiService SDK Response]', JSON.stringify(geminiResponse, null, 2));

    let tokenCount: number | undefined = undefined;
    if (geminiResponse.usageMetadata) {
      if (geminiResponse.usageMetadata.promptTokenCount !== undefined && geminiResponse.usageMetadata.candidatesTokenCount !== undefined) {
        tokenCount = geminiResponse.usageMetadata.promptTokenCount + geminiResponse.usageMetadata.candidatesTokenCount;
      }
    }
    let thoughts: string | undefined = undefined;
    // The structure of parts for thoughts might be different, assuming thoughts are in text parts
    if (config?.thinkingConfig?.includeThoughts && geminiResponse.candidates && geminiResponse.candidates[0]?.content?.parts) {
      const thoughtTexts = geminiResponse.candidates[0].content.parts
        .filter((part: any) => part.thought && part.text) // Assuming SDK part structure
        .map((part: any) => part.text);
      if (thoughtTexts.length > 0) thoughts = thoughtTexts.join('\n---\n');
    }
    return { response: geminiResponse, tokenCount, thoughts };
  } catch (error) {
    return { response: null, error: error instanceof Error ? error.message : "Unknown error with Gemini SDK." };
  }
};

const _generateTextViaOpenAiApi = async (
  messages: OpenAIChatMessage[], 
  config: AiServiceConfig, 
  tools?: Tool[] 
): Promise<{ response: OpenAIChatCompletion | null; tokenCount?: number; thoughts?: string; error?: string } | null> => {
  
  const { model: modelToUse, apiKey: apiKeyForCall, apiUrl: apiUrlForCall } = getEffectiveModelConfig(config);
  
  if (!apiKeyForCall || !apiUrlForCall) {
    return { response: null, error: "OpenAI API Key or URL not configured or passed to service for the selected group."};
  }

  const body: any = {
    model: modelToUse,
    messages: messages, 
  };
  if (config.temperature !== undefined) body.temperature = config.temperature;
  if (config.topP !== undefined) body.top_p = config.topP; 

  if (apiUrlForCall.includes("generativelanguage.googleapis.com") && modelToUse.startsWith("gemini-")) {
      body.reasoning_effort = "low"; 
  }

  if (tools && tools.length > 0) {
    const openAiTools: any[] = [];
    tools.forEach(tool => {
      if (tool.functionDeclarations) {
        tool.functionDeclarations.forEach(geminiFuncDecl => {
          openAiTools.push({
            type: "function",
            function: {
              name: geminiFuncDecl.name,
              description: geminiFuncDecl.description,
              parameters: geminiFuncDecl.parameters 
                            ? convertGeminiSchemaToJsonSchema(geminiFuncDecl.parameters) 
                            : { type: "object", properties: {} } 
            }
          });
        });
      }
    });
    if (openAiTools.length > 0) {
      body.tools = openAiTools;
      body.tool_choice = "auto"; 
    }
  }

  try {
    console.log('[OpenAI API Request]', `URL: ${apiUrlForCall}`, JSON.stringify(body, null, 2));
    const response = await fetch(apiUrlForCall, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyForCall}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[OpenAI API Error Response Body]', errorBody);
      return { response: null, error: `OpenAI API request failed: ${response.status} ${response.statusText}. Details: ${errorBody}` };
    }

    const completion = await response.json() as OpenAIChatCompletion;
    console.log('[OpenAI API Response]', JSON.stringify(completion, null, 2));
    
    const tokenCount = completion.usage?.total_tokens;
    return { response: completion, tokenCount, thoughts: undefined };

  } catch (error) {
    return { response: null, error: `Error calling OpenAI API: ${error instanceof Error ? error.message : String(error)}` };
  }
};


export const generateText = async (
  promptOrMessages: string | GeminiContent[] | OpenAIChatMessage[], 
  config: AiServiceConfig & { tools?: Tool[] } 
): Promise<{ response: GenerateContentResponse | OpenAIChatCompletion | null; tokenCount?: number; thoughts?: string; error?: string } | null> => {
  
  const { apiFormat } = getEffectiveModelConfig(config); 
  
  if (apiFormat === 'openai') {
    if (!Array.isArray(promptOrMessages) || (promptOrMessages.length > 0 && !('role' in promptOrMessages[0] && 'content' in promptOrMessages[0]))) {
       return { response: null, error: "Invalid payload for OpenAI. Expected an array of OpenAIChatMessage."};
    }
    return _generateTextViaOpenAiApi(promptOrMessages as OpenAIChatMessage[], config, config.tools);
  } else { 
     if (typeof promptOrMessages !== 'string' && (!Array.isArray(promptOrMessages) || (promptOrMessages.length > 0 && !('role' in promptOrMessages[0] && 'parts' in promptOrMessages[0])))) {
        return { response: null, error: "Invalid payload for Gemini. Expected a string or an array of GeminiContent."};
     }
    return _generateTextViaGeminiSdk(promptOrMessages as string | GeminiContent[], config, config.tools);
  }
};


export const callGeminiWithFunction = async (
  prompt: string, 
  aiConfig: AiServiceConfig & { model: string }, 
  functionToCall: GeminiFunctionDeclaration,
  expectedFunctionArgName: string,
  nodeIdForLogging: string = '[GeminiService]'
): Promise<GeminiServiceFunctionCallResult> => {
  const logPrefix = `${nodeIdForLogging} [callGeminiWithFunction]`;

  const { model: modelToUse, apiKey: apiKeyForCall, apiFormat } = getEffectiveModelConfig(aiConfig);

  if (apiFormat === 'openai') {
    return { extractedData: null, errorMessage: "Direct function calling via callGeminiWithFunction is intended for Gemini format. Use generateText with tools for OpenAI.", rawResponse: null };
  }

  let clientToUse = defaultGeminiClient;
  let clientStatus = defaultApiKeyStatus;
  const groupId = aiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID;

  if (groupId === DEFAULT_ENV_GEMINI_CONFIG_ID) {
    if (defaultApiKeyStatus !== 'valid' || !defaultGeminiClient) {
      return { extractedData: null, errorMessage: "Gemini API key (from ENV) not configured or AI client not initialized.", rawResponse: null };
    }
  } else if (apiKeyForCall) { 
    try {
      clientToUse = new GoogleGenAI({ apiKey: apiKeyForCall });
      clientStatus = 'valid';
    } catch (error) {
      return { extractedData: null, errorMessage: `Failed to initialize Gemini client with custom API key: ${error instanceof Error ? error.message : String(error)}`, rawResponse: null };
    }
  } else { 
     return { extractedData: null, errorMessage: `API Key for configuration group '${groupId}' not found or passed for function call.`, rawResponse: null };
  }

  if (clientStatus !== 'valid' || !clientToUse) {
    return { extractedData: null, errorMessage: "Gemini AI client for function call not initialized or API key invalid.", rawResponse: null };
  }
  
  const toolsForCall: Tool[] = [{ functionDeclarations: [functionToCall as any] }];
  
  const requestParameters = _prepareGeminiRequest(prompt, aiConfig, modelToUse, toolsForCall); 
  
  try {
    console.log(`${logPrefix} Request to Gemini SDK for function call:`, JSON.stringify(requestParameters, null, 2));
    const genApiResponse = await clientToUse.models.generateContent(requestParameters);
    console.log(`${logPrefix} Response from Gemini SDK for function call:`, JSON.stringify(genApiResponse, null, 2));

    let extractedData: any | null = null;
    let errorMessage: string | null = null;
    let tokenCount: number | undefined = undefined;
    let thoughts: string | undefined = undefined;

    if (genApiResponse.usageMetadata) {
      tokenCount = (genApiResponse.usageMetadata.promptTokenCount || 0) + (genApiResponse.usageMetadata.candidatesTokenCount || 0);
    }
    // Assuming thoughts parts structure for SDK response
    if (aiConfig.thinkingConfig?.includeThoughts && genApiResponse.candidates && genApiResponse.candidates[0]?.content?.parts) {
        const thoughtTexts = genApiResponse.candidates[0].content.parts
            .filter((part: any) => part.thought && part.text)
            .map((part: any) => part.text);
        if (thoughtTexts.length > 0) thoughts = thoughtTexts.join('\n---\n');
    }

    if (genApiResponse.functionCalls && genApiResponse.functionCalls.length > 0) {
      const ourFunctionCallInstance = genApiResponse.functionCalls.find(fc => fc.name === functionToCall.name);
      if (ourFunctionCallInstance) {
        if (ourFunctionCallInstance.args && ourFunctionCallInstance.args[expectedFunctionArgName] !== undefined) {
          extractedData = ourFunctionCallInstance.args[expectedFunctionArgName];
        } else {
          errorMessage = `Gemini called function '${functionToCall.name}' but expected argument '${expectedFunctionArgName}' was missing. Args: ${JSON.stringify(ourFunctionCallInstance.args)}`;
        }
      } else {
        errorMessage = `Gemini responded with unexpected function call(s): ${genApiResponse.functionCalls.map(fc => fc.name).join(', ')}. Expected '${functionToCall.name}'.`;
      }
    } else if (genApiResponse.text) { 
        errorMessage = `AI response was direct text instead of function call ('${functionToCall.name}'). Text: ${genApiResponse.text}`;
        extractedData = null; 
    } else {
        errorMessage = `AI response missing expected function call ('${functionToCall.name}') and direct text content.`;
    }
    return { extractedData, errorMessage, rawResponse: genApiResponse, tokenCount, thoughts };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error during Gemini SDK function call.";
    console.error(`${logPrefix} Error:`, e);
    return { extractedData: null, errorMessage: errorMsg, rawResponse: null, tokenCount: undefined, thoughts: undefined };
  }
};

export const testAiModel = async (
  config: {
    apiFormat: 'gemini' | 'openai';
    model: string;
    prompt: string; 
    apiKey?: string; 
    apiUrl?: string; 
  }
): Promise<{ text?: string; error?: string } | null> => {
  const logPrefix = `[GeminiService.testAiModel Format:${config.apiFormat}]`;
  console.log(`${logPrefix} Test initiated with config:`, { model: config.model, apiUrl: config.apiUrl, apiKeyProvided: !!config.apiKey });

  if (config.apiFormat === 'openai') {
    if (!config.apiKey || !config.apiUrl) {
      console.error(`${logPrefix} OpenAI format requires API Key and API URL.`);
      return { error: "OpenAI format requires API Key and API URL for testing." };
    }
    const messages: OpenAIChatMessage[] = [{ role: "user", content: config.prompt }];
    const body: any = {
      model: config.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 50,
    };
    console.log(`${logPrefix} OpenAI Request Body:`, JSON.stringify(body, null, 2));
    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const responseText = await response.text(); 
      console.log(`${logPrefix} OpenAI Response Status:`, response.status);
      console.log(`${logPrefix} OpenAI Raw Response Body:`, responseText);

      if (!response.ok) {
        return { error: `OpenAI API test failed: ${response.status} ${response.statusText}. ${responseText}` };
      }
      const completion = JSON.parse(responseText) as OpenAIChatCompletion;
      const text = completion.choices[0]?.message?.content;
      return { text };
    } catch (e) {
      const errorMsg = `Error during OpenAI API test: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`${logPrefix} Error:`, e);
      return { error: errorMsg };
    }
  } else { 
    let clientToUse = defaultGeminiClient;
    let clientStatus = defaultApiKeyStatus;

    if (config.apiKey && config.apiKey !== process.env.API_KEY) { 
      try {
        clientToUse = new GoogleGenAI({ apiKey: config.apiKey });
        clientStatus = 'valid';
      } catch (error) {
        const errorMsg = `Failed to initialize Gemini client for test with provided key: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`${logPrefix} Client Init Error:`, error);
        return { error: errorMsg };
      }
    } else if (!config.apiKey && defaultApiKeyStatus !== 'valid') { 
      console.error(`${logPrefix} Gemini API key (ENV) not configured for test.`);
      return { error: "Gemini API key (ENV) not configured for test." };
    }
    
    if (clientStatus !== 'valid' || !clientToUse) {
      console.error(`${logPrefix} Gemini AI client not available.`);
      return { error: "Gemini AI client not available for test." };
    }

    try {
      const contents: GeminiContent[] = [{role: 'user', parts: [{text: config.prompt} as AppTextPart]}];
      const requestParameters: any = { model: config.model, contents: contents };
      console.log(`${logPrefix} Gemini Request Parameters:`, JSON.stringify(requestParameters, null, 2));
      const result: GenerateContentResponse = await clientToUse.models.generateContent(requestParameters);
      console.log(`${logPrefix} Gemini Raw Response:`, JSON.stringify(result, null, 2));
      return { text: result.text };
    } catch (e) {
      const errorMsg = `Error during Gemini API test: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`${logPrefix} Error:`, e);
      return { error: errorMsg };
    }
  }
};
