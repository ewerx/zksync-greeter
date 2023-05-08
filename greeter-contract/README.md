# zkSync Quickstart Tutorial - Smart Contract

This is an example smart contract that stores a greeting message.

Notable differences from a standard Ethereum Hardhat project:

- TypeScript is required
- dependency on `ethers-5.7.x`
- outputs to `artifacts-zk` and `cache-zk`
- `deploy` folder required for deploy scripts
- `hardhat.config.ts` format

## Setup

- edit `hardhat.config.ts` and enter your Ethereum RPC URL

## Usage

### Compile

```shell
yarn hardhat deploy-zksync
```

### Deploy

```shell
yarn hardhat deploy-zksync
```

## Notes

- clean the `artifacts-zk` and `cache-zk` folders to force recompile
- if you get a `Request-Rate Exceeded` message on deploy try a different [node provider](https://github.com/arddluma/awesome-list-rpc-nodes-providers)

## References

[zkSync Era Quickstart Tutorial](https://era.zksync.io/docs/dev/building-on-zksync/hello-world.html)
