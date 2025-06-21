
/**
 * Service for managing execution context IDs.
 */
export class ExecutionContextService {
  private numericSuffix: number = 0; // Starts at 0, will become 1 on first call
  private charCodeA: number = 'a'.charCodeAt(0);
  private currentPrefixChars: number[] = [this.charCodeA]; // Starts with ['a']

  private readonly MAX_NUMERIC_SUFFIX = 9; // Generates IDs like a1-a9, b1-b9, etc.

  /**
   * Generates a unique, short, human-readable execution context ID.
   * Example sequence: a1, a2, ..., a9, b1, ..., z9, aa1, ..., az9, ba1, ...
   * @param _startNodeId The ID of the StartNode initiating this execution wave (currently ignored for global counter).
   * @returns A unique string identifier for the execution context.
   */
  public generateContextId(_startNodeId: string): string {
    this.numericSuffix++;

    if (this.numericSuffix > this.MAX_NUMERIC_SUFFIX) {
      this.numericSuffix = 1;
      this.incrementPrefixChars();
    }

    const prefix = this.currentPrefixChars.map(code => String.fromCharCode(code)).join('');
    return `${prefix}${this.numericSuffix}`;
  }

  private incrementPrefixChars(): void {
    let i = this.currentPrefixChars.length - 1;
    while (i >= 0) {
      this.currentPrefixChars[i]++;
      if (this.currentPrefixChars[i] > this.charCodeA + 25) { // 'z'
        if (i === 0) {
          // All current prefix chars are 'z', need to add a new 'a' at the beginning
          // e.g., 'z' -> 'aa', 'zz' -> 'aaa'
          this.currentPrefixChars[i] = this.charCodeA; // Reset current char to 'a'
          this.currentPrefixChars.unshift(this.charCodeA); // Add 'a' at the start
          break; 
        } else {
          // Current char wrapped around 'z', reset to 'a' and carry over to the left
          // e.g., 'az' -> 'ba'
          this.currentPrefixChars[i] = this.charCodeA;
          i--; // Move to the next char to the left
        }
      } else {
        // No wrap-around, increment was successful
        break;
      }
    }
  }
}
