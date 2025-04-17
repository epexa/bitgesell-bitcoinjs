<img src="./logo.png" alt="Bitgesell + BitcoinJS" />

# Bitgesell + BitcoinJS

[![npm](https://img.shields.io/npm/v/bitgesell-bitcoinjs?style=for-the-badge)](https://www.npmjs.com/package/bitgesell-bitcoinjs) [![examples](https://img.shields.io/badge/examples-100%25-brightgreen?style=for-the-badge)](#-examples)

### This repository provides [Bitgesell blockchain](https://bitgesell.ca) support for the BitcoinJS library.

#### No need to fork or modify `bitcoinjs-lib` — just install and use this [bitgesell-bitcoinjs](https://www.npmjs.com/package/bitgesell-bitcoinjs) package!

## 📦 Requirements
- Node.js >= 14
- [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib) `6.х` version
- [ecpair](https://github.com/bitcoinjs/ecpair)
- [bip32](https://github.com/bitcoinjs/bip32)
- [bip39](https://github.com/bitcoinjs/bip39)
- [@bitcoinerlab/secp256k1](https://github.com/bitcoinerlab/secp256k1)

Install dependencies:
```bash
npm install bitgesell-bitcoinjs bitcoinjs-lib@^6 ecpair bip32 bip39 @bitcoinerlab/secp256k1
```

### IMPORTANT! Always import the Bitgesell Mainnet network configuration from this [bitgesell-bitcoinjs](https://www.npmjs.com/package/bitgesell-bitcoinjs) package and pass it as the network parameter where required.

## ⚙️ Initial Bitgesell BitcoinJS and pass it Bitgesell Mainnet Network Configuration
```js
import { BITGESELL_MAINNET } from 'bitgesell-bitcoinjs';
```

## 🔧 Examples list:
- Generate random wallet
- Import wallet from WIF
- Generate wallet from mnemonic (BIP39 + BIP84)
- Validate address
- Sign a SegWit transaction (P2WPKH)

## 🚀 Usage

### !!! ALL EXAMPLES ARE IN "[examples](examples)" DIRECTORY !!!

To run examples:
```bash
npm ci
node examples
```

## 📄 Examples

#### 0. Import necessary libraries:
```js
import { BITGESELL_MAINNET } from 'bitgesell-bitcoinjs';
import { payments as Payments, address as Address, Psbt } from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import ecc from '@bitcoinerlab/secp256k1';
import { randomBytes } from 'crypto';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';
```

#### 1. Create a random wallet
```js
const ECPair = ECPairFactory(ecc);
const rng = (size) => randomBytes(size);
const keyPair = ECPair.makeRandom({ network: BITGESELL_MAINNET, rng });
const paymentsRandom = Payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(keyPair.publicKey),
});
console.info('public address:', paymentsRandom.address);
```

#### 2. Import from WIF
```js
const ECPair = ECPairFactory(ecc);
const keyPair2 = ECPair.fromWIF('L2ScZnHCser7xN1FsJtc4eR1icDtmwJfqgK3q2XUwb3nmbMEDYkw', BITGESELL_MAINNET);
const paymentFromWif = Payments.p2wpkh({
	network: BITGESELL_MAINNET,
	pubkey: Buffer.from(keyPair2.publicKey),
});
console.info('public address from wif:', paymentFromWif.address);
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
const paymentsFromSeed = Payments.p2wpkh({
    network: BITGESELL_MAINNET,
    pubkey: Buffer.from(child.publicKey),
});
console.info('public address from seed:', paymentsFromSeed.address);
```

#### 4. Validate address
```js
const isValidAddress = (address) => {
	try {
		Address.toOutputScript(address, BITGESELL_MAINNET);
		return true;
	} catch (_) {
		return false;
	}
}

isValidAddress(paymentsFromSeed.address) ? console.info('valid address') : console.info('invalid address');
```

#### 5. Sign a transaction
```js
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
console.info('signed transaction hex:', rawTx);
```

## 🙌 Contributions are welcome!

## 📄 License [MIT](LICENSE)
