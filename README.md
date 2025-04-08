<img src="./logo.png" alt="Bitgesell + BitcoinJS" />

# Bitgesell + BitcoinJS

### This repository demonstrates how to use BitcoinJS libraries with the Bitgesell network.

## 📦 Requirements
- Node.js >= 14
- [bitgesell-networks](https://github.com/epexa/bitgesell-networks)
- [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib)
- [ecpair](https://github.com/bitcoinjs/ecpair)
- [tiny-secp256k1](https://github.com/bitcoinjs/tiny-secp256k1)
- [bip32](https://github.com/bitcoinjs/bip32)
- [bip39](https://github.com/bitcoinjs/bip39)

Install dependencies:
```bash
npm install bitgesell-networks bitcoinjs-lib ecpair tiny-secp256k1 bip32 bip39
```

### IMPORTANT! No need to fork or modify the source code of bitcoinjs-lib, just import the Bitgesell Mainnet network configuration from the [bitgesell-networks](https://www.npmjs.com/package/bitgesell-networks) package and pass it as the `network` parameter wherever required!

[![npm](https://img.shields.io/npm/v/bitgesell-networks)](https://www.npmjs.com/package/bitgesell-networks)

## ⚙️ Initial Bitgesell Mainnet Network Configuration
```js
import { BITGESELL_MAINNET } from 'bitgesell-networks';
```

## 🔧 Examples list:
- Generate random wallet
- Import wallet from WIF
- Generate wallet from mnemonic (BIP39 + BIP84)
- Validate address
- Sign a SegWit transaction (P2WPKH)

## 🚀 Usage

### !!! ALL EXAMPLES ARE IN "[examples.js](examples.js)" FILE !!!

To run examples:
```bash
node examples.js
```

## 📄 Examples

#### 1. Create a random wallet
```js
const ECPair = ECPairFactory(ecc);
const rng = (size) => randomBytes(size);
const keyPair = ECPair.makeRandom({ network: BITGESELL_MAINNET, rng });
const { address } = bitcoin.payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(keyPair.publicKey),
});
console.info('public address:', address);
```

#### 2. Import from WIF
```js
const ECPair = ECPairFactory(ecc);
const keyPair2 = ECPair.fromWIF('Kyqq5GUTS5sA2hPUkugXHduVMLtWzYAW43W8yKSkc54mETNLBCFy', BITGESELL_MAINNET);
const addressFromWif = bitcoin.payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(keyPair2.publicKey),
});
console.info('public address from wif:', addressFromWif.address);
```

#### 3. Generate from mnemonic
```js
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
console.info('public address from seed:', addressFromSeed.address);
```

#### 4. Validate address
```js
const isValidAddress = (address) => {
	try {
		bitcoin.address.toOutputScript(address, BITGESELL_MAINNET);
		return true;
	} catch (_) {
		return false;
	}
}

isValidAddress(addressFromSeed.address) ? console.info('valid address') : console.info('invalid address');
```

#### 5. Sign a transaction
```js
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
console.info('signed transaction hex:', txHex);
```

## 🙌 Contributions are welcome!

## 📄 License [MIT](LICENSE)
