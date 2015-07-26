require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseAssign = require('lodash._baseassign'),
    createAssigner = require('lodash._createassigner'),
    keys = require('lodash.keys');

/**
 * A specialized version of `_.assign` for customizing assigned values without
 * support for argument juggling, multiple sources, and `this` binding `customizer`
 * functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} customizer The function to customize assigned values.
 * @returns {Object} Returns `object`.
 */
function assignWith(object, source, customizer) {
  var index = -1,
      props = keys(source),
      length = props.length;

  while (++index < length) {
    var key = props[index],
        value = object[key],
        result = customizer(value, source[key], key, object, source);

    if ((result === result ? (result !== value) : (value === value)) ||
        (value === undefined && !(key in object))) {
      object[key] = result;
    }
  }
  return object;
}

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it is invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * **Note:** This method mutates `object` and is based on
 * [`Object.assign`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign).
 *
 * @static
 * @memberOf _
 * @alias extend
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
 * // => { 'user': 'fred', 'age': 40 }
 *
 * // using a customizer callback
 * var defaults = _.partialRight(_.assign, function(value, other) {
 *   return _.isUndefined(value) ? other : value;
 * });
 *
 * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var assign = createAssigner(function(object, source, customizer) {
  return customizer
    ? assignWith(object, source, customizer)
    : baseAssign(object, source);
});

module.exports = assign;

},{"lodash._baseassign":2,"lodash._createassigner":4,"lodash.keys":8}],2:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseCopy = require('lodash._basecopy'),
    keys = require('lodash.keys');

/**
 * The base implementation of `_.assign` without support for argument juggling,
 * multiple sources, and `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return source == null
    ? object
    : baseCopy(source, keys(source), object);
}

module.exports = baseAssign;

},{"lodash._basecopy":3,"lodash.keys":8}],3:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property names to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, props, object) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

},{}],4:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var bindCallback = require('lodash._bindcallback'),
    isIterateeCall = require('lodash._isiterateecall'),
    restParam = require('lodash.restparam');

/**
 * Creates a function that assigns properties of source object(s) to a given
 * destination object.
 *
 * **Note:** This function is used to create `_.assign`, `_.defaults`, and `_.merge`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return restParam(function(object, sources) {
    var index = -1,
        length = object == null ? 0 : sources.length,
        customizer = length > 2 ? sources[length - 2] : undefined,
        guard = length > 2 ? sources[2] : undefined,
        thisArg = length > 1 ? sources[length - 1] : undefined;

    if (typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = typeof thisArg == 'function' ? thisArg : undefined;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"lodash._bindcallback":5,"lodash._isiterateecall":6,"lodash.restparam":7}],5:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = bindCallback;

},{}],6:[function(require,module,exports){
/**
 * lodash 3.0.9 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
      ? (isArrayLike(object) && isIndex(index, object.length))
      : (type == 'string' && index in object)) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isIterateeCall;

},{}],7:[function(require,module,exports){
/**
 * lodash 3.6.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],8:[function(require,module,exports){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative'),
    isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keys;

},{"lodash._getnative":9,"lodash.isarguments":10,"lodash.isarray":11}],9:[function(require,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}],10:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

},{}],11:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],12:[function(require,module,exports){
(function (global){

var d3 = (typeof window !== "undefined" ? window['d3'] : typeof global !== "undefined" ? global['d3'] : null);

var gAxis = (function() {
  var _d3axis = d3.svg.axis()
      .orient('top')
      .ticks(14)
      .tickFormat(d3.format('s'))
    , _height = 0
    , _offset  = [0, 0]; //[x, y] shift from parent

  function updateTickLines(selection) {
    var t = _d3axis.ticks();
    selection.selectAll('.tick').select('line')
      .attr('y2', _height - _offset[1]);
  }

  var _axis = function(selection) {
    if (selection !== undefined) {
      selection
        .attr('transform', "translate(" + _offset[0] + "," + _offset[1] + ")")
        .attr('class', 'genecluster-topaxis')
        .call(_d3axis)
        .call(updateTickLines)
    }
    _axis.update = function() {
      selection.call(_d3axis);
      _axis.adjustTickLine();
      return _axis;
    };
    _axis.adjustTickLine = function() {
      selection.call(updateTickLines)
    };
    return _axis;
  };

  _axis.offset = function(arg) {
    if (arg) {
      _offset = arg;
      return _axis;
    } else {
      return _offset;
    }
  };

  _axis.scale = function(arg) {
    _d3axis.scale(arg);
    return _axis;
  };

  _axis.height = function(arg) {
    _height = arg;
    return _axis;
  };

  return _axis;
})();

module.exports = gAxis;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],13:[function(require,module,exports){

var bandsData = require('../data/ideogram_9606_850.json');

function getBandsOnSegment(segment) {
  var filtered = [];
  var foundFirst = false;
  for (var i = 0; i < bandsData.length; ++i) {
    var band = bandsData[i];
    if (foundFirst) {
      if (band['#chromosome'] != segment) {
        break;
      }
    }
    if (band['#chromosome'] == segment) {
      foundFirst = true;
      filtered.push(band)
    }
  }
  return filtered;
}

var cytoBands = (function() {

  var _segment  = '1'
    , _offset   = [0, 0]
    , _width    = 0
    , _xscale   = null
    , _bands    = null
    , _labels   = null

  var BAND_HEIGHT = 22;

  function updateBands() {
    if (_bands) {
      _bands
        .attr('x', function (d) {
          return _xscale(d.bp_start);
        })
        .attr('y', 0)
        .attr('width', function (d) {
          return _xscale(d.bp_stop) - _xscale(d.bp_start);
        });

      _labels
        .attr('x', function(d) {
          var w = _xscale(d.bp_stop) - _xscale(d.bp_start);
          var currentDomain = _xscale.domain();
          if (w > _width && (d.bp_start < currentDomain[0] && d.bp_stop > currentDomain[1])) {
            return _width / 2;
          } else {
            return (_xscale(d.bp_stop) + _xscale(d.bp_start)) / 2 - 10;
          }
        })
    }
  }

  var _cytoBands = function(selection, width) {

    if (width) {
      _width = width;
    }

    if (selection !== undefined) {
      var bandData = getBandsOnSegment(_segment);

      var g = selection
        .attr('transform', "translate(" + _offset[0] + "," + _offset[1] + ")")
        .attr('class', 'genecluster-band')
        .selectAll('g')
        .data(bandData)
        .enter()
        .append('g')
        .attr('class', function(d) {
          var c =  d.stain;
          if (d.density) {
            c += '-' + d.density;
          }
          return c
        });

      _bands = g.append('rect')
        .attr('height', BAND_HEIGHT);

      _labels = g.append('text')
        .text(function(d) {
          return d.arm + d.band;
        })
        .attr('y', (BAND_HEIGHT/2) + 4);


      updateBands();

    }
    return _cytoBands;
  };

  _cytoBands.segment = function(arg) {
    if (arg) {
      _segment = arg;
      return _cytoBands;
    } else {
      return _segment;
    }
  };

  _cytoBands.scale = function(arg) {
    if (arg) {
      _xscale = arg;
      return _cytoBands;
    } else {
      return _xscale;
    }
  };

  _cytoBands.offset = function(arg) {
    if (arg) {
      _offset = arg;
      return _cytoBands;
    } else {
      return _offset;
    }
  };

  _cytoBands.update = function() {
    updateBands();
  };

  return _cytoBands;
})();

module.exports = cytoBands;
},{"../data/ideogram_9606_850.json":15}],14:[function(require,module,exports){
(function (global){

var d3          = (typeof window !== "undefined" ? window['d3'] : typeof global !== "undefined" ? global['d3'] : null)
  , assign      = require('lodash.assign')

var bAxis       = require('./browser-axis.js')
  , bBands   = require('./browser-bands.js')

var browser = (function() {

  function _constructor(args) {

    var options = assign({
      //default options
      target : null,
      width : 1000,
      height : 250,
      specie : 'human',
      region : {
        segment: '22',
        start: '1',
        stop: '5000000'
      }
    }, args);

    var domTarget = options.target ? d3.select(options.target) : d3.selection()
      , yOffset = 25
      , svgTarget = null

      , xscale = d3.scale.linear()
        .domain([options.region.start - 100000, options.region.stop + 20000])
        .range([0, options.width])

      , svgTopAxis = bAxis()
        .height(options.height)
        .offset([0, yOffset])
        .scale(xscale)

      , zoomBehaviour = d3.behavior.zoom()
        .x(xscale)
        .scaleExtent([1, 1000])

      , svgCytoBands = bBands(undefined, options.width)
        .scale(xscale)
        .offset([0, yOffset + 1])
        .segment(options.region.segment)

      this.render = function() {
      domTarget
          .style('width', options.width + 'px')
          .style('height', options.height + 'px')
          .style('border', '1px solid #BDBDBD');

      svgTarget = domTarget
        .append('svg')
        .attr('class', 'genecluster-vis')
        .attr('width', options.width)
        .attr('height', options.height);

      svgTarget.call(zoomBehaviour);
      zoomBehaviour.on('zoom', this.update);

      svgTarget
        .append('g')
        .call(svgTopAxis);

      svgTarget.append('g')
        .call(svgCytoBands);
    };

    this.update = function() {
      svgTopAxis.update();
      svgCytoBands.update();
    }
  }

  return _constructor;
})();

module.exports = browser;



}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./browser-axis.js":12,"./browser-bands.js":13,"lodash.assign":1}],15:[function(require,module,exports){
module.exports=[{
  "#chromosome": 1,
  "arm": "p",
  "band": 36.33,
  "iscn_start": 0,
  "iscn_stop": 100,
  "bp_start": 1,
  "bp_stop": 2300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 36.32,
  "iscn_start": 100,
  "iscn_stop": 244,
  "bp_start": 2300001,
  "bp_stop": 5300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 36.31,
  "iscn_start": 244,
  "iscn_stop": 344,
  "bp_start": 5300001,
  "bp_stop": 7100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 36.23,
  "iscn_start": 344,
  "iscn_stop": 459,
  "bp_start": 7100001,
  "bp_stop": 9100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 36.22,
  "iscn_start": 459,
  "iscn_stop": 660,
  "bp_start": 9100001,
  "bp_stop": 12500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 36.21,
  "iscn_start": 660,
  "iscn_stop": 861,
  "bp_start": 12500001,
  "bp_stop": 15900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 36.13,
  "iscn_start": 861,
  "iscn_stop": 1206,
  "bp_start": 15900001,
  "bp_stop": 20100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 36.12,
  "iscn_start": 1206,
  "iscn_stop": 1321,
  "bp_start": 20100001,
  "bp_stop": 23600000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 36.11,
  "iscn_start": 1321,
  "iscn_stop": 1521,
  "bp_start": 23600001,
  "bp_stop": 27600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 35.3,
  "iscn_start": 1521,
  "iscn_stop": 1651,
  "bp_start": 27600001,
  "bp_stop": 29900000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 35.2,
  "iscn_start": 1651,
  "iscn_stop": 1780,
  "bp_start": 29900001,
  "bp_stop": 32300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 35.1,
  "iscn_start": 1780,
  "iscn_stop": 1895,
  "bp_start": 32300001,
  "bp_stop": 34300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 34.3,
  "iscn_start": 1895,
  "iscn_stop": 2210,
  "bp_start": 34300001,
  "bp_stop": 39600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 34.2,
  "iscn_start": 2210,
  "iscn_stop": 2411,
  "bp_start": 39600001,
  "bp_stop": 43700000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 34.1,
  "iscn_start": 2411,
  "iscn_stop": 2770,
  "bp_start": 43700001,
  "bp_stop": 46300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 33,
  "iscn_start": 2770,
  "iscn_stop": 2986,
  "bp_start": 46300001,
  "bp_stop": 50200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 32.3,
  "iscn_start": 2986,
  "iscn_stop": 3273,
  "bp_start": 50200001,
  "bp_stop": 55600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 32.2,
  "iscn_start": 3273,
  "iscn_stop": 3416,
  "bp_start": 55600001,
  "bp_stop": 58500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 32.1,
  "iscn_start": 3416,
  "iscn_stop": 3732,
  "bp_start": 58500001,
  "bp_stop": 60800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 31.3,
  "iscn_start": 3732,
  "iscn_stop": 3976,
  "bp_start": 60800001,
  "bp_stop": 68500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 31.2,
  "iscn_start": 3976,
  "iscn_stop": 4206,
  "bp_start": 68500001,
  "bp_stop": 69300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 31.1,
  "iscn_start": 4206,
  "iscn_stop": 4852,
  "bp_start": 69300001,
  "bp_stop": 84400000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 22.3,
  "iscn_start": 4852,
  "iscn_stop": 5210,
  "bp_start": 84400001,
  "bp_stop": 87900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 22.2,
  "iscn_start": 5210,
  "iscn_stop": 5440,
  "bp_start": 87900001,
  "bp_stop": 91500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 22.1,
  "iscn_start": 5440,
  "iscn_stop": 5741,
  "bp_start": 91500001,
  "bp_stop": 94300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 21.3,
  "iscn_start": 5741,
  "iscn_stop": 5957,
  "bp_start": 94300001,
  "bp_stop": 99300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 21.2,
  "iscn_start": 5957,
  "iscn_stop": 6029,
  "bp_start": 99300001,
  "bp_stop": 101800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 21.1,
  "iscn_start": 6029,
  "iscn_stop": 6244,
  "bp_start": 101800001,
  "bp_stop": 106700000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 13.3,
  "iscn_start": 6244,
  "iscn_stop": 6459,
  "bp_start": 106700001,
  "bp_stop": 111200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 13.2,
  "iscn_start": 6459,
  "iscn_stop": 6660,
  "bp_start": 111200001,
  "bp_stop": 115500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 13.1,
  "iscn_start": 6660,
  "iscn_stop": 6861,
  "bp_start": 115500001,
  "bp_stop": 117200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 12,
  "iscn_start": 6861,
  "iscn_stop": 7048,
  "bp_start": 117200001,
  "bp_stop": 120400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 7048,
  "iscn_stop": 7119,
  "bp_start": 120400001,
  "bp_stop": 121700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 7119,
  "iscn_stop": 7335,
  "bp_start": 121700001,
  "bp_stop": 123400000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 11,
  "iscn_start": 7335,
  "iscn_stop": 7579,
  "bp_start": 123400001,
  "bp_stop": 125100000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 12,
  "iscn_start": 7579,
  "iscn_stop": 8483,
  "bp_start": 125100001,
  "bp_stop": 143200000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 8483,
  "iscn_stop": 8756,
  "bp_start": 143200001,
  "bp_stop": 147500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 8756,
  "iscn_stop": 8957,
  "bp_start": 147500001,
  "bp_stop": 150600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 8957,
  "iscn_stop": 9244,
  "bp_start": 150600001,
  "bp_stop": 155100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 22,
  "iscn_start": 9244,
  "iscn_stop": 9459,
  "bp_start": 155100001,
  "bp_stop": 156600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 9459,
  "iscn_stop": 9832,
  "bp_start": 156600001,
  "bp_stop": 159100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 9832,
  "iscn_stop": 10048,
  "bp_start": 159100001,
  "bp_stop": 160500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 10048,
  "iscn_stop": 10349,
  "bp_start": 160500001,
  "bp_stop": 165500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 10349,
  "iscn_stop": 10507,
  "bp_start": 165500001,
  "bp_stop": 167200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 10507,
  "iscn_stop": 10679,
  "bp_start": 167200001,
  "bp_stop": 170900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 10679,
  "iscn_stop": 10894,
  "bp_start": 170900001,
  "bp_stop": 173000000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 25.1,
  "iscn_start": 10894,
  "iscn_stop": 11009,
  "bp_start": 173000001,
  "bp_stop": 176100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 25.2,
  "iscn_start": 11009,
  "iscn_stop": 11196,
  "bp_start": 176100001,
  "bp_stop": 180300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 25.3,
  "iscn_start": 11196,
  "iscn_stop": 11598,
  "bp_start": 180300001,
  "bp_stop": 185800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 31.1,
  "iscn_start": 11598,
  "iscn_stop": 11827,
  "bp_start": 185800001,
  "bp_stop": 190800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 31.2,
  "iscn_start": 11827,
  "iscn_stop": 11942,
  "bp_start": 190800001,
  "bp_stop": 193800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 31.3,
  "iscn_start": 11942,
  "iscn_stop": 12172,
  "bp_start": 193800001,
  "bp_stop": 198700000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 32.1,
  "iscn_start": 12172,
  "iscn_stop": 12617,
  "bp_start": 198700001,
  "bp_stop": 207100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 32.2,
  "iscn_start": 12617,
  "iscn_stop": 12803,
  "bp_start": 207100001,
  "bp_stop": 211300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 32.3,
  "iscn_start": 12803,
  "iscn_stop": 13033,
  "bp_start": 211300001,
  "bp_stop": 214400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 41,
  "iscn_start": 13033,
  "iscn_stop": 13320,
  "bp_start": 214400001,
  "bp_stop": 223900000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 42.11,
  "iscn_start": 13320,
  "iscn_stop": 13406,
  "bp_start": 223900001,
  "bp_stop": 224400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 42.12,
  "iscn_start": 13406,
  "iscn_stop": 13607,
  "bp_start": 224400001,
  "bp_stop": 226800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 42.13,
  "iscn_start": 13607,
  "iscn_stop": 13966,
  "bp_start": 226800001,
  "bp_stop": 230500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 42.2,
  "iscn_start": 13966,
  "iscn_stop": 14153,
  "bp_start": 230500001,
  "bp_stop": 234600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 42.3,
  "iscn_start": 14153,
  "iscn_stop": 14397,
  "bp_start": 234600001,
  "bp_stop": 236400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 43,
  "iscn_start": 14397,
  "iscn_stop": 14756,
  "bp_start": 236400001,
  "bp_stop": 243500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 1,
  "arm": "q",
  "band": 44,
  "iscn_start": 14756,
  "iscn_stop": 15100,
  "bp_start": 243500001,
  "bp_stop": 248956422,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 25.3,
  "iscn_start": 0,
  "iscn_stop": 388,
  "bp_start": 1,
  "bp_stop": 4400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 25.2,
  "iscn_start": 388,
  "iscn_stop": 566,
  "bp_start": 4400001,
  "bp_stop": 6900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 25.1,
  "iscn_start": 566,
  "iscn_stop": 954,
  "bp_start": 6900001,
  "bp_stop": 12000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 24.3,
  "iscn_start": 954,
  "iscn_stop": 1193,
  "bp_start": 12000001,
  "bp_stop": 16500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 24.2,
  "iscn_start": 1193,
  "iscn_stop": 1312,
  "bp_start": 16500001,
  "bp_stop": 19000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 24.1,
  "iscn_start": 1312,
  "iscn_stop": 1565,
  "bp_start": 19000001,
  "bp_stop": 23800000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 23.3,
  "iscn_start": 1565,
  "iscn_stop": 1789,
  "bp_start": 23800001,
  "bp_stop": 27700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 23.2,
  "iscn_start": 1789,
  "iscn_stop": 1908,
  "bp_start": 27700001,
  "bp_stop": 29800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 23.1,
  "iscn_start": 1908,
  "iscn_stop": 2027,
  "bp_start": 29800001,
  "bp_stop": 31800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 22.3,
  "iscn_start": 2027,
  "iscn_stop": 2296,
  "bp_start": 31800001,
  "bp_stop": 36300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 22.2,
  "iscn_start": 2296,
  "iscn_stop": 2415,
  "bp_start": 36300001,
  "bp_stop": 38300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 22.1,
  "iscn_start": 2415,
  "iscn_stop": 2609,
  "bp_start": 38300001,
  "bp_stop": 41500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 21,
  "iscn_start": 2609,
  "iscn_stop": 2966,
  "bp_start": 41500001,
  "bp_stop": 47500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 16.3,
  "iscn_start": 2966,
  "iscn_stop": 3220,
  "bp_start": 47500001,
  "bp_stop": 52600000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 16.2,
  "iscn_start": 3220,
  "iscn_stop": 3294,
  "bp_start": 52600001,
  "bp_stop": 54700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 16.1,
  "iscn_start": 3294,
  "iscn_stop": 3548,
  "bp_start": 54700001,
  "bp_stop": 61000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 15,
  "iscn_start": 3548,
  "iscn_stop": 3757,
  "bp_start": 61000001,
  "bp_stop": 63900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 14,
  "iscn_start": 3757,
  "iscn_stop": 3935,
  "bp_start": 63900001,
  "bp_stop": 68400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 13.3,
  "iscn_start": 3935,
  "iscn_stop": 4114,
  "bp_start": 68400001,
  "bp_stop": 71300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 13.2,
  "iscn_start": 4114,
  "iscn_stop": 4248,
  "bp_start": 71300001,
  "bp_stop": 73300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 13.1,
  "iscn_start": 4248,
  "iscn_stop": 4353,
  "bp_start": 73300001,
  "bp_stop": 74800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 12,
  "iscn_start": 4353,
  "iscn_stop": 4860,
  "bp_start": 74800001,
  "bp_stop": 83100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 4860,
  "iscn_stop": 5307,
  "bp_start": 83100001,
  "bp_stop": 91800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 5307,
  "iscn_stop": 5545,
  "bp_start": 91800001,
  "bp_stop": 93900000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 5545,
  "iscn_stop": 5724,
  "bp_start": 93900001,
  "bp_stop": 96000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 5724,
  "iscn_stop": 6022,
  "bp_start": 96000001,
  "bp_stop": 102100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 12.1,
  "iscn_start": 6022,
  "iscn_stop": 6261,
  "bp_start": 102100001,
  "bp_stop": 105300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 6261,
  "iscn_stop": 6395,
  "bp_start": 105300001,
  "bp_stop": 106700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 12.3,
  "iscn_start": 6395,
  "iscn_stop": 6559,
  "bp_start": 106700001,
  "bp_stop": 108700000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 13,
  "iscn_start": 6559,
  "iscn_stop": 6812,
  "bp_start": 108700001,
  "bp_stop": 112200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 14.1,
  "iscn_start": 6812,
  "iscn_stop": 7036,
  "bp_start": 112200001,
  "bp_stop": 118100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 14.2,
  "iscn_start": 7036,
  "iscn_stop": 7334,
  "bp_start": 118100001,
  "bp_stop": 121600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 14.3,
  "iscn_start": 7334,
  "iscn_stop": 7602,
  "bp_start": 121600001,
  "bp_stop": 129100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 7602,
  "iscn_stop": 7826,
  "bp_start": 129100001,
  "bp_stop": 131700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 7826,
  "iscn_stop": 8050,
  "bp_start": 131700001,
  "bp_stop": 134300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 8050,
  "iscn_stop": 8169,
  "bp_start": 134300001,
  "bp_stop": 136100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 8169,
  "iscn_stop": 8437,
  "bp_start": 136100001,
  "bp_stop": 141500000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 8437,
  "iscn_stop": 8497,
  "bp_start": 141500001,
  "bp_stop": 143400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 8497,
  "iscn_stop": 8646,
  "bp_start": 143400001,
  "bp_stop": 147900000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 8646,
  "iscn_stop": 8735,
  "bp_start": 147900001,
  "bp_stop": 149000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 8735,
  "iscn_stop": 8795,
  "bp_start": 149000001,
  "bp_stop": 149600000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 8795,
  "iscn_stop": 9078,
  "bp_start": 149600001,
  "bp_stop": 154000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 9078,
  "iscn_stop": 9361,
  "bp_start": 154000001,
  "bp_stop": 158900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 9361,
  "iscn_stop": 9585,
  "bp_start": 158900001,
  "bp_stop": 162900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 9585,
  "iscn_stop": 9928,
  "bp_start": 162900001,
  "bp_stop": 168900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 31.1,
  "iscn_start": 9928,
  "iscn_stop": 10435,
  "bp_start": 168900001,
  "bp_stop": 177100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 31.2,
  "iscn_start": 10435,
  "iscn_stop": 10599,
  "bp_start": 177100001,
  "bp_stop": 179700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 31.3,
  "iscn_start": 10599,
  "iscn_stop": 10733,
  "bp_start": 179700001,
  "bp_stop": 182100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 32.1,
  "iscn_start": 10733,
  "iscn_stop": 11091,
  "bp_start": 182100001,
  "bp_stop": 188500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 32.2,
  "iscn_start": 11091,
  "iscn_stop": 11225,
  "bp_start": 188500001,
  "bp_stop": 191100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 32.3,
  "iscn_start": 11225,
  "iscn_stop": 11538,
  "bp_start": 191100001,
  "bp_stop": 196600000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 33.1,
  "iscn_start": 11538,
  "iscn_stop": 11925,
  "bp_start": 196600001,
  "bp_stop": 202500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 33.2,
  "iscn_start": 11925,
  "iscn_stop": 12060,
  "bp_start": 202500001,
  "bp_stop": 204100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 33.3,
  "iscn_start": 12060,
  "iscn_stop": 12283,
  "bp_start": 204100001,
  "bp_stop": 208200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 34,
  "iscn_start": 12283,
  "iscn_stop": 12641,
  "bp_start": 208200001,
  "bp_stop": 214500000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 35,
  "iscn_start": 12641,
  "iscn_stop": 13014,
  "bp_start": 214500001,
  "bp_stop": 220700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 36.1,
  "iscn_start": 13014,
  "iscn_stop": 13237,
  "bp_start": 220700001,
  "bp_stop": 224300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 36.2,
  "iscn_start": 13237,
  "iscn_stop": 13297,
  "bp_start": 224300001,
  "bp_stop": 225200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 36.3,
  "iscn_start": 13297,
  "iscn_stop": 13595,
  "bp_start": 225200001,
  "bp_stop": 230100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 37.1,
  "iscn_start": 13595,
  "iscn_stop": 13893,
  "bp_start": 230100001,
  "bp_stop": 234700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 37.2,
  "iscn_start": 13893,
  "iscn_stop": 13998,
  "bp_start": 234700001,
  "bp_stop": 236400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 2,
  "arm": "q",
  "band": 37.3,
  "iscn_start": 13998,
  "iscn_stop": 14400,
  "bp_start": 236400001,
  "bp_stop": 242193529,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 26.3,
  "iscn_start": 0,
  "iscn_stop": 175,
  "bp_start": 1,
  "bp_stop": 2800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 26.2,
  "iscn_start": 175,
  "iscn_stop": 263,
  "bp_start": 2800001,
  "bp_stop": 4000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 26.1,
  "iscn_start": 263,
  "iscn_stop": 408,
  "bp_start": 4000001,
  "bp_stop": 8100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 25.3,
  "iscn_start": 408,
  "iscn_stop": 642,
  "bp_start": 8100001,
  "bp_stop": 11600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 25.2,
  "iscn_start": 642,
  "iscn_stop": 759,
  "bp_start": 11600001,
  "bp_stop": 13200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 25.1,
  "iscn_start": 759,
  "iscn_stop": 963,
  "bp_start": 13200001,
  "bp_stop": 16300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 24.3,
  "iscn_start": 963,
  "iscn_stop": 1269,
  "bp_start": 16300001,
  "bp_stop": 23800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 24.2,
  "iscn_start": 1269,
  "iscn_stop": 1357,
  "bp_start": 23800001,
  "bp_stop": 26300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 24.1,
  "iscn_start": 1357,
  "iscn_stop": 1561,
  "bp_start": 26300001,
  "bp_stop": 30800000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 23,
  "iscn_start": 1561,
  "iscn_stop": 1751,
  "bp_start": 30800001,
  "bp_stop": 32000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 22.3,
  "iscn_start": 1751,
  "iscn_stop": 1926,
  "bp_start": 32000001,
  "bp_stop": 36400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 22.2,
  "iscn_start": 1926,
  "iscn_stop": 2013,
  "bp_start": 36400001,
  "bp_stop": 39300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 22.1,
  "iscn_start": 2013,
  "iscn_stop": 2188,
  "bp_start": 39300001,
  "bp_stop": 43600000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 21.33,
  "iscn_start": 2188,
  "iscn_stop": 2451,
  "bp_start": 43600001,
  "bp_stop": 44100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 21.32,
  "iscn_start": 2451,
  "iscn_stop": 2626,
  "bp_start": 44100001,
  "bp_stop": 44200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 21.31,
  "iscn_start": 2626,
  "iscn_stop": 3239,
  "bp_start": 44200001,
  "bp_stop": 50600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 21.2,
  "iscn_start": 3239,
  "iscn_stop": 3385,
  "bp_start": 50600001,
  "bp_stop": 52300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 21.1,
  "iscn_start": 3385,
  "iscn_stop": 3676,
  "bp_start": 52300001,
  "bp_stop": 54400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 14.3,
  "iscn_start": 3676,
  "iscn_stop": 3910,
  "bp_start": 54400001,
  "bp_stop": 58600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 14.2,
  "iscn_start": 3910,
  "iscn_stop": 4143,
  "bp_start": 58600001,
  "bp_stop": 63800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 14.1,
  "iscn_start": 4143,
  "iscn_stop": 4362,
  "bp_start": 63800001,
  "bp_stop": 69700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 13,
  "iscn_start": 4362,
  "iscn_stop": 4566,
  "bp_start": 69700001,
  "bp_stop": 74100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 12.3,
  "iscn_start": 4566,
  "iscn_stop": 4814,
  "bp_start": 74100001,
  "bp_stop": 79800000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 12.2,
  "iscn_start": 4814,
  "iscn_stop": 4946,
  "bp_start": 79800001,
  "bp_stop": 83500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 12.1,
  "iscn_start": 4946,
  "iscn_stop": 5077,
  "bp_start": 83500001,
  "bp_stop": 87100000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 5077,
  "iscn_stop": 5135,
  "bp_start": 87100001,
  "bp_stop": 87800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 5135,
  "iscn_stop": 5266,
  "bp_start": 87800001,
  "bp_stop": 90900000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 5266,
  "iscn_stop": 5427,
  "bp_start": 90900001,
  "bp_stop": 94000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 5427,
  "iscn_stop": 5602,
  "bp_start": 94000001,
  "bp_stop": 98600000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 12.1,
  "iscn_start": 5602,
  "iscn_stop": 5762,
  "bp_start": 98600001,
  "bp_stop": 100300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 5762,
  "iscn_stop": 5850,
  "bp_start": 100300001,
  "bp_stop": 101200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 12.3,
  "iscn_start": 5850,
  "iscn_stop": 5996,
  "bp_start": 101200001,
  "bp_stop": 103100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 13.11,
  "iscn_start": 5996,
  "iscn_stop": 6229,
  "bp_start": 103100001,
  "bp_stop": 106500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 13.12,
  "iscn_start": 6229,
  "iscn_stop": 6361,
  "bp_start": 106500001,
  "bp_stop": 108200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 13.13,
  "iscn_start": 6361,
  "iscn_stop": 6594,
  "bp_start": 108200001,
  "bp_stop": 111600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 6594,
  "iscn_stop": 6682,
  "bp_start": 111600001,
  "bp_stop": 113700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 13.31,
  "iscn_start": 6682,
  "iscn_stop": 6871,
  "bp_start": 113700001,
  "bp_stop": 117600000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 13.32,
  "iscn_start": 6871,
  "iscn_stop": 6973,
  "bp_start": 117600001,
  "bp_stop": 119300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 13.33,
  "iscn_start": 6973,
  "iscn_stop": 7148,
  "bp_start": 119300001,
  "bp_stop": 122200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 7148,
  "iscn_stop": 7294,
  "bp_start": 122200001,
  "bp_stop": 124100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 7294,
  "iscn_stop": 7440,
  "bp_start": 124100001,
  "bp_stop": 126100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 7440,
  "iscn_stop": 7674,
  "bp_start": 126100001,
  "bp_stop": 129500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 7674,
  "iscn_stop": 7936,
  "bp_start": 129500001,
  "bp_stop": 134000000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 7936,
  "iscn_stop": 8053,
  "bp_start": 134000001,
  "bp_stop": 136000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 8053,
  "iscn_stop": 8228,
  "bp_start": 136000001,
  "bp_stop": 139000000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 23,
  "iscn_start": 8228,
  "iscn_stop": 8461,
  "bp_start": 139000001,
  "bp_stop": 143100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 24,
  "iscn_start": 8461,
  "iscn_stop": 8811,
  "bp_start": 143100001,
  "bp_stop": 149200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 25.1,
  "iscn_start": 8811,
  "iscn_stop": 9001,
  "bp_start": 149200001,
  "bp_stop": 152300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 25.2,
  "iscn_start": 9001,
  "iscn_stop": 9162,
  "bp_start": 152300001,
  "bp_stop": 155300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 25.31,
  "iscn_start": 9162,
  "iscn_stop": 9264,
  "bp_start": 155300001,
  "bp_stop": 157300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 25.32,
  "iscn_start": 9264,
  "iscn_stop": 9366,
  "bp_start": 157300001,
  "bp_stop": 159300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 25.33,
  "iscn_start": 9366,
  "iscn_stop": 9453,
  "bp_start": 159300001,
  "bp_stop": 161000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 26.1,
  "iscn_start": 9453,
  "iscn_stop": 9803,
  "bp_start": 161000001,
  "bp_stop": 167900000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 26.2,
  "iscn_start": 9803,
  "iscn_stop": 9949,
  "bp_start": 167900001,
  "bp_stop": 171200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 26.31,
  "iscn_start": 9949,
  "iscn_stop": 10183,
  "bp_start": 171200001,
  "bp_stop": 176000000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 26.32,
  "iscn_start": 10183,
  "iscn_stop": 10329,
  "bp_start": 176000001,
  "bp_stop": 179300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 26.33,
  "iscn_start": 10329,
  "iscn_stop": 10489,
  "bp_start": 179300001,
  "bp_stop": 183000000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 27.1,
  "iscn_start": 10489,
  "iscn_stop": 10620,
  "bp_start": 183000001,
  "bp_stop": 184800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 27.2,
  "iscn_start": 10620,
  "iscn_stop": 10737,
  "bp_start": 184800001,
  "bp_stop": 186300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 27.3,
  "iscn_start": 10737,
  "iscn_stop": 10883,
  "bp_start": 186300001,
  "bp_stop": 188200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 28,
  "iscn_start": 10883,
  "iscn_stop": 11175,
  "bp_start": 188200001,
  "bp_stop": 192600000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 3,
  "arm": "q",
  "band": 29,
  "iscn_start": 11175,
  "iscn_stop": 11700,
  "bp_start": 192600001,
  "bp_stop": 198295559,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 16.3,
  "iscn_start": 0,
  "iscn_stop": 220,
  "bp_start": 1,
  "bp_stop": 4500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 16.2,
  "iscn_start": 220,
  "iscn_stop": 389,
  "bp_start": 4500001,
  "bp_stop": 6000000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 16.1,
  "iscn_start": 389,
  "iscn_stop": 779,
  "bp_start": 6000001,
  "bp_stop": 11300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 15.33,
  "iscn_start": 779,
  "iscn_stop": 1066,
  "bp_start": 11300001,
  "bp_stop": 15000000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 15.32,
  "iscn_start": 1066,
  "iscn_stop": 1286,
  "bp_start": 15000001,
  "bp_stop": 17700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 15.31,
  "iscn_start": 1286,
  "iscn_stop": 1557,
  "bp_start": 17700001,
  "bp_stop": 21300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 15.2,
  "iscn_start": 1557,
  "iscn_stop": 1811,
  "bp_start": 21300001,
  "bp_stop": 27700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 15.1,
  "iscn_start": 1811,
  "iscn_stop": 2166,
  "bp_start": 27700001,
  "bp_stop": 35800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 14,
  "iscn_start": 2166,
  "iscn_stop": 2505,
  "bp_start": 35800001,
  "bp_stop": 41200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 13,
  "iscn_start": 2505,
  "iscn_stop": 2742,
  "bp_start": 41200001,
  "bp_stop": 44600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 12,
  "iscn_start": 2742,
  "iscn_stop": 2877,
  "bp_start": 44600001,
  "bp_stop": 48200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "p",
  "band": 11,
  "iscn_start": 2877,
  "iscn_stop": 3046,
  "bp_start": 48200001,
  "bp_stop": 50000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 11,
  "iscn_start": 3046,
  "iscn_stop": 3249,
  "bp_start": 50000001,
  "bp_stop": 51800000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 12,
  "iscn_start": 3249,
  "iscn_stop": 3571,
  "bp_start": 51800001,
  "bp_stop": 58500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 13.1,
  "iscn_start": 3571,
  "iscn_stop": 3910,
  "bp_start": 58500001,
  "bp_stop": 65500000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 3910,
  "iscn_stop": 4062,
  "bp_start": 65500001,
  "bp_stop": 69400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 13.3,
  "iscn_start": 4062,
  "iscn_stop": 4333,
  "bp_start": 69400001,
  "bp_stop": 75300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 4333,
  "iscn_stop": 4502,
  "bp_start": 75300001,
  "bp_stop": 78000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 21.21,
  "iscn_start": 4502,
  "iscn_stop": 4671,
  "bp_start": 78000001,
  "bp_stop": 81500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 21.22,
  "iscn_start": 4671,
  "iscn_stop": 4739,
  "bp_start": 81500001,
  "bp_stop": 83200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 21.23,
  "iscn_start": 4739,
  "iscn_stop": 4874,
  "bp_start": 83200001,
  "bp_stop": 86000000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 4874,
  "iscn_stop": 5145,
  "bp_start": 86000001,
  "bp_stop": 87100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 5145,
  "iscn_stop": 5517,
  "bp_start": 87100001,
  "bp_stop": 92800000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 5517,
  "iscn_stop": 5636,
  "bp_start": 92800001,
  "bp_stop": 94200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 5636,
  "iscn_stop": 5890,
  "bp_start": 94200001,
  "bp_stop": 97900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 23,
  "iscn_start": 5890,
  "iscn_stop": 6059,
  "bp_start": 97900001,
  "bp_stop": 100100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 24,
  "iscn_start": 6059,
  "iscn_stop": 6347,
  "bp_start": 100100001,
  "bp_stop": 106700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 25,
  "iscn_start": 6347,
  "iscn_stop": 6685,
  "bp_start": 106700001,
  "bp_stop": 113200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 26,
  "iscn_start": 6685,
  "iscn_stop": 7040,
  "bp_start": 113200001,
  "bp_stop": 119900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 27,
  "iscn_start": 7040,
  "iscn_stop": 7277,
  "bp_start": 119900001,
  "bp_stop": 122800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 28.1,
  "iscn_start": 7277,
  "iscn_stop": 7565,
  "bp_start": 122800001,
  "bp_stop": 127900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 28.2,
  "iscn_start": 7565,
  "iscn_stop": 7734,
  "bp_start": 127900001,
  "bp_stop": 130100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 28.3,
  "iscn_start": 7734,
  "iscn_stop": 8259,
  "bp_start": 130100001,
  "bp_stop": 138500000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 31.1,
  "iscn_start": 8259,
  "iscn_stop": 8581,
  "bp_start": 138500001,
  "bp_stop": 140600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 31.21,
  "iscn_start": 8581,
  "iscn_stop": 8733,
  "bp_start": 140600001,
  "bp_stop": 145900000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 31.22,
  "iscn_start": 8733,
  "iscn_stop": 8851,
  "bp_start": 145900001,
  "bp_stop": 147500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 31.23,
  "iscn_start": 8851,
  "iscn_stop": 9004,
  "bp_start": 147500001,
  "bp_stop": 150200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 31.3,
  "iscn_start": 9004,
  "iscn_stop": 9207,
  "bp_start": 150200001,
  "bp_stop": 154600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 32.1,
  "iscn_start": 9207,
  "iscn_stop": 9545,
  "bp_start": 154600001,
  "bp_stop": 160800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 32.2,
  "iscn_start": 9545,
  "iscn_stop": 9681,
  "bp_start": 160800001,
  "bp_stop": 163600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 32.3,
  "iscn_start": 9681,
  "iscn_stop": 9985,
  "bp_start": 163600001,
  "bp_stop": 169200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 33,
  "iscn_start": 9985,
  "iscn_stop": 10087,
  "bp_start": 169200001,
  "bp_stop": 171000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 34.1,
  "iscn_start": 10087,
  "iscn_stop": 10341,
  "bp_start": 171000001,
  "bp_stop": 175400000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 34.2,
  "iscn_start": 10341,
  "iscn_stop": 10408,
  "bp_start": 175400001,
  "bp_stop": 176600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 34.3,
  "iscn_start": 10408,
  "iscn_stop": 10628,
  "bp_start": 176600001,
  "bp_stop": 182300000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 35.1,
  "iscn_start": 10628,
  "iscn_stop": 10967,
  "bp_start": 182300001,
  "bp_stop": 186200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 4,
  "arm": "q",
  "band": 35.2,
  "iscn_start": 10967,
  "iscn_stop": 11170,
  "bp_start": 186200001,
  "bp_stop": 190214555,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 15.33,
  "iscn_start": 0,
  "iscn_stop": 278,
  "bp_start": 1,
  "bp_stop": 4400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 15.32,
  "iscn_start": 278,
  "iscn_stop": 401,
  "bp_start": 4400001,
  "bp_stop": 6300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 15.31,
  "iscn_start": 401,
  "iscn_stop": 555,
  "bp_start": 6300001,
  "bp_stop": 9900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 15.2,
  "iscn_start": 555,
  "iscn_stop": 802,
  "bp_start": 9900001,
  "bp_stop": 15000000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 15.1,
  "iscn_start": 802,
  "iscn_stop": 972,
  "bp_start": 15000001,
  "bp_stop": 18400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 14.3,
  "iscn_start": 972,
  "iscn_stop": 1234,
  "bp_start": 18400001,
  "bp_stop": 23300000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 14.2,
  "iscn_start": 1234,
  "iscn_stop": 1281,
  "bp_start": 23300001,
  "bp_stop": 24600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 14.1,
  "iscn_start": 1281,
  "iscn_stop": 1543,
  "bp_start": 24600001,
  "bp_stop": 28900000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 13.3,
  "iscn_start": 1543,
  "iscn_stop": 1836,
  "bp_start": 28900001,
  "bp_stop": 33800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 13.2,
  "iscn_start": 1836,
  "iscn_stop": 2068,
  "bp_start": 33800001,
  "bp_stop": 38400000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 13.1,
  "iscn_start": 2068,
  "iscn_stop": 2253,
  "bp_start": 38400001,
  "bp_stop": 42500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 12,
  "iscn_start": 2253,
  "iscn_stop": 2407,
  "bp_start": 42500001,
  "bp_stop": 46100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 5,
  "arm": "p",
  "band": 11,
  "iscn_start": 2407,
  "iscn_stop": 2592,
  "bp_start": 46100001,
  "bp_stop": 48800000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 2592,
  "iscn_stop": 2839,
  "bp_start": 48800001,
  "bp_stop": 51400000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 2839,
  "iscn_stop": 3271,
  "bp_start": 51400001,
  "bp_stop": 59600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 12.1,
  "iscn_start": 3271,
  "iscn_stop": 3518,
  "bp_start": 59600001,
  "bp_stop": 63600000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 3518,
  "iscn_stop": 3580,
  "bp_start": 63600001,
  "bp_stop": 63900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 12.3,
  "iscn_start": 3580,
  "iscn_stop": 3765,
  "bp_start": 63900001,
  "bp_stop": 67400000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 13.1,
  "iscn_start": 3765,
  "iscn_stop": 4012,
  "bp_start": 67400001,
  "bp_stop": 69100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 4012,
  "iscn_stop": 4197,
  "bp_start": 69100001,
  "bp_stop": 74000000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 13.3,
  "iscn_start": 4197,
  "iscn_stop": 4397,
  "bp_start": 74000001,
  "bp_stop": 77600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 14.1,
  "iscn_start": 4397,
  "iscn_stop": 4752,
  "bp_start": 77600001,
  "bp_stop": 82100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 14.2,
  "iscn_start": 4752,
  "iscn_stop": 4907,
  "bp_start": 82100001,
  "bp_stop": 83500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 14.3,
  "iscn_start": 4907,
  "iscn_stop": 5400,
  "bp_start": 83500001,
  "bp_stop": 93000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 15,
  "iscn_start": 5400,
  "iscn_stop": 5678,
  "bp_start": 93000001,
  "bp_stop": 98900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 5678,
  "iscn_stop": 5879,
  "bp_start": 98900001,
  "bp_stop": 103400000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 5879,
  "iscn_stop": 5987,
  "bp_start": 103400001,
  "bp_stop": 105100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 5987,
  "iscn_stop": 6295,
  "bp_start": 105100001,
  "bp_stop": 110200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 6295,
  "iscn_stop": 6419,
  "bp_start": 110200001,
  "bp_stop": 112200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 6419,
  "iscn_stop": 6527,
  "bp_start": 112200001,
  "bp_stop": 113800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 6527,
  "iscn_stop": 6666,
  "bp_start": 113800001,
  "bp_stop": 115900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 6666,
  "iscn_stop": 6943,
  "bp_start": 115900001,
  "bp_stop": 122100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 6943,
  "iscn_stop": 7267,
  "bp_start": 122100001,
  "bp_stop": 127900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 7267,
  "iscn_stop": 7468,
  "bp_start": 127900001,
  "bp_stop": 131200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 31.1,
  "iscn_start": 7468,
  "iscn_stop": 7807,
  "bp_start": 131200001,
  "bp_stop": 136900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 31.2,
  "iscn_start": 7807,
  "iscn_stop": 8008,
  "bp_start": 136900001,
  "bp_stop": 140100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 31.3,
  "iscn_start": 8008,
  "iscn_stop": 8316,
  "bp_start": 140100001,
  "bp_stop": 145100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 32,
  "iscn_start": 8316,
  "iscn_stop": 8625,
  "bp_start": 145100001,
  "bp_stop": 150400000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 33.1,
  "iscn_start": 8625,
  "iscn_stop": 8887,
  "bp_start": 150400001,
  "bp_stop": 153300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 33.2,
  "iscn_start": 8887,
  "iscn_stop": 9072,
  "bp_start": 153300001,
  "bp_stop": 156300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 33.3,
  "iscn_start": 9072,
  "iscn_stop": 9304,
  "bp_start": 156300001,
  "bp_stop": 160500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 34,
  "iscn_start": 9304,
  "iscn_stop": 9690,
  "bp_start": 160500001,
  "bp_stop": 169000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 35.1,
  "iscn_start": 9690,
  "iscn_stop": 9952,
  "bp_start": 169000001,
  "bp_stop": 173300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 35.2,
  "iscn_start": 9952,
  "iscn_stop": 10183,
  "bp_start": 173300001,
  "bp_stop": 177100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 5,
  "arm": "q",
  "band": 35.3,
  "iscn_start": 10183,
  "iscn_stop": 10600,
  "bp_start": 177100001,
  "bp_stop": 181538259,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 25.3,
  "iscn_start": 0,
  "iscn_stop": 118,
  "bp_start": 1,
  "bp_stop": 2300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 25.2,
  "iscn_start": 118,
  "iscn_stop": 207,
  "bp_start": 2300001,
  "bp_stop": 4200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 25.1,
  "iscn_start": 207,
  "iscn_stop": 355,
  "bp_start": 4200001,
  "bp_stop": 7100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 24.3,
  "iscn_start": 355,
  "iscn_stop": 548,
  "bp_start": 7100001,
  "bp_stop": 10600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 24.2,
  "iscn_start": 548,
  "iscn_stop": 592,
  "bp_start": 10600001,
  "bp_stop": 11600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 24.1,
  "iscn_start": 592,
  "iscn_stop": 740,
  "bp_start": 11600001,
  "bp_stop": 13400000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 23,
  "iscn_start": 740,
  "iscn_stop": 844,
  "bp_start": 13400001,
  "bp_stop": 15200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 22.3,
  "iscn_start": 844,
  "iscn_stop": 1185,
  "bp_start": 15200001,
  "bp_stop": 25200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 22.2,
  "iscn_start": 1185,
  "iscn_stop": 1348,
  "bp_start": 25200001,
  "bp_stop": 27100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 22.1,
  "iscn_start": 1348,
  "iscn_stop": 1585,
  "bp_start": 27100001,
  "bp_stop": 30500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 21.33,
  "iscn_start": 1585,
  "iscn_stop": 1718,
  "bp_start": 30500001,
  "bp_stop": 32100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 21.32,
  "iscn_start": 1718,
  "iscn_stop": 1836,
  "bp_start": 32100001,
  "bp_stop": 33500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 21.31,
  "iscn_start": 1836,
  "iscn_stop": 2162,
  "bp_start": 33500001,
  "bp_stop": 36600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 21.2,
  "iscn_start": 2162,
  "iscn_stop": 2310,
  "bp_start": 36600001,
  "bp_stop": 40500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 21.1,
  "iscn_start": 2310,
  "iscn_stop": 2755,
  "bp_start": 40500001,
  "bp_stop": 46200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 12.3,
  "iscn_start": 2755,
  "iscn_stop": 3080,
  "bp_start": 46200001,
  "bp_stop": 51800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 12.2,
  "iscn_start": 3080,
  "iscn_stop": 3140,
  "bp_start": 51800001,
  "bp_stop": 53000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 12.1,
  "iscn_start": 3140,
  "iscn_stop": 3377,
  "bp_start": 53000001,
  "bp_stop": 57200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 3377,
  "iscn_stop": 3421,
  "bp_start": 57200001,
  "bp_stop": 58500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 3421,
  "iscn_stop": 3554,
  "bp_start": 58500001,
  "bp_stop": 59800000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 3554,
  "iscn_stop": 3658,
  "bp_start": 59800001,
  "bp_stop": 62600000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 3658,
  "iscn_stop": 3732,
  "bp_start": 62600001,
  "bp_stop": 62700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 12,
  "iscn_start": 3732,
  "iscn_stop": 4147,
  "bp_start": 62700001,
  "bp_stop": 69200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 13,
  "iscn_start": 4147,
  "iscn_stop": 4324,
  "bp_start": 69200001,
  "bp_stop": 75200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 14.1,
  "iscn_start": 4324,
  "iscn_stop": 4621,
  "bp_start": 75200001,
  "bp_stop": 83200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 14.2,
  "iscn_start": 4621,
  "iscn_stop": 4709,
  "bp_start": 83200001,
  "bp_stop": 84200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 14.3,
  "iscn_start": 4709,
  "iscn_stop": 4917,
  "bp_start": 84200001,
  "bp_stop": 87300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 15,
  "iscn_start": 4917,
  "iscn_stop": 5228,
  "bp_start": 87300001,
  "bp_stop": 92500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 16.1,
  "iscn_start": 5228,
  "iscn_stop": 5613,
  "bp_start": 92500001,
  "bp_stop": 98900000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 16.2,
  "iscn_start": 5613,
  "iscn_stop": 5687,
  "bp_start": 98900001,
  "bp_stop": 100000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 16.3,
  "iscn_start": 5687,
  "iscn_stop": 5983,
  "bp_start": 100000001,
  "bp_stop": 105000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 21,
  "iscn_start": 5983,
  "iscn_stop": 6531,
  "bp_start": 105000001,
  "bp_stop": 114200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 6531,
  "iscn_stop": 6753,
  "bp_start": 114200001,
  "bp_stop": 117900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 6753,
  "iscn_stop": 6872,
  "bp_start": 117900001,
  "bp_stop": 118100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 22.31,
  "iscn_start": 6872,
  "iscn_stop": 7168,
  "bp_start": 118100001,
  "bp_stop": 125800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 22.32,
  "iscn_start": 7168,
  "iscn_stop": 7345,
  "bp_start": 125800001,
  "bp_stop": 126800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 22.33,
  "iscn_start": 7345,
  "iscn_stop": 7642,
  "bp_start": 126800001,
  "bp_stop": 130000000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 7642,
  "iscn_stop": 7923,
  "bp_start": 130000001,
  "bp_stop": 130900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 7923,
  "iscn_stop": 8145,
  "bp_start": 130900001,
  "bp_stop": 134700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 8145,
  "iscn_stop": 8352,
  "bp_start": 134700001,
  "bp_stop": 138300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 8352,
  "iscn_stop": 8560,
  "bp_start": 138300001,
  "bp_stop": 142200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 8560,
  "iscn_stop": 8708,
  "bp_start": 142200001,
  "bp_stop": 145100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 8708,
  "iscn_stop": 8886,
  "bp_start": 145100001,
  "bp_stop": 148500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 25.1,
  "iscn_start": 8886,
  "iscn_stop": 9078,
  "bp_start": 148500001,
  "bp_stop": 152100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 25.2,
  "iscn_start": 9078,
  "iscn_stop": 9241,
  "bp_start": 152100001,
  "bp_stop": 155200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 25.3,
  "iscn_start": 9241,
  "iscn_stop": 9596,
  "bp_start": 155200001,
  "bp_stop": 160600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 26,
  "iscn_start": 9596,
  "iscn_stop": 9774,
  "bp_start": 160600001,
  "bp_stop": 164100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 6,
  "arm": "q",
  "band": 27,
  "iscn_start": 9774,
  "iscn_stop": 10100,
  "bp_start": 164100001,
  "bp_stop": 170805979,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 22.3,
  "iscn_start": 0,
  "iscn_stop": 227,
  "bp_start": 1,
  "bp_stop": 2800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 22.2,
  "iscn_start": 227,
  "iscn_stop": 397,
  "bp_start": 2800001,
  "bp_stop": 4500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 22.1,
  "iscn_start": 397,
  "iscn_stop": 610,
  "bp_start": 4500001,
  "bp_stop": 7200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 21.3,
  "iscn_start": 610,
  "iscn_stop": 908,
  "bp_start": 7200001,
  "bp_stop": 13700000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 21.2,
  "iscn_start": 908,
  "iscn_stop": 965,
  "bp_start": 13700001,
  "bp_stop": 16500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 21.1,
  "iscn_start": 965,
  "iscn_stop": 1121,
  "bp_start": 16500001,
  "bp_stop": 20900000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 15.3,
  "iscn_start": 1121,
  "iscn_stop": 1419,
  "bp_start": 20900001,
  "bp_stop": 25500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 15.2,
  "iscn_start": 1419,
  "iscn_stop": 1589,
  "bp_start": 25500001,
  "bp_stop": 27900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 15.1,
  "iscn_start": 1589,
  "iscn_stop": 1816,
  "bp_start": 27900001,
  "bp_stop": 28800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 14.3,
  "iscn_start": 1816,
  "iscn_stop": 1986,
  "bp_start": 28800001,
  "bp_stop": 34900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 14.2,
  "iscn_start": 1986,
  "iscn_stop": 2043,
  "bp_start": 34900001,
  "bp_stop": 37100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 14.1,
  "iscn_start": 2043,
  "iscn_stop": 2327,
  "bp_start": 37100001,
  "bp_stop": 43300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 13,
  "iscn_start": 2327,
  "iscn_stop": 2639,
  "bp_start": 43300001,
  "bp_stop": 45400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 12.3,
  "iscn_start": 2639,
  "iscn_stop": 2838,
  "bp_start": 45400001,
  "bp_stop": 49000000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 12.2,
  "iscn_start": 2838,
  "iscn_stop": 2909,
  "bp_start": 49000001,
  "bp_stop": 50500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 12.1,
  "iscn_start": 2909,
  "iscn_stop": 3093,
  "bp_start": 50500001,
  "bp_stop": 53900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 3093,
  "iscn_stop": 3306,
  "bp_start": 53900001,
  "bp_stop": 58100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 3306,
  "iscn_stop": 3448,
  "bp_start": 58100001,
  "bp_stop": 60100000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 3448,
  "iscn_stop": 3689,
  "bp_start": 60100001,
  "bp_stop": 62100000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 11.21,
  "iscn_start": 3689,
  "iscn_stop": 3973,
  "bp_start": 62100001,
  "bp_stop": 67500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 11.22,
  "iscn_start": 3973,
  "iscn_stop": 4171,
  "bp_start": 67500001,
  "bp_stop": 72700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 11.23,
  "iscn_start": 4171,
  "iscn_stop": 4597,
  "bp_start": 72700001,
  "bp_stop": 77900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 21.11,
  "iscn_start": 4597,
  "iscn_stop": 4994,
  "bp_start": 77900001,
  "bp_stop": 86700000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 21.12,
  "iscn_start": 4994,
  "iscn_stop": 5108,
  "bp_start": 86700001,
  "bp_stop": 88500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 21.13,
  "iscn_start": 5108,
  "iscn_stop": 5292,
  "bp_start": 88500001,
  "bp_stop": 91500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 5292,
  "iscn_stop": 5406,
  "bp_start": 91500001,
  "bp_stop": 93300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 5406,
  "iscn_stop": 5661,
  "bp_start": 93300001,
  "bp_stop": 98400000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 5661,
  "iscn_stop": 6129,
  "bp_start": 98400001,
  "bp_stop": 104200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 6129,
  "iscn_stop": 6300,
  "bp_start": 104200001,
  "bp_stop": 104900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 6300,
  "iscn_stop": 6470,
  "bp_start": 104900001,
  "bp_stop": 107800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 31.1,
  "iscn_start": 6470,
  "iscn_stop": 6683,
  "bp_start": 107800001,
  "bp_stop": 115000000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 31.2,
  "iscn_start": 6683,
  "iscn_stop": 6867,
  "bp_start": 115000001,
  "bp_stop": 117700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 31.31,
  "iscn_start": 6867,
  "iscn_stop": 7094,
  "bp_start": 117700001,
  "bp_stop": 121400000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 31.32,
  "iscn_start": 7094,
  "iscn_stop": 7208,
  "bp_start": 121400001,
  "bp_stop": 124100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 31.33,
  "iscn_start": 7208,
  "iscn_stop": 7364,
  "bp_start": 124100001,
  "bp_stop": 127500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 32.1,
  "iscn_start": 7364,
  "iscn_stop": 7449,
  "bp_start": 127500001,
  "bp_stop": 129600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 32.2,
  "iscn_start": 7449,
  "iscn_stop": 7576,
  "bp_start": 129600001,
  "bp_stop": 130800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 32.3,
  "iscn_start": 7576,
  "iscn_stop": 7803,
  "bp_start": 130800001,
  "bp_stop": 132900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 33,
  "iscn_start": 7803,
  "iscn_stop": 8031,
  "bp_start": 132900001,
  "bp_stop": 138500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 34,
  "iscn_start": 8031,
  "iscn_stop": 8371,
  "bp_start": 138500001,
  "bp_stop": 143400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 35,
  "iscn_start": 8371,
  "iscn_stop": 8612,
  "bp_start": 143400001,
  "bp_stop": 148200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 36.1,
  "iscn_start": 8612,
  "iscn_stop": 8910,
  "bp_start": 148200001,
  "bp_stop": 152800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 36.2,
  "iscn_start": 8910,
  "iscn_stop": 9080,
  "bp_start": 152800001,
  "bp_stop": 155200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 7,
  "arm": "q",
  "band": 36.3,
  "iscn_start": 9080,
  "iscn_stop": 9350,
  "bp_start": 155200001,
  "bp_stop": 159345973,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 23.3,
  "iscn_start": 0,
  "iscn_stop": 115,
  "bp_start": 1,
  "bp_stop": 2300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 23.2,
  "iscn_start": 115,
  "iscn_stop": 331,
  "bp_start": 2300001,
  "bp_stop": 6300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 23.1,
  "iscn_start": 331,
  "iscn_stop": 690,
  "bp_start": 6300001,
  "bp_stop": 12800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 22,
  "iscn_start": 690,
  "iscn_stop": 992,
  "bp_start": 12800001,
  "bp_stop": 19200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 21.3,
  "iscn_start": 992,
  "iscn_stop": 1179,
  "bp_start": 19200001,
  "bp_stop": 23500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 21.2,
  "iscn_start": 1179,
  "iscn_stop": 1380,
  "bp_start": 23500001,
  "bp_stop": 27500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 21.1,
  "iscn_start": 1380,
  "iscn_stop": 1639,
  "bp_start": 27500001,
  "bp_stop": 29000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 12,
  "iscn_start": 1639,
  "iscn_stop": 1897,
  "bp_start": 29000001,
  "bp_stop": 36700000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 11.23,
  "iscn_start": 1897,
  "iscn_stop": 2041,
  "bp_start": 36700001,
  "bp_stop": 38500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 11.22,
  "iscn_start": 2041,
  "iscn_stop": 2156,
  "bp_start": 38500001,
  "bp_stop": 39900000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 11.21,
  "iscn_start": 2156,
  "iscn_stop": 2343,
  "bp_start": 39900001,
  "bp_stop": 43200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 2343,
  "iscn_stop": 2472,
  "bp_start": 43200001,
  "bp_stop": 45200000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 2472,
  "iscn_stop": 2645,
  "bp_start": 45200001,
  "bp_stop": 47200000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 11.21,
  "iscn_start": 2645,
  "iscn_stop": 2817,
  "bp_start": 47200001,
  "bp_stop": 51300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 11.22,
  "iscn_start": 2817,
  "iscn_stop": 3033,
  "bp_start": 51300001,
  "bp_stop": 51700000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 11.23,
  "iscn_start": 3033,
  "iscn_stop": 3277,
  "bp_start": 51700001,
  "bp_stop": 54600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 12.1,
  "iscn_start": 3277,
  "iscn_stop": 3493,
  "bp_start": 54600001,
  "bp_stop": 60600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 3493,
  "iscn_stop": 3622,
  "bp_start": 60600001,
  "bp_stop": 61300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 12.3,
  "iscn_start": 3622,
  "iscn_stop": 3809,
  "bp_start": 61300001,
  "bp_stop": 65100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 13.1,
  "iscn_start": 3809,
  "iscn_stop": 3938,
  "bp_start": 65100001,
  "bp_stop": 67100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 3938,
  "iscn_stop": 4096,
  "bp_start": 67100001,
  "bp_stop": 69600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 13.3,
  "iscn_start": 4096,
  "iscn_stop": 4312,
  "bp_start": 69600001,
  "bp_stop": 72000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 21.11,
  "iscn_start": 4312,
  "iscn_stop": 4545,
  "bp_start": 72000001,
  "bp_stop": 74600000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 21.12,
  "iscn_start": 4545,
  "iscn_stop": 4628,
  "bp_start": 74600001,
  "bp_stop": 74700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 21.13,
  "iscn_start": 4628,
  "iscn_stop": 4858,
  "bp_start": 74700001,
  "bp_stop": 83500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 4858,
  "iscn_stop": 4959,
  "bp_start": 83500001,
  "bp_stop": 85900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 4959,
  "iscn_stop": 5289,
  "bp_start": 85900001,
  "bp_stop": 92300000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 5289,
  "iscn_stop": 5577,
  "bp_start": 92300001,
  "bp_stop": 97900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 5577,
  "iscn_stop": 5692,
  "bp_start": 97900001,
  "bp_stop": 100500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 5692,
  "iscn_stop": 5922,
  "bp_start": 100500001,
  "bp_stop": 105100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 5922,
  "iscn_stop": 6152,
  "bp_start": 105100001,
  "bp_stop": 109500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 6152,
  "iscn_stop": 6267,
  "bp_start": 109500001,
  "bp_stop": 111100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 6267,
  "iscn_stop": 6611,
  "bp_start": 111100001,
  "bp_stop": 116700000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 24.11,
  "iscn_start": 6611,
  "iscn_stop": 6726,
  "bp_start": 116700001,
  "bp_stop": 118300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 24.12,
  "iscn_start": 6726,
  "iscn_stop": 6942,
  "bp_start": 118300001,
  "bp_stop": 121500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 24.13,
  "iscn_start": 6942,
  "iscn_stop": 7244,
  "bp_start": 121500001,
  "bp_stop": 126300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 24.21,
  "iscn_start": 7244,
  "iscn_stop": 7431,
  "bp_start": 126300001,
  "bp_stop": 130400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 24.22,
  "iscn_start": 7431,
  "iscn_stop": 7661,
  "bp_start": 130400001,
  "bp_stop": 135400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 24.23,
  "iscn_start": 7661,
  "iscn_stop": 7804,
  "bp_start": 135400001,
  "bp_stop": 138900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 8,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 7804,
  "iscn_stop": 8250,
  "bp_start": 138900001,
  "bp_stop": 145138636,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 24.3,
  "iscn_start": 0,
  "iscn_stop": 127,
  "bp_start": 1,
  "bp_stop": 2200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 24.2,
  "iscn_start": 127,
  "iscn_stop": 268,
  "bp_start": 2200001,
  "bp_stop": 4600000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 24.1,
  "iscn_start": 268,
  "iscn_stop": 451,
  "bp_start": 4600001,
  "bp_stop": 9000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 23,
  "iscn_start": 451,
  "iscn_stop": 677,
  "bp_start": 9000001,
  "bp_stop": 14200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 22.3,
  "iscn_start": 677,
  "iscn_stop": 846,
  "bp_start": 14200001,
  "bp_stop": 16600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 22.2,
  "iscn_start": 846,
  "iscn_stop": 987,
  "bp_start": 16600001,
  "bp_stop": 18500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 22.1,
  "iscn_start": 987,
  "iscn_stop": 1085,
  "bp_start": 18500001,
  "bp_stop": 19900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 21.3,
  "iscn_start": 1085,
  "iscn_stop": 1297,
  "bp_start": 19900001,
  "bp_stop": 25600000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 21.2,
  "iscn_start": 1297,
  "iscn_stop": 1395,
  "bp_start": 25600001,
  "bp_stop": 28000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 21.1,
  "iscn_start": 1395,
  "iscn_stop": 1621,
  "bp_start": 28000001,
  "bp_stop": 33200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 13.3,
  "iscn_start": 1621,
  "iscn_stop": 1917,
  "bp_start": 33200001,
  "bp_stop": 36300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 13.2,
  "iscn_start": 1917,
  "iscn_stop": 2030,
  "bp_start": 36300001,
  "bp_stop": 37900000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 13.1,
  "iscn_start": 2030,
  "iscn_stop": 2171,
  "bp_start": 37900001,
  "bp_stop": 39000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 12,
  "iscn_start": 2171,
  "iscn_stop": 2312,
  "bp_start": 39000001,
  "bp_stop": 40000000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 2312,
  "iscn_stop": 2523,
  "bp_start": 40000001,
  "bp_stop": 42200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 2523,
  "iscn_stop": 2650,
  "bp_start": 42200001,
  "bp_stop": 43000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 11,
  "iscn_start": 2650,
  "iscn_stop": 2876,
  "bp_start": 43000001,
  "bp_stop": 45500000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 12,
  "iscn_start": 2876,
  "iscn_stop": 3468,
  "bp_start": 45500001,
  "bp_stop": 61500000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 13,
  "iscn_start": 3468,
  "iscn_stop": 3609,
  "bp_start": 61500001,
  "bp_stop": 65000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 21.11,
  "iscn_start": 3609,
  "iscn_stop": 3792,
  "bp_start": 65000001,
  "bp_stop": 69300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 21.12,
  "iscn_start": 3792,
  "iscn_stop": 3876,
  "bp_start": 69300001,
  "bp_stop": 71300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 21.13,
  "iscn_start": 3876,
  "iscn_stop": 4060,
  "bp_start": 71300001,
  "bp_stop": 76600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 4060,
  "iscn_stop": 4229,
  "bp_start": 76600001,
  "bp_stop": 78500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 21.31,
  "iscn_start": 4229,
  "iscn_stop": 4440,
  "bp_start": 78500001,
  "bp_stop": 81500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 21.32,
  "iscn_start": 4440,
  "iscn_stop": 4638,
  "bp_start": 81500001,
  "bp_stop": 84300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 21.33,
  "iscn_start": 4638,
  "iscn_stop": 4835,
  "bp_start": 84300001,
  "bp_stop": 87800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 4835,
  "iscn_stop": 5074,
  "bp_start": 87800001,
  "bp_stop": 89200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 5074,
  "iscn_stop": 5173,
  "bp_start": 89200001,
  "bp_stop": 91200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 22.31,
  "iscn_start": 5173,
  "iscn_stop": 5314,
  "bp_start": 91200001,
  "bp_stop": 93900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 22.32,
  "iscn_start": 5314,
  "iscn_stop": 5455,
  "bp_start": 93900001,
  "bp_stop": 96500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 22.33,
  "iscn_start": 5455,
  "iscn_stop": 5638,
  "bp_start": 96500001,
  "bp_stop": 99800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 31.1,
  "iscn_start": 5638,
  "iscn_stop": 5892,
  "bp_start": 99800001,
  "bp_stop": 105400000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 31.2,
  "iscn_start": 5892,
  "iscn_stop": 6005,
  "bp_start": 105400001,
  "bp_stop": 108500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 31.3,
  "iscn_start": 6005,
  "iscn_stop": 6146,
  "bp_start": 108500001,
  "bp_stop": 112100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 32,
  "iscn_start": 6146,
  "iscn_stop": 6456,
  "bp_start": 112100001,
  "bp_stop": 114900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 33.1,
  "iscn_start": 6456,
  "iscn_stop": 6681,
  "bp_start": 114900001,
  "bp_stop": 119800000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 33.2,
  "iscn_start": 6681,
  "iscn_stop": 6822,
  "bp_start": 119800001,
  "bp_stop": 123100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 33.3,
  "iscn_start": 6822,
  "iscn_stop": 6949,
  "bp_start": 123100001,
  "bp_stop": 127500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 34.11,
  "iscn_start": 6949,
  "iscn_stop": 7217,
  "bp_start": 127500001,
  "bp_stop": 130600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 34.12,
  "iscn_start": 7217,
  "iscn_stop": 7302,
  "bp_start": 130600001,
  "bp_stop": 131100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 34.13,
  "iscn_start": 7302,
  "iscn_stop": 7443,
  "bp_start": 131100001,
  "bp_stop": 133100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 34.2,
  "iscn_start": 7443,
  "iscn_stop": 7555,
  "bp_start": 133100001,
  "bp_stop": 134500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 9,
  "arm": "q",
  "band": 34.3,
  "iscn_start": 7555,
  "iscn_stop": 7950,
  "bp_start": 134500001,
  "bp_stop": 138394717,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 15.3,
  "iscn_start": 0,
  "iscn_stop": 229,
  "bp_start": 1,
  "bp_stop": 3000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 15.2,
  "iscn_start": 229,
  "iscn_stop": 329,
  "bp_start": 3000001,
  "bp_stop": 3800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 15.1,
  "iscn_start": 329,
  "iscn_stop": 630,
  "bp_start": 3800001,
  "bp_stop": 6600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 14,
  "iscn_start": 630,
  "iscn_stop": 917,
  "bp_start": 6600001,
  "bp_stop": 12200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 13,
  "iscn_start": 917,
  "iscn_stop": 1175,
  "bp_start": 12200001,
  "bp_stop": 17300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 12.33,
  "iscn_start": 1175,
  "iscn_stop": 1361,
  "bp_start": 17300001,
  "bp_stop": 18300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 12.32,
  "iscn_start": 1361,
  "iscn_stop": 1432,
  "bp_start": 18300001,
  "bp_stop": 18400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 12.31,
  "iscn_start": 1432,
  "iscn_stop": 1604,
  "bp_start": 18400001,
  "bp_stop": 22300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 12.2,
  "iscn_start": 1604,
  "iscn_stop": 1662,
  "bp_start": 22300001,
  "bp_stop": 24300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 12.1,
  "iscn_start": 1662,
  "iscn_stop": 1891,
  "bp_start": 24300001,
  "bp_stop": 29300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 11.23,
  "iscn_start": 1891,
  "iscn_stop": 2063,
  "bp_start": 29300001,
  "bp_stop": 31100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 11.22,
  "iscn_start": 2063,
  "iscn_stop": 2235,
  "bp_start": 31100001,
  "bp_stop": 34200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 11.21,
  "iscn_start": 2235,
  "iscn_stop": 2406,
  "bp_start": 34200001,
  "bp_stop": 38000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 2406,
  "iscn_stop": 2621,
  "bp_start": 38000001,
  "bp_stop": 39800000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 2621,
  "iscn_stop": 2850,
  "bp_start": 39800001,
  "bp_stop": 41600000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 11.21,
  "iscn_start": 2850,
  "iscn_stop": 3051,
  "bp_start": 41600001,
  "bp_stop": 45500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 11.22,
  "iscn_start": 3051,
  "iscn_stop": 3252,
  "bp_start": 45500001,
  "bp_stop": 48600000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 11.23,
  "iscn_start": 3252,
  "iscn_stop": 3409,
  "bp_start": 48600001,
  "bp_stop": 51100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 3409,
  "iscn_stop": 3753,
  "bp_start": 51100001,
  "bp_stop": 59400000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 3753,
  "iscn_stop": 3839,
  "bp_start": 59400001,
  "bp_stop": 62800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 3839,
  "iscn_stop": 4097,
  "bp_start": 62800001,
  "bp_stop": 68800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 4097,
  "iscn_stop": 4469,
  "bp_start": 68800001,
  "bp_stop": 73100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 4469,
  "iscn_stop": 4655,
  "bp_start": 73100001,
  "bp_stop": 75900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 4655,
  "iscn_stop": 4970,
  "bp_start": 75900001,
  "bp_stop": 80300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 4970,
  "iscn_stop": 5200,
  "bp_start": 80300001,
  "bp_stop": 86100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 5200,
  "iscn_stop": 5331,
  "bp_start": 86100001,
  "bp_stop": 87700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 23.31,
  "iscn_start": 5331,
  "iscn_stop": 5558,
  "bp_start": 87700001,
  "bp_stop": 91100000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 23.32,
  "iscn_start": 5558,
  "iscn_stop": 5672,
  "bp_start": 91100001,
  "bp_stop": 92300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 23.33,
  "iscn_start": 5672,
  "iscn_stop": 5887,
  "bp_start": 92300001,
  "bp_stop": 95300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 5887,
  "iscn_stop": 5973,
  "bp_start": 95300001,
  "bp_stop": 97500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 5973,
  "iscn_stop": 6131,
  "bp_start": 97500001,
  "bp_stop": 100100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 24.31,
  "iscn_start": 6131,
  "iscn_stop": 6202,
  "bp_start": 100100001,
  "bp_stop": 101200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 24.32,
  "iscn_start": 6202,
  "iscn_stop": 6317,
  "bp_start": 101200001,
  "bp_stop": 103100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 24.33,
  "iscn_start": 6317,
  "iscn_stop": 6374,
  "bp_start": 103100001,
  "bp_stop": 104000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 25.1,
  "iscn_start": 6374,
  "iscn_stop": 6646,
  "bp_start": 104000001,
  "bp_stop": 110100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 25.2,
  "iscn_start": 6646,
  "iscn_stop": 6761,
  "bp_start": 110100001,
  "bp_stop": 113100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 25.3,
  "iscn_start": 6761,
  "iscn_stop": 6890,
  "bp_start": 113100001,
  "bp_stop": 117300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 26.11,
  "iscn_start": 6890,
  "iscn_stop": 7090,
  "bp_start": 117300001,
  "bp_stop": 119900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 26.12,
  "iscn_start": 7090,
  "iscn_stop": 7219,
  "bp_start": 119900001,
  "bp_stop": 121400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 26.13,
  "iscn_start": 7219,
  "iscn_stop": 7506,
  "bp_start": 121400001,
  "bp_stop": 125700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 26.2,
  "iscn_start": 7506,
  "iscn_stop": 7721,
  "bp_start": 125700001,
  "bp_stop": 128800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 10,
  "arm": "q",
  "band": 26.3,
  "iscn_start": 7721,
  "iscn_stop": 8050,
  "bp_start": 128800001,
  "bp_stop": 133797422,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 15.5,
  "iscn_start": 0,
  "iscn_stop": 230,
  "bp_start": 1,
  "bp_stop": 2800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 15.4,
  "iscn_start": 230,
  "iscn_stop": 461,
  "bp_start": 2800001,
  "bp_stop": 11700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 15.3,
  "iscn_start": 461,
  "iscn_stop": 745,
  "bp_start": 11700001,
  "bp_stop": 13800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 15.2,
  "iscn_start": 745,
  "iscn_stop": 935,
  "bp_start": 13800001,
  "bp_stop": 16900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 15.1,
  "iscn_start": 935,
  "iscn_stop": 1246,
  "bp_start": 16900001,
  "bp_stop": 22000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 14.3,
  "iscn_start": 1246,
  "iscn_stop": 1490,
  "bp_start": 22000001,
  "bp_stop": 26200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 14.2,
  "iscn_start": 1490,
  "iscn_stop": 1545,
  "bp_start": 26200001,
  "bp_stop": 27200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 14.1,
  "iscn_start": 1545,
  "iscn_stop": 1775,
  "bp_start": 27200001,
  "bp_stop": 31000000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 13,
  "iscn_start": 1775,
  "iscn_stop": 2114,
  "bp_start": 31000001,
  "bp_stop": 36400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 12,
  "iscn_start": 2114,
  "iscn_stop": 2357,
  "bp_start": 36400001,
  "bp_stop": 43400000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 2357,
  "iscn_stop": 2655,
  "bp_start": 43400001,
  "bp_stop": 48800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 11.12,
  "iscn_start": 2655,
  "iscn_stop": 2872,
  "bp_start": 48800001,
  "bp_stop": 51000000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 11,
  "arm": "p",
  "band": 11.11,
  "iscn_start": 2872,
  "iscn_stop": 3035,
  "bp_start": 51000001,
  "bp_stop": 53400000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 11,
  "iscn_start": 3035,
  "iscn_stop": 3197,
  "bp_start": 53400001,
  "bp_stop": 55800000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 12.1,
  "iscn_start": 3197,
  "iscn_stop": 3414,
  "bp_start": 55800001,
  "bp_stop": 60100000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 3414,
  "iscn_stop": 3550,
  "bp_start": 60100001,
  "bp_stop": 61900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 12.3,
  "iscn_start": 3550,
  "iscn_stop": 3685,
  "bp_start": 61900001,
  "bp_stop": 63600000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 13.1,
  "iscn_start": 3685,
  "iscn_stop": 4037,
  "bp_start": 63600001,
  "bp_stop": 66100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 4037,
  "iscn_stop": 4186,
  "bp_start": 66100001,
  "bp_stop": 68700000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 13.3,
  "iscn_start": 4186,
  "iscn_stop": 4512,
  "bp_start": 68700001,
  "bp_stop": 70500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 13.4,
  "iscn_start": 4512,
  "iscn_stop": 4688,
  "bp_start": 70500001,
  "bp_stop": 75500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 13.5,
  "iscn_start": 4688,
  "iscn_stop": 4877,
  "bp_start": 75500001,
  "bp_stop": 77400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 14.1,
  "iscn_start": 4877,
  "iscn_stop": 5148,
  "bp_start": 77400001,
  "bp_stop": 85900000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 14.2,
  "iscn_start": 5148,
  "iscn_stop": 5257,
  "bp_start": 85900001,
  "bp_stop": 88600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 14.3,
  "iscn_start": 5257,
  "iscn_stop": 5474,
  "bp_start": 88600001,
  "bp_stop": 93000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 21,
  "iscn_start": 5474,
  "iscn_stop": 5690,
  "bp_start": 93000001,
  "bp_stop": 97400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 5690,
  "iscn_stop": 5934,
  "bp_start": 97400001,
  "bp_stop": 102300000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 5934,
  "iscn_stop": 6070,
  "bp_start": 102300001,
  "bp_stop": 103000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 6070,
  "iscn_stop": 6300,
  "bp_start": 103000001,
  "bp_stop": 110600000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 6300,
  "iscn_stop": 6503,
  "bp_start": 110600001,
  "bp_stop": 112700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 6503,
  "iscn_stop": 6693,
  "bp_start": 112700001,
  "bp_stop": 114600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 6693,
  "iscn_stop": 7167,
  "bp_start": 114600001,
  "bp_stop": 121300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 7167,
  "iscn_stop": 7316,
  "bp_start": 121300001,
  "bp_stop": 124000000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 7316,
  "iscn_stop": 7533,
  "bp_start": 124000001,
  "bp_stop": 127900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 7533,
  "iscn_stop": 7695,
  "bp_start": 127900001,
  "bp_stop": 130900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 11,
  "arm": "q",
  "band": 25,
  "iscn_start": 7695,
  "iscn_stop": 7980,
  "bp_start": 130900001,
  "bp_stop": 135086622,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 13.33,
  "iscn_start": 0,
  "iscn_stop": 216,
  "bp_start": 1,
  "bp_stop": 3200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 13.32,
  "iscn_start": 216,
  "iscn_stop": 345,
  "bp_start": 3200001,
  "bp_stop": 5300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 13.31,
  "iscn_start": 345,
  "iscn_stop": 633,
  "bp_start": 5300001,
  "bp_stop": 10000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 13.2,
  "iscn_start": 633,
  "iscn_stop": 806,
  "bp_start": 10000001,
  "bp_stop": 12600000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 13.1,
  "iscn_start": 806,
  "iscn_stop": 921,
  "bp_start": 12600001,
  "bp_stop": 14600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 12.3,
  "iscn_start": 921,
  "iscn_stop": 1195,
  "bp_start": 14600001,
  "bp_stop": 19800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 12.2,
  "iscn_start": 1195,
  "iscn_stop": 1252,
  "bp_start": 19800001,
  "bp_stop": 21100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 12.1,
  "iscn_start": 1252,
  "iscn_stop": 1526,
  "bp_start": 21100001,
  "bp_stop": 26300000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 11.23,
  "iscn_start": 1526,
  "iscn_stop": 1655,
  "bp_start": 26300001,
  "bp_stop": 27600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 11.22,
  "iscn_start": 1655,
  "iscn_stop": 1785,
  "bp_start": 27600001,
  "bp_stop": 30500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 11.21,
  "iscn_start": 1785,
  "iscn_stop": 1900,
  "bp_start": 30500001,
  "bp_stop": 33200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1900,
  "iscn_stop": 2015,
  "bp_start": 33200001,
  "bp_stop": 35500000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 11,
  "iscn_start": 2015,
  "iscn_stop": 2116,
  "bp_start": 35500001,
  "bp_stop": 37800000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 12,
  "iscn_start": 2116,
  "iscn_stop": 2562,
  "bp_start": 37800001,
  "bp_stop": 46000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 13.11,
  "iscn_start": 2562,
  "iscn_stop": 2706,
  "bp_start": 46000001,
  "bp_stop": 48700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 13.12,
  "iscn_start": 2706,
  "iscn_stop": 2850,
  "bp_start": 48700001,
  "bp_stop": 51100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 13.13,
  "iscn_start": 2850,
  "iscn_stop": 3210,
  "bp_start": 51100001,
  "bp_stop": 54500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 3210,
  "iscn_stop": 3383,
  "bp_start": 54500001,
  "bp_stop": 56200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 13.3,
  "iscn_start": 3383,
  "iscn_stop": 3498,
  "bp_start": 56200001,
  "bp_stop": 57700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 14.1,
  "iscn_start": 3498,
  "iscn_stop": 3700,
  "bp_start": 57700001,
  "bp_stop": 62700000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 14.2,
  "iscn_start": 3700,
  "iscn_stop": 3786,
  "bp_start": 62700001,
  "bp_stop": 64700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 14.3,
  "iscn_start": 3786,
  "iscn_stop": 3959,
  "bp_start": 64700001,
  "bp_stop": 67300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 15,
  "iscn_start": 3959,
  "iscn_stop": 4203,
  "bp_start": 67300001,
  "bp_stop": 71100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 4203,
  "iscn_stop": 4362,
  "bp_start": 71100001,
  "bp_stop": 75300000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 4362,
  "iscn_stop": 4549,
  "bp_start": 75300001,
  "bp_stop": 79900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 21.31,
  "iscn_start": 4549,
  "iscn_stop": 4837,
  "bp_start": 79900001,
  "bp_stop": 86300000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 21.32,
  "iscn_start": 4837,
  "iscn_stop": 4894,
  "bp_start": 86300001,
  "bp_stop": 88600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 21.33,
  "iscn_start": 4894,
  "iscn_stop": 5125,
  "bp_start": 88600001,
  "bp_stop": 92200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 22,
  "iscn_start": 5125,
  "iscn_stop": 5355,
  "bp_start": 92200001,
  "bp_stop": 95800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 5355,
  "iscn_stop": 5571,
  "bp_start": 95800001,
  "bp_stop": 101200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 5571,
  "iscn_stop": 5643,
  "bp_start": 101200001,
  "bp_stop": 103500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 5643,
  "iscn_stop": 5873,
  "bp_start": 103500001,
  "bp_stop": 108600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.11,
  "iscn_start": 5873,
  "iscn_stop": 6104,
  "bp_start": 108600001,
  "bp_stop": 111300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.12,
  "iscn_start": 6104,
  "iscn_stop": 6219,
  "bp_start": 111300001,
  "bp_stop": 111900000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.13,
  "iscn_start": 6219,
  "iscn_stop": 6334,
  "bp_start": 111900001,
  "bp_stop": 113900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.21,
  "iscn_start": 6334,
  "iscn_stop": 6478,
  "bp_start": 113900001,
  "bp_stop": 116400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.22,
  "iscn_start": 6478,
  "iscn_stop": 6579,
  "bp_start": 116400001,
  "bp_stop": 117700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.23,
  "iscn_start": 6579,
  "iscn_stop": 6737,
  "bp_start": 117700001,
  "bp_stop": 120300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.31,
  "iscn_start": 6737,
  "iscn_stop": 7083,
  "bp_start": 120300001,
  "bp_stop": 125400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.32,
  "iscn_start": 7083,
  "iscn_stop": 7255,
  "bp_start": 125400001,
  "bp_stop": 128700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 12,
  "arm": "q",
  "band": 24.33,
  "iscn_start": 7255,
  "iscn_stop": 7500,
  "bp_start": 128700001,
  "bp_stop": 133275309,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "p",
  "band": 13,
  "iscn_start": 0,
  "iscn_stop": 282,
  "bp_start": 1,
  "bp_stop": 4600000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "p",
  "band": 12,
  "iscn_start": 282,
  "iscn_stop": 620,
  "bp_start": 4600001,
  "bp_stop": 10100000,
  "stain": "stalk",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 620,
  "iscn_stop": 1015,
  "bp_start": 10100001,
  "bp_stop": 16500000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1015,
  "iscn_stop": 1198,
  "bp_start": 16500001,
  "bp_stop": 17700000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 11,
  "iscn_start": 1198,
  "iscn_stop": 1353,
  "bp_start": 17700001,
  "bp_stop": 18900000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 12.11,
  "iscn_start": 1353,
  "iscn_stop": 1536,
  "bp_start": 18900001,
  "bp_stop": 22600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 12.12,
  "iscn_start": 1536,
  "iscn_stop": 1635,
  "bp_start": 22600001,
  "bp_stop": 24900000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 12.13,
  "iscn_start": 1635,
  "iscn_stop": 1790,
  "bp_start": 24900001,
  "bp_stop": 27200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 1790,
  "iscn_stop": 1888,
  "bp_start": 27200001,
  "bp_stop": 28300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 12.3,
  "iscn_start": 1888,
  "iscn_stop": 2114,
  "bp_start": 28300001,
  "bp_stop": 31600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 13.1,
  "iscn_start": 2114,
  "iscn_stop": 2255,
  "bp_start": 31600001,
  "bp_stop": 33400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 2255,
  "iscn_stop": 2367,
  "bp_start": 33400001,
  "bp_stop": 34900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 13.3,
  "iscn_start": 2367,
  "iscn_stop": 2649,
  "bp_start": 34900001,
  "bp_stop": 39500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 14.11,
  "iscn_start": 2649,
  "iscn_stop": 2931,
  "bp_start": 39500001,
  "bp_stop": 44600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 14.12,
  "iscn_start": 2931,
  "iscn_stop": 3030,
  "bp_start": 44600001,
  "bp_stop": 45200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 14.13,
  "iscn_start": 3030,
  "iscn_stop": 3128,
  "bp_start": 45200001,
  "bp_stop": 46700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 14.2,
  "iscn_start": 3128,
  "iscn_stop": 3311,
  "bp_start": 46700001,
  "bp_stop": 50300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 14.3,
  "iscn_start": 3311,
  "iscn_stop": 3537,
  "bp_start": 50300001,
  "bp_stop": 54700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 3537,
  "iscn_stop": 3762,
  "bp_start": 54700001,
  "bp_stop": 59000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 3762,
  "iscn_stop": 3889,
  "bp_start": 59000001,
  "bp_stop": 61800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 21.31,
  "iscn_start": 3889,
  "iscn_stop": 4058,
  "bp_start": 61800001,
  "bp_stop": 65200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 21.32,
  "iscn_start": 4058,
  "iscn_stop": 4199,
  "bp_start": 65200001,
  "bp_stop": 68100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 21.33,
  "iscn_start": 4199,
  "iscn_stop": 4439,
  "bp_start": 68100001,
  "bp_stop": 72800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 4439,
  "iscn_stop": 4565,
  "bp_start": 72800001,
  "bp_stop": 74900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 4565,
  "iscn_stop": 4678,
  "bp_start": 74900001,
  "bp_stop": 76700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 4678,
  "iscn_stop": 4791,
  "bp_start": 76700001,
  "bp_stop": 78500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 31.1,
  "iscn_start": 4791,
  "iscn_stop": 5087,
  "bp_start": 78500001,
  "bp_stop": 87100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 31.2,
  "iscn_start": 5087,
  "iscn_stop": 5171,
  "bp_start": 87100001,
  "bp_stop": 89400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 31.3,
  "iscn_start": 5171,
  "iscn_stop": 5355,
  "bp_start": 89400001,
  "bp_stop": 94400000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 32.1,
  "iscn_start": 5355,
  "iscn_stop": 5510,
  "bp_start": 94400001,
  "bp_stop": 97500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 32.2,
  "iscn_start": 5510,
  "iscn_stop": 5636,
  "bp_start": 97500001,
  "bp_stop": 98700000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 32.3,
  "iscn_start": 5636,
  "iscn_stop": 5834,
  "bp_start": 98700001,
  "bp_stop": 101100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 33.1,
  "iscn_start": 5834,
  "iscn_stop": 5989,
  "bp_start": 101100001,
  "bp_stop": 104200000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 33.2,
  "iscn_start": 5989,
  "iscn_stop": 6087,
  "bp_start": 104200001,
  "bp_stop": 106400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 33.3,
  "iscn_start": 6087,
  "iscn_stop": 6256,
  "bp_start": 106400001,
  "bp_stop": 109600000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 13,
  "arm": "q",
  "band": 34,
  "iscn_start": 6256,
  "iscn_stop": 6510,
  "bp_start": 109600001,
  "bp_stop": 114364328,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "p",
  "band": 13,
  "iscn_start": 0,
  "iscn_stop": 284,
  "bp_start": 1,
  "bp_stop": 3600000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "p",
  "band": 12,
  "iscn_start": 284,
  "iscn_stop": 624,
  "bp_start": 3600001,
  "bp_stop": 8000000,
  "stain": "stalk",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 624,
  "iscn_stop": 1249,
  "bp_start": 8000001,
  "bp_stop": 16100000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1249,
  "iscn_stop": 1433,
  "bp_start": 16100001,
  "bp_stop": 17200000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 1433,
  "iscn_stop": 1660,
  "bp_start": 17200001,
  "bp_stop": 18200000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 1660,
  "iscn_stop": 2043,
  "bp_start": 18200001,
  "bp_stop": 24100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 12,
  "iscn_start": 2043,
  "iscn_stop": 2313,
  "bp_start": 24100001,
  "bp_stop": 32900000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 13.1,
  "iscn_start": 2313,
  "iscn_stop": 2469,
  "bp_start": 32900001,
  "bp_stop": 34800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 2469,
  "iscn_stop": 2582,
  "bp_start": 34800001,
  "bp_stop": 36100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 13.3,
  "iscn_start": 2582,
  "iscn_stop": 2724,
  "bp_start": 36100001,
  "bp_stop": 37400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 2724,
  "iscn_stop": 2923,
  "bp_start": 37400001,
  "bp_stop": 43000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 2923,
  "iscn_stop": 3008,
  "bp_start": 43000001,
  "bp_stop": 46700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 3008,
  "iscn_stop": 3264,
  "bp_start": 46700001,
  "bp_stop": 50400000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 3264,
  "iscn_stop": 3491,
  "bp_start": 50400001,
  "bp_stop": 53600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 3491,
  "iscn_stop": 3604,
  "bp_start": 53600001,
  "bp_stop": 55000000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 3604,
  "iscn_stop": 3718,
  "bp_start": 55000001,
  "bp_stop": 57600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 3718,
  "iscn_stop": 3916,
  "bp_start": 57600001,
  "bp_stop": 61600000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 3916,
  "iscn_stop": 4044,
  "bp_start": 61600001,
  "bp_stop": 64300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 4044,
  "iscn_stop": 4186,
  "bp_start": 64300001,
  "bp_stop": 67400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 4186,
  "iscn_stop": 4484,
  "bp_start": 67400001,
  "bp_stop": 69800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 4484,
  "iscn_stop": 4626,
  "bp_start": 69800001,
  "bp_stop": 73300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 4626,
  "iscn_stop": 4839,
  "bp_start": 73300001,
  "bp_stop": 78800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 31.1,
  "iscn_start": 4839,
  "iscn_stop": 5051,
  "bp_start": 78800001,
  "bp_stop": 83100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 31.2,
  "iscn_start": 5051,
  "iscn_stop": 5094,
  "bp_start": 83100001,
  "bp_stop": 84400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 31.3,
  "iscn_start": 5094,
  "iscn_stop": 5349,
  "bp_start": 84400001,
  "bp_stop": 89300000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 32.11,
  "iscn_start": 5349,
  "iscn_stop": 5406,
  "bp_start": 89300001,
  "bp_stop": 91400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 32.12,
  "iscn_start": 5406,
  "iscn_stop": 5505,
  "bp_start": 91400001,
  "bp_stop": 94200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 32.13,
  "iscn_start": 5505,
  "iscn_stop": 5619,
  "bp_start": 94200001,
  "bp_stop": 95800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 32.2,
  "iscn_start": 5619,
  "iscn_stop": 5732,
  "bp_start": 95800001,
  "bp_stop": 100900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 32.31,
  "iscn_start": 5732,
  "iscn_stop": 5903,
  "bp_start": 100900001,
  "bp_stop": 102700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 32.32,
  "iscn_start": 5903,
  "iscn_stop": 6016,
  "bp_start": 102700001,
  "bp_stop": 103500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 14,
  "arm": "q",
  "band": 32.33,
  "iscn_start": 6016,
  "iscn_stop": 6300,
  "bp_start": 103500001,
  "bp_stop": 107043718,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "p",
  "band": 13,
  "iscn_start": 0,
  "iscn_stop": 270,
  "bp_start": 1,
  "bp_stop": 4200000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "p",
  "band": 12,
  "iscn_start": 270,
  "iscn_stop": 631,
  "bp_start": 4200001,
  "bp_stop": 9700000,
  "stain": "stalk",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 631,
  "iscn_stop": 1142,
  "bp_start": 9700001,
  "bp_stop": 17500000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1142,
  "iscn_stop": 1382,
  "bp_start": 17500001,
  "bp_stop": 19000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 1382,
  "iscn_stop": 1487,
  "bp_start": 19000001,
  "bp_stop": 20500000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 1487,
  "iscn_stop": 1773,
  "bp_start": 20500001,
  "bp_stop": 25500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 12,
  "iscn_start": 1773,
  "iscn_stop": 1968,
  "bp_start": 25500001,
  "bp_stop": 27800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 13.1,
  "iscn_start": 1968,
  "iscn_stop": 2164,
  "bp_start": 27800001,
  "bp_stop": 30000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 2164,
  "iscn_stop": 2284,
  "bp_start": 30000001,
  "bp_stop": 30900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 13.3,
  "iscn_start": 2284,
  "iscn_stop": 2524,
  "bp_start": 30900001,
  "bp_stop": 33400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 14,
  "iscn_start": 2524,
  "iscn_stop": 2765,
  "bp_start": 33400001,
  "bp_stop": 39800000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 15.1,
  "iscn_start": 2765,
  "iscn_stop": 2975,
  "bp_start": 39800001,
  "bp_stop": 42500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 15.2,
  "iscn_start": 2975,
  "iscn_stop": 3065,
  "bp_start": 42500001,
  "bp_stop": 43300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 15.3,
  "iscn_start": 3065,
  "iscn_stop": 3245,
  "bp_start": 43300001,
  "bp_stop": 44500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 3245,
  "iscn_stop": 3471,
  "bp_start": 44500001,
  "bp_stop": 49200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 3471,
  "iscn_stop": 3621,
  "bp_start": 49200001,
  "bp_stop": 52600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 3621,
  "iscn_stop": 3846,
  "bp_start": 52600001,
  "bp_stop": 58800000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 3846,
  "iscn_stop": 3982,
  "bp_start": 58800001,
  "bp_stop": 59000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 3982,
  "iscn_stop": 4087,
  "bp_start": 59000001,
  "bp_stop": 63400000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 22.31,
  "iscn_start": 4087,
  "iscn_stop": 4252,
  "bp_start": 63400001,
  "bp_stop": 66900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 22.32,
  "iscn_start": 4252,
  "iscn_stop": 4357,
  "bp_start": 66900001,
  "bp_stop": 67000000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 22.33,
  "iscn_start": 4357,
  "iscn_stop": 4507,
  "bp_start": 67000001,
  "bp_stop": 67200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 23,
  "iscn_start": 4507,
  "iscn_stop": 4613,
  "bp_start": 67200001,
  "bp_stop": 72400000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 4613,
  "iscn_stop": 4748,
  "bp_start": 72400001,
  "bp_stop": 74900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 4748,
  "iscn_stop": 4808,
  "bp_start": 74900001,
  "bp_stop": 76300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 4808,
  "iscn_stop": 4928,
  "bp_start": 76300001,
  "bp_stop": 78000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 25.1,
  "iscn_start": 4928,
  "iscn_stop": 5048,
  "bp_start": 78000001,
  "bp_stop": 81400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 25.2,
  "iscn_start": 5048,
  "iscn_stop": 5169,
  "bp_start": 81400001,
  "bp_stop": 84700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 25.3,
  "iscn_start": 5169,
  "iscn_stop": 5379,
  "bp_start": 84700001,
  "bp_stop": 88500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 26.1,
  "iscn_start": 5379,
  "iscn_stop": 5649,
  "bp_start": 88500001,
  "bp_stop": 93800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 26.2,
  "iscn_start": 5649,
  "iscn_stop": 5860,
  "bp_start": 93800001,
  "bp_stop": 98000000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 15,
  "arm": "q",
  "band": 26.3,
  "iscn_start": 5860,
  "iscn_stop": 6070,
  "bp_start": 98000001,
  "bp_stop": 101991189,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 13.3,
  "iscn_start": 0,
  "iscn_stop": 352,
  "bp_start": 1,
  "bp_stop": 7800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 13.2,
  "iscn_start": 352,
  "iscn_stop": 596,
  "bp_start": 7800001,
  "bp_stop": 10400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 13.13,
  "iscn_start": 596,
  "iscn_stop": 813,
  "bp_start": 10400001,
  "bp_stop": 12500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 13.12,
  "iscn_start": 813,
  "iscn_stop": 948,
  "bp_start": 12500001,
  "bp_stop": 14700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 13.11,
  "iscn_start": 948,
  "iscn_stop": 1070,
  "bp_start": 14700001,
  "bp_stop": 16700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 12.3,
  "iscn_start": 1070,
  "iscn_stop": 1246,
  "bp_start": 16700001,
  "bp_stop": 21200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 12.2,
  "iscn_start": 1246,
  "iscn_stop": 1409,
  "bp_start": 21200001,
  "bp_stop": 24200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 12.1,
  "iscn_start": 1409,
  "iscn_stop": 1558,
  "bp_start": 24200001,
  "bp_stop": 28500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 1558,
  "iscn_stop": 1856,
  "bp_start": 28500001,
  "bp_stop": 35300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1856,
  "iscn_stop": 2045,
  "bp_start": 35300001,
  "bp_stop": 36800000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 2045,
  "iscn_stop": 2194,
  "bp_start": 36800001,
  "bp_stop": 38400000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 2194,
  "iscn_stop": 2709,
  "bp_start": 38400001,
  "bp_stop": 47000000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 12.1,
  "iscn_start": 2709,
  "iscn_stop": 2953,
  "bp_start": 47000001,
  "bp_stop": 52600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 2953,
  "iscn_stop": 3142,
  "bp_start": 52600001,
  "bp_stop": 56000000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 13,
  "iscn_start": 3142,
  "iscn_stop": 3346,
  "bp_start": 56000001,
  "bp_stop": 57300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 21,
  "iscn_start": 3346,
  "iscn_stop": 3657,
  "bp_start": 57300001,
  "bp_stop": 66600000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 3657,
  "iscn_stop": 4023,
  "bp_start": 66600001,
  "bp_stop": 70800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 4023,
  "iscn_stop": 4118,
  "bp_start": 70800001,
  "bp_stop": 72800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 4118,
  "iscn_stop": 4294,
  "bp_start": 72800001,
  "bp_stop": 74100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 4294,
  "iscn_stop": 4551,
  "bp_start": 74100001,
  "bp_stop": 79200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 4551,
  "iscn_stop": 4659,
  "bp_start": 79200001,
  "bp_stop": 81600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 4659,
  "iscn_stop": 4768,
  "bp_start": 81600001,
  "bp_stop": 84100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 4768,
  "iscn_stop": 4930,
  "bp_start": 84100001,
  "bp_stop": 87000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 4930,
  "iscn_stop": 5025,
  "bp_start": 87000001,
  "bp_stop": 88700000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 16,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 5025,
  "iscn_stop": 5120,
  "bp_start": 88700001,
  "bp_stop": 90338345,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "p",
  "band": 13.3,
  "iscn_start": 0,
  "iscn_stop": 385,
  "bp_start": 1,
  "bp_stop": 3400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "p",
  "band": 13.2,
  "iscn_start": 385,
  "iscn_stop": 550,
  "bp_start": 3400001,
  "bp_stop": 6500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 17,
  "arm": "p",
  "band": 13.1,
  "iscn_start": 550,
  "iscn_stop": 784,
  "bp_start": 6500001,
  "bp_stop": 10800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "p",
  "band": 12,
  "iscn_start": 784,
  "iscn_stop": 990,
  "bp_start": 10800001,
  "bp_stop": 16100000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 17,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 990,
  "iscn_stop": 1499,
  "bp_start": 16100001,
  "bp_stop": 22700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1499,
  "iscn_stop": 1664,
  "bp_start": 22700001,
  "bp_stop": 25100000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 1664,
  "iscn_stop": 1815,
  "bp_start": 25100001,
  "bp_stop": 27400000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 1815,
  "iscn_stop": 2104,
  "bp_start": 27400001,
  "bp_stop": 33500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 12,
  "iscn_start": 2104,
  "iscn_stop": 2255,
  "bp_start": 33500001,
  "bp_stop": 39800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 2255,
  "iscn_stop": 2461,
  "bp_start": 39800001,
  "bp_stop": 40200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 2461,
  "iscn_stop": 2599,
  "bp_start": 40200001,
  "bp_stop": 42800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 21.31,
  "iscn_start": 2599,
  "iscn_stop": 2874,
  "bp_start": 42800001,
  "bp_stop": 46800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 21.32,
  "iscn_start": 2874,
  "iscn_stop": 3025,
  "bp_start": 46800001,
  "bp_stop": 49300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 21.33,
  "iscn_start": 3025,
  "iscn_stop": 3176,
  "bp_start": 49300001,
  "bp_stop": 52100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 22,
  "iscn_start": 3176,
  "iscn_stop": 3383,
  "bp_start": 52100001,
  "bp_stop": 59500000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 23.1,
  "iscn_start": 3383,
  "iscn_stop": 3451,
  "bp_start": 59500001,
  "bp_stop": 60200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 23.2,
  "iscn_start": 3451,
  "iscn_stop": 3658,
  "bp_start": 60200001,
  "bp_stop": 63100000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 23.3,
  "iscn_start": 3658,
  "iscn_stop": 3781,
  "bp_start": 63100001,
  "bp_stop": 64600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 24.1,
  "iscn_start": 3781,
  "iscn_stop": 3850,
  "bp_start": 64600001,
  "bp_stop": 66200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 24.2,
  "iscn_start": 3850,
  "iscn_stop": 4001,
  "bp_start": 66200001,
  "bp_stop": 69100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 24.3,
  "iscn_start": 4001,
  "iscn_stop": 4166,
  "bp_start": 69100001,
  "bp_stop": 72900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 25.1,
  "iscn_start": 4166,
  "iscn_stop": 4400,
  "bp_start": 72900001,
  "bp_stop": 76800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 25.2,
  "iscn_start": 4400,
  "iscn_stop": 4510,
  "bp_start": 76800001,
  "bp_stop": 77200000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 17,
  "arm": "q",
  "band": 25.3,
  "iscn_start": 4510,
  "iscn_stop": 4950,
  "bp_start": 77200001,
  "bp_stop": 83257441,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "p",
  "band": 11.32,
  "iscn_start": 0,
  "iscn_stop": 159,
  "bp_start": 1,
  "bp_stop": 2900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "p",
  "band": 11.31,
  "iscn_start": 159,
  "iscn_stop": 430,
  "bp_start": 2900001,
  "bp_stop": 7200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 18,
  "arm": "p",
  "band": 11.23,
  "iscn_start": 430,
  "iscn_stop": 526,
  "bp_start": 7200001,
  "bp_stop": 8500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "p",
  "band": 11.22,
  "iscn_start": 526,
  "iscn_stop": 685,
  "bp_start": 8500001,
  "bp_stop": 10900000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 18,
  "arm": "p",
  "band": 11.21,
  "iscn_start": 685,
  "iscn_stop": 1035,
  "bp_start": 10900001,
  "bp_stop": 15400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1035,
  "iscn_stop": 1290,
  "bp_start": 15400001,
  "bp_stop": 18500000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 1290,
  "iscn_stop": 1561,
  "bp_start": 18500001,
  "bp_stop": 21500000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 1561,
  "iscn_stop": 1847,
  "bp_start": 21500001,
  "bp_stop": 27500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 12.1,
  "iscn_start": 1847,
  "iscn_stop": 2229,
  "bp_start": 27500001,
  "bp_stop": 35100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 2229,
  "iscn_stop": 2436,
  "bp_start": 35100001,
  "bp_stop": 39500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 12.3,
  "iscn_start": 2436,
  "iscn_stop": 2755,
  "bp_start": 39500001,
  "bp_stop": 45900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 2755,
  "iscn_stop": 3153,
  "bp_start": 45900001,
  "bp_stop": 50700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 3153,
  "iscn_stop": 3392,
  "bp_start": 50700001,
  "bp_stop": 56200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 21.31,
  "iscn_start": 3392,
  "iscn_stop": 3519,
  "bp_start": 56200001,
  "bp_stop": 58600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 21.32,
  "iscn_start": 3519,
  "iscn_stop": 3663,
  "bp_start": 58600001,
  "bp_stop": 61300000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 21.33,
  "iscn_start": 3663,
  "iscn_stop": 3758,
  "bp_start": 61300001,
  "bp_stop": 63900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 22.1,
  "iscn_start": 3758,
  "iscn_stop": 4077,
  "bp_start": 63900001,
  "bp_stop": 69100000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 4077,
  "iscn_stop": 4204,
  "bp_start": 69100001,
  "bp_stop": 71000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 4204,
  "iscn_stop": 4411,
  "bp_start": 71000001,
  "bp_stop": 75400000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 18,
  "arm": "q",
  "band": 23,
  "iscn_start": 4411,
  "iscn_stop": 4650,
  "bp_start": 75400001,
  "bp_stop": 80373285,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "p",
  "band": 13.3,
  "iscn_start": 0,
  "iscn_stop": 578,
  "bp_start": 1,
  "bp_stop": 6900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "p",
  "band": 13.2,
  "iscn_start": 578,
  "iscn_stop": 870,
  "bp_start": 6900001,
  "bp_stop": 12600000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 19,
  "arm": "p",
  "band": 13.13,
  "iscn_start": 870,
  "iscn_stop": 1034,
  "bp_start": 12600001,
  "bp_stop": 13800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "p",
  "band": 13.12,
  "iscn_start": 1034,
  "iscn_stop": 1216,
  "bp_start": 13800001,
  "bp_stop": 16100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 19,
  "arm": "p",
  "band": 13.11,
  "iscn_start": 1216,
  "iscn_stop": 1581,
  "bp_start": 16100001,
  "bp_stop": 19900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "p",
  "band": 12,
  "iscn_start": 1581,
  "iscn_stop": 1809,
  "bp_start": 19900001,
  "bp_stop": 24200000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "p",
  "band": 11,
  "iscn_start": 1809,
  "iscn_stop": 1992,
  "bp_start": 24200001,
  "bp_stop": 26200000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 11,
  "iscn_start": 1992,
  "iscn_stop": 2159,
  "bp_start": 26200001,
  "bp_stop": 28100000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 12,
  "iscn_start": 2159,
  "iscn_stop": 2372,
  "bp_start": 28100001,
  "bp_stop": 31900000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.11,
  "iscn_start": 2372,
  "iscn_stop": 2569,
  "bp_start": 31900001,
  "bp_stop": 35100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.12,
  "iscn_start": 2569,
  "iscn_stop": 2737,
  "bp_start": 35100001,
  "bp_stop": 37800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.13,
  "iscn_start": 2737,
  "iscn_stop": 2949,
  "bp_start": 37800001,
  "bp_stop": 38200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 2949,
  "iscn_stop": 3101,
  "bp_start": 38200001,
  "bp_stop": 42900000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.31,
  "iscn_start": 3101,
  "iscn_stop": 3193,
  "bp_start": 42900001,
  "bp_stop": 44700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.32,
  "iscn_start": 3193,
  "iscn_stop": 3390,
  "bp_start": 44700001,
  "bp_stop": 47500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.33,
  "iscn_start": 3390,
  "iscn_stop": 3649,
  "bp_start": 47500001,
  "bp_stop": 50900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.41,
  "iscn_start": 3649,
  "iscn_stop": 3770,
  "bp_start": 50900001,
  "bp_stop": 53100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.42,
  "iscn_start": 3770,
  "iscn_stop": 3938,
  "bp_start": 53100001,
  "bp_stop": 55800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 19,
  "arm": "q",
  "band": 13.43,
  "iscn_start": 3938,
  "iscn_stop": 4120,
  "bp_start": 55800001,
  "bp_stop": 58617616,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 20,
  "arm": "p",
  "band": 13,
  "iscn_start": 0,
  "iscn_stop": 333,
  "bp_start": 1,
  "bp_stop": 5100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "p",
  "band": 12.3,
  "iscn_start": 333,
  "iscn_stop": 513,
  "bp_start": 5100001,
  "bp_stop": 9200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 20,
  "arm": "p",
  "band": 12.2,
  "iscn_start": 513,
  "iscn_stop": 624,
  "bp_start": 9200001,
  "bp_stop": 12000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "p",
  "band": 12.1,
  "iscn_start": 624,
  "iscn_stop": 915,
  "bp_start": 12000001,
  "bp_stop": 17900000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 20,
  "arm": "p",
  "band": 11.23,
  "iscn_start": 915,
  "iscn_stop": 1164,
  "bp_start": 17900001,
  "bp_stop": 21300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "p",
  "band": 11.22,
  "iscn_start": 1164,
  "iscn_stop": 1275,
  "bp_start": 21300001,
  "bp_stop": 22300000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 20,
  "arm": "p",
  "band": 11.21,
  "iscn_start": 1275,
  "iscn_stop": 1441,
  "bp_start": 22300001,
  "bp_stop": 25700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1441,
  "iscn_stop": 1608,
  "bp_start": 25700001,
  "bp_stop": 28100000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 1608,
  "iscn_stop": 1774,
  "bp_start": 28100001,
  "bp_stop": 30400000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 11.21,
  "iscn_start": 1774,
  "iscn_stop": 1927,
  "bp_start": 30400001,
  "bp_stop": 33500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 11.22,
  "iscn_start": 1927,
  "iscn_stop": 2051,
  "bp_start": 33500001,
  "bp_stop": 35800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 11.23,
  "iscn_start": 2051,
  "iscn_stop": 2232,
  "bp_start": 35800001,
  "bp_stop": 39000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 12,
  "iscn_start": 2232,
  "iscn_stop": 2439,
  "bp_start": 39000001,
  "bp_stop": 43100000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 13.11,
  "iscn_start": 2439,
  "iscn_stop": 2578,
  "bp_start": 43100001,
  "bp_stop": 43500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 13.12,
  "iscn_start": 2578,
  "iscn_stop": 2758,
  "bp_start": 43500001,
  "bp_stop": 47800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 13.13,
  "iscn_start": 2758,
  "iscn_stop": 3077,
  "bp_start": 47800001,
  "bp_stop": 51200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 3077,
  "iscn_stop": 3299,
  "bp_start": 51200001,
  "bp_stop": 56400000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 13.31,
  "iscn_start": 3299,
  "iscn_stop": 3382,
  "bp_start": 56400001,
  "bp_stop": 57800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 13.32,
  "iscn_start": 3382,
  "iscn_stop": 3493,
  "bp_start": 57800001,
  "bp_stop": 59700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 20,
  "arm": "q",
  "band": 13.33,
  "iscn_start": 3493,
  "iscn_stop": 3770,
  "bp_start": 59700001,
  "bp_stop": 64444167,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "p",
  "band": 13,
  "iscn_start": 0,
  "iscn_stop": 311,
  "bp_start": 1,
  "bp_stop": 3100000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "p",
  "band": 12,
  "iscn_start": 311,
  "iscn_stop": 683,
  "bp_start": 3100001,
  "bp_stop": 7000000,
  "stain": "stalk",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 683,
  "iscn_stop": 1056,
  "bp_start": 7000001,
  "bp_stop": 10900000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1056,
  "iscn_stop": 1274,
  "bp_start": 10900001,
  "bp_stop": 12000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 1274,
  "iscn_stop": 1367,
  "bp_start": 12000001,
  "bp_stop": 13000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 11.2,
  "iscn_start": 1367,
  "iscn_stop": 1584,
  "bp_start": 13000001,
  "bp_stop": 15000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 21.1,
  "iscn_start": 1584,
  "iscn_stop": 2019,
  "bp_start": 15000001,
  "bp_stop": 22600000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 21.2,
  "iscn_start": 2019,
  "iscn_stop": 2144,
  "bp_start": 22600001,
  "bp_stop": 25500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 21.3,
  "iscn_start": 2144,
  "iscn_stop": 2330,
  "bp_start": 25500001,
  "bp_stop": 30200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 22.11,
  "iscn_start": 2330,
  "iscn_stop": 2485,
  "bp_start": 30200001,
  "bp_stop": 34400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 22.12,
  "iscn_start": 2485,
  "iscn_stop": 2610,
  "bp_start": 34400001,
  "bp_stop": 36400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 22.13,
  "iscn_start": 2610,
  "iscn_stop": 2703,
  "bp_start": 36400001,
  "bp_stop": 38300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 22.2,
  "iscn_start": 2703,
  "iscn_stop": 2858,
  "bp_start": 38300001,
  "bp_stop": 41200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 21,
  "arm": "q",
  "band": 22.3,
  "iscn_start": 2858,
  "iscn_stop": 3200,
  "bp_start": 41200001,
  "bp_stop": 46709983,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "p",
  "band": 13,
  "iscn_start": 0,
  "iscn_stop": 260,
  "bp_start": 1,
  "bp_stop": 4300000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "p",
  "band": 12,
  "iscn_start": 260,
  "iscn_stop": 576,
  "bp_start": 4300001,
  "bp_stop": 9400000,
  "stain": "stalk",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "p",
  "band": 11.2,
  "iscn_start": 576,
  "iscn_stop": 836,
  "bp_start": 9400001,
  "bp_stop": 13700000,
  "stain": "gvar",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "p",
  "band": 11.1,
  "iscn_start": 836,
  "iscn_stop": 1015,
  "bp_start": 13700001,
  "bp_stop": 15000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 11.1,
  "iscn_start": 1015,
  "iscn_stop": 1234,
  "bp_start": 15000001,
  "bp_stop": 17400000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 11.21,
  "iscn_start": 1234,
  "iscn_stop": 1563,
  "bp_start": 17400001,
  "bp_stop": 21700000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 11.22,
  "iscn_start": 1563,
  "iscn_stop": 1700,
  "bp_start": 21700001,
  "bp_stop": 23100000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 11.23,
  "iscn_start": 1700,
  "iscn_stop": 1878,
  "bp_start": 23100001,
  "bp_stop": 25500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 12.1,
  "iscn_start": 1878,
  "iscn_stop": 2029,
  "bp_start": 25500001,
  "bp_stop": 29200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 12.2,
  "iscn_start": 2029,
  "iscn_stop": 2194,
  "bp_start": 29200001,
  "bp_stop": 31800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 12.3,
  "iscn_start": 2194,
  "iscn_stop": 2413,
  "bp_start": 31800001,
  "bp_stop": 37200000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 13.1,
  "iscn_start": 2413,
  "iscn_stop": 2687,
  "bp_start": 37200001,
  "bp_stop": 40600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 13.2,
  "iscn_start": 2687,
  "iscn_stop": 2852,
  "bp_start": 40600001,
  "bp_stop": 43800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 13.31,
  "iscn_start": 2852,
  "iscn_stop": 3181,
  "bp_start": 43800001,
  "bp_stop": 48100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 13.32,
  "iscn_start": 3181,
  "iscn_stop": 3290,
  "bp_start": 48100001,
  "bp_stop": 49100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": 22,
  "arm": "q",
  "band": 13.33,
  "iscn_start": 3290,
  "iscn_stop": 3400,
  "bp_start": 49100001,
  "bp_stop": 50818468,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 22.33,
  "iscn_start": 0,
  "iscn_stop": 323,
  "bp_start": 1,
  "bp_stop": 4400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 22.32,
  "iscn_start": 323,
  "iscn_stop": 504,
  "bp_start": 4400001,
  "bp_stop": 6100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 22.31,
  "iscn_start": 504,
  "iscn_stop": 866,
  "bp_start": 6100001,
  "bp_stop": 9600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 22.2,
  "iscn_start": 866,
  "iscn_stop": 1034,
  "bp_start": 9600001,
  "bp_stop": 17400000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 22.13,
  "iscn_start": 1034,
  "iscn_stop": 1345,
  "bp_start": 17400001,
  "bp_stop": 19200000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 22.12,
  "iscn_start": 1345,
  "iscn_stop": 1448,
  "bp_start": 19200001,
  "bp_stop": 21900000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 22.11,
  "iscn_start": 1448,
  "iscn_stop": 1577,
  "bp_start": 21900001,
  "bp_stop": 24900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 21.3,
  "iscn_start": 1577,
  "iscn_stop": 1784,
  "bp_start": 24900001,
  "bp_stop": 29300000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 21.2,
  "iscn_start": 1784,
  "iscn_stop": 1862,
  "bp_start": 29300001,
  "bp_stop": 31500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 21.1,
  "iscn_start": 1862,
  "iscn_stop": 2120,
  "bp_start": 31500001,
  "bp_stop": 37800000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 11.4,
  "iscn_start": 2120,
  "iscn_stop": 2430,
  "bp_start": 37800001,
  "bp_stop": 42500000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 11.3,
  "iscn_start": 2430,
  "iscn_stop": 2624,
  "bp_start": 42500001,
  "bp_stop": 47600000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 11.23,
  "iscn_start": 2624,
  "iscn_stop": 2948,
  "bp_start": 47600001,
  "bp_stop": 50100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 11.22,
  "iscn_start": 2948,
  "iscn_stop": 3129,
  "bp_start": 50100001,
  "bp_stop": 54800000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 11.21,
  "iscn_start": 3129,
  "iscn_stop": 3206,
  "bp_start": 54800001,
  "bp_stop": 58100000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "p",
  "band": 11.1,
  "iscn_start": 3206,
  "iscn_stop": 3297,
  "bp_start": 58100001,
  "bp_stop": 61000000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 11.1,
  "iscn_start": 3297,
  "iscn_stop": 3491,
  "bp_start": 61000001,
  "bp_stop": 63800000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 11.2,
  "iscn_start": 3491,
  "iscn_stop": 3620,
  "bp_start": 63800001,
  "bp_stop": 65400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 12,
  "iscn_start": 3620,
  "iscn_stop": 3827,
  "bp_start": 65400001,
  "bp_stop": 68500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 13.1,
  "iscn_start": 3827,
  "iscn_stop": 4137,
  "bp_start": 68500001,
  "bp_stop": 73000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 13.2,
  "iscn_start": 4137,
  "iscn_stop": 4292,
  "bp_start": 73000001,
  "bp_stop": 74700000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 13.3,
  "iscn_start": 4292,
  "iscn_stop": 4447,
  "bp_start": 74700001,
  "bp_stop": 76800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 21.1,
  "iscn_start": 4447,
  "iscn_stop": 4732,
  "bp_start": 76800001,
  "bp_stop": 85400000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 21.2,
  "iscn_start": 4732,
  "iscn_stop": 4809,
  "bp_start": 85400001,
  "bp_stop": 87000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 21.31,
  "iscn_start": 4809,
  "iscn_stop": 5107,
  "bp_start": 87000001,
  "bp_stop": 92700000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 21.32,
  "iscn_start": 5107,
  "iscn_stop": 5184,
  "bp_start": 92700001,
  "bp_stop": 94300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 21.33,
  "iscn_start": 5184,
  "iscn_stop": 5430,
  "bp_start": 94300001,
  "bp_stop": 99100000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 22.1,
  "iscn_start": 5430,
  "iscn_stop": 5701,
  "bp_start": 99100001,
  "bp_stop": 103300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 22.2,
  "iscn_start": 5701,
  "iscn_stop": 5843,
  "bp_start": 103300001,
  "bp_stop": 104500000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 22.3,
  "iscn_start": 5843,
  "iscn_stop": 6050,
  "bp_start": 104500001,
  "bp_stop": 109400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 23,
  "iscn_start": 6050,
  "iscn_stop": 6322,
  "bp_start": 109400001,
  "bp_stop": 117400000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 24,
  "iscn_start": 6322,
  "iscn_stop": 6619,
  "bp_start": 117400001,
  "bp_stop": 121800000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 25,
  "iscn_start": 6619,
  "iscn_stop": 7059,
  "bp_start": 121800001,
  "bp_stop": 129500000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 26.1,
  "iscn_start": 7059,
  "iscn_stop": 7253,
  "bp_start": 129500001,
  "bp_stop": 131300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 26.2,
  "iscn_start": 7253,
  "iscn_stop": 7395,
  "bp_start": 131300001,
  "bp_stop": 134500000,
  "stain": "gpos",
  "density": 25
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 26.3,
  "iscn_start": 7395,
  "iscn_stop": 7602,
  "bp_start": 134500001,
  "bp_stop": 138900000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 27.1,
  "iscn_start": 7602,
  "iscn_stop": 7808,
  "bp_start": 138900001,
  "bp_stop": 141200000,
  "stain": "gpos",
  "density": 75
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 27.2,
  "iscn_start": 7808,
  "iscn_stop": 7886,
  "bp_start": 141200001,
  "bp_stop": 143000000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 27.3,
  "iscn_start": 7886,
  "iscn_stop": 8145,
  "bp_start": 143000001,
  "bp_stop": 148000000,
  "stain": "gpos",
  "density": 100
}, {
  "#chromosome": "X",
  "arm": "q",
  "band": 28,
  "iscn_start": 8145,
  "iscn_stop": 8610,
  "bp_start": 148000001,
  "bp_stop": 156040895,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "Y",
  "arm": "p",
  "band": 11.32,
  "iscn_start": 0,
  "iscn_stop": 149,
  "bp_start": 1,
  "bp_stop": 300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "Y",
  "arm": "p",
  "band": 11.31,
  "iscn_start": 149,
  "iscn_stop": 298,
  "bp_start": 300001,
  "bp_stop": 600000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "Y",
  "arm": "p",
  "band": 11.2,
  "iscn_start": 298,
  "iscn_stop": 1043,
  "bp_start": 600001,
  "bp_stop": 10300000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "Y",
  "arm": "p",
  "band": 11.1,
  "iscn_start": 1043,
  "iscn_stop": 1117,
  "bp_start": 10300001,
  "bp_stop": 10400000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": "Y",
  "arm": "q",
  "band": 11.1,
  "iscn_start": 1117,
  "iscn_stop": 1266,
  "bp_start": 10400001,
  "bp_stop": 10600000,
  "stain": "acen",
  "density": null
}, {
  "#chromosome": "Y",
  "arm": "q",
  "band": 11.21,
  "iscn_start": 1266,
  "iscn_stop": 1397,
  "bp_start": 10600001,
  "bp_stop": 12400000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "Y",
  "arm": "q",
  "band": 11.221,
  "iscn_start": 1397,
  "iscn_stop": 1713,
  "bp_start": 12400001,
  "bp_stop": 17100000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "Y",
  "arm": "q",
  "band": 11.222,
  "iscn_start": 1713,
  "iscn_stop": 1881,
  "bp_start": 17100001,
  "bp_stop": 19600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "Y",
  "arm": "q",
  "band": 11.223,
  "iscn_start": 1881,
  "iscn_stop": 2160,
  "bp_start": 19600001,
  "bp_stop": 23800000,
  "stain": "gpos",
  "density": 50
}, {
  "#chromosome": "Y",
  "arm": "q",
  "band": 11.23,
  "iscn_start": 2160,
  "iscn_stop": 2346,
  "bp_start": 23800001,
  "bp_stop": 26600000,
  "stain": "gneg",
  "density": null
}, {
  "#chromosome": "Y",
  "arm": "q",
  "band": 12,
  "iscn_start": 2346,
  "iscn_stop": 3650,
  "bp_start": 26600001,
  "bp_stop": 57227415,
  "stain": "gvar",
  "density": null
}]
},{}],"gene-cluster":[function(require,module,exports){
(function (global){


var d3 = (typeof window !== "undefined" ? window['d3'] : typeof global !== "undefined" ? global['d3'] : null);
var browser = require('./core/browser.js');

var geneclusterAPI = browser;

geneclusterAPI.version = '0.0.1';

module.exports = geneclusterAPI;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./core/browser.js":14}]},{},["gene-cluster"])


//# sourceMappingURL=gene-cluster.js.map