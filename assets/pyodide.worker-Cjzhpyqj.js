let t=null,r=null;async function f(){return t||(r||(r=(async()=>{const{loadPyodide:e}=await import("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs");return t=await e(),t})().catch(e=>{throw r=null,e})),r)}self.onmessage=async e=>{const{type:a,code:n}=e.data;if(a!=="run")return;const i=performance.now();try{const s=await f(),o=`

import sys
import traceback as _tb

class ExecutionLimitExceeded(Exception):
    pass

_frames = []
_output = []
_step_count = [0]
_call_stack = [{'name': '(main)', 'line': 1, 'args': {}}]
_heap = {}
_heap_counter = [0]

def _serialize_value(v):
    if v is None: return None
    if isinstance(v, bool): return bool(v)
    if isinstance(v, int): return int(v)
    if isinstance(v, float): return float(v)
    if isinstance(v, str): return str(v)
    if isinstance(v, (list, tuple)):
        ref_id = f"ref_{id(v)}"
        return ref_id
    if isinstance(v, dict):
        ref_id = f"ref_{id(v)}"
        return ref_id
    return repr(v)

def _get_type(v):
    if v is None: return 'None'
    return type(v).__name__

def _trace(frame, event, arg):
    global _step_count, _frames
    if event == 'line':
        _step_count[0] += 1
        if _step_count[0] > 1000:
            sys.settrace(None)
            raise ExecutionLimitExceeded("Execution limit of 1000 steps reached")

        lvars = dict(frame.f_locals)
        variables = {}
        prev_vars = _frames[-1]['variables'] if _frames else {}
        for k, v in lvars.items():
            if k.startswith('_'): continue
            sv = _serialize_value(v)
            variables[k] = {
                'value': sv,
                'type': _get_type(v),
                'changed': k not in prev_vars or prev_vars[k]['value'] != sv
            }

        _frames.append({
            'step': len(_frames),
            'line': frame.f_lineno,
            'type': 'normal',
            'isBreakpoint': False,
            'variables': variables,
            'callStack': list(_call_stack),
            'heap': [],
            'output': list(_output),
            'error': None
        })

    elif event == 'call':
        fn_name = frame.f_code.co_name
        if fn_name != '<module>':
            args = {k: _serialize_value(v) for k, v in frame.f_locals.items() if not k.startswith('_')}
            _call_stack.append({'name': fn_name, 'line': frame.f_lineno, 'args': args})
            if _frames:
                _frames[-1]['type'] = 'call'
                _frames[-1]['callStack'] = list(_call_stack)

    elif event == 'return':
        fn_name = frame.f_code.co_name
        if fn_name != '<module>' and len(_call_stack) > 1:
            _call_stack.pop()
            if _frames:
                _frames[-1]['type'] = 'return'

    return _trace

import builtins
_original_print = builtins.print
def _captured_print(*args, **kwargs):
    msg = ' '.join(str(a) for a in args)
    _output.append(msg)
    if _frames:
        _frames[-1]['output'] = list(_output)
builtins.print = _captured_print


try:
    sys.settrace(_trace)
    exec(compile(${JSON.stringify(n)}, '<user_code>', 'exec'))
    sys.settrace(None)
except ExecutionLimitExceeded as e:
    _frames.append({
        'step': len(_frames),
        'line': _frames[-1]['line'] if _frames else 1,
        'type': 'error',
        'isBreakpoint': False,
        'variables': _frames[-1]['variables'] if _frames else {},
        'callStack': list(_call_stack),
        'heap': [],
        'output': list(_output),
        'error': {
            'type': 'ExecutionLimitExceeded',
            'message': str(e),
            'explanation': 'Python execution reached the 1000-step limit.',
            'suggestion': 'Check your loop conditions and recursion base cases.',
            'line': _frames[-1]['line'] if _frames else 1
        }
    })
except Exception as e:
    err_type = type(e).__name__
    err_line = getattr(e, 'lineno', _frames[-1]['line'] if _frames else 1)
    explanations = {
        'NameError': ('You used a name that has not been defined.', 'Check spelling and make sure the variable is defined first.'),
        'TypeError': ('You used a value in a way that does not match its type.', 'Check that you are calling the right method and using the right types.'),
        'IndexError': ('You accessed an index outside the list range.', 'Check that your index is between 0 and len(list)-1.'),
        'ZeroDivisionError': ('You divided by zero.', 'Make sure your divisor is never zero.'),
        'AttributeError': ('You accessed an attribute that does not exist on this object.', 'Check the attribute name for this type.'),
        'SyntaxError': ('Your code has a syntax error.', 'Check for missing colons, parentheses, or indentation errors.'),
    }
    expl, sugg = explanations.get(err_type, (f'An error occurred: {str(e)}', 'Check the highlighted line for mistakes.'))
    _frames.append({
        'step': len(_frames),
        'line': int(err_line) if isinstance(err_line, int) and err_line is not None else (_frames[-1]['line'] if _frames else 1),
        'type': 'error',
        'isBreakpoint': False,
        'variables': _frames[-1]['variables'] if _frames else {},
        'callStack': list(_call_stack),
        'heap': [],
        'output': list(_output),
        'error': {'type': err_type, 'message': str(e), 'explanation': expl, 'suggestion': sugg, 'line': int(err_line) if isinstance(err_line, int) and err_line is not None else 1}
    })
finally:
    sys.settrace(None)
    import builtins
    builtins.print = _original_print

import json as _json
_result = _json.dumps(_frames)
_result
`,l=s.runPython(o),_=JSON.parse(l),c=Math.round(performance.now()-i);self.postMessage({type:"frames",frames:_,elapsedMs:c})}catch(s){self.postMessage({type:"error",error:{type:"RuntimeError",message:String(s),explanation:"An unexpected error occurred while running your Python code.",suggestion:"Check your code for syntax errors.",line:1}})}};
