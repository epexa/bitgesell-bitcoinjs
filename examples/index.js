// import { BITGESELL_MAINNET } from 'bitgesell-bitcoinjs';
import { BITGESELL_MAINNET } from './../index.js';
import { payments as Payments, address as Address, Psbt } from 'bitcoinjs-lib'; // eslint-disable-line n/no-extraneous-import
import ECPairFactory from 'ecpair';
import ecc from '@bitcoinerlab/secp256k1';
import { randomBytes } from 'crypto';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';

const ECPair = ECPairFactory(ecc);

/* START CREATE A RANDOM WALLET */
const rng = (size) => randomBytes(size);
const keyPair = ECPair.makeRandom({ network: BITGESELL_MAINNET, rng });
const paymentsRandom = Payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(keyPair.publicKey),
});
console.info('public address:', paymentsRandom.address);
/* END CREATE A RANDOM WALLET */

/* START IMPORT WALLET FROM WIF */
const keyPair2 = ECPair.fromWIF('L2ScZnHCser7xN1FsJtc4eR1icDtmwJfqgK3q2XUwb3nmbMEDYkw', BITGESELL_MAINNET);
const paymentFromWif = Payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(keyPair2.publicKey),
});
console.info('public address from wif:', paymentFromWif.address); // bgl1q8j64v07nhzgs4rwyrv664zd4vx70xk7fe25npf
/* START IMPORT WALLET FROM WIF */

/* START CREATE WALLET FROM SEED PHRASE */
const mnemonic = bip39.generateMnemonic(256);
console.info('seed:', mnemonic);
const seed = bip39.mnemonicToSeedSync(mnemonic);
const bip32 = BIP32Factory(ecc);
const root = bip32.fromSeed(seed, BITGESELL_MAINNET);
const path = 'm/84\'/0\'/0\'/0/0';
const child = root.derivePath(path);
const paymentsFromSeed = Payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(child.publicKey),
});
console.info('public address from seed:', paymentsFromSeed.address); // bgl1q...
/* START CREATE WALLET FROM SEED PHRASE */

/* START VALIDATE ADDRESS */
const isValidAddress = (address) => {
	try {
		Address.toOutputScript(address, BITGESELL_MAINNET);
		return true;
	}
	catch {
		return false;
	}
};

isValidAddress(paymentsFromSeed.address) ? console.info('valid address') : console.info('invalid address');
/* END VALIDATE ADDRESS */

/* START SIGN A P2WPKH TRANSACTION */
const psbt = new Psbt({ network: BITGESELL_MAINNET });
const utxoValue = 100000000;
psbt.addInput({
	hash: '3d2e4113a0a2bb94aed0eef1e7a21a8d6dbda399b048330cb55853befe82a8ed',
	index: 0,
	witnessUtxo: {
		script: paymentFromWif.output,
		value: utxoValue,
	},
});
psbt.addOutput({
	address: 'bgl1q8j64v07nhzgs4rwyrv664zd4vx70xk7fe25npf',
	value: utxoValue - 10000,
});
psbt.signInput(0, keyPair2);
psbt.finalizeAllInputs();
const rawTx = psbt.extractTransaction().toHex();
console.info('signed transaction hex:', rawTx); // 02000000000101eda882febe5358b50c3348b099a3bd6d8d1aa2e7f1eed0ae94bba2a013412e3d0000000000ffffffff01f0b9f505000000001600143cb5563fd3b8910a8dc41b35aa89b561bcf35bc90247304402206234c5da64fa641b4ebbb41b770fbc8241080d02ff44f8d22d1464f3106faf3902206c62c894e7ecd4cbbf6d0948a386a6a5cdf041a478389d2b0b88876036088ab70121027547ee264c57d4caa64084fe7f472158ce6ff3d893f04fcc492fa14674f22ee300000000
/* END SIGN A P2WPKH TRANSACTION */

