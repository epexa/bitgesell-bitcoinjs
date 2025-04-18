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
var _psbtutils = require("bitcoinjs-lib/src/psbt/psbtutils.js");
var _sha3 = require("@noble/hashes/sha3");
var _varuintbitcoin = require("varuint-bitcoin");
var _bitgesellnetworks = require("bitgesell-networks");
var toLE = function(number) {
    var size = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 4;
    var buf = Buffer.alloc(size);
    buf.writeUInt32LE(number, 0);
    return buf;
};
var getPreimage = function(param) {
    var version = param.version, vIn = param.vIn, vOut = param.vOut, locktime = param.locktime, inputIdx = param.inputIdx, scriptCode = param.scriptCode, value = param.value, sighashType = param.sighashType;
    var versionBuf = toLE(version);
    var prevouts = Buffer.concat(vIn.map(function(param) {
        var txid = param.txid, vout = param.vout;
        var hash = Buffer.from(txid, 'hex').reverse();
        return Buffer.concat([
            hash,
            toLE(vout)
        ]);
    }));
    var sequence = Buffer.concat(vIn.map(function(param) {
        var sequence = param.sequence;
        return toLE(sequence);
    }));
    var input = vIn[inputIdx];
    var outpoint = Buffer.concat([
        Buffer.from(input.txid, 'hex').reverse(),
        toLE(input.vout)
    ]);
    var scriptCodeLen = Buffer.from([
        scriptCode.length
    ]);
    var valBuf = toLE(value, 8);
    var seqBuf = toLE(input.sequence);
    var outputs = Buffer.concat(vOut.map(function(param) {
        var value = param.value, script = param.script;
        return Buffer.concat([
            toLE(value, 8),
            Buffer.from((0, _varuintbitcoin.encode)(script.length).buffer),
            script
        ]);
    }));
    var locktimeBuf = toLE(locktime, 4);
    var sighashTypeBuf = toLE(sighashType, 4);
    return Buffer.concat([
        versionBuf,
        Buffer.from((0, _sha3.keccak_256)(prevouts)),
        Buffer.from((0, _sha3.keccak_256)(sequence)),
        outpoint,
        scriptCodeLen,
        scriptCode,
        valBuf,
        seqBuf,
        Buffer.from((0, _sha3.keccak_256)(outputs)),
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
                pubkey: pubkeyBuf
            }).output,
            value: vIn[inputIdx].value,
            sighashType: sighashType
        });
        var sighash = Buffer.from((0, _sha3.keccak_256)(preimage));
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
    _bitcoinjslib.Psbt.prototype.finalizeInput = function(inputIndex) {
        for(var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++){
            args[_key - 1] = arguments[_key];
        }
        var input = this.data.inputs[inputIndex];
        input.finalScriptWitness = (0, _psbtutils.witnessStackToScriptWitness)([
            input.__bglSigDER,
            input.__bglPubkey
        ]);
        return this;
    };
    _bitcoinjslib.Psbt.prototype.__psbtPatched = true;
};
patchPsbt();

