import type { Language } from '../types/execution'

export interface Snippet { label: string; code: string }

export const SNIPPETS: Record<Language, Snippet[]> = {
  javascript: [
    { label: 'Hello World', code: `console.log("Hello, World!");` },
    { label: 'Variables', code: `let x = 10;\nlet y = 20;\nlet sum = x + y;\nconsole.log(sum);` },
    { label: 'Loop', code: `for (let i = 0; i < 5; i++) {\n  console.log(i);\n}` },
    { label: 'Recursion', code: `function fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}\nconsole.log(fib(5));` },
    { label: 'Error', code: `let x = 10;\nconsole.log(y);` },
  ],
  python: [
    { label: 'Hello World', code: `print("Hello, World!")` },
    { label: 'Variables', code: `x = 10\ny = 20\nsum = x + y\nprint(sum)` },
    { label: 'Loop', code: `for i in range(5):\n    print(i)` },
    { label: 'Recursion', code: `def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\nprint(fib(5))` },
    { label: 'Error', code: `x = 10\nprint(y)` },
  ],
  java: [
    { label: 'Hello World', code: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}` },
    { label: 'Variables', code: `public class Main {\n  public static void main(String[] args) {\n    int x = 10;\n    int y = 20;\n    int sum = x + y;\n    System.out.println(sum);\n  }\n}` },
    { label: 'Loop', code: `public class Main {\n  public static void main(String[] args) {\n    for (int i = 0; i < 5; i++) {\n      System.out.println(i);\n    }\n  }\n}` },
    { label: 'Recursion', code: `public class Main {\n  static int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n-1) + fib(n-2);\n  }\n  public static void main(String[] args) {\n    System.out.println(fib(5));\n  }\n}` },
    { label: 'Error', code: `public class Main {\n  public static void main(String[] args) {\n    int x = 10;\n    System.out.println(y);\n  }\n}` },
  ],
  c: [
    { label: 'Hello World', code: `#include <stdio.h>\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}` },
    { label: 'Variables', code: `#include <stdio.h>\nint main() {\n  int x = 10;\n  int y = 20;\n  int sum = x + y;\n  printf("%d\\n", sum);\n  return 0;\n}` },
    { label: 'Loop', code: `#include <stdio.h>\nint main() {\n  for (int i = 0; i < 5; i++) {\n    printf("%d\\n", i);\n  }\n  return 0;\n}` },
    { label: 'Recursion', code: `#include <stdio.h>\nint fib(int n) {\n  if (n <= 1) return n;\n  return fib(n-1) + fib(n-2);\n}\nint main() {\n  printf("%d\\n", fib(5));\n  return 0;\n}` },
    { label: 'Error', code: `#include <stdio.h>\nint main() {\n  int x = 10;\n  printf("%d\\n", y);\n  return 0;\n}` },
  ],
  cpp: [
    { label: 'Hello World', code: `#include <iostream>\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}` },
    { label: 'Variables', code: `#include <iostream>\nint main() {\n  int x = 10;\n  int y = 20;\n  int sum = x + y;\n  std::cout << sum << std::endl;\n  return 0;\n}` },
    { label: 'Loop', code: `#include <iostream>\nint main() {\n  for (int i = 0; i < 5; i++) {\n    std::cout << i << std::endl;\n  }\n  return 0;\n}` },
    { label: 'Recursion', code: `#include <iostream>\nint fib(int n) {\n  if (n <= 1) return n;\n  return fib(n-1) + fib(n-2);\n}\nint main() {\n  std::cout << fib(5) << std::endl;\n  return 0;\n}` },
    { label: 'Error', code: `#include <iostream>\nint main() {\n  int x = 10;\n  std::cout << y << std::endl;\n  return 0;\n}` },
  ],
  pseudocode: [
    { label: 'Hello World', code: `PRINT "Hello, World!"` },
    { label: 'Variables', code: `SET x = 10\nSET y = 20\nSET sum = x + y\nPRINT sum` },
    { label: 'Loop', code: `FOR i FROM 0 TO 4:\n  PRINT i` },
    { label: 'Recursion', code: `FUNCTION fib(n):\n  IF n <= 1: RETURN n\n  RETURN fib(n-1) + fib(n-2)\nPRINT fib(5)` },
    { label: 'Error', code: `SET x = 10\nPRINT y` },
  ],
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  pseudocode: 'Pseudocode',
}
