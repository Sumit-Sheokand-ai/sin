interface Explanation { explanation: string; suggestion: string }

const EXPLANATIONS: Record<string, (msg: string) => Explanation> = {
  ReferenceError: () => ({
    explanation: "You tried to use a variable that hasn't been declared yet.",
    suggestion: "Check spelling and make sure the variable is declared with let, const, or var before this line.",
  }),
  TypeError: (msg) => ({
    explanation: msg.includes('undefined') || msg.includes('null')
      ? "You tried to access a property or call a method on a value that doesn't exist (undefined or null)."
      : "You used a value in a way that doesn't match its type.",
    suggestion: "Check that the variable has been assigned a value before using it, and that you're calling the right method.",
  }),
  SyntaxError: () => ({
    explanation: "Your code has a syntax error — the language couldn't understand it.",
    suggestion: "Check for missing brackets, parentheses, or quotes near the highlighted line.",
  }),
  RangeError: () => ({
    explanation: "A value was outside the expected range (e.g. too large, negative, or stack overflow from deep recursion).",
    suggestion: "Check your loop bounds or recursion base case.",
  }),
  InfiniteLoopError: () => ({
    explanation: "This loop ran more than 1000 steps without finishing. It may be an infinite loop.",
    suggestion: "Check your loop condition — make sure it can eventually become false.",
  }),
  MAX_STEPS_EXCEEDED: () => ({
    explanation: "Execution produced more than 1000 steps. The trace was stopped to protect performance.",
    suggestion: "Try a smaller input, or simplify the code to reduce the number of steps.",
  }),
  NameError: () => ({
    explanation: "You used a name (variable or function) that hasn't been defined.",
    suggestion: "Check spelling and make sure the variable is defined before this line.",
  }),
  AttributeError: () => ({
    explanation: "You tried to access an attribute or method that doesn't exist on this object.",
    suggestion: "Check that you're using the correct attribute name for this type.",
  }),
  IndexError: () => ({
    explanation: "You tried to access an index that is outside the range of the list or array.",
    suggestion: "Check that your index is within bounds (0 to length-1).",
  }),
  ZeroDivisionError: () => ({
    explanation: "You tried to divide a number by zero.",
    suggestion: "Check your divisor — make sure it's never zero before dividing.",
  }),
  ExecutionLimitExceeded: () => ({
    explanation: "Python execution reached the 1000-step limit. The code may contain an infinite loop.",
    suggestion: "Check your loop conditions and recursion base cases.",
  }),
}

export function explainError(type: string, message: string): Explanation {
  const factory = EXPLANATIONS[type]
  if (factory) return factory(message)
  return {
    explanation: `An error occurred: ${type}${message ? ` — ${message}` : ''}.`,
    suggestion: "Check the highlighted line for mistakes.",
  }
}
