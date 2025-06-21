import { GeminiFunctionDeclarationSchema, GeminiType } from '../../../types';

// Minimal JSON Schema types needed for conversion
interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  items?: JsonSchemaProperty;
}

export function convertGeminiSchemaToJsonSchema(
  geminiSchema: GeminiFunctionDeclarationSchema
): JsonSchemaProperty {
  const jsonSchema: JsonSchemaProperty = { type: '' };

  switch (geminiSchema.type) {
    case GeminiType.STRING:
      jsonSchema.type = 'string';
      break;
    case GeminiType.NUMBER:
      jsonSchema.type = 'number';
      break;
    case GeminiType.INTEGER: // JSON Schema also has 'integer'
      jsonSchema.type = 'integer';
      break;
    case GeminiType.BOOLEAN:
      jsonSchema.type = 'boolean';
      break;
    case GeminiType.ARRAY:
      jsonSchema.type = 'array';
      if (geminiSchema.items) {
        jsonSchema.items = convertGeminiSchemaToJsonSchema(geminiSchema.items);
      }
      break;
    case GeminiType.OBJECT:
      jsonSchema.type = 'object';
      if (geminiSchema.properties) {
        jsonSchema.properties = {};
        for (const key in geminiSchema.properties) {
          jsonSchema.properties[key] = convertGeminiSchemaToJsonSchema(
            geminiSchema.properties[key]
          );
        }
      }
      if (geminiSchema.required && geminiSchema.required.length > 0) {
        jsonSchema.required = [...geminiSchema.required];
      }
      break;
    default:
      // Fallback for any unknown GeminiType, treat as string or a generic object if possible
      // Or throw an error if strictness is required
      console.warn(`Unsupported GeminiType encountered: ${geminiSchema.type}. Defaulting to string.`);
      jsonSchema.type = 'string';
  }

  if (geminiSchema.description) {
    jsonSchema.description = geminiSchema.description;
  }
  if (geminiSchema.enum && geminiSchema.enum.length > 0) {
    jsonSchema.enum = [...geminiSchema.enum];
  }

  return jsonSchema;
}
