// Generates a full fib(5) recursive trace for ExecutionTreePanel visualization
// Run with: node scripts/generateRecursionTrace.js

const fs = require('fs')
const path = require('path')

let stepCounter = 0
const frames = []

function makeVar(value, changed) {
  return { value, type: 'number', changed }
}

function addFrame(type, line, variables, callStack, output) {
  frames.push({
    step: stepCounter++,
    line,
    type,
    isBreakpoint: false,
    variables,
    callStack: callStack.map(e => ({ ...e })),
    heap: [],
    output: [...output],
    error: null,
  })
}

// fib(n) execution — modifies callStack in place
function fib(n, callStack, output) {
  // CALL frame — entering fib(n)
  callStack.push({ name: 'fib', line: 1, args: { n } })
  addFrame('call', 1, { n: makeVar(n, true) }, callStack, output)

  // Check base case line
  addFrame('normal', 2, { n: makeVar(n, false) }, callStack, output)

  if (n <= 1) {
    // base case — return n directly
    const result = n
    callStack.pop()
    addFrame('return', 2, { result: makeVar(result, true) }, callStack, output)
    return result
  }

  // Line 3: recursive call fib(n-1)
  addFrame('normal', 3, { n: makeVar(n, false) }, callStack, output)
  const r1 = fib(n - 1, callStack, output)

  // After first recursive call returns
  addFrame('normal', 3, { n: makeVar(n, false), r1: makeVar(r1, true) }, callStack, output)
  const r2 = fib(n - 2, callStack, output)

  // Compute and return
  const result = r1 + r2
  addFrame('normal', 3, { n: makeVar(n, false), r1: makeVar(r1, false), r2: makeVar(r2, true), result: makeVar(result, true) }, callStack, output)

  callStack.pop()
  addFrame('return', 3, { result: makeVar(result, false) }, callStack, output)
  return result
}

// --- Build trace ---
const output = []
const mainStack = [{ name: '(main)', line: 4, args: {} }]

// Initial frame before calling fib
addFrame('normal', 4, {}, mainStack, output)

const result = fib(5, mainStack, output)

// Final frame with output
output.push(String(result))
addFrame('normal', 4, { result: makeVar(result, true) }, mainStack, output)

// --- Per-language configs ---
const languages = {
  pseudocode: {
    code: `FUNCTION fib(n):
  IF n <= 1: RETURN n
  RETURN fib(n-1) + fib(n-2)
PRINT fib(5)`,
  },
  c: {
    code: `#include <stdio.h>
int fib(int n) {
  if (n <= 1) return n;
  return fib(n-1) + fib(n-2);
}
int main() {
  printf("%d\\n", fib(5));
}`,
  },
  cpp: {
    code: `#include <iostream>
int fib(int n) {
  if (n <= 1) return n;
  return fib(n-1) + fib(n-2);
}
int main() {
  std::cout << fib(5) << std::endl;
}`,
  },
  java: {
    code: `public class Main {
  static int fib(int n) {
    if (n <= 1) return n;
    return fib(n-1) + fib(n-2);
  }
  public static void main(String[] args) {
    System.out.println(fib(5));
  }
}`,
  },
}

const tracesDir = path.join(__dirname, '..', 'public', 'traces')

for (const [lang, config] of Object.entries(languages)) {
  const trace = {
    language: lang,
    snippet: 'recursion',
    code: config.code,
    frames,
  }
  const outPath = path.join(tracesDir, lang, 'recursion.json')
  fs.writeFileSync(outPath, JSON.stringify(trace, null, 2))
  console.log(`✓ ${outPath} (${frames.length} frames)`)
}
