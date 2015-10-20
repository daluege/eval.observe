new function () {

function Eval(expr) {
  if (!(this instanceof Eval)) return new Eval(expr); // Enable `e = Eval(expr)`

  var tokenizer = /(?:([({[])|([\])}])|(\.)?((?!\d)(?:(?!\s)[$\w\u0080-\uFFFF]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]{1,6}\})+)|((?:0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)|(['"])(?:(?!\2|\\).|\\(?:\r\n|[\s\S]))*(\2)?|`(?:[^`\\$]|\\[\s\S]|\$(?!\{)|\$\{(?:[^{}]|\{[^}]*\}?)*\}?)*(`)?|\/(?!\*)(?:\[(?:(?![\]\\]).|\\.)*\]|(?![\/\]\\]).|\\.)+\/(?:(?!\s*(?:\b|[\u0080-\uFFFF$\\'"~({]|[+\-!](?!=)|\.?\d))|[gmiyu]{1,5}\b(?![\u0080-\uFFFF$\\]|\s*(?:[+\-*%&|^<>!=?({]|\/(?![\/*])))))|((?:(?!\d)[\x00-\x40])+)|\S)[^\S\n]*/g;

  expr = expr.replace(/\/\/.*|\/\*(?:[^*]|\*(?!\/))*(\*\/)?/g, ''); // Remove comments from expression

  var tokens = [], exprOffsets = [], exprOffset = 0, match;

  var vars = {};

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

  expr = tokens.join('');
  expr = 'eval("'+expr.replace(/"/g, '\"')+'")';

  this.observe = observe;
  this.exec = exec;

  function exec(thisArg, scopes) {
    // ...
  }
  function observe(thisArg, scopes, callback) {
    scopes = [].slice.call(arguments, 1);
    callback = scopes.pop();
    if (thisArg == null) thisArg = window;

    var observers = {}, computing;

    // Use `new Function` to isolate code from variables of the local scope
    var body = 'return '+expr;
    for (var i = 0; i < scopes.length; i++) body = 'with (this.scopes['+i+']) { '+body+' }';
    var func = new Function(body);
    this.func = func;

    for (var name in vars) if (vars.hasOwnProperty(name)) {
      for (var j = 0; j < scopes.length; j++) observe(scopes[j], name);
    }

    return compute();

    function compute() {
      if (computing) return;
      try {
        computing = true;
        getProperty.scopes = scopes;
        for (var key in thisArg) getProperty[key] = null; // Cause `(key in this) == true`
        var value = func.call(getProperty);
        computing = false;
        callback(value);
        return value;
      } finally {
        computing = false;
      }
    }
    function getProperty(obj, key) {
      if (obj == getProperty) obj = thisArg; // Catch `this.key`, which translates to `this(this, 'key')`
      var value = obj[key];
      observe(obj, key);
      return value;
    }
    function observe(obj, key) {
      if ((key in observers) && observers.hasOwnProperty(key)) {
        for (var observer = observers[key], i = 0; i < observer.length; i++) if (observer[i] == obj) return;
      }

      var value = obj[key];
      // TODO: respect current Object.getPropertyDescriptor
      Object.defineProperty(obj, key, { configurable: true, enumerable: key in obj, get: get, set: set });

      observers[key] = obj;

      function get() {
        return value;
      }
      function set(newValue) {
        value = newValue;
        compute();
      }
    }
  }
}

window.Eval = Eval;

}