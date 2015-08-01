require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  function Foo () {}
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    arr.constructor = Foo
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Foo && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
    return fromTypedArray(that, object)
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":3,"ieee754":4,"is-array":5}],3:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.3.2 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.3.2',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],11:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],12:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],13:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":11,"./encode":12}],14:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":15}],15:[function(require,module,exports){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


module.exports = Duplex;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/



/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

},{"./_stream_readable":17,"./_stream_writable":19,"core-util-is":20,"inherits":7,"process-nextick-args":21}],16:[function(require,module,exports){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":18,"core-util-is":20,"inherits":7}],17:[function(require,module,exports){
(function (process){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/


/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/



/*<replacement>*/
var Stream;
(function (){try{
  Stream = require('st' + 'ream');
}catch(_){}finally{
  if (!Stream)
    Stream = require('events').EventEmitter;
}}())
/*</replacement>*/

var Buffer = require('buffer').Buffer;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/



/*<replacement>*/
var debug = require('util');
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function')
    this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function() {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else {
      return state.length;
    }
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (ret !== null)
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!(Buffer.isBuffer(chunk)) &&
      typeof chunk !== 'string' &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      processNextTick(emitReadable_, stream);
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    processNextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }; }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))

},{"./_stream_duplex":15,"_process":9,"buffer":2,"core-util-is":20,"events":6,"inherits":7,"isarray":8,"process-nextick-args":21,"string_decoder/":37,"util":1}],18:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function')
      this._transform = options.transform;

    if (typeof options.flush === 'function')
      this._flush = options.flush;
  }

  this.once('prefinish', function() {
    if (typeof this._flush === 'function')
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":15,"core-util-is":20,"inherits":7}],19:[function(require,module,exports){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/



/*<replacement>*/
var Stream;
(function (){try{
  Stream = require('st' + 'ream');
}catch(_){}finally{
  if (!Stream)
    Stream = require('events').EventEmitter;
}}())
/*</replacement>*/

var Buffer = require('buffer').Buffer;

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function (){try {
Object.defineProperty(WritableState.prototype, 'buffer', {
  get: require('util-deprecate')(function() {
    return this.getBuffer();
  }, '_writableState.buffer is deprecated. Use ' +
      '_writableState.getBuffer() instead.')
});
}catch(_){}}());


function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function')
      this._write = options.write;

    if (typeof options.writev === 'function')
      this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;

  if (!(Buffer.isBuffer(chunk)) &&
      typeof chunk !== 'string' &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = nop;

  if (state.ended)
    writeAfterEnd(this, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.bufferedRequest)
      clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string')
    encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64',
'ucs2', 'ucs-2','utf16le', 'utf-16le', 'raw']
.indexOf((encoding + '').toLowerCase()) > -1))
    throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync)
    processNextTick(cb, er);
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      processNextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var buffer = [];
    var cbs = [];
    while (entry) {
      cbs.push(entry.callback);
      buffer.push(entry);
      entry = entry.next;
    }

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    state.lastBufferedRequest = null;
    doWrite(stream, state, true, state.length, buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null)
      state.lastBufferedRequest = null;
  }
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined)
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(state) {
  return (state.ending &&
          state.length === 0 &&
          state.bufferedRequest === null &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      processNextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

},{"./_stream_duplex":15,"buffer":2,"core-util-is":20,"events":6,"inherits":7,"process-nextick-args":21,"util-deprecate":22}],20:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)

},{"buffer":2}],21:[function(require,module,exports){
(function (process){
'use strict';
module.exports = nextTick;

function nextTick(fn) {
  var args = new Array(arguments.length - 1);
  var i = 0;
  while (i < arguments.length) {
    args[i++] = arguments[i];
  }
  process.nextTick(function afterTick() {
    fn.apply(null, args);
  });
}

}).call(this,require('_process'))

},{"_process":9}],22:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  if (!global.localStorage) return false;
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],23:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":16}],24:[function(require,module,exports){
var Stream = (function (){
  try {
    return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":15,"./lib/_stream_passthrough.js":16,"./lib/_stream_readable.js":17,"./lib/_stream_transform.js":18,"./lib/_stream_writable.js":19}],25:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":18}],26:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":19}],27:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":6,"inherits":7,"readable-stream/duplex.js":14,"readable-stream/passthrough.js":23,"readable-stream/readable.js":24,"readable-stream/transform.js":25,"readable-stream/writable.js":26}],28:[function(require,module,exports){
var ClientRequest = require('./lib/request')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Split opts.host into its components
	var hostHostname = opts.host ? opts.host.split(':')[0] : null
	var hostPort = opts.host ? parseInt(opts.host.split(':')[1], 10) : null

	opts.method = opts.method || 'GET'
	opts.headers = opts.headers || {}
	opts.path = opts.path || '/'
	opts.protocol = opts.protocol || window.location.protocol
	// If the hostname is provided, use the default port for the protocol. If
	// the url is instead relative, use window.location.port
	var defaultPort = (opts.hostname || hostHostname) ? (opts.protocol === 'https:' ? 443 : 80) : window.location.port
	opts.hostname = opts.hostname || hostHostname || window.location.hostname
	opts.port = opts.port || hostPort || defaultPort

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.STATUS_CODES = statusCodes

http.METHODS = [
	'GET',
	'POST',
	'PUT',
	'DELETE' // TODO: include the methods from RFC 2616 and 2518?
]

},{"./lib/request":30,"builtin-status-codes":32,"url":38,"xtend":39}],29:[function(require,module,exports){
exports.fetch = isFunction(window.fetch) && isFunction(window.ReadableByteStream)

exports.blobConstructor = false
try {
	new Blob([new ArrayBuffer(1)])
	exports.blobConstructor = true
} catch (e) {}

var xhr = new window.XMLHttpRequest()
xhr.open('GET', '/')

function checkTypeSupport (type) {
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

var haveArrayBuffer = isFunction(window.ArrayBuffer)
var haveSlice = haveArrayBuffer && isFunction(window.ArrayBuffer.prototype.slice)

exports.arraybuffer = haveArrayBuffer && checkTypeSupport('arraybuffer')
exports.msstream = haveSlice && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = haveArrayBuffer && checkTypeSupport('moz-chunked-arraybuffer')
exports.overrideMimeType = isFunction(xhr.overrideMimeType)
exports.vbArray = isFunction(window.VBArray)

function isFunction (value) {
  return typeof value === 'function'
}

xhr = null // Help gc

},{}],30:[function(require,module,exports){
(function (process,Buffer){
// var Base64 = require('Base64')
var capability = require('./capability')
var foreach = require('foreach')
var indexOf = require('indexof')
var inherits = require('inherits')
var keys = require('object-keys')
var response = require('./response')
var stream = require('stream')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary) {
	if (capability.fetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else if (capability.vbArray && preferBinary) {
		return 'text:vbarray'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._url = opts.protocol + '//' + opts.hostname + ':' + opts.port + opts.path
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
	foreach(keys(opts.headers), function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility isn't
		preferBinary = false
	} else if (opts.mode === 'prefer-fast') {
		// If binary is preferred for speed
		preferBinary = true
	} else if (!opts.mode || opts.mode === 'default') {
		// By default, use binary if text streaming may corrupt data
		preferBinary = !capability.overrideMimeType
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary)

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (indexOf(unsafeHeaders, lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var self = this
	return self._headers[name.toLowerCase()].value
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	var headersObj = self._headers
	var body
	if (opts.method === 'POST' || opts.method === 'PUT') {
		if (capability.blobConstructor) {
			body = new window.Blob(self._body.map(function (buffer) {
				return buffer.toArrayBuffer()
			}), {
				type: (headersObj['content-type'] || {}).value || ''
			})
		} else {
			// get utf8 string
			body = Buffer.concat(self._body).toString()
		}
	}

	if (self._mode === 'fetch') {
		var headers = keys(headersObj).map(function (name) {
			return [headersObj[name].name, headersObj[name].value]
		})

		window.fetch(self._url, {
			method: self._opts.method,
			headers: headers,
			body: body,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin'
		}).then(function (response) {
			self._fetchResponse = response
			self._connect()
		}).then(undefined, function (reason) {
			self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new window.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode.split(':')[0]

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		foreach(keys(headersObj), function (name) {
			xhr.setRequestHeader(headersObj[name].name, headersObj[name].value)
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable. Even though the spec says it should
 * be available in readyState 3, accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		return (xhr.status !== null)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
	var self = this
	self._destroyed = true
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	// Currently, there isn't a way to truly abort a fetch.
	// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	if (data)
		stream.Writable.push.call(self, data, encoding)

	stream.Writable.prototype.end.call(self, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'user-agent',
	'via'
]

}).call(this,require('_process'),require("buffer").Buffer)

},{"./capability":29,"./response":31,"_process":9,"buffer":2,"foreach":33,"indexof":34,"inherits":7,"object-keys":35,"stream":27}],31:[function(require,module,exports){
(function (process,Buffer){
var capability = require('./capability')
var foreach = require('foreach')
var inherits = require('inherits')
var stream = require('stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.statusCode = response.status
		self.statusMessage = response.statusText
		// backwards compatible version of for (<item> of <iterable>):
		// for (var <item>,_i,_it = <iterable>[Symbol.iterator](); <item> = (_i = _it.next()).value,!_i.done;)
		for (var header, _i, _it = response.headers[Symbol.iterator](); header = (_i = _it.next()).value, !_i.done;) {
			self.headers[header[0].toLowerCase()] = header[1]
			self.rawHeaders.push(header[0], header[1])
		}

		// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				if (result.done) {
					self.push(null)
					return
				}
				self.push(new Buffer(result.value))
				read()
			})
		}
		read()

	} else {
		self._xhr = xhr
		self._pos = 0

		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		foreach(headers, function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (self.headers[key] !== undefined)
					self.headers[key] += ', ' + matches[2]
				else
					self.headers[key] = matches[2]
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRProgress = function () {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text:vbarray': // For IE9
			if (xhr.readyState !== rStates.DONE)
				break
			try {
				// This fails in IE8
				response = new window.VBArray(xhr.responseBody).toArray()
			} catch (e) {}
			if (response !== null) {
				self.push(new Buffer(response))
				break
			}
			// Falls through in IE8	
		case 'text':
			try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
				response = xhr.responseText
			} catch (e) {
				self._mode = 'text:vbarray'
				break
			}
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = new Buffer(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE)
				break
			response = xhr.response
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new window.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		self.push(null)
	}
}

}).call(this,require('_process'),require("buffer").Buffer)

},{"./capability":29,"_process":9,"buffer":2,"foreach":33,"inherits":7,"stream":27}],32:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Moved Temporarily",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Time-out",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Request Entity Too Large",
  "414": "Request-URI Too Large",
  "415": "Unsupported Media Type",
  "416": "Requested Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Time-out",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],33:[function(require,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],34:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],35:[function(require,module,exports){
'use strict';

// modified from https://github.com/es-shims/es5-shim
var has = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var slice = Array.prototype.slice;
var isArgs = require('./isArguments');
var hasDontEnumBug = !({ 'toString': null }).propertyIsEnumerable('toString');
var hasProtoEnumBug = function () {}.propertyIsEnumerable('prototype');
var dontEnums = [
	'toString',
	'toLocaleString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'constructor'
];

var keysShim = function keys(object) {
	var isObject = object !== null && typeof object === 'object';
	var isFunction = toStr.call(object) === '[object Function]';
	var isArguments = isArgs(object);
	var isString = isObject && toStr.call(object) === '[object String]';
	var theKeys = [];

	if (!isObject && !isFunction && !isArguments) {
		throw new TypeError('Object.keys called on a non-object');
	}

	var skipProto = hasProtoEnumBug && isFunction;
	if (isString && object.length > 0 && !has.call(object, 0)) {
		for (var i = 0; i < object.length; ++i) {
			theKeys.push(String(i));
		}
	}

	if (isArguments && object.length > 0) {
		for (var j = 0; j < object.length; ++j) {
			theKeys.push(String(j));
		}
	} else {
		for (var name in object) {
			if (!(skipProto && name === 'prototype') && has.call(object, name)) {
				theKeys.push(String(name));
			}
		}
	}

	if (hasDontEnumBug) {
		var ctor = object.constructor;
		var skipConstructor = ctor && ctor.prototype === object;

		for (var k = 0; k < dontEnums.length; ++k) {
			if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
				theKeys.push(dontEnums[k]);
			}
		}
	}
	return theKeys;
};

keysShim.shim = function shimObjectKeys() {
	if (!Object.keys) {
		Object.keys = keysShim;
	} else {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			return (Object.keys(arguments) || '').length === 2;
		}(1, 2));
		if (!keysWorksWithArguments) {
			var originalKeys = Object.keys;
			Object.keys = function keys(object) {
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				} else {
					return originalKeys(object);
				}
			};
		}
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./isArguments":36}],36:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],37:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":2}],38:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":10,"querystring":13}],39:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],40:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.3.0
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$toString = {}.toString;
    var lib$es6$promise$asap$$vertxNext;
    var lib$es6$promise$asap$$customSchedulerFn;

    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        if (lib$es6$promise$asap$$customSchedulerFn) {
          lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
        } else {
          lib$es6$promise$asap$$scheduleFlush();
        }
      }
    }

    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
      lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
    }

    function lib$es6$promise$asap$$setAsap(asapFn) {
      lib$es6$promise$asap$$asap = asapFn;
    }

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      var nextTick = process.nextTick;
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // setImmediate should be used instead instead
      var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
      if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
        nextTick = setImmediate;
      }
      return function() {
        nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertex() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertex();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$asap(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = lib$es6$promise$$internal$$getThen(maybeThenable);

        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFullfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value);
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      var enumerator = this;

      enumerator._instanceConstructor = Constructor;
      enumerator.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (enumerator._validateInput(input)) {
        enumerator._input     = input;
        enumerator.length     = input.length;
        enumerator._remaining = input.length;

        enumerator._init();

        if (enumerator.length === 0) {
          lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
        } else {
          enumerator.length = enumerator.length || 0;
          enumerator._enumerate();
          if (enumerator._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(enumerator.promise, enumerator._validationError());
      }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return lib$es6$promise$utils$$isArray(input);
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var enumerator = this;

      var length  = enumerator.length;
      var promise = enumerator.promise;
      var input   = enumerator._input;

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        enumerator._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var enumerator = this;
      var c = enumerator._instanceConstructor;

      if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== lib$es6$promise$$internal$$PENDING) {
          entry._onerror = null;
          enumerator._settledAt(entry._state, i, entry._result);
        } else {
          enumerator._willSettleAt(c.resolve(entry), i);
        }
      } else {
        enumerator._remaining--;
        enumerator._result[i] = entry;
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var enumerator = this;
      var promise = enumerator.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        enumerator._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          enumerator._result[i] = value;
        }
      }

      if (enumerator._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, enumerator._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!lib$es6$promise$utils$$isArray(entries)) {
        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        lib$es6$promise$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        lib$es6$promise$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this._id = lib$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        if (!lib$es6$promise$utils$$isFunction(resolver)) {
          lib$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof lib$es6$promise$promise$$Promise)) {
          lib$es6$promise$promise$$needsNew();
        }

        lib$es6$promise$$internal$$initializePromise(this, resolver);
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor(lib$es6$promise$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          lib$es6$promise$asap$$asap(function(){
            lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":9}],41:[function(require,module,exports){
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

},{"lodash._baseassign":42,"lodash._createassigner":44,"lodash.keys":48}],42:[function(require,module,exports){
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

},{"lodash._basecopy":43,"lodash.keys":48}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
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

},{"lodash._bindcallback":45,"lodash._isiterateecall":46,"lodash.restparam":47}],45:[function(require,module,exports){
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

},{}],46:[function(require,module,exports){
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

},{}],47:[function(require,module,exports){
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

},{}],48:[function(require,module,exports){
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

},{"lodash._getnative":49,"lodash.isarguments":50,"lodash.isarray":51}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
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

},{}],52:[function(require,module,exports){
module.exports={
  "name": "ncbi-eutils",
  "version": "0.2.2",
  "description": "NCBI E-utilities API for JavaScript (Node + Browser)",
  "main": "src/index.js",
  "scripts": {
    "test": "gulp test"
  },
  "repository": {
    "type": "git",
    "url": "git+https://linjoey@github.com/linjoey/ncbi-eutils.git"
  },
  "author": "",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/linjoey/ncbi-eutils/issues"
  },
  "homepage": "https://github.com/linjoey/ncbi-eutils#readme",
  "devDependencies": {
    "browserify": "^11.0.0",
    "gulp": "^3.9.0",
    "gulp-concat": "^2.6.0",
    "gulp-mocha": "^2.1.3",
    "gulp-sourcemaps": "^1.5.2",
    "gulp-uglify": "^1.2.0",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "^1.1.0"
  },
  "dependencies": {
    "es6-promise": "^2.3.0",
    "lodash.assign": "^3.2.0",
    "request": "^2.60.0",
    "xml2js": "^0.4.9"
  },
  "readme": "# ncbi-eutils\n\nThis package is a JavaScript wrapper for **NCBI's E-utilities API** documented at http://www.ncbi.nlm.nih.gov/books/NBK25500/. It uses  ES6 promises to support \"piping\" to combine successive E-utility calls, e.g. piping `esearch` results to `elink`, then piping its result to `esummary`. This can be used in node (CommonJS) or the browser.\n\n[![npm version](https://badge.fury.io/js/ncbi-eutils.svg)](http://badge.fury.io/js/ncbi-eutils)\n[![npm version](https://img.shields.io/badge/license-MIT-blue.svg)]()\n\n### Usage\nAccess a single eutil:\n```javascript\n  var eutils = require('ncbi-eutils');\n  eutils.esearch({db:'gene', term: 'foxp2[sym] AND human[orgn]'})\n    .then(function(d){console.log(d)}) \n```\n\nBasic data pipelines: `esearch` -> `esummay`\n```javascript\n  eutils.esearch({db:'gene', term: 'ltf[sym] AND human[orgn]'})\n    .then(eutils.esummary)\n    .then(function(d){console.log(d)})\n```\n\nMore complex data pipelines: `esearch` -> `elink` -> `esummary` \n```javascript\n  eutils.esearch({db: 'protein', term: '15718680[UID]'})\n    .then(eutils.elink({dbto:'gene'}))\n    .then(function(d) {\n      //supported eutil parameters can be added like this\n      d.retstart = 5;\n      return eutils.esummary(d);\n    })\n    .then(function (d) {console.log(d)})\n    .catch(function (d) {console.log(d)});\n```\n\n\n### Install\n```javascript\nnpm install --save ncbi-eutils\n```\nor in a browser\n```html\n<script src=\"ncbi-eutils.min.js\"></script>\n<script>\n      var eutils = require('ncbi-eutils');\n      ...\n</script>\n```\n\n## API\n\nAll calls in this package return a promise object. To get the return values, pass a function to .then() or .catch() to get the results and errors, respectively. Alternatively, pass another eutil function to .then() to create a data pipeline. For detailed descriptions of each E-utility, please visit NCBI's documentations.\n\n### eutils.einfo([db])\nIf **db** is specified, return all metadata for that database. Otherwise, return the list of all available NCBI databases. To see a live example of this, go to: http://linjoey.github.io/ncbi-eutils/docs/dbinfo.html.\n\n### eutils.esearch(options)\n> Provides a list of UIDs matching a text query\n\n**options.db** a valid NCBI database name\n\n**options.term** a valid search term\n\n### eutils.esummary(options)\n> Returns document summaries (DocSums) for a list of input UIDs\n\n**options.db** a valid NCBI database name\n\n**options.id** array of ids to pass to esummary e.g ['12345', '67890']. Only required if called as the start of a pipeline.\n\n### eutils.efetch(options)\n> Returns formatted data records for a list of input UIDs\n\n**options.db** a valid NCBI database name\n\n**options.id** array of ids to pass to efetch e.g ['12345', '67890']. Only required if called as the start of a pipeline.\n\n### eutils.elink(options)\n> Returns UIDs linked to an input set of UIDs in either the same or a different Entrez database\n\n**options.dbto** a valid NCBI database name\n\n**options.dbfrom** a valid NCBI database name. Only required if called as the start of a pipeline.\n\n**options.id** array of ids to pass to esummary e.g ['12345', '67890']. Only required if called as the start of a pipeline.\n\n\n\n### Dev Agenda\n- [ ] Fix up efetch to support more user options\n- [x] test complex pipelines e.g. esearch | elink | efetch\n- [ ] implement other eutils: espell, egquery, ecitmatch?\n- [x] implement convenience calls for esearch -> esummary\n- [ ] write test test test\n- [ ] elink-> results dont have auto history server, relinking to other eutils use manual id passing. Implement epost to support large tasks\n\n### NCBI Copyright & Disclaimers\nPlease visit http://www.ncbi.nlm.nih.gov/About/disclaimer.html for NCBI's copyright notice.\n\n## License\nMIT\n",
  "readmeFilename": "README.md",
  "gitHead": "51ea68ba4668c3e973793059b3c7fb1f3e8cdc6d",
  "_id": "ncbi-eutils@0.2.2",
  "_shasum": "c839485b49f6cef1aeb6851fc7a3fadd050f907d",
  "_from": "ncbi-eutils@0.2.2"
}

},{}],53:[function(require,module,exports){

var request = require('./request.js')
  , Term = require('./term.js')
  , xml2js = require('xml2js').parseString
  , assign = require('lodash.assign')
  , EUTILS_BASE = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

function buildQueryParameters(options, ignoreList) {
  var query = '';
  for (var prop in options) {
    if (options.hasOwnProperty(prop) && ignoreList.indexOf(prop) == -1) {
      query += '&' + prop + '=' + options[prop];
    }
  }
  return query;
}

function ensureOptionIsSet(options, names, tag) {
  var msg = 'Invalid arguments supplied to ' + tag;
  if (options === undefined) {
    throw new Error(msg);
  }

  for (var i = 0; i < names.length; ++i) {
    if (options[names[i]] === undefined) {
      throw new Error(msg);
    }
  }
}

exports.einfo = function einfo(db) {
  var requestURL = EUTILS_BASE + 'einfo.fcgi?retmode=json&';
  if (db !== undefined) {
    requestURL += 'version=2.0&db=' + db;
  }
  return request(requestURL).then(function(res) {
    return JSON.parse(res);
  });
};

exports.esearch = function esearch(userOptions) {
  ensureOptionIsSet(userOptions, ['db', 'term'], 'esearch');

  var options = assign({
    retmax: 200
  }, userOptions);

  var requestURL = EUTILS_BASE + 'esearch.fcgi?retmode=json&usehistory=y';
  requestURL += buildQueryParameters(options, ['term', 'usehistory', 'retmode']);
  requestURL += '&term=' + (options.term instanceof Term ? options.term.queryText : options.term);

  return request(requestURL).then(function(res) {
    var jsonRes = JSON.parse(res);
    jsonRes.db = options.db;

    if (jsonRes.esearchresult.count <= options.retmax) {
      jsonRes.id = jsonRes.esearchresult.idlist;
    }

    return jsonRes;
  });
};

function makeRequest(requestURL) {
  return request(requestURL).then(function(res) {
    return new Promise(function(resolve, reject) {
      xml2js(res, {explicitArray:false}, function(err, result) {
        if (!err) {
          resolve(result);
        } else {
          reject(err);
        }
      });
    });
  });
}
exports.esummary = function summary(options) {
  ensureOptionIsSet(options, ['db'], 'esummary');

  var requestURL = EUTILS_BASE + 'esummary.fcgi?';
  requestURL += buildQueryParameters(options, ['esearchresult', 'header']);

  if (options.id === undefined) {
    requestURL += '&query_key=' + options.esearchresult.querykey;
    requestURL += '&webenv=' + options.esearchresult.webenv;
  }

  return makeRequest(requestURL);
};

function getWebenvKeysForURL(options) {
  var url = '';
  if (options.esearchresult !== undefined) {
    url += '&query_key=' + options.esearchresult.querykey;
    url += '&webenv=' + options.esearchresult.webenv;
  }
  return url;
}

//TODO enhance to support rettype and retmode
//http://www.ncbi.nlm.nih.gov/books/NBK25499/table/chapter4.T._valid_values_of__retmode_and/?report=objectonly
exports.efetch = function efetch(options) {
  ensureOptionIsSet(options, ['db'], 'efetch');

  var requestURL = EUTILS_BASE + 'efetch.fcgi?retmode=xml';
  requestURL += buildQueryParameters(options, ['retmode', 'esearchresult', 'header']);
  requestURL += getWebenvKeysForURL(options);

  return makeRequest(requestURL);
};

exports.elink = function(userOptions) {

  return function elink(options) {
    options = assign(options, userOptions);

    if (options.header && (options.header.type === 'esearch' || options.header.type === 'elink')) {
      options.dbfrom = options.db;
    }

    options.db = options.dbto;

    ensureOptionIsSet(options, ['dbfrom','dbto'], 'elink');

    var requestURL = EUTILS_BASE + 'elink.fcgi?retmode=json';
    requestURL += buildQueryParameters(options, ['retmode', 'esearchresult', 'header']);
    requestURL += getWebenvKeysForURL(options);

    return request(requestURL).then(function(res) {
      var jsonRes = JSON.parse(res);
      jsonRes.db = options.db;
      jsonRes.id = jsonRes.linksets[0].linksetdbs[0].links;
      return jsonRes;
    });
  };
};
},{"./request.js":55,"./term.js":56,"lodash.assign":41,"xml2js":59}],54:[function(require,module,exports){


var version = require('../package.json').version
  , Term = require('./term.js')
  , eutilsAPI = require('./core-utils');

eutilsAPI.version = version;

eutilsAPI.buildSearchTerm = function buildSearchTerm(value, field) {
  return new Term(value, field);
};

eutilsAPI.search = function(db, term) {
  var eopts = {
    db: db,
    term: term
  };

  if (arguments.length == 1 && typeof arguments[0] === 'object') {
    eopts = arguments[0];
  }
  return eutilsAPI.esearch(eopts).then(eutilsAPI.esummary);
};


module.exports = eutilsAPI;
},{"../package.json":52,"./core-utils":53,"./term.js":56}],55:[function(require,module,exports){

var http = require('http');
var Promise = require('es6-promise').Promise;

function request(url) {
  return new Promise(function(resolve, reject) {
    var body = '';
    http.get(url, function(res) {
      if (res.statusCode === 200) {
        res.on('data', function(chunk) {
          body += chunk;
        });
        res.on('end', function() {
          resolve(body);
        })
      } else {
        reject(res.statusMessage);
      }
    })
  });
}

module.exports = request;


},{"es6-promise":40,"http":28}],56:[function(require,module,exports){
/**
 * Class Term
 */
var Term = (function() {
  function _attachField (op, value, field) {
    if (op !== undefined) {
      this.queryText += ' ' + op + ' ';
    }

    this.queryText += value;

    if (field !== undefined) {
      this.queryText += '[' + field + ']';
    }
  }

  function _termConstructor(value, field) {
    var _this = this;
    _this.queryText = '';
    _this.termAdded = false;

    if (value !== undefined) {
      _attachField.call(_this, undefined, value, field);
    }

    Object.defineProperty(_termConstructor.prototype, 'openParen', {
      get: function() {
        _this.queryText += '(';
        return _this;
      }
    });

    Object.defineProperty(_termConstructor.prototype, 'closeParen', {
      get: function() {
        _this.queryText += ')';
        return _this;
      }
    });
  }

  _termConstructor.prototype.and = function(value, field) {
    _attachField.call(this, 'AND', value, field);
    return this;
  };

  _termConstructor.prototype.or = function(value, field) {
    _attachField.call(this, 'OR', value, field);
    return this;
  };

  _termConstructor.prototype.not = function(value, field) {
    _attachField.call(this, 'NOT', value, field);
    return this;
  };

  _termConstructor.prototype.range = function(op, range, field) {
    this.queryText += ' ' + op.toUpperCase() + ' ' + range[0] + '[' + field + ']:' + range[1] + '[' + field + '] ';
    return this;
  };

  return _termConstructor;
})();

module.exports = Term;
},{}],57:[function(require,module,exports){
// Generated by CoffeeScript 1.9.2
(function() {
  var xml2js;

  xml2js = require('../lib/xml2js');

  exports.stripBOM = function(str) {
    if (str[0] === '\uFEFF') {
      return str.substring(1);
    } else {
      return str;
    }
  };

}).call(this);

},{"../lib/xml2js":59}],58:[function(require,module,exports){
// Generated by CoffeeScript 1.9.2
(function() {
  var prefixMatch;

  prefixMatch = new RegExp(/(?!xmlns)^.*:/);

  exports.normalize = function(str) {
    return str.toLowerCase();
  };

  exports.firstCharLowerCase = function(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  };

  exports.stripPrefix = function(str) {
    return str.replace(prefixMatch, '');
  };

  exports.parseNumbers = function(str) {
    if (!isNaN(str)) {
      str = str % 1 === 0 ? parseInt(str, 10) : parseFloat(str);
    }
    return str;
  };

}).call(this);

},{}],59:[function(require,module,exports){
// Generated by CoffeeScript 1.9.2
(function() {
  var bom, builder, escapeCDATA, events, isEmpty, processName, processors, requiresCDATA, sax, wrapCDATA,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  sax = require('sax');

  events = require('events');

  builder = require('xmlbuilder');

  bom = require('./bom');

  processors = require('./processors');

  isEmpty = function(thing) {
    return typeof thing === "object" && (thing != null) && Object.keys(thing).length === 0;
  };

  processName = function(processors, processedName) {
    var i, len, process;
    for (i = 0, len = processors.length; i < len; i++) {
      process = processors[i];
      processedName = process(processedName);
    }
    return processedName;
  };

  requiresCDATA = function(entry) {
    return entry.indexOf('&') >= 0 || entry.indexOf('>') >= 0 || entry.indexOf('<') >= 0;
  };

  wrapCDATA = function(entry) {
    return "<![CDATA[" + (escapeCDATA(entry)) + "]]>";
  };

  escapeCDATA = function(entry) {
    return entry.replace(']]>', ']]]]><![CDATA[>');
  };

  exports.processors = processors;

  exports.defaults = {
    "0.1": {
      explicitCharkey: false,
      trim: true,
      normalize: true,
      normalizeTags: false,
      attrkey: "@",
      charkey: "#",
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: false,
      explicitRoot: false,
      validator: null,
      xmlns: false,
      explicitChildren: false,
      childkey: '@@',
      charsAsChildren: false,
      async: false,
      strict: true,
      attrNameProcessors: null,
      tagNameProcessors: null,
      valueProcessors: null,
      emptyTag: ''
    },
    "0.2": {
      explicitCharkey: false,
      trim: false,
      normalize: false,
      normalizeTags: false,
      attrkey: "$",
      charkey: "_",
      explicitArray: true,
      ignoreAttrs: false,
      mergeAttrs: false,
      explicitRoot: true,
      validator: null,
      xmlns: false,
      explicitChildren: false,
      preserveChildrenOrder: false,
      childkey: '$$',
      charsAsChildren: false,
      async: false,
      strict: true,
      attrNameProcessors: null,
      tagNameProcessors: null,
      valueProcessors: null,
      rootName: 'root',
      xmldec: {
        'version': '1.0',
        'encoding': 'UTF-8',
        'standalone': true
      },
      doctype: null,
      renderOpts: {
        'pretty': true,
        'indent': '  ',
        'newline': '\n'
      },
      headless: false,
      chunkSize: 10000,
      emptyTag: '',
      cdata: false
    }
  };

  exports.ValidationError = (function(superClass) {
    extend(ValidationError, superClass);

    function ValidationError(message) {
      this.message = message;
    }

    return ValidationError;

  })(Error);

  exports.Builder = (function() {
    function Builder(opts) {
      var key, ref, value;
      this.options = {};
      ref = exports.defaults["0.2"];
      for (key in ref) {
        if (!hasProp.call(ref, key)) continue;
        value = ref[key];
        this.options[key] = value;
      }
      for (key in opts) {
        if (!hasProp.call(opts, key)) continue;
        value = opts[key];
        this.options[key] = value;
      }
    }

    Builder.prototype.buildObject = function(rootObj) {
      var attrkey, charkey, render, rootElement, rootName;
      attrkey = this.options.attrkey;
      charkey = this.options.charkey;
      if ((Object.keys(rootObj).length === 1) && (this.options.rootName === exports.defaults['0.2'].rootName)) {
        rootName = Object.keys(rootObj)[0];
        rootObj = rootObj[rootName];
      } else {
        rootName = this.options.rootName;
      }
      render = (function(_this) {
        return function(element, obj) {
          var attr, child, entry, index, key, value;
          if (typeof obj !== 'object') {
            if (_this.options.cdata && requiresCDATA(obj)) {
              element.raw(wrapCDATA(obj));
            } else {
              element.txt(obj);
            }
          } else {
            for (key in obj) {
              if (!hasProp.call(obj, key)) continue;
              child = obj[key];
              if (key === attrkey) {
                if (typeof child === "object") {
                  for (attr in child) {
                    value = child[attr];
                    element = element.att(attr, value);
                  }
                }
              } else if (key === charkey) {
                if (_this.options.cdata && requiresCDATA(child)) {
                  element = element.raw(wrapCDATA(child));
                } else {
                  element = element.txt(child);
                }
              } else if (Array.isArray(child)) {
                for (index in child) {
                  if (!hasProp.call(child, index)) continue;
                  entry = child[index];
                  if (typeof entry === 'string') {
                    if (_this.options.cdata && requiresCDATA(entry)) {
                      element = element.ele(key).raw(wrapCDATA(entry)).up();
                    } else {
                      element = element.ele(key, entry).up();
                    }
                  } else {
                    element = arguments.callee(element.ele(key), entry).up();
                  }
                }
              } else if (typeof child === "object") {
                element = arguments.callee(element.ele(key), child).up();
              } else {
                if (typeof child === 'string' && _this.options.cdata && requiresCDATA(child)) {
                  element = element.ele(key).raw(wrapCDATA(child)).up();
                } else {
                  element = element.ele(key, child.toString()).up();
                }
              }
            }
          }
          return element;
        };
      })(this);
      rootElement = builder.create(rootName, this.options.xmldec, this.options.doctype, {
        headless: this.options.headless
      });
      return render(rootElement, rootObj).end(this.options.renderOpts);
    };

    return Builder;

  })();

  exports.Parser = (function(superClass) {
    extend(Parser, superClass);

    function Parser(opts) {
      this.parseString = bind(this.parseString, this);
      this.reset = bind(this.reset, this);
      this.assignOrPush = bind(this.assignOrPush, this);
      this.processAsync = bind(this.processAsync, this);
      var key, ref, value;
      if (!(this instanceof exports.Parser)) {
        return new exports.Parser(opts);
      }
      this.options = {};
      ref = exports.defaults["0.2"];
      for (key in ref) {
        if (!hasProp.call(ref, key)) continue;
        value = ref[key];
        this.options[key] = value;
      }
      for (key in opts) {
        if (!hasProp.call(opts, key)) continue;
        value = opts[key];
        this.options[key] = value;
      }
      if (this.options.xmlns) {
        this.options.xmlnskey = this.options.attrkey + "ns";
      }
      if (this.options.normalizeTags) {
        if (!this.options.tagNameProcessors) {
          this.options.tagNameProcessors = [];
        }
        this.options.tagNameProcessors.unshift(processors.normalize);
      }
      this.reset();
    }

    Parser.prototype.processAsync = function() {
      var chunk;
      if (this.remaining.length <= this.options.chunkSize) {
        chunk = this.remaining;
        this.remaining = '';
        this.saxParser = this.saxParser.write(chunk);
        return this.saxParser.close();
      } else {
        chunk = this.remaining.substr(0, this.options.chunkSize);
        this.remaining = this.remaining.substr(this.options.chunkSize, this.remaining.length);
        this.saxParser = this.saxParser.write(chunk);
        return setImmediate(this.processAsync);
      }
    };

    Parser.prototype.assignOrPush = function(obj, key, newValue) {
      if (!(key in obj)) {
        if (!this.options.explicitArray) {
          return obj[key] = newValue;
        } else {
          return obj[key] = [newValue];
        }
      } else {
        if (!(obj[key] instanceof Array)) {
          obj[key] = [obj[key]];
        }
        return obj[key].push(newValue);
      }
    };

    Parser.prototype.reset = function() {
      var attrkey, charkey, ontext, stack;
      this.removeAllListeners();
      this.saxParser = sax.parser(this.options.strict, {
        trim: false,
        normalize: false,
        xmlns: this.options.xmlns
      });
      this.saxParser.errThrown = false;
      this.saxParser.onerror = (function(_this) {
        return function(error) {
          _this.saxParser.resume();
          if (!_this.saxParser.errThrown) {
            _this.saxParser.errThrown = true;
            return _this.emit("error", error);
          }
        };
      })(this);
      this.saxParser.ended = false;
      this.EXPLICIT_CHARKEY = this.options.explicitCharkey;
      this.resultObject = null;
      stack = [];
      attrkey = this.options.attrkey;
      charkey = this.options.charkey;
      this.saxParser.onopentag = (function(_this) {
        return function(node) {
          var key, newValue, obj, processedKey, ref;
          obj = {};
          obj[charkey] = "";
          if (!_this.options.ignoreAttrs) {
            ref = node.attributes;
            for (key in ref) {
              if (!hasProp.call(ref, key)) continue;
              if (!(attrkey in obj) && !_this.options.mergeAttrs) {
                obj[attrkey] = {};
              }
              newValue = node.attributes[key];
              processedKey = _this.options.attrNameProcessors ? processName(_this.options.attrNameProcessors, key) : key;
              if (_this.options.mergeAttrs) {
                _this.assignOrPush(obj, processedKey, newValue);
              } else {
                obj[attrkey][processedKey] = newValue;
              }
            }
          }
          obj["#name"] = _this.options.tagNameProcessors ? processName(_this.options.tagNameProcessors, node.name) : node.name;
          if (_this.options.xmlns) {
            obj[_this.options.xmlnskey] = {
              uri: node.uri,
              local: node.local
            };
          }
          return stack.push(obj);
        };
      })(this);
      this.saxParser.onclosetag = (function(_this) {
        return function() {
          var cdata, emptyStr, err, key, node, nodeName, obj, objClone, old, s, xpath;
          obj = stack.pop();
          nodeName = obj["#name"];
          if (!_this.options.explicitChildren || !_this.options.preserveChildrenOrder) {
            delete obj["#name"];
          }
          if (obj.cdata === true) {
            cdata = obj.cdata;
            delete obj.cdata;
          }
          s = stack[stack.length - 1];
          if (obj[charkey].match(/^\s*$/) && !cdata) {
            emptyStr = obj[charkey];
            delete obj[charkey];
          } else {
            if (_this.options.trim) {
              obj[charkey] = obj[charkey].trim();
            }
            if (_this.options.normalize) {
              obj[charkey] = obj[charkey].replace(/\s{2,}/g, " ").trim();
            }
            obj[charkey] = _this.options.valueProcessors ? processName(_this.options.valueProcessors, obj[charkey]) : obj[charkey];
            if (Object.keys(obj).length === 1 && charkey in obj && !_this.EXPLICIT_CHARKEY) {
              obj = obj[charkey];
            }
          }
          if (isEmpty(obj)) {
            obj = _this.options.emptyTag !== '' ? _this.options.emptyTag : emptyStr;
          }
          if (_this.options.validator != null) {
            xpath = "/" + ((function() {
              var i, len, results;
              results = [];
              for (i = 0, len = stack.length; i < len; i++) {
                node = stack[i];
                results.push(node["#name"]);
              }
              return results;
            })()).concat(nodeName).join("/");
            try {
              obj = _this.options.validator(xpath, s && s[nodeName], obj);
            } catch (_error) {
              err = _error;
              _this.emit("error", err);
            }
          }
          if (_this.options.explicitChildren && !_this.options.mergeAttrs && typeof obj === 'object') {
            if (!_this.options.preserveChildrenOrder) {
              node = {};
              if (_this.options.attrkey in obj) {
                node[_this.options.attrkey] = obj[_this.options.attrkey];
                delete obj[_this.options.attrkey];
              }
              if (!_this.options.charsAsChildren && _this.options.charkey in obj) {
                node[_this.options.charkey] = obj[_this.options.charkey];
                delete obj[_this.options.charkey];
              }
              if (Object.getOwnPropertyNames(obj).length > 0) {
                node[_this.options.childkey] = obj;
              }
              obj = node;
            } else if (s) {
              s[_this.options.childkey] = s[_this.options.childkey] || [];
              objClone = {};
              for (key in obj) {
                if (!hasProp.call(obj, key)) continue;
                objClone[key] = obj[key];
              }
              s[_this.options.childkey].push(objClone);
              delete obj["#name"];
              if (Object.keys(obj).length === 1 && charkey in obj && !_this.EXPLICIT_CHARKEY) {
                obj = obj[charkey];
              }
            }
          }
          if (stack.length > 0) {
            return _this.assignOrPush(s, nodeName, obj);
          } else {
            if (_this.options.explicitRoot) {
              old = obj;
              obj = {};
              obj[nodeName] = old;
            }
            _this.resultObject = obj;
            _this.saxParser.ended = true;
            return _this.emit("end", _this.resultObject);
          }
        };
      })(this);
      ontext = (function(_this) {
        return function(text) {
          var charChild, s;
          s = stack[stack.length - 1];
          if (s) {
            s[charkey] += text;
            if (_this.options.explicitChildren && _this.options.preserveChildrenOrder && _this.options.charsAsChildren && text.replace(/\\n/g, '').trim() !== '') {
              s[_this.options.childkey] = s[_this.options.childkey] || [];
              charChild = {
                '#name': '__text__'
              };
              charChild[charkey] = text;
              s[_this.options.childkey].push(charChild);
            }
            return s;
          }
        };
      })(this);
      this.saxParser.ontext = ontext;
      return this.saxParser.oncdata = (function(_this) {
        return function(text) {
          var s;
          s = ontext(text);
          if (s) {
            return s.cdata = true;
          }
        };
      })(this);
    };

    Parser.prototype.parseString = function(str, cb) {
      var err;
      if ((cb != null) && typeof cb === "function") {
        this.on("end", function(result) {
          this.reset();
          return cb(null, result);
        });
        this.on("error", function(err) {
          this.reset();
          return cb(err);
        });
      }
      str = str.toString();
      if (str.trim() === '') {
        this.emit("end", null);
        return true;
      }
      try {
        str = bom.stripBOM(str);
        if (this.options.async) {
          this.remaining = str;
          setImmediate(this.processAsync);
          this.saxParser;
        }
        return this.saxParser.write(str).close();
      } catch (_error) {
        err = _error;
        if (!(this.saxParser.errThrown || this.saxParser.ended)) {
          this.emit('error', err);
          return this.saxParser.errThrown = true;
        } else if (this.saxParser.ended) {
          throw err;
        }
      }
    };

    return Parser;

  })(events.EventEmitter);

  exports.parseString = function(str, a, b) {
    var cb, options, parser;
    if (b != null) {
      if (typeof b === 'function') {
        cb = b;
      }
      if (typeof a === 'object') {
        options = a;
      }
    } else {
      if (typeof a === 'function') {
        cb = a;
      }
      options = {};
    }
    parser = new exports.Parser(options);
    return parser.parseString(str, cb);
  };

}).call(this);

},{"./bom":57,"./processors":58,"events":6,"sax":60,"xmlbuilder":77}],60:[function(require,module,exports){
(function (Buffer){
// wrapper for non-node envs
;(function (sax) {

sax.parser = function (strict, opt) { return new SAXParser(strict, opt) }
sax.SAXParser = SAXParser
sax.SAXStream = SAXStream
sax.createStream = createStream

// When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
// When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
// since that's the earliest that a buffer overrun could occur.  This way, checks are
// as rare as required, but as often as necessary to ensure never crossing this bound.
// Furthermore, buffers are only tested at most once per write(), so passing a very
// large string into write() might have undesirable effects, but this is manageable by
// the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
// edge case, result in creating at most one complete copy of the string passed in.
// Set to Infinity to have unlimited buffers.
sax.MAX_BUFFER_LENGTH = 64 * 1024

var buffers = [
  "comment", "sgmlDecl", "textNode", "tagName", "doctype",
  "procInstName", "procInstBody", "entity", "attribName",
  "attribValue", "cdata", "script"
]

sax.EVENTS = // for discoverability.
  [ "text"
  , "processinginstruction"
  , "sgmldeclaration"
  , "doctype"
  , "comment"
  , "attribute"
  , "opentag"
  , "closetag"
  , "opencdata"
  , "cdata"
  , "closecdata"
  , "error"
  , "end"
  , "ready"
  , "script"
  , "opennamespace"
  , "closenamespace"
  ]

function SAXParser (strict, opt) {
  if (!(this instanceof SAXParser)) return new SAXParser(strict, opt)

  var parser = this
  clearBuffers(parser)
  parser.q = parser.c = ""
  parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH
  parser.opt = opt || {}
  parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags
  parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase"
  parser.tags = []
  parser.closed = parser.closedRoot = parser.sawRoot = false
  parser.tag = parser.error = null
  parser.strict = !!strict
  parser.noscript = !!(strict || parser.opt.noscript)
  parser.state = S.BEGIN
  parser.ENTITIES = Object.create(sax.ENTITIES)
  parser.attribList = []

  // namespaces form a prototype chain.
  // it always points at the current tag,
  // which protos to its parent tag.
  if (parser.opt.xmlns) parser.ns = Object.create(rootNS)

  // mostly just for error reporting
  parser.trackPosition = parser.opt.position !== false
  if (parser.trackPosition) {
    parser.position = parser.line = parser.column = 0
  }
  emit(parser, "onready")
}

if (!Object.create) Object.create = function (o) {
  function f () { this.__proto__ = o }
  f.prototype = o
  return new f
}

if (!Object.getPrototypeOf) Object.getPrototypeOf = function (o) {
  return o.__proto__
}

if (!Object.keys) Object.keys = function (o) {
  var a = []
  for (var i in o) if (o.hasOwnProperty(i)) a.push(i)
  return a
}

function checkBufferLength (parser) {
  var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10)
    , maxActual = 0
  for (var i = 0, l = buffers.length; i < l; i ++) {
    var len = parser[buffers[i]].length
    if (len > maxAllowed) {
      // Text/cdata nodes can get big, and since they're buffered,
      // we can get here under normal conditions.
      // Avoid issues by emitting the text node now,
      // so at least it won't get any bigger.
      switch (buffers[i]) {
        case "textNode":
          closeText(parser)
        break

        case "cdata":
          emitNode(parser, "oncdata", parser.cdata)
          parser.cdata = ""
        break

        case "script":
          emitNode(parser, "onscript", parser.script)
          parser.script = ""
        break

        default:
          error(parser, "Max buffer length exceeded: "+buffers[i])
      }
    }
    maxActual = Math.max(maxActual, len)
  }
  // schedule the next check for the earliest possible buffer overrun.
  parser.bufferCheckPosition = (sax.MAX_BUFFER_LENGTH - maxActual)
                             + parser.position
}

function clearBuffers (parser) {
  for (var i = 0, l = buffers.length; i < l; i ++) {
    parser[buffers[i]] = ""
  }
}

function flushBuffers (parser) {
  closeText(parser)
  if (parser.cdata !== "") {
    emitNode(parser, "oncdata", parser.cdata)
    parser.cdata = ""
  }
  if (parser.script !== "") {
    emitNode(parser, "onscript", parser.script)
    parser.script = ""
  }
}

SAXParser.prototype =
  { end: function () { end(this) }
  , write: write
  , resume: function () { this.error = null; return this }
  , close: function () { return this.write(null) }
  , flush: function () { flushBuffers(this) }
  }

try {
  var Stream = require("stream").Stream
} catch (ex) {
  var Stream = function () {}
}


var streamWraps = sax.EVENTS.filter(function (ev) {
  return ev !== "error" && ev !== "end"
})

function createStream (strict, opt) {
  return new SAXStream(strict, opt)
}

function SAXStream (strict, opt) {
  if (!(this instanceof SAXStream)) return new SAXStream(strict, opt)

  Stream.apply(this)

  this._parser = new SAXParser(strict, opt)
  this.writable = true
  this.readable = true


  var me = this

  this._parser.onend = function () {
    me.emit("end")
  }

  this._parser.onerror = function (er) {
    me.emit("error", er)

    // if didn't throw, then means error was handled.
    // go ahead and clear error, so we can write again.
    me._parser.error = null
  }

  this._decoder = null;

  streamWraps.forEach(function (ev) {
    Object.defineProperty(me, "on" + ev, {
      get: function () { return me._parser["on" + ev] },
      set: function (h) {
        if (!h) {
          me.removeAllListeners(ev)
          return me._parser["on"+ev] = h
        }
        me.on(ev, h)
      },
      enumerable: true,
      configurable: false
    })
  })
}

SAXStream.prototype = Object.create(Stream.prototype,
  { constructor: { value: SAXStream } })

SAXStream.prototype.write = function (data) {
  if (typeof Buffer === 'function' &&
      typeof Buffer.isBuffer === 'function' &&
      Buffer.isBuffer(data)) {
    if (!this._decoder) {
      var SD = require('string_decoder').StringDecoder
      this._decoder = new SD('utf8')
    }
    data = this._decoder.write(data);
  }

  this._parser.write(data.toString())
  this.emit("data", data)
  return true
}

SAXStream.prototype.end = function (chunk) {
  if (chunk && chunk.length) this.write(chunk)
  this._parser.end()
  return true
}

SAXStream.prototype.on = function (ev, handler) {
  var me = this
  if (!me._parser["on"+ev] && streamWraps.indexOf(ev) !== -1) {
    me._parser["on"+ev] = function () {
      var args = arguments.length === 1 ? [arguments[0]]
               : Array.apply(null, arguments)
      args.splice(0, 0, ev)
      me.emit.apply(me, args)
    }
  }

  return Stream.prototype.on.call(me, ev, handler)
}



// character classes and tokens
var whitespace = "\r\n\t "
  // this really needs to be replaced with character classes.
  // XML allows all manner of ridiculous numbers and digits.
  , number = "0124356789"
  , letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  // (Letter | "_" | ":")
  , quote = "'\""
  , entity = number+letter+"#"
  , attribEnd = whitespace + ">"
  , CDATA = "[CDATA["
  , DOCTYPE = "DOCTYPE"
  , XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
  , XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/"
  , rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE }

// turn all the string character sets into character class objects.
whitespace = charClass(whitespace)
number = charClass(number)
letter = charClass(letter)

// http://www.w3.org/TR/REC-xml/#NT-NameStartChar
// This implementation works on strings, a single character at a time
// as such, it cannot ever support astral-plane characters (10000-EFFFF)
// without a significant breaking change to either this  parser, or the
// JavaScript language.  Implementation of an emoji-capable xml parser
// is left as an exercise for the reader.
var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/

var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/

quote = charClass(quote)
entity = charClass(entity)
attribEnd = charClass(attribEnd)

function charClass (str) {
  return str.split("").reduce(function (s, c) {
    s[c] = true
    return s
  }, {})
}

function isRegExp (c) {
  return Object.prototype.toString.call(c) === '[object RegExp]'
}

function is (charclass, c) {
  return isRegExp(charclass) ? !!c.match(charclass) : charclass[c]
}

function not (charclass, c) {
  return !is(charclass, c)
}

var S = 0
sax.STATE =
{ BEGIN                     : S++
, TEXT                      : S++ // general stuff
, TEXT_ENTITY               : S++ // &amp and such.
, OPEN_WAKA                 : S++ // <
, SGML_DECL                 : S++ // <!BLARG
, SGML_DECL_QUOTED          : S++ // <!BLARG foo "bar
, DOCTYPE                   : S++ // <!DOCTYPE
, DOCTYPE_QUOTED            : S++ // <!DOCTYPE "//blah
, DOCTYPE_DTD               : S++ // <!DOCTYPE "//blah" [ ...
, DOCTYPE_DTD_QUOTED        : S++ // <!DOCTYPE "//blah" [ "foo
, COMMENT_STARTING          : S++ // <!-
, COMMENT                   : S++ // <!--
, COMMENT_ENDING            : S++ // <!-- blah -
, COMMENT_ENDED             : S++ // <!-- blah --
, CDATA                     : S++ // <![CDATA[ something
, CDATA_ENDING              : S++ // ]
, CDATA_ENDING_2            : S++ // ]]
, PROC_INST                 : S++ // <?hi
, PROC_INST_BODY            : S++ // <?hi there
, PROC_INST_ENDING          : S++ // <?hi "there" ?
, OPEN_TAG                  : S++ // <strong
, OPEN_TAG_SLASH            : S++ // <strong /
, ATTRIB                    : S++ // <a
, ATTRIB_NAME               : S++ // <a foo
, ATTRIB_NAME_SAW_WHITE     : S++ // <a foo _
, ATTRIB_VALUE              : S++ // <a foo=
, ATTRIB_VALUE_QUOTED       : S++ // <a foo="bar
, ATTRIB_VALUE_CLOSED       : S++ // <a foo="bar"
, ATTRIB_VALUE_UNQUOTED     : S++ // <a foo=bar
, ATTRIB_VALUE_ENTITY_Q     : S++ // <foo bar="&quot;"
, ATTRIB_VALUE_ENTITY_U     : S++ // <foo bar=&quot;
, CLOSE_TAG                 : S++ // </a
, CLOSE_TAG_SAW_WHITE       : S++ // </a   >
, SCRIPT                    : S++ // <script> ...
, SCRIPT_ENDING             : S++ // <script> ... <
}

sax.ENTITIES =
{ "amp" : "&"
, "gt" : ">"
, "lt" : "<"
, "quot" : "\""
, "apos" : "'"
, "AElig" : 198
, "Aacute" : 193
, "Acirc" : 194
, "Agrave" : 192
, "Aring" : 197
, "Atilde" : 195
, "Auml" : 196
, "Ccedil" : 199
, "ETH" : 208
, "Eacute" : 201
, "Ecirc" : 202
, "Egrave" : 200
, "Euml" : 203
, "Iacute" : 205
, "Icirc" : 206
, "Igrave" : 204
, "Iuml" : 207
, "Ntilde" : 209
, "Oacute" : 211
, "Ocirc" : 212
, "Ograve" : 210
, "Oslash" : 216
, "Otilde" : 213
, "Ouml" : 214
, "THORN" : 222
, "Uacute" : 218
, "Ucirc" : 219
, "Ugrave" : 217
, "Uuml" : 220
, "Yacute" : 221
, "aacute" : 225
, "acirc" : 226
, "aelig" : 230
, "agrave" : 224
, "aring" : 229
, "atilde" : 227
, "auml" : 228
, "ccedil" : 231
, "eacute" : 233
, "ecirc" : 234
, "egrave" : 232
, "eth" : 240
, "euml" : 235
, "iacute" : 237
, "icirc" : 238
, "igrave" : 236
, "iuml" : 239
, "ntilde" : 241
, "oacute" : 243
, "ocirc" : 244
, "ograve" : 242
, "oslash" : 248
, "otilde" : 245
, "ouml" : 246
, "szlig" : 223
, "thorn" : 254
, "uacute" : 250
, "ucirc" : 251
, "ugrave" : 249
, "uuml" : 252
, "yacute" : 253
, "yuml" : 255
, "copy" : 169
, "reg" : 174
, "nbsp" : 160
, "iexcl" : 161
, "cent" : 162
, "pound" : 163
, "curren" : 164
, "yen" : 165
, "brvbar" : 166
, "sect" : 167
, "uml" : 168
, "ordf" : 170
, "laquo" : 171
, "not" : 172
, "shy" : 173
, "macr" : 175
, "deg" : 176
, "plusmn" : 177
, "sup1" : 185
, "sup2" : 178
, "sup3" : 179
, "acute" : 180
, "micro" : 181
, "para" : 182
, "middot" : 183
, "cedil" : 184
, "ordm" : 186
, "raquo" : 187
, "frac14" : 188
, "frac12" : 189
, "frac34" : 190
, "iquest" : 191
, "times" : 215
, "divide" : 247
, "OElig" : 338
, "oelig" : 339
, "Scaron" : 352
, "scaron" : 353
, "Yuml" : 376
, "fnof" : 402
, "circ" : 710
, "tilde" : 732
, "Alpha" : 913
, "Beta" : 914
, "Gamma" : 915
, "Delta" : 916
, "Epsilon" : 917
, "Zeta" : 918
, "Eta" : 919
, "Theta" : 920
, "Iota" : 921
, "Kappa" : 922
, "Lambda" : 923
, "Mu" : 924
, "Nu" : 925
, "Xi" : 926
, "Omicron" : 927
, "Pi" : 928
, "Rho" : 929
, "Sigma" : 931
, "Tau" : 932
, "Upsilon" : 933
, "Phi" : 934
, "Chi" : 935
, "Psi" : 936
, "Omega" : 937
, "alpha" : 945
, "beta" : 946
, "gamma" : 947
, "delta" : 948
, "epsilon" : 949
, "zeta" : 950
, "eta" : 951
, "theta" : 952
, "iota" : 953
, "kappa" : 954
, "lambda" : 955
, "mu" : 956
, "nu" : 957
, "xi" : 958
, "omicron" : 959
, "pi" : 960
, "rho" : 961
, "sigmaf" : 962
, "sigma" : 963
, "tau" : 964
, "upsilon" : 965
, "phi" : 966
, "chi" : 967
, "psi" : 968
, "omega" : 969
, "thetasym" : 977
, "upsih" : 978
, "piv" : 982
, "ensp" : 8194
, "emsp" : 8195
, "thinsp" : 8201
, "zwnj" : 8204
, "zwj" : 8205
, "lrm" : 8206
, "rlm" : 8207
, "ndash" : 8211
, "mdash" : 8212
, "lsquo" : 8216
, "rsquo" : 8217
, "sbquo" : 8218
, "ldquo" : 8220
, "rdquo" : 8221
, "bdquo" : 8222
, "dagger" : 8224
, "Dagger" : 8225
, "bull" : 8226
, "hellip" : 8230
, "permil" : 8240
, "prime" : 8242
, "Prime" : 8243
, "lsaquo" : 8249
, "rsaquo" : 8250
, "oline" : 8254
, "frasl" : 8260
, "euro" : 8364
, "image" : 8465
, "weierp" : 8472
, "real" : 8476
, "trade" : 8482
, "alefsym" : 8501
, "larr" : 8592
, "uarr" : 8593
, "rarr" : 8594
, "darr" : 8595
, "harr" : 8596
, "crarr" : 8629
, "lArr" : 8656
, "uArr" : 8657
, "rArr" : 8658
, "dArr" : 8659
, "hArr" : 8660
, "forall" : 8704
, "part" : 8706
, "exist" : 8707
, "empty" : 8709
, "nabla" : 8711
, "isin" : 8712
, "notin" : 8713
, "ni" : 8715
, "prod" : 8719
, "sum" : 8721
, "minus" : 8722
, "lowast" : 8727
, "radic" : 8730
, "prop" : 8733
, "infin" : 8734
, "ang" : 8736
, "and" : 8743
, "or" : 8744
, "cap" : 8745
, "cup" : 8746
, "int" : 8747
, "there4" : 8756
, "sim" : 8764
, "cong" : 8773
, "asymp" : 8776
, "ne" : 8800
, "equiv" : 8801
, "le" : 8804
, "ge" : 8805
, "sub" : 8834
, "sup" : 8835
, "nsub" : 8836
, "sube" : 8838
, "supe" : 8839
, "oplus" : 8853
, "otimes" : 8855
, "perp" : 8869
, "sdot" : 8901
, "lceil" : 8968
, "rceil" : 8969
, "lfloor" : 8970
, "rfloor" : 8971
, "lang" : 9001
, "rang" : 9002
, "loz" : 9674
, "spades" : 9824
, "clubs" : 9827
, "hearts" : 9829
, "diams" : 9830
}

Object.keys(sax.ENTITIES).forEach(function (key) {
    var e = sax.ENTITIES[key]
    var s = typeof e === 'number' ? String.fromCharCode(e) : e
    sax.ENTITIES[key] = s
})

for (var S in sax.STATE) sax.STATE[sax.STATE[S]] = S

// shorthand
S = sax.STATE

function emit (parser, event, data) {
  parser[event] && parser[event](data)
}

function emitNode (parser, nodeType, data) {
  if (parser.textNode) closeText(parser)
  emit(parser, nodeType, data)
}

function closeText (parser) {
  parser.textNode = textopts(parser.opt, parser.textNode)
  if (parser.textNode) emit(parser, "ontext", parser.textNode)
  parser.textNode = ""
}

function textopts (opt, text) {
  if (opt.trim) text = text.trim()
  if (opt.normalize) text = text.replace(/\s+/g, " ")
  return text
}

function error (parser, er) {
  closeText(parser)
  if (parser.trackPosition) {
    er += "\nLine: "+parser.line+
          "\nColumn: "+parser.column+
          "\nChar: "+parser.c
  }
  er = new Error(er)
  parser.error = er
  emit(parser, "onerror", er)
  return parser
}

function end (parser) {
  if (!parser.closedRoot) strictFail(parser, "Unclosed root tag")
  if ((parser.state !== S.BEGIN) && (parser.state !== S.TEXT)) error(parser, "Unexpected end")
  closeText(parser)
  parser.c = ""
  parser.closed = true
  emit(parser, "onend")
  SAXParser.call(parser, parser.strict, parser.opt)
  return parser
}

function strictFail (parser, message) {
  if (typeof parser !== 'object' || !(parser instanceof SAXParser))
    throw new Error('bad call to strictFail');
  if (parser.strict) error(parser, message)
}

function newTag (parser) {
  if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]()
  var parent = parser.tags[parser.tags.length - 1] || parser
    , tag = parser.tag = { name : parser.tagName, attributes : {} }

  // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
  if (parser.opt.xmlns) tag.ns = parent.ns
  parser.attribList.length = 0
}

function qname (name, attribute) {
  var i = name.indexOf(":")
    , qualName = i < 0 ? [ "", name ] : name.split(":")
    , prefix = qualName[0]
    , local = qualName[1]

  // <x "xmlns"="http://foo">
  if (attribute && name === "xmlns") {
    prefix = "xmlns"
    local = ""
  }

  return { prefix: prefix, local: local }
}

function attrib (parser) {
  if (!parser.strict) parser.attribName = parser.attribName[parser.looseCase]()

  if (parser.attribList.indexOf(parser.attribName) !== -1 ||
      parser.tag.attributes.hasOwnProperty(parser.attribName)) {
    return parser.attribName = parser.attribValue = ""
  }

  if (parser.opt.xmlns) {
    var qn = qname(parser.attribName, true)
      , prefix = qn.prefix
      , local = qn.local

    if (prefix === "xmlns") {
      // namespace binding attribute; push the binding into scope
      if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
        strictFail( parser
                  , "xml: prefix must be bound to " + XML_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
        strictFail( parser
                  , "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else {
        var tag = parser.tag
          , parent = parser.tags[parser.tags.length - 1] || parser
        if (tag.ns === parent.ns) {
          tag.ns = Object.create(parent.ns)
        }
        tag.ns[local] = parser.attribValue
      }
    }

    // defer onattribute events until all attributes have been seen
    // so any new bindings can take effect; preserve attribute order
    // so deferred events can be emitted in document order
    parser.attribList.push([parser.attribName, parser.attribValue])
  } else {
    // in non-xmlns mode, we can emit the event right away
    parser.tag.attributes[parser.attribName] = parser.attribValue
    emitNode( parser
            , "onattribute"
            , { name: parser.attribName
              , value: parser.attribValue } )
  }

  parser.attribName = parser.attribValue = ""
}

function openTag (parser, selfClosing) {
  if (parser.opt.xmlns) {
    // emit namespace binding events
    var tag = parser.tag

    // add namespace info to tag
    var qn = qname(parser.tagName)
    tag.prefix = qn.prefix
    tag.local = qn.local
    tag.uri = tag.ns[qn.prefix] || ""

    if (tag.prefix && !tag.uri) {
      strictFail(parser, "Unbound namespace prefix: "
                       + JSON.stringify(parser.tagName))
      tag.uri = qn.prefix
    }

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (tag.ns && parent.ns !== tag.ns) {
      Object.keys(tag.ns).forEach(function (p) {
        emitNode( parser
                , "onopennamespace"
                , { prefix: p , uri: tag.ns[p] } )
      })
    }

    // handle deferred onattribute events
    // Note: do not apply default ns to attributes:
    //   http://www.w3.org/TR/REC-xml-names/#defaulting
    for (var i = 0, l = parser.attribList.length; i < l; i ++) {
      var nv = parser.attribList[i]
      var name = nv[0]
        , value = nv[1]
        , qualName = qname(name, true)
        , prefix = qualName.prefix
        , local = qualName.local
        , uri = prefix == "" ? "" : (tag.ns[prefix] || "")
        , a = { name: name
              , value: value
              , prefix: prefix
              , local: local
              , uri: uri
              }

      // if there's any attributes with an undefined namespace,
      // then fail on them now.
      if (prefix && prefix != "xmlns" && !uri) {
        strictFail(parser, "Unbound namespace prefix: "
                         + JSON.stringify(prefix))
        a.uri = prefix
      }
      parser.tag.attributes[name] = a
      emitNode(parser, "onattribute", a)
    }
    parser.attribList.length = 0
  }

  parser.tag.isSelfClosing = !!selfClosing

  // process the tag
  parser.sawRoot = true
  parser.tags.push(parser.tag)
  emitNode(parser, "onopentag", parser.tag)
  if (!selfClosing) {
    // special case for <script> in non-strict mode.
    if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
      parser.state = S.SCRIPT
    } else {
      parser.state = S.TEXT
    }
    parser.tag = null
    parser.tagName = ""
  }
  parser.attribName = parser.attribValue = ""
  parser.attribList.length = 0
}

function closeTag (parser) {
  if (!parser.tagName) {
    strictFail(parser, "Weird empty close tag.")
    parser.textNode += "</>"
    parser.state = S.TEXT
    return
  }

  if (parser.script) {
    if (parser.tagName !== "script") {
      parser.script += "</" + parser.tagName + ">"
      parser.tagName = ""
      parser.state = S.SCRIPT
      return
    }
    emitNode(parser, "onscript", parser.script)
    parser.script = ""
  }

  // first make sure that the closing tag actually exists.
  // <a><b></c></b></a> will close everything, otherwise.
  var t = parser.tags.length
  var tagName = parser.tagName
  if (!parser.strict) tagName = tagName[parser.looseCase]()
  var closeTo = tagName
  while (t --) {
    var close = parser.tags[t]
    if (close.name !== closeTo) {
      // fail the first time in strict mode
      strictFail(parser, "Unexpected close tag")
    } else break
  }

  // didn't find it.  we already failed for strict, so just abort.
  if (t < 0) {
    strictFail(parser, "Unmatched closing tag: "+parser.tagName)
    parser.textNode += "</" + parser.tagName + ">"
    parser.state = S.TEXT
    return
  }
  parser.tagName = tagName
  var s = parser.tags.length
  while (s --> t) {
    var tag = parser.tag = parser.tags.pop()
    parser.tagName = parser.tag.name
    emitNode(parser, "onclosetag", parser.tagName)

    var x = {}
    for (var i in tag.ns) x[i] = tag.ns[i]

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (parser.opt.xmlns && tag.ns !== parent.ns) {
      // remove namespace bindings introduced by tag
      Object.keys(tag.ns).forEach(function (p) {
        var n = tag.ns[p]
        emitNode(parser, "onclosenamespace", { prefix: p, uri: n })
      })
    }
  }
  if (t === 0) parser.closedRoot = true
  parser.tagName = parser.attribValue = parser.attribName = ""
  parser.attribList.length = 0
  parser.state = S.TEXT
}

function parseEntity (parser) {
  var entity = parser.entity
    , entityLC = entity.toLowerCase()
    , num
    , numStr = ""
  if (parser.ENTITIES[entity])
    return parser.ENTITIES[entity]
  if (parser.ENTITIES[entityLC])
    return parser.ENTITIES[entityLC]
  entity = entityLC
  if (entity.charAt(0) === "#") {
    if (entity.charAt(1) === "x") {
      entity = entity.slice(2)
      num = parseInt(entity, 16)
      numStr = num.toString(16)
    } else {
      entity = entity.slice(1)
      num = parseInt(entity, 10)
      numStr = num.toString(10)
    }
  }
  entity = entity.replace(/^0+/, "")
  if (numStr.toLowerCase() !== entity) {
    strictFail(parser, "Invalid character entity")
    return "&"+parser.entity + ";"
  }

  return String.fromCodePoint(num)
}

function write (chunk) {
  var parser = this
  if (this.error) throw this.error
  if (parser.closed) return error(parser,
    "Cannot write after close. Assign an onready handler.")
  if (chunk === null) return end(parser)
  var i = 0, c = ""
  while (parser.c = c = chunk.charAt(i++)) {
    if (parser.trackPosition) {
      parser.position ++
      if (c === "\n") {
        parser.line ++
        parser.column = 0
      } else parser.column ++
    }
    switch (parser.state) {

      case S.BEGIN:
        if (c === "<") {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else if (not(whitespace,c)) {
          // have to process this as a text node.
          // weird, but happens.
          strictFail(parser, "Non-whitespace before first tag.")
          parser.textNode = c
          parser.state = S.TEXT
        }
      continue

      case S.TEXT:
        if (parser.sawRoot && !parser.closedRoot) {
          var starti = i-1
          while (c && c!=="<" && c!=="&") {
            c = chunk.charAt(i++)
            if (c && parser.trackPosition) {
              parser.position ++
              if (c === "\n") {
                parser.line ++
                parser.column = 0
              } else parser.column ++
            }
          }
          parser.textNode += chunk.substring(starti, i-1)
        }
        if (c === "<") {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else {
          if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot))
            strictFail(parser, "Text data outside of root node.")
          if (c === "&") parser.state = S.TEXT_ENTITY
          else parser.textNode += c
        }
      continue

      case S.SCRIPT:
        // only non-strict
        if (c === "<") {
          parser.state = S.SCRIPT_ENDING
        } else parser.script += c
      continue

      case S.SCRIPT_ENDING:
        if (c === "/") {
          parser.state = S.CLOSE_TAG
        } else {
          parser.script += "<" + c
          parser.state = S.SCRIPT
        }
      continue

      case S.OPEN_WAKA:
        // either a /, ?, !, or text is coming next.
        if (c === "!") {
          parser.state = S.SGML_DECL
          parser.sgmlDecl = ""
        } else if (is(whitespace, c)) {
          // wait for it...
        } else if (is(nameStart,c)) {
          parser.state = S.OPEN_TAG
          parser.tagName = c
        } else if (c === "/") {
          parser.state = S.CLOSE_TAG
          parser.tagName = ""
        } else if (c === "?") {
          parser.state = S.PROC_INST
          parser.procInstName = parser.procInstBody = ""
        } else {
          strictFail(parser, "Unencoded <")
          // if there was some whitespace, then add that in.
          if (parser.startTagPosition + 1 < parser.position) {
            var pad = parser.position - parser.startTagPosition
            c = new Array(pad).join(" ") + c
          }
          parser.textNode += "<" + c
          parser.state = S.TEXT
        }
      continue

      case S.SGML_DECL:
        if ((parser.sgmlDecl+c).toUpperCase() === CDATA) {
          emitNode(parser, "onopencdata")
          parser.state = S.CDATA
          parser.sgmlDecl = ""
          parser.cdata = ""
        } else if (parser.sgmlDecl+c === "--") {
          parser.state = S.COMMENT
          parser.comment = ""
          parser.sgmlDecl = ""
        } else if ((parser.sgmlDecl+c).toUpperCase() === DOCTYPE) {
          parser.state = S.DOCTYPE
          if (parser.doctype || parser.sawRoot) strictFail(parser,
            "Inappropriately located doctype declaration")
          parser.doctype = ""
          parser.sgmlDecl = ""
        } else if (c === ">") {
          emitNode(parser, "onsgmldeclaration", parser.sgmlDecl)
          parser.sgmlDecl = ""
          parser.state = S.TEXT
        } else if (is(quote, c)) {
          parser.state = S.SGML_DECL_QUOTED
          parser.sgmlDecl += c
        } else parser.sgmlDecl += c
      continue

      case S.SGML_DECL_QUOTED:
        if (c === parser.q) {
          parser.state = S.SGML_DECL
          parser.q = ""
        }
        parser.sgmlDecl += c
      continue

      case S.DOCTYPE:
        if (c === ">") {
          parser.state = S.TEXT
          emitNode(parser, "ondoctype", parser.doctype)
          parser.doctype = true // just remember that we saw it.
        } else {
          parser.doctype += c
          if (c === "[") parser.state = S.DOCTYPE_DTD
          else if (is(quote, c)) {
            parser.state = S.DOCTYPE_QUOTED
            parser.q = c
          }
        }
      continue

      case S.DOCTYPE_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.q = ""
          parser.state = S.DOCTYPE
        }
      continue

      case S.DOCTYPE_DTD:
        parser.doctype += c
        if (c === "]") parser.state = S.DOCTYPE
        else if (is(quote,c)) {
          parser.state = S.DOCTYPE_DTD_QUOTED
          parser.q = c
        }
      continue

      case S.DOCTYPE_DTD_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.state = S.DOCTYPE_DTD
          parser.q = ""
        }
      continue

      case S.COMMENT:
        if (c === "-") parser.state = S.COMMENT_ENDING
        else parser.comment += c
      continue

      case S.COMMENT_ENDING:
        if (c === "-") {
          parser.state = S.COMMENT_ENDED
          parser.comment = textopts(parser.opt, parser.comment)
          if (parser.comment) emitNode(parser, "oncomment", parser.comment)
          parser.comment = ""
        } else {
          parser.comment += "-" + c
          parser.state = S.COMMENT
        }
      continue

      case S.COMMENT_ENDED:
        if (c !== ">") {
          strictFail(parser, "Malformed comment")
          // allow <!-- blah -- bloo --> in non-strict mode,
          // which is a comment of " blah -- bloo "
          parser.comment += "--" + c
          parser.state = S.COMMENT
        } else parser.state = S.TEXT
      continue

      case S.CDATA:
        if (c === "]") parser.state = S.CDATA_ENDING
        else parser.cdata += c
      continue

      case S.CDATA_ENDING:
        if (c === "]") parser.state = S.CDATA_ENDING_2
        else {
          parser.cdata += "]" + c
          parser.state = S.CDATA
        }
      continue

      case S.CDATA_ENDING_2:
        if (c === ">") {
          if (parser.cdata) emitNode(parser, "oncdata", parser.cdata)
          emitNode(parser, "onclosecdata")
          parser.cdata = ""
          parser.state = S.TEXT
        } else if (c === "]") {
          parser.cdata += "]"
        } else {
          parser.cdata += "]]" + c
          parser.state = S.CDATA
        }
      continue

      case S.PROC_INST:
        if (c === "?") parser.state = S.PROC_INST_ENDING
        else if (is(whitespace, c)) parser.state = S.PROC_INST_BODY
        else parser.procInstName += c
      continue

      case S.PROC_INST_BODY:
        if (!parser.procInstBody && is(whitespace, c)) continue
        else if (c === "?") parser.state = S.PROC_INST_ENDING
        else parser.procInstBody += c
      continue

      case S.PROC_INST_ENDING:
        if (c === ">") {
          emitNode(parser, "onprocessinginstruction", {
            name : parser.procInstName,
            body : parser.procInstBody
          })
          parser.procInstName = parser.procInstBody = ""
          parser.state = S.TEXT
        } else {
          parser.procInstBody += "?" + c
          parser.state = S.PROC_INST_BODY
        }
      continue

      case S.OPEN_TAG:
        if (is(nameBody, c)) parser.tagName += c
        else {
          newTag(parser)
          if (c === ">") openTag(parser)
          else if (c === "/") parser.state = S.OPEN_TAG_SLASH
          else {
            if (not(whitespace, c)) strictFail(
              parser, "Invalid character in tag name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.OPEN_TAG_SLASH:
        if (c === ">") {
          openTag(parser, true)
          closeTag(parser)
        } else {
          strictFail(parser, "Forward-slash in opening tag not followed by >")
          parser.state = S.ATTRIB
        }
      continue

      case S.ATTRIB:
        // haven't read the attribute name yet.
        if (is(whitespace, c)) continue
        else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (c === ">") {
          strictFail(parser, "Attribute without value")
          parser.attribValue = parser.attribName
          attrib(parser)
          openTag(parser)
        }
        else if (is(whitespace, c)) parser.state = S.ATTRIB_NAME_SAW_WHITE
        else if (is(nameBody, c)) parser.attribName += c
        else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME_SAW_WHITE:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (is(whitespace, c)) continue
        else {
          strictFail(parser, "Attribute without value")
          parser.tag.attributes[parser.attribName] = ""
          parser.attribValue = ""
          emitNode(parser, "onattribute",
                   { name : parser.attribName, value : "" })
          parser.attribName = ""
          if (c === ">") openTag(parser)
          else if (is(nameStart, c)) {
            parser.attribName = c
            parser.state = S.ATTRIB_NAME
          } else {
            strictFail(parser, "Invalid attribute name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.ATTRIB_VALUE:
        if (is(whitespace, c)) continue
        else if (is(quote, c)) {
          parser.q = c
          parser.state = S.ATTRIB_VALUE_QUOTED
        } else {
          strictFail(parser, "Unquoted attribute value")
          parser.state = S.ATTRIB_VALUE_UNQUOTED
          parser.attribValue = c
        }
      continue

      case S.ATTRIB_VALUE_QUOTED:
        if (c !== parser.q) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_Q
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        parser.q = ""
        parser.state = S.ATTRIB_VALUE_CLOSED
      continue

      case S.ATTRIB_VALUE_CLOSED:
        if (is(whitespace, c)) {
          parser.state = S.ATTRIB
        } else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          strictFail(parser, "No whitespace between attributes")
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_VALUE_UNQUOTED:
        if (not(attribEnd,c)) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_U
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        if (c === ">") openTag(parser)
        else parser.state = S.ATTRIB
      continue

      case S.CLOSE_TAG:
        if (!parser.tagName) {
          if (is(whitespace, c)) continue
          else if (not(nameStart, c)) {
            if (parser.script) {
              parser.script += "</" + c
              parser.state = S.SCRIPT
            } else {
              strictFail(parser, "Invalid tagname in closing tag.")
            }
          } else parser.tagName = c
        }
        else if (c === ">") closeTag(parser)
        else if (is(nameBody, c)) parser.tagName += c
        else if (parser.script) {
          parser.script += "</" + parser.tagName
          parser.tagName = ""
          parser.state = S.SCRIPT
        } else {
          if (not(whitespace, c)) strictFail(parser,
            "Invalid tagname in closing tag")
          parser.state = S.CLOSE_TAG_SAW_WHITE
        }
      continue

      case S.CLOSE_TAG_SAW_WHITE:
        if (is(whitespace, c)) continue
        if (c === ">") closeTag(parser)
        else strictFail(parser, "Invalid characters in closing tag")
      continue

      case S.TEXT_ENTITY:
      case S.ATTRIB_VALUE_ENTITY_Q:
      case S.ATTRIB_VALUE_ENTITY_U:
        switch(parser.state) {
          case S.TEXT_ENTITY:
            var returnState = S.TEXT, buffer = "textNode"
          break

          case S.ATTRIB_VALUE_ENTITY_Q:
            var returnState = S.ATTRIB_VALUE_QUOTED, buffer = "attribValue"
          break

          case S.ATTRIB_VALUE_ENTITY_U:
            var returnState = S.ATTRIB_VALUE_UNQUOTED, buffer = "attribValue"
          break
        }
        if (c === ";") {
          parser[buffer] += parseEntity(parser)
          parser.entity = ""
          parser.state = returnState
        }
        else if (is(entity, c)) parser.entity += c
        else {
          strictFail(parser, "Invalid character entity")
          parser[buffer] += "&" + parser.entity + c
          parser.entity = ""
          parser.state = returnState
        }
      continue

      default:
        throw new Error(parser, "Unknown state: " + parser.state)
    }
  } // while
  // cdata blocks can get very big under normal conditions. emit and move on.
  // if (parser.state === S.CDATA && parser.cdata) {
  //   emitNode(parser, "oncdata", parser.cdata)
  //   parser.cdata = ""
  // }
  if (parser.position >= parser.bufferCheckPosition) checkBufferLength(parser)
  return parser
}

/*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
if (!String.fromCodePoint) {
        (function() {
                var stringFromCharCode = String.fromCharCode;
                var floor = Math.floor;
                var fromCodePoint = function() {
                        var MAX_SIZE = 0x4000;
                        var codeUnits = [];
                        var highSurrogate;
                        var lowSurrogate;
                        var index = -1;
                        var length = arguments.length;
                        if (!length) {
                                return '';
                        }
                        var result = '';
                        while (++index < length) {
                                var codePoint = Number(arguments[index]);
                                if (
                                        !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
                                        codePoint < 0 || // not a valid Unicode code point
                                        codePoint > 0x10FFFF || // not a valid Unicode code point
                                        floor(codePoint) != codePoint // not an integer
                                ) {
                                        throw RangeError('Invalid code point: ' + codePoint);
                                }
                                if (codePoint <= 0xFFFF) { // BMP code point
                                        codeUnits.push(codePoint);
                                } else { // Astral code point; split in surrogate halves
                                        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                                        codePoint -= 0x10000;
                                        highSurrogate = (codePoint >> 10) + 0xD800;
                                        lowSurrogate = (codePoint % 0x400) + 0xDC00;
                                        codeUnits.push(highSurrogate, lowSurrogate);
                                }
                                if (index + 1 == length || codeUnits.length > MAX_SIZE) {
                                        result += stringFromCharCode.apply(null, codeUnits);
                                        codeUnits.length = 0;
                                }
                        }
                        return result;
                };
                if (Object.defineProperty) {
                        Object.defineProperty(String, 'fromCodePoint', {
                                'value': fromCodePoint,
                                'configurable': true,
                                'writable': true
                        });
                } else {
                        String.fromCodePoint = fromCodePoint;
                }
        }());
}

})(typeof exports === "undefined" ? sax = {} : exports);

}).call(this,require("buffer").Buffer)

},{"buffer":2,"stream":27,"string_decoder":37}],61:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLAttribute, create;

  create = require('lodash/object/create');

  module.exports = XMLAttribute = (function() {
    function XMLAttribute(parent, name, value) {
      this.stringify = parent.stringify;
      if (name == null) {
        throw new Error("Missing attribute name of element " + parent.name);
      }
      if (value == null) {
        throw new Error("Missing attribute value for attribute " + name + " of element " + parent.name);
      }
      this.name = this.stringify.attName(name);
      this.value = this.stringify.attValue(value);
    }

    XMLAttribute.prototype.clone = function() {
      return create(XMLAttribute.prototype, this);
    };

    XMLAttribute.prototype.toString = function(options, level) {
      return ' ' + this.name + '="' + this.value + '"';
    };

    return XMLAttribute;

  })();

}).call(this);

},{"lodash/object/create":131}],62:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLBuilder, XMLDeclaration, XMLDocType, XMLElement, XMLStringifier;

  XMLStringifier = require('./XMLStringifier');

  XMLDeclaration = require('./XMLDeclaration');

  XMLDocType = require('./XMLDocType');

  XMLElement = require('./XMLElement');

  module.exports = XMLBuilder = (function() {
    function XMLBuilder(name, options) {
      var root, temp;
      if (name == null) {
        throw new Error("Root element needs a name");
      }
      if (options == null) {
        options = {};
      }
      this.options = options;
      this.stringify = new XMLStringifier(options);
      temp = new XMLElement(this, 'doc');
      root = temp.element(name);
      root.isRoot = true;
      root.documentObject = this;
      this.rootObject = root;
      if (!options.headless) {
        root.declaration(options);
        if ((options.pubID != null) || (options.sysID != null)) {
          root.doctype(options);
        }
      }
    }

    XMLBuilder.prototype.root = function() {
      return this.rootObject;
    };

    XMLBuilder.prototype.end = function(options) {
      return this.toString(options);
    };

    XMLBuilder.prototype.toString = function(options) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      r = '';
      if (this.xmldec != null) {
        r += this.xmldec.toString(options);
      }
      if (this.doctype != null) {
        r += this.doctype.toString(options);
      }
      r += this.rootObject.toString(options);
      if (pretty && r.slice(-newline.length) === newline) {
        r = r.slice(0, -newline.length);
      }
      return r;
    };

    return XMLBuilder;

  })();

}).call(this);

},{"./XMLDeclaration":69,"./XMLDocType":70,"./XMLElement":71,"./XMLStringifier":75}],63:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLCData, XMLNode, create,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  create = require('lodash/object/create');

  XMLNode = require('./XMLNode');

  module.exports = XMLCData = (function(superClass) {
    extend(XMLCData, superClass);

    function XMLCData(parent, text) {
      XMLCData.__super__.constructor.call(this, parent);
      if (text == null) {
        throw new Error("Missing CDATA text");
      }
      this.text = this.stringify.cdata(text);
    }

    XMLCData.prototype.clone = function() {
      return create(XMLCData.prototype, this);
    };

    XMLCData.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<![CDATA[' + this.text + ']]>';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLCData;

  })(XMLNode);

}).call(this);

},{"./XMLNode":72,"lodash/object/create":131}],64:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLComment, XMLNode, create,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  create = require('lodash/object/create');

  XMLNode = require('./XMLNode');

  module.exports = XMLComment = (function(superClass) {
    extend(XMLComment, superClass);

    function XMLComment(parent, text) {
      XMLComment.__super__.constructor.call(this, parent);
      if (text == null) {
        throw new Error("Missing comment text");
      }
      this.text = this.stringify.comment(text);
    }

    XMLComment.prototype.clone = function() {
      return create(XMLComment.prototype, this);
    };

    XMLComment.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<!-- ' + this.text + ' -->';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLComment;

  })(XMLNode);

}).call(this);

},{"./XMLNode":72,"lodash/object/create":131}],65:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLDTDAttList, create;

  create = require('lodash/object/create');

  module.exports = XMLDTDAttList = (function() {
    function XMLDTDAttList(parent, elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      this.stringify = parent.stringify;
      if (elementName == null) {
        throw new Error("Missing DTD element name");
      }
      if (attributeName == null) {
        throw new Error("Missing DTD attribute name");
      }
      if (!attributeType) {
        throw new Error("Missing DTD attribute type");
      }
      if (!defaultValueType) {
        throw new Error("Missing DTD attribute default");
      }
      if (defaultValueType.indexOf('#') !== 0) {
        defaultValueType = '#' + defaultValueType;
      }
      if (!defaultValueType.match(/^(#REQUIRED|#IMPLIED|#FIXED|#DEFAULT)$/)) {
        throw new Error("Invalid default value type; expected: #REQUIRED, #IMPLIED, #FIXED or #DEFAULT");
      }
      if (defaultValue && !defaultValueType.match(/^(#FIXED|#DEFAULT)$/)) {
        throw new Error("Default value only applies to #FIXED or #DEFAULT");
      }
      this.elementName = this.stringify.eleName(elementName);
      this.attributeName = this.stringify.attName(attributeName);
      this.attributeType = this.stringify.dtdAttType(attributeType);
      this.defaultValue = this.stringify.dtdAttDefault(defaultValue);
      this.defaultValueType = defaultValueType;
    }

    XMLDTDAttList.prototype.clone = function() {
      return create(XMLDTDAttList.prototype, this);
    };

    XMLDTDAttList.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<!ATTLIST ' + this.elementName + ' ' + this.attributeName + ' ' + this.attributeType;
      if (this.defaultValueType !== '#DEFAULT') {
        r += ' ' + this.defaultValueType;
      }
      if (this.defaultValue) {
        r += ' "' + this.defaultValue + '"';
      }
      r += '>';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLDTDAttList;

  })();

}).call(this);

},{"lodash/object/create":131}],66:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLDTDElement, create, isArray;

  create = require('lodash/object/create');

  isArray = require('lodash/lang/isArray');

  module.exports = XMLDTDElement = (function() {
    function XMLDTDElement(parent, name, value) {
      this.stringify = parent.stringify;
      if (name == null) {
        throw new Error("Missing DTD element name");
      }
      if (!value) {
        value = '(#PCDATA)';
      }
      if (isArray(value)) {
        value = '(' + value.join(',') + ')';
      }
      this.name = this.stringify.eleName(name);
      this.value = this.stringify.dtdElementValue(value);
    }

    XMLDTDElement.prototype.clone = function() {
      return create(XMLDTDElement.prototype, this);
    };

    XMLDTDElement.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<!ELEMENT ' + this.name + ' ' + this.value + '>';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLDTDElement;

  })();

}).call(this);

},{"lodash/lang/isArray":123,"lodash/object/create":131}],67:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLDTDEntity, create, isObject;

  create = require('lodash/object/create');

  isObject = require('lodash/lang/isObject');

  module.exports = XMLDTDEntity = (function() {
    function XMLDTDEntity(parent, pe, name, value) {
      this.stringify = parent.stringify;
      if (name == null) {
        throw new Error("Missing entity name");
      }
      if (value == null) {
        throw new Error("Missing entity value");
      }
      this.pe = !!pe;
      this.name = this.stringify.eleName(name);
      if (!isObject(value)) {
        this.value = this.stringify.dtdEntityValue(value);
      } else {
        if (!value.pubID && !value.sysID) {
          throw new Error("Public and/or system identifiers are required for an external entity");
        }
        if (value.pubID && !value.sysID) {
          throw new Error("System identifier is required for a public external entity");
        }
        if (value.pubID != null) {
          this.pubID = this.stringify.dtdPubID(value.pubID);
        }
        if (value.sysID != null) {
          this.sysID = this.stringify.dtdSysID(value.sysID);
        }
        if (value.nData != null) {
          this.nData = this.stringify.dtdNData(value.nData);
        }
        if (this.pe && this.nData) {
          throw new Error("Notation declaration is not allowed in a parameter entity");
        }
      }
    }

    XMLDTDEntity.prototype.clone = function() {
      return create(XMLDTDEntity.prototype, this);
    };

    XMLDTDEntity.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<!ENTITY';
      if (this.pe) {
        r += ' %';
      }
      r += ' ' + this.name;
      if (this.value) {
        r += ' "' + this.value + '"';
      } else {
        if (this.pubID && this.sysID) {
          r += ' PUBLIC "' + this.pubID + '" "' + this.sysID + '"';
        } else if (this.sysID) {
          r += ' SYSTEM "' + this.sysID + '"';
        }
        if (this.nData) {
          r += ' NDATA ' + this.nData;
        }
      }
      r += '>';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLDTDEntity;

  })();

}).call(this);

},{"lodash/lang/isObject":127,"lodash/object/create":131}],68:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLDTDNotation, create;

  create = require('lodash/object/create');

  module.exports = XMLDTDNotation = (function() {
    function XMLDTDNotation(parent, name, value) {
      this.stringify = parent.stringify;
      if (name == null) {
        throw new Error("Missing notation name");
      }
      if (!value.pubID && !value.sysID) {
        throw new Error("Public or system identifiers are required for an external entity");
      }
      this.name = this.stringify.eleName(name);
      if (value.pubID != null) {
        this.pubID = this.stringify.dtdPubID(value.pubID);
      }
      if (value.sysID != null) {
        this.sysID = this.stringify.dtdSysID(value.sysID);
      }
    }

    XMLDTDNotation.prototype.clone = function() {
      return create(XMLDTDNotation.prototype, this);
    };

    XMLDTDNotation.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<!NOTATION ' + this.name;
      if (this.pubID && this.sysID) {
        r += ' PUBLIC "' + this.pubID + '" "' + this.sysID + '"';
      } else if (this.pubID) {
        r += ' PUBLIC "' + this.pubID + '"';
      } else if (this.sysID) {
        r += ' SYSTEM "' + this.sysID + '"';
      }
      r += '>';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLDTDNotation;

  })();

}).call(this);

},{"lodash/object/create":131}],69:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLDeclaration, XMLNode, create, isObject,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  create = require('lodash/object/create');

  isObject = require('lodash/lang/isObject');

  XMLNode = require('./XMLNode');

  module.exports = XMLDeclaration = (function(superClass) {
    extend(XMLDeclaration, superClass);

    function XMLDeclaration(parent, version, encoding, standalone) {
      var ref;
      XMLDeclaration.__super__.constructor.call(this, parent);
      if (isObject(version)) {
        ref = version, version = ref.version, encoding = ref.encoding, standalone = ref.standalone;
      }
      if (!version) {
        version = '1.0';
      }
      if (version != null) {
        this.version = this.stringify.xmlVersion(version);
      }
      if (encoding != null) {
        this.encoding = this.stringify.xmlEncoding(encoding);
      }
      if (standalone != null) {
        this.standalone = this.stringify.xmlStandalone(standalone);
      }
    }

    XMLDeclaration.prototype.clone = function() {
      return create(XMLDeclaration.prototype, this);
    };

    XMLDeclaration.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<?xml';
      if (this.version != null) {
        r += ' version="' + this.version + '"';
      }
      if (this.encoding != null) {
        r += ' encoding="' + this.encoding + '"';
      }
      if (this.standalone != null) {
        r += ' standalone="' + this.standalone + '"';
      }
      r += '?>';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLDeclaration;

  })(XMLNode);

}).call(this);

},{"./XMLNode":72,"lodash/lang/isObject":127,"lodash/object/create":131}],70:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDocType, XMLProcessingInstruction, create, isObject;

  create = require('lodash/object/create');

  isObject = require('lodash/lang/isObject');

  XMLCData = require('./XMLCData');

  XMLComment = require('./XMLComment');

  XMLDTDAttList = require('./XMLDTDAttList');

  XMLDTDEntity = require('./XMLDTDEntity');

  XMLDTDElement = require('./XMLDTDElement');

  XMLDTDNotation = require('./XMLDTDNotation');

  XMLProcessingInstruction = require('./XMLProcessingInstruction');

  module.exports = XMLDocType = (function() {
    function XMLDocType(parent, pubID, sysID) {
      var ref, ref1;
      this.documentObject = parent;
      this.stringify = this.documentObject.stringify;
      this.children = [];
      if (isObject(pubID)) {
        ref = pubID, pubID = ref.pubID, sysID = ref.sysID;
      }
      if (sysID == null) {
        ref1 = [pubID, sysID], sysID = ref1[0], pubID = ref1[1];
      }
      if (pubID != null) {
        this.pubID = this.stringify.dtdPubID(pubID);
      }
      if (sysID != null) {
        this.sysID = this.stringify.dtdSysID(sysID);
      }
    }

    XMLDocType.prototype.clone = function() {
      return create(XMLDocType.prototype, this);
    };

    XMLDocType.prototype.element = function(name, value) {
      var child;
      child = new XMLDTDElement(this, name, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.attList = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      var child;
      child = new XMLDTDAttList(this, elementName, attributeName, attributeType, defaultValueType, defaultValue);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.entity = function(name, value) {
      var child;
      child = new XMLDTDEntity(this, false, name, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.pEntity = function(name, value) {
      var child;
      child = new XMLDTDEntity(this, true, name, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.notation = function(name, value) {
      var child;
      child = new XMLDTDNotation(this, name, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.cdata = function(value) {
      var child;
      child = new XMLCData(this, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.comment = function(value) {
      var child;
      child = new XMLComment(this, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.instruction = function(target, value) {
      var child;
      child = new XMLProcessingInstruction(this, target, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.root = function() {
      return this.documentObject.root();
    };

    XMLDocType.prototype.document = function() {
      return this.documentObject;
    };

    XMLDocType.prototype.toString = function(options, level) {
      var child, i, indent, len, newline, offset, pretty, r, ref, ref1, ref2, ref3, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<!DOCTYPE ' + this.root().name;
      if (this.pubID && this.sysID) {
        r += ' PUBLIC "' + this.pubID + '" "' + this.sysID + '"';
      } else if (this.sysID) {
        r += ' SYSTEM "' + this.sysID + '"';
      }
      if (this.children.length > 0) {
        r += ' [';
        if (pretty) {
          r += newline;
        }
        ref3 = this.children;
        for (i = 0, len = ref3.length; i < len; i++) {
          child = ref3[i];
          r += child.toString(options, level + 1);
        }
        r += ']';
      }
      r += '>';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    XMLDocType.prototype.ele = function(name, value) {
      return this.element(name, value);
    };

    XMLDocType.prototype.att = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      return this.attList(elementName, attributeName, attributeType, defaultValueType, defaultValue);
    };

    XMLDocType.prototype.ent = function(name, value) {
      return this.entity(name, value);
    };

    XMLDocType.prototype.pent = function(name, value) {
      return this.pEntity(name, value);
    };

    XMLDocType.prototype.not = function(name, value) {
      return this.notation(name, value);
    };

    XMLDocType.prototype.dat = function(value) {
      return this.cdata(value);
    };

    XMLDocType.prototype.com = function(value) {
      return this.comment(value);
    };

    XMLDocType.prototype.ins = function(target, value) {
      return this.instruction(target, value);
    };

    XMLDocType.prototype.up = function() {
      return this.root();
    };

    XMLDocType.prototype.doc = function() {
      return this.document();
    };

    return XMLDocType;

  })();

}).call(this);

},{"./XMLCData":63,"./XMLComment":64,"./XMLDTDAttList":65,"./XMLDTDElement":66,"./XMLDTDEntity":67,"./XMLDTDNotation":68,"./XMLProcessingInstruction":73,"lodash/lang/isObject":127,"lodash/object/create":131}],71:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLAttribute, XMLElement, XMLNode, XMLProcessingInstruction, create, every, isArray, isFunction, isObject,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  create = require('lodash/object/create');

  isObject = require('lodash/lang/isObject');

  isArray = require('lodash/lang/isArray');

  isFunction = require('lodash/lang/isFunction');

  every = require('lodash/collection/every');

  XMLNode = require('./XMLNode');

  XMLAttribute = require('./XMLAttribute');

  XMLProcessingInstruction = require('./XMLProcessingInstruction');

  module.exports = XMLElement = (function(superClass) {
    extend(XMLElement, superClass);

    function XMLElement(parent, name, attributes) {
      XMLElement.__super__.constructor.call(this, parent);
      if (name == null) {
        throw new Error("Missing element name");
      }
      this.name = this.stringify.eleName(name);
      this.children = [];
      this.instructions = [];
      this.attributes = {};
      if (attributes != null) {
        this.attribute(attributes);
      }
    }

    XMLElement.prototype.clone = function() {
      var att, attName, clonedSelf, i, len, pi, ref, ref1;
      clonedSelf = create(XMLElement.prototype, this);
      if (clonedSelf.isRoot) {
        clonedSelf.documentObject = null;
      }
      clonedSelf.attributes = {};
      ref = this.attributes;
      for (attName in ref) {
        if (!hasProp.call(ref, attName)) continue;
        att = ref[attName];
        clonedSelf.attributes[attName] = att.clone();
      }
      clonedSelf.instructions = [];
      ref1 = this.instructions;
      for (i = 0, len = ref1.length; i < len; i++) {
        pi = ref1[i];
        clonedSelf.instructions.push(pi.clone());
      }
      clonedSelf.children = [];
      this.children.forEach(function(child) {
        var clonedChild;
        clonedChild = child.clone();
        clonedChild.parent = clonedSelf;
        return clonedSelf.children.push(clonedChild);
      });
      return clonedSelf;
    };

    XMLElement.prototype.attribute = function(name, value) {
      var attName, attValue;
      if (name != null) {
        name = name.valueOf();
      }
      if (isObject(name)) {
        for (attName in name) {
          if (!hasProp.call(name, attName)) continue;
          attValue = name[attName];
          this.attribute(attName, attValue);
        }
      } else {
        if (isFunction(value)) {
          value = value.apply();
        }
        if (!this.options.skipNullAttributes || (value != null)) {
          this.attributes[name] = new XMLAttribute(this, name, value);
        }
      }
      return this;
    };

    XMLElement.prototype.removeAttribute = function(name) {
      var attName, i, len;
      if (name == null) {
        throw new Error("Missing attribute name");
      }
      name = name.valueOf();
      if (isArray(name)) {
        for (i = 0, len = name.length; i < len; i++) {
          attName = name[i];
          delete this.attributes[attName];
        }
      } else {
        delete this.attributes[name];
      }
      return this;
    };

    XMLElement.prototype.instruction = function(target, value) {
      var i, insTarget, insValue, instruction, len;
      if (target != null) {
        target = target.valueOf();
      }
      if (value != null) {
        value = value.valueOf();
      }
      if (isArray(target)) {
        for (i = 0, len = target.length; i < len; i++) {
          insTarget = target[i];
          this.instruction(insTarget);
        }
      } else if (isObject(target)) {
        for (insTarget in target) {
          if (!hasProp.call(target, insTarget)) continue;
          insValue = target[insTarget];
          this.instruction(insTarget, insValue);
        }
      } else {
        if (isFunction(value)) {
          value = value.apply();
        }
        instruction = new XMLProcessingInstruction(this, target, value);
        this.instructions.push(instruction);
      }
      return this;
    };

    XMLElement.prototype.toString = function(options, level) {
      var att, child, i, indent, instruction, j, len, len1, name, newline, offset, pretty, r, ref, ref1, ref2, ref3, ref4, ref5, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      ref3 = this.instructions;
      for (i = 0, len = ref3.length; i < len; i++) {
        instruction = ref3[i];
        r += instruction.toString(options, level + 1);
      }
      if (pretty) {
        r += space;
      }
      r += '<' + this.name;
      ref4 = this.attributes;
      for (name in ref4) {
        if (!hasProp.call(ref4, name)) continue;
        att = ref4[name];
        r += att.toString(options);
      }
      if (this.children.length === 0 || every(this.children, function(e) {
        return e.value === '';
      })) {
        r += '/>';
        if (pretty) {
          r += newline;
        }
      } else if (pretty && this.children.length === 1 && (this.children[0].value != null)) {
        r += '>';
        r += this.children[0].value;
        r += '</' + this.name + '>';
        r += newline;
      } else {
        r += '>';
        if (pretty) {
          r += newline;
        }
        ref5 = this.children;
        for (j = 0, len1 = ref5.length; j < len1; j++) {
          child = ref5[j];
          r += child.toString(options, level + 1);
        }
        if (pretty) {
          r += space;
        }
        r += '</' + this.name + '>';
        if (pretty) {
          r += newline;
        }
      }
      return r;
    };

    XMLElement.prototype.att = function(name, value) {
      return this.attribute(name, value);
    };

    XMLElement.prototype.ins = function(target, value) {
      return this.instruction(target, value);
    };

    XMLElement.prototype.a = function(name, value) {
      return this.attribute(name, value);
    };

    XMLElement.prototype.i = function(target, value) {
      return this.instruction(target, value);
    };

    return XMLElement;

  })(XMLNode);

}).call(this);

},{"./XMLAttribute":61,"./XMLNode":72,"./XMLProcessingInstruction":73,"lodash/collection/every":79,"lodash/lang/isArray":123,"lodash/lang/isFunction":125,"lodash/lang/isObject":127,"lodash/object/create":131}],72:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLCData, XMLComment, XMLDeclaration, XMLDocType, XMLElement, XMLNode, XMLRaw, XMLText, isArray, isEmpty, isFunction, isObject,
    hasProp = {}.hasOwnProperty;

  isObject = require('lodash/lang/isObject');

  isArray = require('lodash/lang/isArray');

  isFunction = require('lodash/lang/isFunction');

  isEmpty = require('lodash/lang/isEmpty');

  XMLElement = null;

  XMLCData = null;

  XMLComment = null;

  XMLDeclaration = null;

  XMLDocType = null;

  XMLRaw = null;

  XMLText = null;

  module.exports = XMLNode = (function() {
    function XMLNode(parent) {
      this.parent = parent;
      this.options = this.parent.options;
      this.stringify = this.parent.stringify;
      if (XMLElement === null) {
        XMLElement = require('./XMLElement');
        XMLCData = require('./XMLCData');
        XMLComment = require('./XMLComment');
        XMLDeclaration = require('./XMLDeclaration');
        XMLDocType = require('./XMLDocType');
        XMLRaw = require('./XMLRaw');
        XMLText = require('./XMLText');
      }
    }

    XMLNode.prototype.clone = function() {
      throw new Error("Cannot clone generic XMLNode");
    };

    XMLNode.prototype.element = function(name, attributes, text) {
      var item, j, key, lastChild, len, ref, val;
      lastChild = null;
      if (attributes == null) {
        attributes = {};
      }
      attributes = attributes.valueOf();
      if (!isObject(attributes)) {
        ref = [attributes, text], text = ref[0], attributes = ref[1];
      }
      if (name != null) {
        name = name.valueOf();
      }
      if (isArray(name)) {
        for (j = 0, len = name.length; j < len; j++) {
          item = name[j];
          lastChild = this.element(item);
        }
      } else if (isFunction(name)) {
        lastChild = this.element(name.apply());
      } else if (isObject(name)) {
        for (key in name) {
          if (!hasProp.call(name, key)) continue;
          val = name[key];
          if (isFunction(val)) {
            val = val.apply();
          }
          if ((isObject(val)) && (isEmpty(val))) {
            val = null;
          }
          if (!this.options.ignoreDecorators && this.stringify.convertAttKey && key.indexOf(this.stringify.convertAttKey) === 0) {
            lastChild = this.attribute(key.substr(this.stringify.convertAttKey.length), val);
          } else if (!this.options.ignoreDecorators && this.stringify.convertPIKey && key.indexOf(this.stringify.convertPIKey) === 0) {
            lastChild = this.instruction(key.substr(this.stringify.convertPIKey.length), val);
          } else if (isObject(val)) {
            if (!this.options.ignoreDecorators && this.stringify.convertListKey && key.indexOf(this.stringify.convertListKey) === 0 && isArray(val)) {
              lastChild = this.element(val);
            } else {
              lastChild = this.element(key);
              lastChild.element(val);
            }
          } else {
            lastChild = this.element(key, val);
          }
        }
      } else {
        if (!this.options.ignoreDecorators && this.stringify.convertTextKey && name.indexOf(this.stringify.convertTextKey) === 0) {
          lastChild = this.text(text);
        } else if (!this.options.ignoreDecorators && this.stringify.convertCDataKey && name.indexOf(this.stringify.convertCDataKey) === 0) {
          lastChild = this.cdata(text);
        } else if (!this.options.ignoreDecorators && this.stringify.convertCommentKey && name.indexOf(this.stringify.convertCommentKey) === 0) {
          lastChild = this.comment(text);
        } else if (!this.options.ignoreDecorators && this.stringify.convertRawKey && name.indexOf(this.stringify.convertRawKey) === 0) {
          lastChild = this.raw(text);
        } else {
          lastChild = this.node(name, attributes, text);
        }
      }
      if (lastChild == null) {
        throw new Error("Could not create any elements with: " + name);
      }
      return lastChild;
    };

    XMLNode.prototype.insertBefore = function(name, attributes, text) {
      var child, i, removed;
      if (this.isRoot) {
        throw new Error("Cannot insert elements at root level");
      }
      i = this.parent.children.indexOf(this);
      removed = this.parent.children.splice(i);
      child = this.parent.element(name, attributes, text);
      Array.prototype.push.apply(this.parent.children, removed);
      return child;
    };

    XMLNode.prototype.insertAfter = function(name, attributes, text) {
      var child, i, removed;
      if (this.isRoot) {
        throw new Error("Cannot insert elements at root level");
      }
      i = this.parent.children.indexOf(this);
      removed = this.parent.children.splice(i + 1);
      child = this.parent.element(name, attributes, text);
      Array.prototype.push.apply(this.parent.children, removed);
      return child;
    };

    XMLNode.prototype.remove = function() {
      var i, ref;
      if (this.isRoot) {
        throw new Error("Cannot remove the root element");
      }
      i = this.parent.children.indexOf(this);
      [].splice.apply(this.parent.children, [i, i - i + 1].concat(ref = [])), ref;
      return this.parent;
    };

    XMLNode.prototype.node = function(name, attributes, text) {
      var child, ref;
      if (name != null) {
        name = name.valueOf();
      }
      if (attributes == null) {
        attributes = {};
      }
      attributes = attributes.valueOf();
      if (!isObject(attributes)) {
        ref = [attributes, text], text = ref[0], attributes = ref[1];
      }
      child = new XMLElement(this, name, attributes);
      if (text != null) {
        child.text(text);
      }
      this.children.push(child);
      return child;
    };

    XMLNode.prototype.text = function(value) {
      var child;
      child = new XMLText(this, value);
      this.children.push(child);
      return this;
    };

    XMLNode.prototype.cdata = function(value) {
      var child;
      child = new XMLCData(this, value);
      this.children.push(child);
      return this;
    };

    XMLNode.prototype.comment = function(value) {
      var child;
      child = new XMLComment(this, value);
      this.children.push(child);
      return this;
    };

    XMLNode.prototype.raw = function(value) {
      var child;
      child = new XMLRaw(this, value);
      this.children.push(child);
      return this;
    };

    XMLNode.prototype.declaration = function(version, encoding, standalone) {
      var doc, xmldec;
      doc = this.document();
      xmldec = new XMLDeclaration(doc, version, encoding, standalone);
      doc.xmldec = xmldec;
      return doc.root();
    };

    XMLNode.prototype.doctype = function(pubID, sysID) {
      var doc, doctype;
      doc = this.document();
      doctype = new XMLDocType(doc, pubID, sysID);
      doc.doctype = doctype;
      return doctype;
    };

    XMLNode.prototype.up = function() {
      if (this.isRoot) {
        throw new Error("The root node has no parent. Use doc() if you need to get the document object.");
      }
      return this.parent;
    };

    XMLNode.prototype.root = function() {
      var child;
      if (this.isRoot) {
        return this;
      }
      child = this.parent;
      while (!child.isRoot) {
        child = child.parent;
      }
      return child;
    };

    XMLNode.prototype.document = function() {
      return this.root().documentObject;
    };

    XMLNode.prototype.end = function(options) {
      return this.document().toString(options);
    };

    XMLNode.prototype.prev = function() {
      var i;
      if (this.isRoot) {
        throw new Error("Root node has no siblings");
      }
      i = this.parent.children.indexOf(this);
      if (i < 1) {
        throw new Error("Already at the first node");
      }
      return this.parent.children[i - 1];
    };

    XMLNode.prototype.next = function() {
      var i;
      if (this.isRoot) {
        throw new Error("Root node has no siblings");
      }
      i = this.parent.children.indexOf(this);
      if (i === -1 || i === this.parent.children.length - 1) {
        throw new Error("Already at the last node");
      }
      return this.parent.children[i + 1];
    };

    XMLNode.prototype.importXMLBuilder = function(xmlbuilder) {
      var clonedRoot;
      clonedRoot = xmlbuilder.root().clone();
      clonedRoot.parent = this;
      clonedRoot.isRoot = false;
      this.children.push(clonedRoot);
      return this;
    };

    XMLNode.prototype.ele = function(name, attributes, text) {
      return this.element(name, attributes, text);
    };

    XMLNode.prototype.nod = function(name, attributes, text) {
      return this.node(name, attributes, text);
    };

    XMLNode.prototype.txt = function(value) {
      return this.text(value);
    };

    XMLNode.prototype.dat = function(value) {
      return this.cdata(value);
    };

    XMLNode.prototype.com = function(value) {
      return this.comment(value);
    };

    XMLNode.prototype.doc = function() {
      return this.document();
    };

    XMLNode.prototype.dec = function(version, encoding, standalone) {
      return this.declaration(version, encoding, standalone);
    };

    XMLNode.prototype.dtd = function(pubID, sysID) {
      return this.doctype(pubID, sysID);
    };

    XMLNode.prototype.e = function(name, attributes, text) {
      return this.element(name, attributes, text);
    };

    XMLNode.prototype.n = function(name, attributes, text) {
      return this.node(name, attributes, text);
    };

    XMLNode.prototype.t = function(value) {
      return this.text(value);
    };

    XMLNode.prototype.d = function(value) {
      return this.cdata(value);
    };

    XMLNode.prototype.c = function(value) {
      return this.comment(value);
    };

    XMLNode.prototype.r = function(value) {
      return this.raw(value);
    };

    XMLNode.prototype.u = function() {
      return this.up();
    };

    return XMLNode;

  })();

}).call(this);

},{"./XMLCData":63,"./XMLComment":64,"./XMLDeclaration":69,"./XMLDocType":70,"./XMLElement":71,"./XMLRaw":74,"./XMLText":76,"lodash/lang/isArray":123,"lodash/lang/isEmpty":124,"lodash/lang/isFunction":125,"lodash/lang/isObject":127}],73:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLProcessingInstruction, create;

  create = require('lodash/object/create');

  module.exports = XMLProcessingInstruction = (function() {
    function XMLProcessingInstruction(parent, target, value) {
      this.stringify = parent.stringify;
      if (target == null) {
        throw new Error("Missing instruction target");
      }
      this.target = this.stringify.insTarget(target);
      if (value) {
        this.value = this.stringify.insValue(value);
      }
    }

    XMLProcessingInstruction.prototype.clone = function() {
      return create(XMLProcessingInstruction.prototype, this);
    };

    XMLProcessingInstruction.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<?';
      r += this.target;
      if (this.value) {
        r += ' ' + this.value;
      }
      r += '?>';
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLProcessingInstruction;

  })();

}).call(this);

},{"lodash/object/create":131}],74:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLNode, XMLRaw, create,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  create = require('lodash/object/create');

  XMLNode = require('./XMLNode');

  module.exports = XMLRaw = (function(superClass) {
    extend(XMLRaw, superClass);

    function XMLRaw(parent, text) {
      XMLRaw.__super__.constructor.call(this, parent);
      if (text == null) {
        throw new Error("Missing raw text");
      }
      this.value = this.stringify.raw(text);
    }

    XMLRaw.prototype.clone = function() {
      return create(XMLRaw.prototype, this);
    };

    XMLRaw.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += this.value;
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLRaw;

  })(XMLNode);

}).call(this);

},{"./XMLNode":72,"lodash/object/create":131}],75:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLStringifier,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    hasProp = {}.hasOwnProperty;

  module.exports = XMLStringifier = (function() {
    function XMLStringifier(options) {
      this.assertLegalChar = bind(this.assertLegalChar, this);
      var key, ref, value;
      this.allowSurrogateChars = options != null ? options.allowSurrogateChars : void 0;
      ref = (options != null ? options.stringify : void 0) || {};
      for (key in ref) {
        if (!hasProp.call(ref, key)) continue;
        value = ref[key];
        this[key] = value;
      }
    }

    XMLStringifier.prototype.eleName = function(val) {
      val = '' + val || '';
      return this.assertLegalChar(val);
    };

    XMLStringifier.prototype.eleText = function(val) {
      val = '' + val || '';
      return this.assertLegalChar(this.elEscape(val));
    };

    XMLStringifier.prototype.cdata = function(val) {
      val = '' + val || '';
      if (val.match(/]]>/)) {
        throw new Error("Invalid CDATA text: " + val);
      }
      return this.assertLegalChar(val);
    };

    XMLStringifier.prototype.comment = function(val) {
      val = '' + val || '';
      if (val.match(/--/)) {
        throw new Error("Comment text cannot contain double-hypen: " + val);
      }
      return this.assertLegalChar(val);
    };

    XMLStringifier.prototype.raw = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.attName = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.attValue = function(val) {
      val = '' + val || '';
      return this.attEscape(val);
    };

    XMLStringifier.prototype.insTarget = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.insValue = function(val) {
      val = '' + val || '';
      if (val.match(/\?>/)) {
        throw new Error("Invalid processing instruction value: " + val);
      }
      return val;
    };

    XMLStringifier.prototype.xmlVersion = function(val) {
      val = '' + val || '';
      if (!val.match(/1\.[0-9]+/)) {
        throw new Error("Invalid version number: " + val);
      }
      return val;
    };

    XMLStringifier.prototype.xmlEncoding = function(val) {
      val = '' + val || '';
      if (!val.match(/[A-Za-z](?:[A-Za-z0-9._-]|-)*/)) {
        throw new Error("Invalid encoding: " + val);
      }
      return val;
    };

    XMLStringifier.prototype.xmlStandalone = function(val) {
      if (val) {
        return "yes";
      } else {
        return "no";
      }
    };

    XMLStringifier.prototype.dtdPubID = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdSysID = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdElementValue = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdAttType = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdAttDefault = function(val) {
      if (val != null) {
        return '' + val || '';
      } else {
        return val;
      }
    };

    XMLStringifier.prototype.dtdEntityValue = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdNData = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.convertAttKey = '@';

    XMLStringifier.prototype.convertPIKey = '?';

    XMLStringifier.prototype.convertTextKey = '#text';

    XMLStringifier.prototype.convertCDataKey = '#cdata';

    XMLStringifier.prototype.convertCommentKey = '#comment';

    XMLStringifier.prototype.convertRawKey = '#raw';

    XMLStringifier.prototype.convertListKey = '#list';

    XMLStringifier.prototype.assertLegalChar = function(str) {
      var chars, chr;
      if (this.allowSurrogateChars) {
        chars = /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uFFFE-\uFFFF]/;
      } else {
        chars = /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE-\uFFFF]/;
      }
      chr = str.match(chars);
      if (chr) {
        throw new Error("Invalid character (" + chr + ") in string: " + str + " at index " + chr.index);
      }
      return str;
    };

    XMLStringifier.prototype.elEscape = function(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
    };

    XMLStringifier.prototype.attEscape = function(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');
    };

    return XMLStringifier;

  })();

}).call(this);

},{}],76:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLNode, XMLText, create,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  create = require('lodash/object/create');

  XMLNode = require('./XMLNode');

  module.exports = XMLText = (function(superClass) {
    extend(XMLText, superClass);

    function XMLText(parent, text) {
      XMLText.__super__.constructor.call(this, parent);
      if (text == null) {
        throw new Error("Missing element text");
      }
      this.value = this.stringify.eleText(text);
    }

    XMLText.prototype.clone = function() {
      return create(XMLText.prototype, this);
    };

    XMLText.prototype.toString = function(options, level) {
      var indent, newline, offset, pretty, r, ref, ref1, ref2, space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += this.value;
      if (pretty) {
        r += newline;
      }
      return r;
    };

    return XMLText;

  })(XMLNode);

}).call(this);

},{"./XMLNode":72,"lodash/object/create":131}],77:[function(require,module,exports){
// Generated by CoffeeScript 1.9.1
(function() {
  var XMLBuilder, assign;

  assign = require('lodash/object/assign');

  XMLBuilder = require('./XMLBuilder');

  module.exports.create = function(name, xmldec, doctype, options) {
    options = assign({}, xmldec, doctype, options);
    return new XMLBuilder(name, options).root();
  };

}).call(this);

},{"./XMLBuilder":62,"lodash/object/assign":130}],78:[function(require,module,exports){
/**
 * Gets the last element of `array`.
 *
 * @static
 * @memberOf _
 * @category Array
 * @param {Array} array The array to query.
 * @returns {*} Returns the last element of `array`.
 * @example
 *
 * _.last([1, 2, 3]);
 * // => 3
 */
function last(array) {
  var length = array ? array.length : 0;
  return length ? array[length - 1] : undefined;
}

module.exports = last;

},{}],79:[function(require,module,exports){
var arrayEvery = require('../internal/arrayEvery'),
    baseCallback = require('../internal/baseCallback'),
    baseEvery = require('../internal/baseEvery'),
    isArray = require('../lang/isArray'),
    isIterateeCall = require('../internal/isIterateeCall');

/**
 * Checks if `predicate` returns truthy for **all** elements of `collection`.
 * The predicate is bound to `thisArg` and invoked with three arguments:
 * (value, index|key, collection).
 *
 * If a property name is provided for `predicate` the created `_.property`
 * style callback returns the property value of the given element.
 *
 * If a value is also provided for `thisArg` the created `_.matchesProperty`
 * style callback returns `true` for elements that have a matching property
 * value, else `false`.
 *
 * If an object is provided for `predicate` the created `_.matches` style
 * callback returns `true` for elements that have the properties of the given
 * object, else `false`.
 *
 * @static
 * @memberOf _
 * @alias all
 * @category Collection
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function|Object|string} [predicate=_.identity] The function invoked
 *  per iteration.
 * @param {*} [thisArg] The `this` binding of `predicate`.
 * @returns {boolean} Returns `true` if all elements pass the predicate check,
 *  else `false`.
 * @example
 *
 * _.every([true, 1, null, 'yes'], Boolean);
 * // => false
 *
 * var users = [
 *   { 'user': 'barney', 'active': false },
 *   { 'user': 'fred',   'active': false }
 * ];
 *
 * // using the `_.matches` callback shorthand
 * _.every(users, { 'user': 'barney', 'active': false });
 * // => false
 *
 * // using the `_.matchesProperty` callback shorthand
 * _.every(users, 'active', false);
 * // => true
 *
 * // using the `_.property` callback shorthand
 * _.every(users, 'active');
 * // => false
 */
function every(collection, predicate, thisArg) {
  var func = isArray(collection) ? arrayEvery : baseEvery;
  if (thisArg && isIterateeCall(collection, predicate, thisArg)) {
    predicate = undefined;
  }
  if (typeof predicate != 'function' || thisArg !== undefined) {
    predicate = baseCallback(predicate, thisArg, 3);
  }
  return func(collection, predicate);
}

module.exports = every;

},{"../internal/arrayEvery":81,"../internal/baseCallback":85,"../internal/baseEvery":89,"../internal/isIterateeCall":114,"../lang/isArray":123}],80:[function(require,module,exports){
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

},{}],81:[function(require,module,exports){
/**
 * A specialized version of `_.every` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if all elements pass the predicate check,
 *  else `false`.
 */
function arrayEvery(array, predicate) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (!predicate(array[index], index, array)) {
      return false;
    }
  }
  return true;
}

module.exports = arrayEvery;

},{}],82:[function(require,module,exports){
/**
 * A specialized version of `_.some` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

module.exports = arraySome;

},{}],83:[function(require,module,exports){
var keys = require('../object/keys');

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

module.exports = assignWith;

},{"../object/keys":132}],84:[function(require,module,exports){
var baseCopy = require('./baseCopy'),
    keys = require('../object/keys');

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

},{"../object/keys":132,"./baseCopy":86}],85:[function(require,module,exports){
var baseMatches = require('./baseMatches'),
    baseMatchesProperty = require('./baseMatchesProperty'),
    bindCallback = require('./bindCallback'),
    identity = require('../utility/identity'),
    property = require('../utility/property');

/**
 * The base implementation of `_.callback` which supports specifying the
 * number of arguments to provide to `func`.
 *
 * @private
 * @param {*} [func=_.identity] The value to convert to a callback.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function baseCallback(func, thisArg, argCount) {
  var type = typeof func;
  if (type == 'function') {
    return thisArg === undefined
      ? func
      : bindCallback(func, thisArg, argCount);
  }
  if (func == null) {
    return identity;
  }
  if (type == 'object') {
    return baseMatches(func);
  }
  return thisArg === undefined
    ? property(func)
    : baseMatchesProperty(func, thisArg);
}

module.exports = baseCallback;

},{"../utility/identity":135,"../utility/property":136,"./baseMatches":96,"./baseMatchesProperty":97,"./bindCallback":102}],86:[function(require,module,exports){
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

},{}],87:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} prototype The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(prototype) {
    if (isObject(prototype)) {
      object.prototype = prototype;
      var result = new object;
      object.prototype = undefined;
    }
    return result || {};
  };
}());

module.exports = baseCreate;

},{"../lang/isObject":127}],88:[function(require,module,exports){
var baseForOwn = require('./baseForOwn'),
    createBaseEach = require('./createBaseEach');

/**
 * The base implementation of `_.forEach` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object|string} Returns `collection`.
 */
var baseEach = createBaseEach(baseForOwn);

module.exports = baseEach;

},{"./baseForOwn":91,"./createBaseEach":104}],89:[function(require,module,exports){
var baseEach = require('./baseEach');

/**
 * The base implementation of `_.every` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if all elements pass the predicate check,
 *  else `false`
 */
function baseEvery(collection, predicate) {
  var result = true;
  baseEach(collection, function(value, index, collection) {
    result = !!predicate(value, index, collection);
    return result;
  });
  return result;
}

module.exports = baseEvery;

},{"./baseEach":88}],90:[function(require,module,exports){
var createBaseFor = require('./createBaseFor');

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"./createBaseFor":105}],91:[function(require,module,exports){
var baseFor = require('./baseFor'),
    keys = require('../object/keys');

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

module.exports = baseForOwn;

},{"../object/keys":132,"./baseFor":90}],92:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * The base implementation of `get` without support for string paths
 * and default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} path The path of the property to get.
 * @param {string} [pathKey] The key representation of path.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path, pathKey) {
  if (object == null) {
    return;
  }
  if (pathKey !== undefined && pathKey in toObject(object)) {
    path = [pathKey];
  }
  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[path[index++]];
  }
  return (index && index == length) ? object : undefined;
}

module.exports = baseGet;

},{"./toObject":120}],93:[function(require,module,exports){
var baseIsEqualDeep = require('./baseIsEqualDeep'),
    isObject = require('../lang/isObject'),
    isObjectLike = require('./isObjectLike');

/**
 * The base implementation of `_.isEqual` without support for `this` binding
 * `customizer` functions.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {Function} [customizer] The function to customize comparing values.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
}

module.exports = baseIsEqual;

},{"../lang/isObject":127,"./baseIsEqualDeep":94,"./isObjectLike":117}],94:[function(require,module,exports){
var equalArrays = require('./equalArrays'),
    equalByTag = require('./equalByTag'),
    equalObjects = require('./equalObjects'),
    isArray = require('../lang/isArray'),
    isTypedArray = require('../lang/isTypedArray');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    objectTag = '[object Object]';

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing objects.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA=[]] Tracks traversed `value` objects.
 * @param {Array} [stackB=[]] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = arrayTag,
      othTag = arrayTag;

  if (!objIsArr) {
    objTag = objToString.call(object);
    if (objTag == argsTag) {
      objTag = objectTag;
    } else if (objTag != objectTag) {
      objIsArr = isTypedArray(object);
    }
  }
  if (!othIsArr) {
    othTag = objToString.call(other);
    if (othTag == argsTag) {
      othTag = objectTag;
    } else if (othTag != objectTag) {
      othIsArr = isTypedArray(other);
    }
  }
  var objIsObj = objTag == objectTag,
      othIsObj = othTag == objectTag,
      isSameTag = objTag == othTag;

  if (isSameTag && !(objIsArr || objIsObj)) {
    return equalByTag(object, other, objTag);
  }
  if (!isLoose) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
    }
  }
  if (!isSameTag) {
    return false;
  }
  // Assume cyclic values are equal.
  // For more information on detecting circular references see https://es5.github.io/#JO.
  stackA || (stackA = []);
  stackB || (stackB = []);

  var length = stackA.length;
  while (length--) {
    if (stackA[length] == object) {
      return stackB[length] == other;
    }
  }
  // Add `object` and `other` to the stack of traversed objects.
  stackA.push(object);
  stackB.push(other);

  var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);

  stackA.pop();
  stackB.pop();

  return result;
}

module.exports = baseIsEqualDeep;

},{"../lang/isArray":123,"../lang/isTypedArray":129,"./equalArrays":106,"./equalByTag":107,"./equalObjects":108}],95:[function(require,module,exports){
var baseIsEqual = require('./baseIsEqual'),
    toObject = require('./toObject');

/**
 * The base implementation of `_.isMatch` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Array} matchData The propery names, values, and compare flags to match.
 * @param {Function} [customizer] The function to customize comparing objects.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, matchData, customizer) {
  var index = matchData.length,
      length = index,
      noCustomizer = !customizer;

  if (object == null) {
    return !length;
  }
  object = toObject(object);
  while (index--) {
    var data = matchData[index];
    if ((noCustomizer && data[2])
          ? data[1] !== object[data[0]]
          : !(data[0] in object)
        ) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0],
        objValue = object[key],
        srcValue = data[1];

    if (noCustomizer && data[2]) {
      if (objValue === undefined && !(key in object)) {
        return false;
      }
    } else {
      var result = customizer ? customizer(objValue, srcValue, key) : undefined;
      if (!(result === undefined ? baseIsEqual(srcValue, objValue, customizer, true) : result)) {
        return false;
      }
    }
  }
  return true;
}

module.exports = baseIsMatch;

},{"./baseIsEqual":93,"./toObject":120}],96:[function(require,module,exports){
var baseIsMatch = require('./baseIsMatch'),
    getMatchData = require('./getMatchData'),
    toObject = require('./toObject');

/**
 * The base implementation of `_.matches` which does not clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new function.
 */
function baseMatches(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    var key = matchData[0][0],
        value = matchData[0][1];

    return function(object) {
      if (object == null) {
        return false;
      }
      return object[key] === value && (value !== undefined || (key in toObject(object)));
    };
  }
  return function(object) {
    return baseIsMatch(object, matchData);
  };
}

module.exports = baseMatches;

},{"./baseIsMatch":95,"./getMatchData":110,"./toObject":120}],97:[function(require,module,exports){
var baseGet = require('./baseGet'),
    baseIsEqual = require('./baseIsEqual'),
    baseSlice = require('./baseSlice'),
    isArray = require('../lang/isArray'),
    isKey = require('./isKey'),
    isStrictComparable = require('./isStrictComparable'),
    last = require('../array/last'),
    toObject = require('./toObject'),
    toPath = require('./toPath');

/**
 * The base implementation of `_.matchesProperty` which does not clone `srcValue`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} srcValue The value to compare.
 * @returns {Function} Returns the new function.
 */
function baseMatchesProperty(path, srcValue) {
  var isArr = isArray(path),
      isCommon = isKey(path) && isStrictComparable(srcValue),
      pathKey = (path + '');

  path = toPath(path);
  return function(object) {
    if (object == null) {
      return false;
    }
    var key = pathKey;
    object = toObject(object);
    if ((isArr || !isCommon) && !(key in object)) {
      object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
      if (object == null) {
        return false;
      }
      key = last(path);
      object = toObject(object);
    }
    return object[key] === srcValue
      ? (srcValue !== undefined || (key in object))
      : baseIsEqual(srcValue, object[key], undefined, true);
  };
}

module.exports = baseMatchesProperty;

},{"../array/last":78,"../lang/isArray":123,"./baseGet":92,"./baseIsEqual":93,"./baseSlice":100,"./isKey":115,"./isStrictComparable":118,"./toObject":120,"./toPath":121}],98:[function(require,module,exports){
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

module.exports = baseProperty;

},{}],99:[function(require,module,exports){
var baseGet = require('./baseGet'),
    toPath = require('./toPath');

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new function.
 */
function basePropertyDeep(path) {
  var pathKey = (path + '');
  path = toPath(path);
  return function(object) {
    return baseGet(object, path, pathKey);
  };
}

module.exports = basePropertyDeep;

},{"./baseGet":92,"./toPath":121}],100:[function(require,module,exports){
/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  start = start == null ? 0 : (+start || 0);
  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = (end === undefined || end > length) ? length : (+end || 0);
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

module.exports = baseSlice;

},{}],101:[function(require,module,exports){
/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` or `undefined` values.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  return value == null ? '' : (value + '');
}

module.exports = baseToString;

},{}],102:[function(require,module,exports){
var identity = require('../utility/identity');

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

module.exports = bindCallback;

},{"../utility/identity":135}],103:[function(require,module,exports){
var bindCallback = require('./bindCallback'),
    isIterateeCall = require('./isIterateeCall'),
    restParam = require('../function/restParam');

/**
 * Creates a `_.assign`, `_.defaults`, or `_.merge` function.
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

},{"../function/restParam":80,"./bindCallback":102,"./isIterateeCall":114}],104:[function(require,module,exports){
var getLength = require('./getLength'),
    isLength = require('./isLength'),
    toObject = require('./toObject');

/**
 * Creates a `baseEach` or `baseEachRight` function.
 *
 * @private
 * @param {Function} eachFunc The function to iterate over a collection.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    var length = collection ? getLength(collection) : 0;
    if (!isLength(length)) {
      return eachFunc(collection, iteratee);
    }
    var index = fromRight ? length : -1,
        iterable = toObject(collection);

    while ((fromRight ? index-- : ++index < length)) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}

module.exports = createBaseEach;

},{"./getLength":109,"./isLength":116,"./toObject":120}],105:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{"./toObject":120}],106:[function(require,module,exports){
var arraySome = require('./arraySome');

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing arrays.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var index = -1,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
    return false;
  }
  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index],
        result = customizer ? customizer(isLoose ? othValue : arrValue, isLoose ? arrValue : othValue, index) : undefined;

    if (result !== undefined) {
      if (result) {
        continue;
      }
      return false;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (isLoose) {
      if (!arraySome(other, function(othValue) {
            return arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
          })) {
        return false;
      }
    } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB))) {
      return false;
    }
  }
  return true;
}

module.exports = equalArrays;

},{"./arraySome":82}],107:[function(require,module,exports){
/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag) {
  switch (tag) {
    case boolTag:
    case dateTag:
      // Coerce dates and booleans to numbers, dates to milliseconds and booleans
      // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
      return +object == +other;

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case numberTag:
      // Treat `NaN` vs. `NaN` as equal.
      return (object != +object)
        ? other != +other
        : object == +other;

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings primitives and string
      // objects as equal. See https://es5.github.io/#x15.10.6.4 for more details.
      return object == (other + '');
  }
  return false;
}

module.exports = equalByTag;

},{}],108:[function(require,module,exports){
var keys = require('../object/keys');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing values.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var objProps = keys(object),
      objLength = objProps.length,
      othProps = keys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isLoose) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isLoose ? key in other : hasOwnProperty.call(other, key))) {
      return false;
    }
  }
  var skipCtor = isLoose;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key],
        result = customizer ? customizer(isLoose ? othValue : objValue, isLoose? objValue : othValue, key) : undefined;

    // Recursively compare objects (susceptible to call stack limits).
    if (!(result === undefined ? equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB) : result)) {
      return false;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (!skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      return false;
    }
  }
  return true;
}

module.exports = equalObjects;

},{"../object/keys":132}],109:[function(require,module,exports){
var baseProperty = require('./baseProperty');

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

module.exports = getLength;

},{"./baseProperty":98}],110:[function(require,module,exports){
var isStrictComparable = require('./isStrictComparable'),
    pairs = require('../object/pairs');

/**
 * Gets the propery names, values, and compare flags of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the match data of `object`.
 */
function getMatchData(object) {
  var result = pairs(object),
      length = result.length;

  while (length--) {
    result[length][2] = isStrictComparable(result[length][1]);
  }
  return result;
}

module.exports = getMatchData;

},{"../object/pairs":134,"./isStrictComparable":118}],111:[function(require,module,exports){
var isNative = require('../lang/isNative');

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

module.exports = getNative;

},{"../lang/isNative":126}],112:[function(require,module,exports){
var getLength = require('./getLength'),
    isLength = require('./isLength');

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

module.exports = isArrayLike;

},{"./getLength":109,"./isLength":116}],113:[function(require,module,exports){
/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

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

module.exports = isIndex;

},{}],114:[function(require,module,exports){
var isArrayLike = require('./isArrayLike'),
    isIndex = require('./isIndex'),
    isObject = require('../lang/isObject');

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

module.exports = isIterateeCall;

},{"../lang/isObject":127,"./isArrayLike":112,"./isIndex":113}],115:[function(require,module,exports){
var isArray = require('../lang/isArray'),
    toObject = require('./toObject');

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  var type = typeof value;
  if ((type == 'string' && reIsPlainProp.test(value)) || type == 'number') {
    return true;
  }
  if (isArray(value)) {
    return false;
  }
  var result = !reIsDeepProp.test(value);
  return result || (object != null && value in toObject(object));
}

module.exports = isKey;

},{"../lang/isArray":123,"./toObject":120}],116:[function(require,module,exports){
/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

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

module.exports = isLength;

},{}],117:[function(require,module,exports){
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

module.exports = isObjectLike;

},{}],118:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && !isObject(value);
}

module.exports = isStrictComparable;

},{"../lang/isObject":127}],119:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('./isIndex'),
    isLength = require('./isLength'),
    keysIn = require('../object/keysIn');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

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

module.exports = shimKeys;

},{"../lang/isArguments":122,"../lang/isArray":123,"../object/keysIn":133,"./isIndex":113,"./isLength":116}],120:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

module.exports = toObject;

},{"../lang/isObject":127}],121:[function(require,module,exports){
var baseToString = require('./baseToString'),
    isArray = require('../lang/isArray');

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `value` to property path array if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Array} Returns the property path array.
 */
function toPath(value) {
  if (isArray(value)) {
    return value;
  }
  var result = [];
  baseToString(value).replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
}

module.exports = toPath;

},{"../lang/isArray":123,"./baseToString":101}],122:[function(require,module,exports){
var isArrayLike = require('../internal/isArrayLike'),
    isObjectLike = require('../internal/isObjectLike');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

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

},{"../internal/isArrayLike":112,"../internal/isObjectLike":117}],123:[function(require,module,exports){
var getNative = require('../internal/getNative'),
    isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var arrayTag = '[object Array]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

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

module.exports = isArray;

},{"../internal/getNative":111,"../internal/isLength":116,"../internal/isObjectLike":117}],124:[function(require,module,exports){
var isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isArrayLike = require('../internal/isArrayLike'),
    isFunction = require('./isFunction'),
    isObjectLike = require('../internal/isObjectLike'),
    isString = require('./isString'),
    keys = require('../object/keys');

/**
 * Checks if `value` is empty. A value is considered empty unless it is an
 * `arguments` object, array, string, or jQuery-like collection with a length
 * greater than `0` or an object with own enumerable properties.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {Array|Object|string} value The value to inspect.
 * @returns {boolean} Returns `true` if `value` is empty, else `false`.
 * @example
 *
 * _.isEmpty(null);
 * // => true
 *
 * _.isEmpty(true);
 * // => true
 *
 * _.isEmpty(1);
 * // => true
 *
 * _.isEmpty([1, 2, 3]);
 * // => false
 *
 * _.isEmpty({ 'a': 1 });
 * // => false
 */
function isEmpty(value) {
  if (value == null) {
    return true;
  }
  if (isArrayLike(value) && (isArray(value) || isString(value) || isArguments(value) ||
      (isObjectLike(value) && isFunction(value.splice)))) {
    return !value.length;
  }
  return !keys(value).length;
}

module.exports = isEmpty;

},{"../internal/isArrayLike":112,"../internal/isObjectLike":117,"../object/keys":132,"./isArguments":122,"./isArray":123,"./isFunction":125,"./isString":128}],125:[function(require,module,exports){
var isObject = require('./isObject');

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

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

module.exports = isFunction;

},{"./isObject":127}],126:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isObjectLike = require('../internal/isObjectLike');

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

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

module.exports = isNative;

},{"../internal/isObjectLike":117,"./isFunction":125}],127:[function(require,module,exports){
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

module.exports = isObject;

},{}],128:[function(require,module,exports){
var isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var stringTag = '[object String]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
}

module.exports = isString;

},{"../internal/isObjectLike":117}],129:[function(require,module,exports){
var isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dateTag] = typedArrayTags[errorTag] =
typedArrayTags[funcTag] = typedArrayTags[mapTag] =
typedArrayTags[numberTag] = typedArrayTags[objectTag] =
typedArrayTags[regexpTag] = typedArrayTags[setTag] =
typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
function isTypedArray(value) {
  return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
}

module.exports = isTypedArray;

},{"../internal/isLength":116,"../internal/isObjectLike":117}],130:[function(require,module,exports){
var assignWith = require('../internal/assignWith'),
    baseAssign = require('../internal/baseAssign'),
    createAssigner = require('../internal/createAssigner');

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it is invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * **Note:** This method mutates `object` and is based on
 * [`Object.assign`](http://ecma-international.org/ecma-262/6.0/#sec-object.assign).
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

},{"../internal/assignWith":83,"../internal/baseAssign":84,"../internal/createAssigner":103}],131:[function(require,module,exports){
var baseAssign = require('../internal/baseAssign'),
    baseCreate = require('../internal/baseCreate'),
    isIterateeCall = require('../internal/isIterateeCall');

/**
 * Creates an object that inherits from the given `prototype` object. If a
 * `properties` object is provided its own enumerable properties are assigned
 * to the created object.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} prototype The object to inherit from.
 * @param {Object} [properties] The properties to assign to the object.
 * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
 * @returns {Object} Returns the new object.
 * @example
 *
 * function Shape() {
 *   this.x = 0;
 *   this.y = 0;
 * }
 *
 * function Circle() {
 *   Shape.call(this);
 * }
 *
 * Circle.prototype = _.create(Shape.prototype, {
 *   'constructor': Circle
 * });
 *
 * var circle = new Circle;
 * circle instanceof Circle;
 * // => true
 *
 * circle instanceof Shape;
 * // => true
 */
function create(prototype, properties, guard) {
  var result = baseCreate(prototype);
  if (guard && isIterateeCall(prototype, properties, guard)) {
    properties = undefined;
  }
  return properties ? baseAssign(result, properties) : result;
}

module.exports = create;

},{"../internal/baseAssign":84,"../internal/baseCreate":87,"../internal/isIterateeCall":114}],132:[function(require,module,exports){
var getNative = require('../internal/getNative'),
    isArrayLike = require('../internal/isArrayLike'),
    isObject = require('../lang/isObject'),
    shimKeys = require('../internal/shimKeys');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

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

module.exports = keys;

},{"../internal/getNative":111,"../internal/isArrayLike":112,"../internal/shimKeys":119,"../lang/isObject":127}],133:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('../internal/isIndex'),
    isLength = require('../internal/isLength'),
    isObject = require('../lang/isObject');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

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

module.exports = keysIn;

},{"../internal/isIndex":113,"../internal/isLength":116,"../lang/isArguments":122,"../lang/isArray":123,"../lang/isObject":127}],134:[function(require,module,exports){
var keys = require('./keys'),
    toObject = require('../internal/toObject');

/**
 * Creates a two dimensional array of the key-value pairs for `object`,
 * e.g. `[[key1, value1], [key2, value2]]`.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the new array of key-value pairs.
 * @example
 *
 * _.pairs({ 'barney': 36, 'fred': 40 });
 * // => [['barney', 36], ['fred', 40]] (iteration order is not guaranteed)
 */
function pairs(object) {
  object = toObject(object);

  var index = -1,
      props = keys(object),
      length = props.length,
      result = Array(length);

  while (++index < length) {
    var key = props[index];
    result[index] = [key, object[key]];
  }
  return result;
}

module.exports = pairs;

},{"../internal/toObject":120,"./keys":132}],135:[function(require,module,exports){
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

module.exports = identity;

},{}],136:[function(require,module,exports){
var baseProperty = require('../internal/baseProperty'),
    basePropertyDeep = require('../internal/basePropertyDeep'),
    isKey = require('../internal/isKey');

/**
 * Creates a function that returns the property value at `path` on a
 * given object.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': { 'c': 2 } } },
 *   { 'a': { 'b': { 'c': 1 } } }
 * ];
 *
 * _.map(objects, _.property('a.b.c'));
 * // => [2, 1]
 *
 * _.pluck(_.sortBy(objects, _.property(['a', 'b', 'c'])), 'a.b.c');
 * // => [1, 2]
 */
function property(path) {
  return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
}

module.exports = property;

},{"../internal/baseProperty":98,"../internal/basePropertyDeep":99,"../internal/isKey":115}],137:[function(require,module,exports){
(function (global){

var d3 = (typeof window !== "undefined" ? window['d3'] : typeof global !== "undefined" ? global['d3'] : null);

var gAxis = (function() {
  var _d3axis = d3.svg.axis()
      .orient('top')
      //.ticks(12)
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

},{}],138:[function(require,module,exports){

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
},{"../data/ideogram_9606_850.json":140}],139:[function(require,module,exports){
(function (global){

var d3         = (typeof window !== "undefined" ? window['d3'] : typeof global !== "undefined" ? global['d3'] : null)
  , assign     = require('lodash.assign');

var bAxis      = require('./browser-axis.js')
  , bBands     = require('./browser-bands.js')
  , genesTrack = require('../gene-track.js')

var browser = (function() {
  function _constructor(args) {
    var _this = this;
    var options = assign({
      //default options
      target : null,
      width : 1200,
      height : 250,
      gene: 'foxp2',
      specie : 'human',
      region : {
        segment: '7',
        start: '114386300',
        stop: '114593760'
      }
    }, args);

    var domTarget = options.target ? d3.select(options.target) : d3.selection()
      , yOffset = 25
      , svgTarget = null

      , xscale = d3.scale.linear()
        .domain([+options.region.start, +options.region.stop])
        .range([0, options.width])

      , svgTopAxis = bAxis()
        .height(options.height)
        .offset([0, yOffset])
        .scale(xscale)

      , zoomBehaviour = d3.behavior.zoom()
        .x(xscale)
        .scaleExtent([0.5, 50])

      , svgCytoBands = bBands(undefined, options.width)
        .scale(xscale)
        .offset([0, yOffset + 1])
        .segment(options.region.segment)

      , svgGenes = genesTrack(xscale)
        .locus(options.region.segment, options.region.start, options.region.stop);

    _this.render = function () {
      domTarget
        .style('width', options.width + 'px')
        .style('height', options.height + 'px')
        .style('border', '1px solid #BDBDBD');

      svgTarget = domTarget
        .append('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('class', 'genecluster-vis')
        .attr('width', options.width)
        .attr('height', options.height);

      svgTarget.call(zoomBehaviour);
      zoomBehaviour.on('zoom', _this.update);
      zoomBehaviour.on('zoomend', _this.updateend)

      svgTarget
        .append('g')
        .call(svgTopAxis);

      svgTarget.append('g')
        .call(svgCytoBands);

      svgTarget.append('g')
        .attr('transform', "translate(0," + (yOffset + 24) + ")")
        .call(svgGenes);
    };

    _this.update = function () {
      svgTopAxis.update();
      svgCytoBands.update();
      svgGenes.update();
    };

    _this.updateend = function() {
      svgGenes.updateend();
    }
  }

  return _constructor;
})();

module.exports = browser;



}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../gene-track.js":142,"./browser-axis.js":137,"./browser-bands.js":138,"lodash.assign":41}],140:[function(require,module,exports){
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
},{}],141:[function(require,module,exports){

var GeneManager = (function() {

  var _constructor = function() {
    this.db = [];
  };

  _constructor.prototype.findFreeTrack = function(uid, start, stop) {
    var trackNo = 0;
    var collide;
    for (var i = 0; i < this.db.length; i++) {
      collide = false;
      for (var j = 0; j < this.db[i].length; j++) {
        var gene = this.db[i][j];

        if (gene.uid === uid) {
          return trackNo;
        }

        if (gene.stop >= start && gene.start <= stop) {
          trackNo++;
          collide = true;
          break;
        }
      }
      if(!collide) {
        return trackNo;
      }
    }
    return trackNo;
  };

// Register a gene location
// Return its available track to display
  _constructor.prototype.register = function (gene) {

    if (gene.stop < gene.start) {
      gene.stop = [gene.start, gene.start = gene.stop][0];
    }

    var trackNo = this.findFreeTrack(gene.uid, gene.start, gene.stop);

    if (typeof this.db[trackNo] === 'undefined') {
      this.db[trackNo] = [];
    }
    this.db[trackNo].push(gene);

    return trackNo;
  };

  return _constructor;
})();

module.exports = GeneManager;

},{}],142:[function(require,module,exports){
(function (global){

var d3 = (typeof window !== "undefined" ? window['d3'] : typeof global !== "undefined" ? global['d3'] : null);
var eutils = require('ncbi-eutils');
var GeneManager = require('./gene-manager.js');

var genetrack = function(xscale) {

  var _specie = 'human'
    , _chr = '1'
    , _start = '1'
    , _stop  = '100000'
    , _bufferedStart = _start
    , _bufferedStop = _stop
    , _geneSummaryManager = new GeneManager()
    , _selection;

  var genesGroup;
  var outGenes;

  var _gt = function(selection) {

    if (selection !== undefined) {
      _selection = selection;

      drawGeneSummariesAt(_start, _stop);
    }

    return _gt;
  };

  function encodeGeneShape(upstream, x, y, width, height) {
    var h = (width - (height/2)) > 0 ? (width - (height/2)) : 0;
    var lx = (width >= height/2) ? height / 2 : width;

    if (upstream) {
      return "M" + x + " " + y +
        " l" + lx + " -" + (height/2) +
        " h" +  h +
        " v" + (height) +
        " h-" + h + " z";
    } else {
      return "M" + (x + width) + " " + y +
        " l-" + lx + " -" + (height/2) +
        " h-" + h +
        " v" + height +
        " h" + h + " z";
    }
  }

  function drawGeneSummariesAt(start, stop) {
    var q = _chr + "[CHR] AND " + start + "[CPOS]:" + stop + "[CPOS] AND " + _specie + "[ORGN]";
    return eutils.esearch({db:'gene', term: q})
      .then(eutils.esummary)
      .then(function(data) {

        if ((typeof data.eSummaryResult.ERROR !== 'undefined')) {
          return
        }

        data = data.eSummaryResult.DocumentSummarySet.DocumentSummary;
console.log(data)
        if (data.constructor === Array) {
          for (var i = 0; i < data.length; i++) {
            var trackNum = _geneSummaryManager
              .register({
                uid: data[i].$.uid,
                start: +data[i].GenomicInfo.GenomicInfoType.ChrStart,
                stop: +data[i].GenomicInfo.GenomicInfoType.ChrStop
              });

            data[i].track = trackNum;
          }

          genesGroup = _selection.selectAll('.gene')
            .data(data, function(d) { return d.$.uid });

          var genesEnter = genesGroup.enter()
            .append('g')
            .attr('class', 'gene');

          genesEnter.append('path')
            //.attr('y', function(d) {
            //  return (20 * d.track) + 20;
            //})
            //.attr('height', 10)

          genesEnter.append('text')
            .attr('y', function(d) { return (40 * d.track) + 20;})
            .text(function(d){ return d.Name; })

          genesEnter.append('title')
            .text(function(d) {return d.Name; })

          outGenes = genesGroup.exit();

          _gt.update();

        } else {
          //single element

        }
      })
      .catch(function(reason) {
        console.log(reason);
        throw new Error('genecluster-vis Data retrieval Error');
      });
  }

  function applyUpdate() {
    //this.select('rect')
    //  .attr('x', function (d) {
    //    return xscale(+d.ChrStart);
    //  }).attr('width', function (d) {
    //    var ginfo = d.GenomicInfo.GenomicInfoType;
    //
    //    var w = 0;
    //    if (ginfo.ChrStart > ginfo.ChrStop) {
    //      w = xscale(+ginfo.ChrStart) - xscale(+ginfo.ChrStop);
    //    } else {
    //      w = xscale(+ginfo.ChrStop) - xscale(+ginfo.ChrStart);
    //    }
    //
    //    return (w && w >=0) ? w : 0;
    //  })

    this.select('path')
      .attr('d', function(d) {

        var ginfo = d.GenomicInfo.GenomicInfoType;

        var width = 0;
        if (ginfo.ChrStart > ginfo.ChrStop) {
          width = xscale(+ginfo.ChrStart) - xscale(+ginfo.ChrStop);
        } else {
          width = xscale(+ginfo.ChrStop) - xscale(+ginfo.ChrStart);
        }
        var x = xscale(+d.ChrStart);
        var y = (40 * d.track) + 30;
        var isUpStream = (ginfo.ChrStart < ginfo.ChrStop) ? true : false;

        return encodeGeneShape(isUpStream, x, y, width, 15);
      })

    this.select('text')
      .attr('x', function(d) { return xscale(+d.ChrStart);})
  }

  _gt.update = function() {

    applyUpdate.call(genesGroup)
  }

  _gt.updateend = function() {
    applyUpdate.call(outGenes);
    var ext = xscale.domain();

    //dont make request on old areas or zooming in
    if (ext[0] < _bufferedStart || ext[1] > _bufferedStop) {
      var start = ext[0] < _bufferedStart ? ext[0] : _bufferedStart;
      var stop = ext[1] > _bufferedStop ? ext[1] : _bufferedStop;

      _bufferedStart = start;
      _bufferedStop = stop;

      drawGeneSummariesAt(start, stop);
    }
  };

  _gt.locus = function(newChr, newStart, newStop) {
    _chr = newChr;
    _bufferedStart = _start = newStart;
    _bufferedStop = _stop = newStop;
    return _gt;
  };

  _gt.specie = function(arg) {
    if (arg) {
      _specie = arg;
      return _gt;
    } else {
      return _gt;
    }
  };

  return _gt;
};

module.exports = genetrack;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./gene-manager.js":141,"ncbi-eutils":54}],"genecluster-vis":[function(require,module,exports){
(function (global){


var d3 = (typeof window !== "undefined" ? window['d3'] : typeof global !== "undefined" ? global['d3'] : null);
var browser = require('./core/browser.js');

var geneclusterAPI = browser;

geneclusterAPI.version = '0.0.1';

module.exports = geneclusterAPI;

//var parseString = require('xml2js').parseString;
//
//  d3.xhr('http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=1[chr]+AND+1[CHRPOS]:100000[CHRPOS]+AND+human[ORGAN]'
//    , function(e,d) {
//      console.log(d);
//    parseString(d.response, function (err, result) {
//      console.log(result);
//    });
//  })

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./core/browser.js":139}]},{},["genecluster-vis"])


//# sourceMappingURL=genecluster-vis.js.map