new function () {

function Eval(expr) {
  if (!(this instanceof Eval)) return new Eval(expr); // Enable use of `e = Eval(expr)`

  // TODO: fix string matching
  var tokenizer = /(?:([({[])|([\])}])|(\.)?((?!\d)(?:(?!\s)[$\w\u0080-\uFFFF]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]{1,6}\})+)|((?:0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)|(['"])(?:(?!\2|\\).|\\(?:\r\n|[\s\S]))*(\2)?|`(?:[^`\\$]|\\[\s\S]|\$(?!\{)|\$\{(?:[^{}]|\{[^}]*\}?)*\}?)*(`)?|\/(?!\*)(?:\[(?:(?![\]\\]).|\\.)*\]|(?![\/\]\\]).|\\.)+\/(?:(?!\s*(?:\b|[\u0080-\uFFFF$\\'"~({]|[+\-!](?!=)|\.?\d))|[gmiyu]{1,5}\b(?![\u0080-\uFFFF$\\]|\s*(?:[+\-*%&|^<>!=?({]|\/(?![\/*])))))|((?:(?!\d)[\x00-\x40])+)|\S)[^\S\n]*/g;

  expr = expr.replace(/\/\/.*|\/\*(?:[^*]|\*(?!\/))*(\*\/)?/g, ''); // Remove comments from expression

  var tokens = [], exprOffsets = [], exprOffset = 0, match;

  var vars = {};

  // TODO: handle assignments
  while (match = tokenizer.exec(expr)) {
    var token = match[0], open = match[1], close = match[2], dot = match[3], name = match[4], literal = match[5], punctuator = match[9];

    if (open) {
      if (open == '[') {
        tokens.splice(exprOffset, 0, 'this(');
        token = ', ';
      }
      exprOffsets.push(exprOffset);
      exprOffset = tokens.length+1;
    }
    else if (dot) {
      tokens.splice(exprOffset, 0, 'this(');
      token = ", '"+name+"')";
    }
    else if (name) {
      vars[name] = name;
      exprOffset = tokens.length;
    }
    else if (literal) {
      exprOffset = tokens.length;
    }
    else if (close) {
      exprOffset = exprOffsets.pop();
      if (close == ']') {
        token = ')';
      }
    }
    else {
      exprOffset = tokens.length+1;
    }
    tokens.push(token);
  }

  // TODO: no eval if no [;}\n] token occurs
  expr = tokens.join('');
  expr = 'eval("'+expr.replace(/"/g, '\"')+'")';

  this.observe = observe;

  function observe(thisArg, scopes, callback) {
    scopes = [].slice.call(arguments, 1);
    callback = scopes.pop();
    if (thisArg == null) thisArg = window;

    var value, computing, observed;

    // Use `new Function` to isolate code from variables of the local scope
    var body = 'return '+expr;
    for (var i = 0; i < scopes.length; i++) body = 'with (this.scopes['+i+']) { '+body+' }';
    var func = new Function(body).bind(getProperty);

    for (var name in vars) if (vars.hasOwnProperty(name)) {
      for (var j = 0; j < scopes.length; j++) observe(scopes[j], name);
    }

    return compute();

    function compute() {
      if (computing) return;
      getProperty.scopes = scopes;
      for (var key in thisArg) getProperty[key] = null; // Cause `(key in this) == true`

      computing = true;
      var lastValue = value;
      value = undefined; // `undefined` is the default in case that `func` fails
      try {
        value = func();
        return value;
      } finally {
        computing = false;
        if (value !== lastValue) callback(value);
      }
    }
    function getProperty(obj, key) {
      if (obj == getProperty) obj = thisArg; // Catch `this.key`, which translates to `this(this, 'key')`

      observed = false;
      var value = obj[key];
      if (!observed) observe(obj, key); // Add observer if it does not exist
      return value;
    }
    function observe(obj, key) {
      var desc = Object.getOwnPropertyDescriptor(obj, key), propObserved;
      if (!desc) desc = { configurable: true, enumerable: key in obj, value: obj[key], writable: true };

      Object.defineProperty(obj, key, { configurable: desc.configurable, enumerable: desc.enumerable, get: get, set: set });

      function get() {
        observed = propObserved = true; // Indicate that the property is already observed
        return (typeof desc.get == 'function') ? desc.get.call(obj) : desc.value;
      }
      function set(newValue) {
        if (typeof desc.set == 'function') {
          desc.set.call(obj, newValue);
        } else {
          if (!desc.writable) return;
          desc.value = newValue;
        }
        propObserved = false;
        compute(); // Compute and notify callback
        // Remove the observer if the current property is not read upon evaluation
        // TODO: Remove actively instead of lazily (dependency collection)
        if (!propObserved) Object.defineProperty(obj, key, desc);
      }
    }
  }
}

window.Eval = Eval;

}