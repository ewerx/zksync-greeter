# zkSync Quickstart Tutorial - Frontend

This is a simple frontend to demo the zkSync Quickstart `Greeter` contract and the abiilty to pay for gas using ERC20 tokens using zkSync [account abstraction support](https://era.zksync.io/docs/dev/developer-guides/aa.html) and the testnet [paymaster](https://era.zksync.io/docs/dev/developer-guides/aa.html#paymasters).

## Getting Started

### Setup MetaMask

- [add zkSync Era networks to MetaMask](https://era.zksync.io/docs/dev/fundamentals/interacting.html#connecting-to-zksync-era-on-metamask)
- get Goerli ETH to bridge to L2 or deploy the contract
- in order to test the paymaster feature you need ERC20 tokens on L2
  - use the [portal](https://goerli.portal.zksync.io/) to bridge assets or the [faucet](https://goerli.portal.zksync.io/faucet) to get test tokens

### Install dependencies

```shell
yarn
```

### Run dev server

```shell
yarn dev
```

Open http://localhost:5173/

### Usage Notes

- on tesnet gas prices don't get converted based on the token decimals, so you may see unusually large amounts depending on the token selected

## Implementation

This is a [Vite](https://vitejs.dev/) React app, based on the original Vue implementation from the [tutorial](https://era.zksync.io/docs/dev/building-on-zksync/hello-world.html#compile-and-deploy-the-greeter-contract) and some minor fixes and tweaks.
