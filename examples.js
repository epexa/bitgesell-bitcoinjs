import { BITGESELL_MAINNET } from 'bitgesell-networks';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { randomBytes } from 'crypto';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';


const ECPair = ECPairFactory(ecc);


/* START CREATE A RANDOM WALLET */
const rng = (size) => randomBytes(size);
const keyPair = ECPair.makeRandom({ network: BITGESELL_MAINNET, rng });
const { address } = bitcoin.payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(keyPair.publicKey),
});
console.info('public address:', address);
/* END CREATE A RANDOM WALLET */


/* START IMPORT WALLET FROM WIF */
const keyPair2 = ECPair.fromWIF('Kyqq5GUTS5sA2hPUkugXHduVMLtWzYAW43W8yKSkc54mETNLBCFy', BITGESELL_MAINNET);
const addressFromWif = bitcoin.payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(keyPair2.publicKey),
});
console.info('public address from wif:', addressFromWif.address); // bgl1qmh64y99mwmr0jtqpk78h06aa2ne2zr7v22nsq6
/* START IMPORT WALLET FROM WIF */


/* START CREATE WALLET FROM SEED PHRASE */
const mnemonic = bip39.generateMnemonic(256);
console.info('seed:', mnemonic);
const seed = bip39.mnemonicToSeedSync(mnemonic);
const bip32 = BIP32Factory(ecc);
const root = bip32.fromSeed(seed, BITGESELL_MAINNET);
const path = 'm/84\'/0\'/0\'/0/0';
const child = root.derivePath(path);
const addressFromSeed = bitcoin.payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(child.publicKey),
});
console.info('public address from seed:', addressFromSeed.address); // bgl1q...
/* START CREATE WALLET FROM SEED PHRASE */


/* START VALIDATE ADDRESS */
const isValidAddress = (address) => {
	try {
		bitcoin.address.toOutputScript(address, BITGESELL_MAINNET);
		return true;
	} catch (_) {
		return false;
	}
}

isValidAddress(addressFromSeed.address) ? console.info('valid address') : console.info('invalid address');
/* END VALIDATE ADDRESS */


/* START SIGN A P2WPKH TRANSACTION */
const wrapKeyForPsbt = (ecpair) => ({ publicKey: Buffer.from(ecpair.publicKey), sign: (hash) => Buffer.from(ecpair.sign(hash)) });
const psbt = new bitcoin.Psbt({ network: BITGESELL_MAINNET });
psbt.addInput({
	hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // REAL_TXID_HERE
	index: 0,
	witnessUtxo: {
		script: addressFromWif.output,
		value: 50_000,
	},
});
psbt.addOutput({
	address: 'bgl1qmh64y99mwmr0jtqpk78h06aa2ne2zr7v22nsq6',
	value: 49_000,
});
psbt.signInput(0, wrapKeyForPsbt(keyPair2));
psbt.finalizeAllInputs();
const txHex = psbt.extractTransaction().toHex();
console.info('signed transaction hex:', txHex); // 02000000000101aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0000000000ffffffff0168bf000000000000160014ddf55214bb76c6f92c01b78f77ebbd54f2a10fcc0248304502210089f104e6dfd9f647e283bff9b82d30836cfbc42b8fecd3418897cdff63dd60b20220226bc5dd656cb2dd0b717502e5fd561b6c48e74d0d5e9075c8fd18a18092a9e20121039aab415f97bf3a6bf3023b3e165e8b176712023a7e990753d8f50268b148f53b00000000
/* END SIGN A P2WPKH TRANSACTION */
