import { Psbt, payments, script } from 'bitcoinjs-lib';
import { witnessStackToScriptWitness } from 'bitcoinjs-lib/src/psbt/psbtutils.js';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { encode as varuintEncode } from 'varuint-bitcoin';
import { BITGESELL_MAINNET } from 'bitgesell-networks';

const toLE = (number, size = 4) => {
	const buf = Buffer.alloc(size);

	buf.writeUInt32LE(number, 0);

	return buf;
};

const getPreimage = ({ version, vIn, vOut, locktime, inputIdx, scriptCode, value, sighashType }) => {
	const versionBuf = toLE(version);
	const prevouts = Buffer.concat(vIn.map(({ txid, vout }) => {
		const hash = Buffer.from(txid, 'hex').reverse();

		return Buffer.concat([ hash, toLE(vout) ]);
	}));
	const sequence = Buffer.concat(vIn.map(({ sequence }) => toLE(sequence)));
	const input = vIn[inputIdx];
	const outpoint = Buffer.concat([
		Buffer.from(input.txid, 'hex').reverse(),
		toLE(input.vout),
	]);
	const scriptCodeLen = Buffer.from([ scriptCode.length ]);
	const valBuf = toLE(value, 8);
	const seqBuf = toLE(input.sequence);
	const outputs = Buffer.concat(vOut.map(({ value, script }) => Buffer.concat([
		toLE(value, 8),
		Buffer.from(varuintEncode(script.length).buffer),
		script,
	])));
	const locktimeBuf = toLE(locktime, 4);
	const sighashTypeBuf = toLE(sighashType, 4);

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

	Psbt.prototype.finalizeInput = function(inputIndex, ...args) {
		const input = this.data.inputs[inputIndex];

		input.finalScriptWitness = witnessStackToScriptWitness([ input.__bglSigDER, input.__bglPubkey ]);

		return this;
	};

	Psbt.prototype.__psbtPatched = true;
};

patchPsbt();

export {
	Psbt,
	BITGESELL_MAINNET,
};
