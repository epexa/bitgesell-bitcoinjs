import { Psbt, payments, script } from 'bitcoinjs-lib';
import { witnessStackToScriptWitness } from 'bitcoinjs-lib/src/psbt/psbtutils.js';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { encode as varuintEncode } from 'varuint-bitcoin';
import { BITGESELL_MAINNET } from 'bitgesell-networks';

const toLE8 = (v) => {
	const buf = Buffer.alloc(8);
	buf.writeUInt32LE(v >>> 0, 0);
	return buf;
};

const getPreimage = ({ version, vIn, vOut, locktime, inputIdx, scriptCode, value, sighashType }) => {
	const versionBuf = Buffer.alloc(4);
	versionBuf.writeUInt32LE(version, 0);
	const prevouts = Buffer.concat(vIn.map((input) => {
		const hash = Buffer.from(input.txid, 'hex').reverse();
		const voutBuf = Buffer.alloc(4);
		voutBuf.writeUInt32LE(input.vout, 0);
		return Buffer.concat([ hash, voutBuf ]);
	}));
	const sequence = Buffer.concat(vIn.map((input) => {
		const seqBuf = Buffer.alloc(4);
		seqBuf.writeUInt32LE(input.sequence, 0);
		return seqBuf;
	}));
	const input = vIn[inputIdx];
	const outpoint = Buffer.concat([
		Buffer.from(input.txid, 'hex').reverse(),
		(() => { const b = Buffer.alloc(4); b.writeUInt32LE(input.vout, 0); return b; })(),
	]);
	const scriptCodeLen = Buffer.from([ scriptCode.length ]);
	const valBuf = toLE8(value);
	const seqBuf = Buffer.alloc(4);
	seqBuf.writeUInt32LE(input.sequence, 0);
	const outputs = Buffer.concat(vOut.map((out) => {
		const script = out.script;
		return Buffer.concat([
			toLE8(out.value),
			Buffer.from(varuintEncode(script.length).buffer),
			script,
		]);
	}));
	const locktimeBuf = Buffer.alloc(4);
	const sighashTypeBuf = Buffer.alloc(4);
	sighashTypeBuf.writeUInt32LE(sighashType, 0);

	return Buffer.concat([
		versionBuf,
		Buffer.from(keccak256(prevouts)),
		Buffer.from(keccak256(sequence)),
		outpoint,
		scriptCodeLen,
		scriptCode,
		valBuf,
		seqBuf,
		Buffer.from(keccak256(outputs)),
		locktimeBuf,
		sighashTypeBuf,
	]);
};

const patchPsbt = () => {
	if (Psbt.prototype.__psbtPatched) return;

	Psbt.prototype.signInput = function(inputIdx, keyPair, ...args) {
		const input = this.data.inputs[inputIdx];
		const pubkeyBuf = Buffer.from(keyPair.publicKey);
		const sighashType = 0x01;
		const tx = this.__CACHE.__TX;
		const vIn = tx.ins.map((inp, idx) => ({
			txid: Buffer.from(inp.hash).reverse().toString('hex'),
			vout: inp.index,
			sequence: inp.sequence,
			value: this.data.inputs[idx].witnessUtxo.value,
		}));
		const vOut = tx.outs.map((out) => ({
			value: out.value,
			script: out.script,
		}));
		const preimage = getPreimage({
			version: tx.version,
			vIn,
			vOut,
			locktime: tx.locktime,
			inputIdx,
			scriptCode: payments.p2pkh({ pubkey: pubkeyBuf }).output,
			value: vIn[inputIdx].value,
			sighashType,
		});
		const sighash = Buffer.from(keccak256(preimage));
		const sigDER = script.signature.encode(Buffer.from(keyPair.sign(sighash)), sighashType);
		input.partialSig = [ { signature: sigDER, pubkey: pubkeyBuf } ];
		input.__bglSigDER = sigDER;
		input.__bglPubkey = pubkeyBuf;
		return this;
	};

	const origFinalizeInput = Psbt.prototype.finalizeInput;
	Psbt.prototype.finalizeInput = function(inputIndex, ...args) {
		const input = this.data.inputs[inputIndex];
		if (input.__bglSigDER && input.__bglPubkey) {
			input.finalScriptWitness = witnessStackToScriptWitness([ input.__bglSigDER, input.__bglPubkey ]);
			return this;
		}
		return origFinalizeInput.call(this, inputIndex, ...args);
	};

	Psbt.prototype.__psbtPatched = true;
};

patchPsbt();

export {
	Psbt,
	BITGESELL_MAINNET,
};
