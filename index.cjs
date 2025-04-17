"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    BITGESELL_MAINNET: function() {
        return _bitgesellnetworks.BITGESELL_MAINNET;
    },
    Psbt: function() {
        return _bitcoinjslib.Psbt;
    }
});
var _bitcoinjslib = require("bitcoinjs-lib");
var _bitgesellnetworks = require("bitgesell-networks");
var _psbtutils = require("bitcoinjs-lib/src/psbt/psbtutils.js");
var _jssha3 = /*#__PURE__*/ _interop_require_default(require("js-sha3"));
var _varuintbitcoin = require("varuint-bitcoin");
function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
var keccak256 = _jssha3.default.keccak256;
var toLE8 = function(v) {
    var buf = Buffer.alloc(8);
    buf.writeUInt32LE(v >>> 0, 0);
    return buf;
};
var getPreimage = function(param) {
    var version = param.version, vIn = param.vIn, vOut = param.vOut, locktime = param.locktime, inputIdx = param.inputIdx, scriptCode = param.scriptCode, value = param.value, sighashType = param.sighashType;
    var versionBuf = Buffer.alloc(4);
    versionBuf.writeUInt32LE(version, 0);
    var prevouts = Buffer.concat(vIn.map(function(input) {
        var hash = Buffer.from(input.txid, 'hex').reverse();
        var voutBuf = Buffer.alloc(4);
        voutBuf.writeUInt32LE(input.vout, 0);
        return Buffer.concat([
            hash,
            voutBuf
        ]);
    }));
    var sequence = Buffer.concat(vIn.map(function(input) {
        var seqBuf = Buffer.alloc(4);
        seqBuf.writeUInt32LE(input.sequence, 0);
        return seqBuf;
    }));
    var input = vIn[inputIdx];
    var outpoint = Buffer.concat([
        Buffer.from(input.txid, 'hex').reverse(),
        function() {
            var b = Buffer.alloc(4);
            b.writeUInt32LE(input.vout, 0);
            return b;
        }()
    ]);
    var scriptCodeLen = Buffer.from([
        scriptCode.length
    ]);
    var valBuf = toLE8(value);
    var seqBuf = Buffer.alloc(4);
    seqBuf.writeUInt32LE(input.sequence, 0);
    var outputs = Buffer.concat(vOut.map(function(out) {
        var script = out.script;
        return Buffer.concat([
            toLE8(out.value),
            Buffer.from((0, _varuintbitcoin.encode)(script.length).buffer),
            script
        ]);
    }));
    var locktimeBuf = Buffer.alloc(4);
    var sighashTypeBuf = Buffer.alloc(4);
    sighashTypeBuf.writeUInt32LE(sighashType, 0);
    return Buffer.concat([
        versionBuf,
        Buffer.from(keccak256.arrayBuffer(prevouts)),
        Buffer.from(keccak256.arrayBuffer(sequence)),
        outpoint,
        scriptCodeLen,
        scriptCode,
        valBuf,
        seqBuf,
        Buffer.from(keccak256.arrayBuffer(outputs)),
        locktimeBuf,
        sighashTypeBuf
    ]);
};
var patchPsbt = function() {
    if (_bitcoinjslib.Psbt.prototype.__psbtPatched) return;
    _bitcoinjslib.Psbt.prototype.signInput = function patchPsbt(inputIdx, keyPair) {
        var _this = this;
        for(var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++){
            args[_key - 2] = arguments[_key];
        }
        var input = this.data.inputs[inputIdx];
        var pubkeyBuf = Buffer.from(keyPair.publicKey);
        var sighashType = 0x01;
        var tx = this.__CACHE.__TX;
        var vIn = tx.ins.map(function(inp, idx) {
            return {
                txid: Buffer.from(inp.hash).reverse().toString('hex'),
                vout: inp.index,
                sequence: inp.sequence,
                value: _this.data.inputs[idx].witnessUtxo.value
            };
        });
        var vOut = tx.outs.map(function(out) {
            return {
                value: out.value,
                script: out.script
            };
        });
        var preimage = getPreimage({
            version: tx.version,
            vIn: vIn,
            vOut: vOut,
            locktime: tx.locktime,
            inputIdx: inputIdx,
            scriptCode: _bitcoinjslib.payments.p2pkh({
                pubkey: pubkeyBuf,
                network: _bitgesellnetworks.BITGESELL_MAINNET
            }).output,
            value: vIn[inputIdx].value,
            sighashType: sighashType
        });
        var sighash = Buffer.from(keccak256.arrayBuffer(preimage));
        var sigDER = _bitcoinjslib.script.signature.encode(Buffer.from(keyPair.sign(sighash)), sighashType);
        input.partialSig = [
            {
                signature: sigDER,
                pubkey: pubkeyBuf
            }
        ];
        input.__bglSigDER = sigDER;
        input.__bglPubkey = pubkeyBuf;
        return this;
    };
    var origFinalizeInput = _bitcoinjslib.Psbt.prototype.finalizeInput;
    _bitcoinjslib.Psbt.prototype.finalizeInput = function(inputIndex) {
        for(var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++){
            args[_key - 1] = arguments[_key];
        }
        var _origFinalizeInput;
        var input = this.data.inputs[inputIndex];
        if (input.__bglSigDER && input.__bglPubkey) {
            input.finalScriptWitness = (0, _psbtutils.witnessStackToScriptWitness)([
                input.__bglSigDER,
                input.__bglPubkey
            ]);
            return this;
        }
        return (_origFinalizeInput = origFinalizeInput).call.apply(_origFinalizeInput, [
            this,
            inputIndex
        ].concat(_to_consumable_array(args)));
    };
    _bitcoinjslib.Psbt.prototype.__psbtPatched = true;
};
patchPsbt();

